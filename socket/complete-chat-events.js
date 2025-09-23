/**
 * Complete Chat System Socket.IO Events
 * Full-featured real-time chat with messaging, typing, read receipts, and notifications
 */

const { query } = require('../database/connection');
const { notificationManager } = require('./notification-events');
const { presenceManager } = require('./presence-events');
const { chatMonitor } = require('../utils/chat-monitor');

/**
 * Chat event configuration
 */
const CHAT_CONFIG = {
    TYPING_TIMEOUT: 3000,       // 3 seconds typing timeout
    MESSAGE_RATE_LIMIT: 10,     // 10 messages per minute
    TYPING_DEBOUNCE: 1000,      // 1 second typing debounce
};

/**
 * Rate limiting for chat events
 */
const chatRateLimit = new Map(); // userId -> { count: number, resetTime: number }
const typingDebounce = new Map(); // userId -> timeout

/**
 * Initialize complete chat Socket.IO events
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
function initializeCompleteChatEvents(io) {
    console.log('🔄 Initializing complete chat Socket.IO events...');

    // Handle new socket connections
    io.on('connection', async (socket) => {
        const userId = socket.userId;

        if (!userId) {
            console.log('❌ Chat connection rejected: No user ID');
            socket.disconnect();
            return;
        }

        console.log(`💬 Chat connection established: ${socket.id} (User: ${userId})`);
        chatMonitor.logConnection(socket.id, userId, 'connected');

        // Join user to their personal room
        const userRoom = `user:${userId}`;
        socket.join(userRoom);
        socket.userRoom = userRoom;

        // ================================
        // MESSAGE SENDING
        // ================================

        socket.on('send_message', async (data, callback) => {
            try {
                const { recipientId, message, messageType = 'text', replyToId = null } = data;

                // Validate input
                if (!recipientId || !message || typeof message !== 'string' || message.trim().length === 0) {
                    const error = 'Recipient ID and message are required';
                    socket.emit('message_error', { error });
                    if (callback) callback({ success: false, error });
                    return;
                }

                if (message.length > 2000) {
                    const error = 'Message too long (max 2000 characters)';
                    socket.emit('message_error', { error });
                    if (callback) callback({ success: false, error });
                    return;
                }

                // Rate limiting
                if (!checkMessageRateLimit(userId)) {
                    const error = 'Message rate limit exceeded';
                    socket.emit('message_error', { error });
                    if (callback) callback({ success: false, error });
                    return;
                }

                console.log(`📤 Socket message: ${userId} -> ${recipientId}`);
                chatMonitor.logMessageSent(userId, recipientId, message, Date.now());

                // Save message to database
                const result = await query(
                    `SELECT * FROM save_complete_message($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        userId, 
                        parseInt(recipientId), 
                        message.trim(),
                        message.trim(), // original_text
                        message.trim(), // translated_text
                        'en', // original_lang
                        'en', // translated_lang
                        messageType,
                        replyToId
                    ]
                );

                if (!result.rows || result.rows.length === 0) {
                    const error = 'Failed to save message';
                    socket.emit('message_error', { error });
                    if (callback) callback({ success: false, error });
                    return;
                }

                const savedMessage = result.rows[0];

                // Get sender information
                const senderResult = await query(
                    'SELECT id, full_name, username, status FROM users WHERE id = $1',
                    [userId]
                );

                const sender = senderResult.rows[0];

                // Prepare message data for real-time delivery
                const messageData = {
                    id: savedMessage.id,
                    senderId: savedMessage.sender_id,
                    recipientId: savedMessage.recipient_id,
                    message: savedMessage.body,
                    messageType: savedMessage.message_type,
                    status: savedMessage.status,
                    timestamp: savedMessage.created_at,
                    sender: {
                        id: sender.id,
                        fullName: sender.full_name,
                        username: sender.username,
                        status: sender.status
                    }
                };

                // Send message to recipient in real-time
                const recipientRoom = `user:${recipientId}`;
                io.to(recipientRoom).emit('new_message', messageData);
                
                // Log message delivery
                chatMonitor.logMessageReceived(userId, recipientId, message, savedMessage.id);

                // Send confirmation to sender
                socket.emit('message_sent', {
                    messageId: savedMessage.id,
                    timestamp: savedMessage.created_at,
                    status: 'sent'
                });

                // Send notification to recipient
                await sendChatNotification(userId, parseInt(recipientId), savedMessage.id, message);

                console.log(`✅ Message delivered: ${userId} -> ${recipientId}`);

                if (callback) callback({ 
                    success: true, 
                    messageId: savedMessage.id,
                    timestamp: savedMessage.created_at
                });

            } catch (error) {
                console.error('❌ Socket message error:', error);
                socket.emit('message_error', { error: 'Failed to send message' });
                if (callback) callback({ success: false, error: 'Failed to send message' });
            }
        });

        // ================================
        // TYPING INDICATORS
        // ================================

        socket.on('typing', async (data) => {
            try {
                const { targetUserId, isTyping } = data;

                if (!targetUserId || typeof isTyping !== 'boolean') {
                    return;
                }

                // Debounce typing events
                const debounceKey = `${userId}-${targetUserId}`;
                if (typingDebounce.has(debounceKey)) {
                    clearTimeout(typingDebounce.get(debounceKey));
                }

                if (isTyping) {
                    // Update database
                    await query(
                        `INSERT INTO typing_indicators (user_id, target_user_id, is_typing, started_at)
                         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                         ON CONFLICT (user_id, target_user_id)
                         DO UPDATE SET is_typing = $3, started_at = CURRENT_TIMESTAMP`,
                        [userId, parseInt(targetUserId), isTyping]
                    );

                    // Send typing indicator to target user
                    const targetRoom = `user:${targetUserId}`;
                    io.to(targetRoom).emit('user_typing', {
                        userId: userId,
                        isTyping: true,
                        timestamp: new Date()
                    });

                    console.log(`⌨️ Typing started: ${userId} -> ${targetUserId}`);
                    chatMonitor.logTypingEvent(userId, targetUserId, true);
                } else {
                    // Remove typing indicator
                    await query(
                        `DELETE FROM typing_indicators WHERE user_id = $1 AND target_user_id = $2`,
                        [userId, parseInt(targetUserId)]
                    );

                    // Send typing stop to target user
                    const targetRoom = `user:${targetUserId}`;
                    io.to(targetRoom).emit('user_typing', {
                        userId: userId,
                        isTyping: false,
                        timestamp: new Date()
                    });

                    console.log(`⌨️ Typing stopped: ${userId} -> ${targetUserId}`);
                    chatMonitor.logTypingEvent(userId, targetUserId, false);
                }

                // Set timeout to auto-stop typing indicator
                if (isTyping) {
                    const timeout = setTimeout(async () => {
                        await query(
                            `DELETE FROM typing_indicators WHERE user_id = $1 AND target_user_id = $2`,
                            [userId, parseInt(targetUserId)]
                        );

                        const targetRoom = `user:${targetUserId}`;
                        io.to(targetRoom).emit('user_typing', {
                            userId: userId,
                            isTyping: false,
                            timestamp: new Date()
                        });

                        typingDebounce.delete(debounceKey);
                        console.log(`⌨️ Typing auto-stopped: ${userId} -> ${targetUserId}`);
                    }, CHAT_CONFIG.TYPING_TIMEOUT);

                    typingDebounce.set(debounceKey, timeout);
                } else {
                    typingDebounce.delete(debounceKey);
                }

            } catch (error) {
                console.error('❌ Typing indicator error:', error);
            }
        });

        // ================================
        // READ RECEIPTS
        // ================================

        socket.on('mark_read', async (data) => {
            try {
                const { senderId } = data;

                if (!senderId) {
                    return;
                }

                console.log(`👁️ Marking messages as read: ${senderId} -> ${userId}`);

                // Mark messages as read in database
                const result = await query(
                    `SELECT mark_messages_as_read($1, $2)`,
                    [userId, parseInt(senderId)]
                );

                const updatedCount = result.rows[0].mark_messages_as_read;

                if (updatedCount > 0) {
                    // Send read receipt to sender
                    const senderRoom = `user:${senderId}`;
                    io.to(senderRoom).emit('messages_read', {
                        readerId: userId,
                        messageCount: updatedCount,
                        timestamp: new Date()
                    });

                    console.log(`✅ Read receipt sent: ${userId} read ${updatedCount} messages from ${senderId}`);
                    chatMonitor.logReadReceipt(userId, senderId, updatedCount);
                }

            } catch (error) {
                console.error('❌ Read receipt error:', error);
            }
        });

        // ================================
        // MESSAGE REACTIONS
        // ================================

        socket.on('message_reaction', async (data) => {
            try {
                const { messageId, reaction } = data;

                if (!messageId || !reaction) {
                    return;
                }

                console.log(`😊 Adding reaction: ${userId} -> ${messageId} (${reaction})`);

                // Remove existing reaction if exists
                await query(
                    `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
                    [parseInt(messageId), userId]
                );

                // Add new reaction
                const result = await query(
                    `INSERT INTO message_reactions (message_id, user_id, reaction)
                     VALUES ($1, $2, $3)
                     RETURNING id`,
                    [parseInt(messageId), userId, reaction]
                );

                // Get message sender to send reaction notification
                const messageResult = await query(
                    'SELECT sender_id FROM messages WHERE id = $1',
                    [parseInt(messageId)]
                );

                if (messageResult.rows && messageResult.rows.length > 0) {
                    const messageSender = messageResult.rows[0].sender_id;
                    
                    // Send reaction to message sender
                    const senderRoom = `user:${messageSender}`;
                    io.to(senderRoom).emit('message_reaction', {
                        messageId: parseInt(messageId),
                        userId: userId,
                        reaction: reaction,
                        timestamp: new Date()
                    });

                    console.log(`✅ Reaction delivered: ${userId} reacted to ${messageId} from ${messageSender}`);
                }

            } catch (error) {
                console.error('❌ Message reaction error:', error);
            }
        });

        // ================================
        // CONVERSATION MANAGEMENT
        // ================================

        socket.on('join_conversation', async (data) => {
            try {
                const { friendId } = data;

                if (!friendId) {
                    return;
                }

                const conversationRoom = `conversation:${Math.min(userId, parseInt(friendId))}-${Math.max(userId, parseInt(friendId))}`;
                socket.join(conversationRoom);
                socket.conversationRoom = conversationRoom;

                console.log(`💬 User ${userId} joined conversation with ${friendId}`);

                // Send confirmation
                socket.emit('conversation_joined', {
                    friendId: parseInt(friendId),
                    room: conversationRoom
                });

            } catch (error) {
                console.error('❌ Join conversation error:', error);
            }
        });

        socket.on('leave_conversation', async (data) => {
            try {
                const { friendId } = data;

                if (!friendId) {
                    return;
                }

                const conversationRoom = `conversation:${Math.min(userId, parseInt(friendId))}-${Math.max(userId, parseInt(friendId))}`;
                socket.leave(conversationRoom);

                console.log(`💬 User ${userId} left conversation with ${friendId}`);

            } catch (error) {
                console.error('❌ Leave conversation error:', error);
            }
        });

        // ================================
        // CONNECTION CLEANUP
        // ================================

        socket.on('disconnect', async (reason) => {
            console.log(`💬 Chat socket disconnected: ${socket.id} (User: ${userId}, Reason: ${reason})`);
            chatMonitor.logConnection(socket.id, userId, `disconnected (${reason})`);

            // Clean up typing indicators
            await query(
                `DELETE FROM typing_indicators WHERE user_id = $1`,
                [userId]
            );

            // Clean up debounce timers
            for (const [key, timeout] of typingDebounce.entries()) {
                if (key.startsWith(`${userId}-`)) {
                    clearTimeout(timeout);
                    typingDebounce.delete(key);
                }
            }

            // Leave all rooms
            if (socket.userRoom) {
                socket.leave(socket.userRoom);
            }
            if (socket.conversationRoom) {
                socket.leave(socket.conversationRoom);
            }

            console.log(`✅ Chat cleanup completed for user ${userId}`);
        });
    });
}

/**
 * Check message rate limit for a user
 */
function checkMessageRateLimit(userId) {
    const now = Date.now();
    const userLimit = chatRateLimit.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
        chatRateLimit.set(userId, {
            count: 1,
            resetTime: now + 60000 // Reset in 1 minute
        });
        return true;
    }

    if (userLimit.count >= CHAT_CONFIG.MESSAGE_RATE_LIMIT) {
        return false;
    }

    userLimit.count++;
    return true;
}

/**
 * Send chat notification to user
 */
async function sendChatNotification(senderId, recipientId, messageId, messageText) {
    try {
        // Get sender information
        const senderResult = await query(
            'SELECT full_name, username FROM users WHERE id = $1',
            [senderId]
        );

        if (!senderResult.rows || senderResult.rows.length === 0) {
            return;
        }

        const sender = senderResult.rows[0];
        const notificationMessage = `${sender.full_name} sent you a message`;

        // Create notification in database
        await query(
            `INSERT INTO chat_notifications (user_id, sender_id, message_id, notification_type)
             VALUES ($1, $2, $3, 'message')`,
            [recipientId, senderId, messageId]
        );

        // Send real-time notification if notification manager is available
        if (notificationManager && notificationManager.sendNotification) {
            await notificationManager.sendNotification({
                userId: recipientId,
                type: 'friend_message',
                message: notificationMessage,
                data: {
                    senderId: senderId,
                    senderName: sender.full_name,
                    messageId: messageId,
                    messagePreview: messageText.substring(0, 100)
                }
            });
        }

        console.log(`📢 Chat notification sent: ${senderId} -> ${recipientId}`);

    } catch (error) {
        console.error('❌ Chat notification error:', error);
    }
}

module.exports = {
    initializeCompleteChatEvents
};
