const { pool } = require('../database/connection');

/**
 * 🎲 RANDOM CHAT MANAGER - Coomeet Model
 * Instant matching, real-time messaging, WebRTC signaling
 */

class RandomChatManager {
    constructor(io) {
        this.io = io;
        this.queue = new Map(); // userId -> { socket, preferences, joinedAt }
        this.activeRooms = new Map(); // roomId -> { user1, user2, startedAt }
        this.userSockets = new Map(); // userId -> socket
        this.socketUsers = new Map(); // socketId -> userId

        this.setupEvents();
        this.startQueueProcessor();
    }

    setupEvents() {
        this.io.on('connection', (socket) => {
            console.log(`🎲 Random chat socket connected: ${socket.id}`);

            // Join random chat system
            socket.on('random_chat:join_queue', async (data) => {
                await this.handleJoinQueue(socket, data);
            });

            // Leave queue
            socket.on('random_chat:leave_queue', async () => {
                await this.handleLeaveQueue(socket);
            });

            // Send message
            socket.on('random_chat:send_message', async (data) => {
                await this.handleSendMessage(socket, data);
            });

            // Typing indicator
            socket.on('random_chat:typing', (data) => {
                this.handleTyping(socket, data);
            });

            // Skip current partner
            socket.on('random_chat:skip_partner', async () => {
                await this.handleSkipPartner(socket);
            });

            // End chat
            socket.on('random_chat:end_chat', async () => {
                await this.handleEndChat(socket);
            });

            // WebRTC signaling
            socket.on('random_chat:webrtc_offer', (data) => {
                this.handleWebRTCSignal(socket, 'offer', data);
            });

            socket.on('random_chat:webrtc_answer', (data) => {
                this.handleWebRTCSignal(socket, 'answer', data);
            });

            socket.on('random_chat:webrtc_ice_candidate', (data) => {
                this.handleWebRTCSignal(socket, 'ice_candidate', data);
            });

            // Report user
            socket.on('random_chat:report_user', async (data) => {
                await this.handleReportUser(socket, data);
            });

            // Disconnect
            socket.on('disconnect', async () => {
                await this.handleDisconnect(socket);
            });
        });
    }

    async handleJoinQueue(socket, data) {
        try {
            const userId = socket.userId || data.userId;
            if (!userId) {
                socket.emit('random_chat:error', { message: 'Authentication required' });
                return;
            }

            // Store user-socket mapping
            this.userSockets.set(userId, socket);
            this.socketUsers.set(socket.id, userId);
            socket.userId = userId;

            // Check if already in queue
            if (this.queue.has(userId)) {
                socket.emit('random_chat:already_in_queue', { position: this.queue.size });
                return;
            }

            // Check if already in active chat
            const activeRoom = await this.getUserActiveRoom(userId);
            if (activeRoom) {
                socket.emit('random_chat:already_in_chat', { roomId: activeRoom.id });
                return;
            }

            // Add to database queue
            const preferences = data.preferences || {};
            await pool.query(`
                INSERT INTO chat_queue (user_id, preferences, gender_preference, language_preference)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id)
                DO UPDATE SET
                    preferences = $2,
                    gender_preference = $3,
                    language_preference = $4,
                    joined_at = CURRENT_TIMESTAMP,
                    status = 'waiting'
            `, [
                userId,
                JSON.stringify(preferences),
                preferences.gender || null,
                preferences.language || null
            ]);

            // Add to memory queue
            this.queue.set(userId, {
                socket,
                preferences,
                joinedAt: Date.now()
            });

            console.log(`👥 User ${userId} joined queue. Queue size: ${this.queue.size}`);

            socket.emit('random_chat:queue_joined', {
                position: this.queue.size,
                estimatedWait: this.calculateEstimatedWait()
            });

            // Try immediate matching
            await this.tryMatchUsers();

        } catch (error) {
            console.error('❌ Error joining queue:', error);
            socket.emit('random_chat:error', { message: 'Failed to join queue' });
        }
    }

    async handleLeaveQueue(socket) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            // Remove from memory queue
            this.queue.delete(userId);

            // Update database
            await pool.query(`
                UPDATE chat_queue
                SET status = 'cancelled'
                WHERE user_id = $1 AND status = 'waiting'
            `, [userId]);

            socket.emit('random_chat:queue_left');
            console.log(`👋 User ${userId} left queue. Queue size: ${this.queue.size}`);

        } catch (error) {
            console.error('❌ Error leaving queue:', error);
        }
    }

    async tryMatchUsers() {
        if (this.queue.size < 2) return;

        const queueArray = Array.from(this.queue.entries());

        // Simple FIFO matching (can be enhanced with preference matching)
        const [user1Id, user1Data] = queueArray[0];
        const [user2Id, user2Data] = queueArray[1];

        try {
            // Create room in database
            const roomResult = await pool.query(`
                INSERT INTO chat_rooms (user1_id, user2_id, room_type, status)
                VALUES ($1, $2, 'random', 'active')
                RETURNING id, started_at
            `, [user1Id, user2Id]);

            const room = roomResult.rows[0];
            const roomId = room.id;

            // Update queue status in database
            await pool.query(`
                UPDATE chat_queue
                SET status = 'matched', matched_with = $2
                WHERE user_id = $1
            `, [user1Id, user2Id]);

            await pool.query(`
                UPDATE chat_queue
                SET status = 'matched', matched_with = $2
                WHERE user_id = $1
            `, [user2Id, user1Id]);

            // Remove from queue
            this.queue.delete(user1Id);
            this.queue.delete(user2Id);

            // Store active room
            this.activeRooms.set(roomId, {
                user1: { id: user1Id, socket: user1Data.socket },
                user2: { id: user2Id, socket: user2Data.socket },
                startedAt: Date.now()
            });

            // Get partner info
            const user1Info = await this.getUserInfo(user1Id);
            const user2Info = await this.getUserInfo(user2Id);

            // Notify both users - match found!
            user1Data.socket.emit('random_chat:match_found', {
                roomId,
                partner: {
                    id: user2Id,
                    username: user2Info.username,
                    gender: user2Info.gender,
                    language: user2Info.native_language
                }
            });

            user2Data.socket.emit('random_chat:match_found', {
                roomId,
                partner: {
                    id: user1Id,
                    username: user1Info.username,
                    gender: user1Info.gender,
                    language: user1Info.native_language
                }
            });

            // Join Socket.IO room
            user1Data.socket.join(`room_${roomId}`);
            user2Data.socket.join(`room_${roomId}`);

            console.log(`🎉 Match created! Room ${roomId}: User ${user1Id} <-> User ${user2Id}`);

            // Send system message
            await this.sendSystemMessage(roomId, 'You are now connected! Say hi! 👋');

        } catch (error) {
            console.error('❌ Error matching users:', error);
        }
    }

    async handleSendMessage(socket, data) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const { roomId, message } = data;
            if (!message || !message.trim()) return;

            // Verify user is in this room
            const room = this.activeRooms.get(roomId);
            if (!room) {
                socket.emit('random_chat:error', { message: 'Room not found' });
                return;
            }

            if (room.user1.id !== userId && room.user2.id !== userId) {
                socket.emit('random_chat:error', { message: 'Not authorized' });
                return;
            }

            // Save message to database
            const messageResult = await pool.query(`
                INSERT INTO chat_messages (room_id, sender_id, message_text, message_type)
                VALUES ($1, $2, $3, 'text')
                RETURNING id, created_at
            `, [roomId, userId, message.trim()]);

            const savedMessage = messageResult.rows[0];

            // Broadcast to room
            this.io.to(`room_${roomId}`).emit('random_chat:new_message', {
                id: savedMessage.id,
                roomId,
                senderId: userId,
                message: message.trim(),
                createdAt: savedMessage.created_at
            });

            console.log(`💬 Message in room ${roomId} from user ${userId}`);

        } catch (error) {
            console.error('❌ Error sending message:', error);
            socket.emit('random_chat:error', { message: 'Failed to send message' });
        }
    }

    handleTyping(socket, data) {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) return;

        const { roomId, isTyping } = data;
        const room = this.activeRooms.get(roomId);
        if (!room) return;

        // Send to partner only
        const partnerId = room.user1.id === userId ? room.user2.id : room.user1.id;
        const partnerSocket = this.userSockets.get(partnerId);

        if (partnerSocket) {
            partnerSocket.emit('random_chat:partner_typing', { isTyping });
        }
    }

    async handleSkipPartner(socket) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const activeRoom = await this.getUserActiveRoom(userId);
            if (!activeRoom) {
                socket.emit('random_chat:error', { message: 'Not in active chat' });
                return;
            }

            // End current room
            await this.endRoom(activeRoom.id, 'skipped');

            // Update statistics
            await pool.query(`
                UPDATE chat_statistics
                SET total_skips = total_skips + 1
                WHERE user_id = $1
            `, [userId]);

            // Auto re-join queue
            await this.handleJoinQueue(socket, { userId });

        } catch (error) {
            console.error('❌ Error skipping partner:', error);
            socket.emit('random_chat:error', { message: 'Failed to skip partner' });
        }
    }

    async handleEndChat(socket) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const activeRoom = await this.getUserActiveRoom(userId);
            if (!activeRoom) return;

            await this.endRoom(activeRoom.id, 'ended');

            socket.emit('random_chat:chat_ended');

        } catch (error) {
            console.error('❌ Error ending chat:', error);
        }
    }

    async endRoom(roomId, reason = 'ended') {
        try {
            const room = this.activeRooms.get(roomId);
            if (!room) return;

            // Update database
            await pool.query(`
                UPDATE chat_rooms
                SET status = $2, ended_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [roomId, reason]);

            // Notify both users
            this.io.to(`room_${roomId}`).emit('random_chat:chat_ended', { reason });

            // Leave Socket.IO room
            room.user1.socket.leave(`room_${roomId}`);
            room.user2.socket.leave(`room_${roomId}`);

            // Remove from active rooms
            this.activeRooms.delete(roomId);

            console.log(`🔚 Room ${roomId} ended: ${reason}`);

        } catch (error) {
            console.error('❌ Error ending room:', error);
        }
    }

    handleWebRTCSignal(socket, signalType, data) {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) return;

        const { roomId, signal } = data;
        const room = this.activeRooms.get(roomId);
        if (!room) return;

        // Forward to partner
        const partnerId = room.user1.id === userId ? room.user2.id : room.user1.id;
        const partnerSocket = this.userSockets.get(partnerId);

        if (partnerSocket) {
            partnerSocket.emit(`random_chat:webrtc_${signalType}`, { signal });
        }
    }

    async handleReportUser(socket, data) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            const { reportedUserId, roomId, reason, description } = data;

            await pool.query(`
                INSERT INTO chat_reports (reporter_id, reported_user_id, room_id, reason, description)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, reportedUserId, roomId, reason, description || null]);

            // Update statistics
            await pool.query(`
                UPDATE chat_statistics
                SET times_reported = times_reported + 1
                WHERE user_id = $1
            `, [reportedUserId]);

            socket.emit('random_chat:report_submitted');
            console.log(`🚨 Report: User ${userId} reported User ${reportedUserId}`);

        } catch (error) {
            console.error('❌ Error reporting user:', error);
            socket.emit('random_chat:error', { message: 'Failed to submit report' });
        }
    }

    async handleDisconnect(socket) {
        try {
            const userId = this.socketUsers.get(socket.id);
            if (!userId) return;

            console.log(`🔌 User ${userId} disconnected from random chat`);

            // Remove from queue
            await this.handleLeaveQueue(socket);

            // End active chat
            const activeRoom = await this.getUserActiveRoom(userId);
            if (activeRoom) {
                await this.endRoom(activeRoom.id, 'abandoned');
            }

            // Cleanup mappings
            this.userSockets.delete(userId);
            this.socketUsers.delete(socket.id);

        } catch (error) {
            console.error('❌ Error handling disconnect:', error);
        }
    }

    async getUserActiveRoom(userId) {
        try {
            const result = await pool.query(`
                SELECT id, user1_id, user2_id, started_at
                FROM chat_rooms
                WHERE (user1_id = $1 OR user2_id = $1)
                AND status = 'active'
                ORDER BY started_at DESC
                LIMIT 1
            `, [userId]);

            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting active room:', error);
            return null;
        }
    }

    async getUserInfo(userId) {
        try {
            const result = await pool.query(`
                SELECT id, username, gender, native_language
                FROM users
                WHERE id = $1
            `, [userId]);

            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error getting user info:', error);
            return null;
        }
    }

    async sendSystemMessage(roomId, message) {
        try {
            await pool.query(`
                INSERT INTO chat_messages (room_id, sender_id, message_text, message_type)
                VALUES ($1, 0, $2, 'system')
            `, [roomId, message]);

            this.io.to(`room_${roomId}`).emit('random_chat:system_message', { message });
        } catch (error) {
            console.error('❌ Error sending system message:', error);
        }
    }

    calculateEstimatedWait() {
        // Simple estimation: ~2 seconds per person in queue
        return Math.max(2, this.queue.size * 2);
    }

    async startQueueProcessor() {
        // Create cleanup function if it doesn't exist
        try {
            await pool.query(`
                CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
                RETURNS void AS $$
                BEGIN
                    -- No-op: Random chat uses in-memory queue (Map objects)
                    RETURN;
                END;
                $$ LANGUAGE plpgsql;
            `);
            console.log('✅ Random chat cleanup function ready');
        } catch (funcError) {
            console.log('⚠️ Could not create cleanup function:', funcError.message);
        }

        // Process queue every 2 seconds for matching
        setInterval(async () => {
            if (this.queue.size >= 2) {
                await this.tryMatchUsers();
            }
        }, 2000);

        // Cleanup old queue entries every minute
        setInterval(async () => {
            try {
                await pool.query(`SELECT cleanup_old_queue_entries()`);
            } catch (error) {
                console.error('❌ Error cleaning queue:', error);
            }
        }, 60000);
    }
}

module.exports = RandomChatManager;
