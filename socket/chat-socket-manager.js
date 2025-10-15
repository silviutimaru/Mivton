const { pool } = require('../database/connection');

class ChatSocketManager {
    constructor(io) {
        this.io = io;
        this.userSockets = new Map(); // userId -> Set of socketIds
        this.socketUsers = new Map(); // socketId -> userId
        this.typingUsers = new Map(); // conversationId -> Set of userIds
        
        this.setupChatEvents();
    }

    setupChatEvents() {
        this.io.on('connection', (socket) => {
            // Handle user joining chat system
            socket.on('chat:join', (userId) => {
                this.handleUserJoin(socket, userId);
            });

            // Handle sending messages
            socket.on('chat:send_message', async (data) => {
                await this.handleSendMessage(socket, data);
            });

            // Handle typing indicators
            socket.on('chat:typing_start', (data) => {
                this.handleTypingStart(socket, data);
            });

            socket.on('chat:typing_stop', (data) => {
                this.handleTypingStop(socket, data);
            });

            // Handle message read receipts
            socket.on('chat:mark_read', async (data) => {
                await this.handleMarkRead(socket, data);
            });

            // Handle user leaving conversation
            socket.on('chat:leave_conversation', (data) => {
                this.handleLeaveConversation(socket, data);
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                this.handleUserDisconnect(socket);
            });
        });
    }

    handleUserJoin(socket, userId) {
        try {
            // Store user-socket mapping
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(socket.id);
            this.socketUsers.set(socket.id, userId);

            // Join user to their personal room for notifications
            socket.join(`user_${userId}`);

            console.log(`🔗 User ${userId} joined chat system (socket: ${socket.id})`);

            // Notify friends that user is online
            this.notifyFriendsOnlineStatus(userId, 'online');

        } catch (error) {
            console.error('❌ Error handling chat join:', error);
        }
    }

    async handleSendMessage(socket, data) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) {
                socket.emit('chat:error', { message: 'Not authenticated' });
                return;
            }

            const { recipientId, content, conversationId } = data;

            if (!content || content.trim().length === 0) {
                socket.emit('chat:error', { message: 'Message content is required' });
                return;
            }

            // Verify friendship
            const friendCheck = await pool.query(`
                SELECT 1 FROM friendships 
                WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
                AND status = 'active'
            `, [userId, recipientId]);

            if (friendCheck.rows.length === 0) {
                socket.emit('chat:error', { message: 'Can only send messages to friends' });
                return;
            }

            // Find or create conversation
            let convId = conversationId;
            if (!convId) {
                let convResult = await pool.query(`
                    SELECT id FROM chat_conversations 
                    WHERE (participant_1 = $1 AND participant_2 = $2) 
                       OR (participant_1 = $2 AND participant_2 = $1)
                `, [userId, recipientId]);

                if (convResult.rows.length === 0) {
                    const newConv = await pool.query(`
                        INSERT INTO chat_conversations (participant_1, participant_2)
                        VALUES ($1, $2)
                        RETURNING id
                    `, [Math.min(userId, recipientId), Math.max(userId, recipientId)]);
                    convId = newConv.rows[0].id;
                } else {
                    convId = convResult.rows[0].id;
                }
            }

            // Insert message
            const messageResult = await pool.query(`
                INSERT INTO chat_messages (conversation_id, sender_id, content)
                VALUES ($1, $2, $3)
                RETURNING id, created_at
            `, [convId, userId, content.trim()]);

            const messageId = messageResult.rows[0].id;

            // Update conversation
            await pool.query(`
                UPDATE chat_conversations 
                SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [messageId, convId]);

            // Create message status for recipient
            await pool.query(`
                INSERT INTO message_status (message_id, user_id, status)
                VALUES ($1, $2, 'delivered')
                ON CONFLICT (message_id, user_id) DO NOTHING
            `, [messageId, recipientId]);

            // Get sender info for the message
            const senderInfo = await pool.query(`
                SELECT username FROM users WHERE id = $1
            `, [userId]);

            const messageData = {
                id: messageId,
                conversation_id: convId,
                sender_id: userId,
                sender_username: senderInfo.rows[0].username,
                content: content.trim(),
                created_at: messageResult.rows[0].created_at
            };

            // Send to sender (confirmation)
            socket.emit('chat:message_sent', messageData);

            // Send to recipient (if online)
            this.io.to(`user_${recipientId}`).emit('chat:new_message', messageData);

            // Stop typing indicator for sender
            this.handleTypingStop(socket, { conversationId: convId });

            console.log(`💬 Message sent: ${userId} -> ${recipientId} in conversation ${convId}`);

        } catch (error) {
            console.error('❌ Error sending message:', error);
            socket.emit('chat:error', { message: 'Failed to send message' });
        }
    }

    handleTypingStart(socket, data) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const { conversationId, recipientId } = data;

            if (!this.typingUsers.has(conversationId)) {
                this.typingUsers.set(conversationId, new Set());
            }
            this.typingUsers.get(conversationId).add(userId);

            // Notify recipient
            this.io.to(`user_${recipientId}`).emit('chat:typing_start', {
                conversationId,
                userId,
                username: data.username || 'Someone'
            });

        } catch (error) {
            console.error('❌ Error handling typing start:', error);
        }
    }

    handleTypingStop(socket, data) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const { conversationId, recipientId } = data;

            if (this.typingUsers.has(conversationId)) {
                this.typingUsers.get(conversationId).delete(userId);
                if (this.typingUsers.get(conversationId).size === 0) {
                    this.typingUsers.delete(conversationId);
                }
            }

            // Notify recipient
            if (recipientId) {
                this.io.to(`user_${recipientId}`).emit('chat:typing_stop', {
                    conversationId,
                    userId
                });
            }

        } catch (error) {
            console.error('❌ Error handling typing stop:', error);
        }
    }

    async handleMarkRead(socket, data) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const { messageId, conversationId } = data;

            // Update message status
            await pool.query(`
                INSERT INTO message_status (message_id, user_id, status, updated_at)
                VALUES ($1, $2, 'read', CURRENT_TIMESTAMP)
                ON CONFLICT (message_id, user_id) 
                DO UPDATE SET status = 'read', updated_at = CURRENT_TIMESTAMP
            `, [messageId, userId]);

            // Get message sender to notify them
            const messageInfo = await pool.query(`
                SELECT sender_id FROM chat_messages WHERE id = $1
            `, [messageId]);

            if (messageInfo.rows.length > 0) {
                const senderId = messageInfo.rows[0].sender_id;
                
                // Notify sender that message was read
                this.io.to(`user_${senderId}`).emit('chat:message_read', {
                    messageId,
                    conversationId,
                    readBy: userId
                });
            }

        } catch (error) {
            console.error('❌ Error marking message as read:', error);
        }
    }

    handleLeaveConversation(socket, data) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const { conversationId } = data;

            // Stop any typing indicators
            this.handleTypingStop(socket, { conversationId });

        } catch (error) {
            console.error('❌ Error leaving conversation:', error);
        }
    }

    handleUserDisconnect(socket) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            // Remove from user sockets mapping
            if (this.userSockets.has(userId)) {
                this.userSockets.get(userId).delete(socket.id);
                if (this.userSockets.get(userId).size === 0) {
                    this.userSockets.delete(userId);
                    // User is fully offline, notify friends
                    this.notifyFriendsOnlineStatus(userId, 'offline');
                }
            }

            // Remove from socket users mapping
            this.socketUsers.delete(socket.id);

            // Clear any typing indicators for this user
            for (const [conversationId, typingSet] of this.typingUsers.entries()) {
                if (typingSet.has(userId)) {
                    typingSet.delete(userId);
                    if (typingSet.size === 0) {
                        this.typingUsers.delete(conversationId);
                    }
                }
            }

            console.log(`🔌 User ${userId} disconnected from chat (socket: ${socket.id})`);

        } catch (error) {
            console.error('❌ Error handling disconnect:', error);
        }
    }

    async notifyFriendsOnlineStatus(userId, status) {
        try {
            // Get user's friends
            const friends = await pool.query(`
                SELECT 
                    CASE 
                        WHEN user_id = $1 THEN friend_id 
                        ELSE user_id 
                    END as friend_id
                FROM friendships 
                WHERE (user_id = $1 OR friend_id = $1) AND status = 'active'
            `, [userId]);

            // Notify each friend
            friends.rows.forEach(friend => {
                this.io.to(`user_${friend.friend_id}`).emit('chat:friend_status', {
                    userId,
                    status
                });
            });

        } catch (error) {
            console.error('❌ Error notifying friends of status change:', error);
        }
    }

    // Utility method to check if user is online
    isUserOnline(userId) {
        return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
    }

    // Get online friends for a user
    async getOnlineFriends(userId) {
        try {
            const friends = await pool.query(`
                SELECT 
                    CASE 
                        WHEN user_id = $1 THEN friend_id 
                        ELSE user_id 
                    END as friend_id
                FROM friendships 
                WHERE (user_id = $1 OR friend_id = $1) AND status = 'active'
            `, [userId]);

            return friends.rows.map(friend => ({
                userId: friend.friend_id,
                online: this.isUserOnline(friend.friend_id)
            }));

        } catch (error) {
            console.error('❌ Error getting online friends:', error);
            return [];
        }
    }
}

module.exports = ChatSocketManager;