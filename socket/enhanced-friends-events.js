/**
 * 🚀 MIVTON PHASE 3.2 - ENHANCED FRIENDS EVENTS SYSTEM
 * Complete real-time friends system with advanced notification management
 * 
 * Features:
 * - Enhanced real-time friend interactions
 * - Integrated notification system
 * - Advanced presence management
 * - Activity feed updates
 * - Connection management
 * - Performance optimizations
 */

const { connectionManager } = require('./connection-manager');
const { notificationManager } = require('./notification-events');
const { presenceManager } = require('./presence-events');
const { activityManager } = require('./activity-events');
const { improvedSocketAuth, requireSocketAuth } = require('./improved-socket-auth');
const { areUsersFriends, isUserBlocked } = require('../utils/friends-utils');
const { setupVideoCallHandlers } = require('./video-call-handlers');

/**
 * Enhanced friends events configuration
 */
const FRIENDS_CONFIG = {
    MAX_BATCH_SIZE: 50,
    EVENT_THROTTLE: 1000,       // 1 second between similar events
    TYPING_TIMEOUT: 3000,       // 3 seconds typing timeout
    PRESENCE_DEBOUNCE: 2000,    // 2 seconds presence update debounce
    ACTIVITY_THROTTLE: 5000     // 5 seconds between activity updates
};

/**
 * Event throttling map
 */
const eventThrottle = new Map(); // userId:eventType -> timestamp

/**
 * Initialize enhanced friends Socket.IO events
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
function initializeEnhancedFriendsEvents(io) {
    console.log('🔄 Initializing enhanced friends Socket.IO events...');

    // Initialize all managers
    connectionManager.initialize(io);
    notificationManager.initialize(io);
    presenceManager.initialize(io);
    activityManager.initialize(io);

    // Authentication middleware
    io.use(improvedSocketAuth);

    // Enhanced connection handling
    io.on('connection', async (socket) => {
        const userId = socket.userId;

        console.log(`🔌 Enhanced connection established: ${socket.id} (User: ${userId || 'anonymous'})`);

        // Add to connection manager
        const connectionAdded = await connectionManager.addConnection(socket, userId);
        if (!connectionAdded) {
            return; // Connection was rejected
        }

        if (userId) {
            // Handle user coming online
            await presenceManager.handleUserOnline(userId, socket.userInfo);

            // Send initial data
            await sendInitialData(socket, userId);
        }

        // ================================
        // TASK 4.2: ROOM MANAGEMENT
        // ================================

        socket.on('join', (userIdForRoom) => {
            try {
                const roomName = `user:${userIdForRoom}`;
                socket.join(roomName);
                console.log(`🚀 Socket ${socket.id} joined room: ${roomName}`);
                
                // Store the room info on the socket for cleanup
                socket.userRoom = roomName;
                socket.roomUserId = userIdForRoom;
                
                // Send confirmation if desired
                socket.emit('joined', { room: roomName, userId: userIdForRoom });
            } catch (error) {
                console.error('❌ Error joining room:', error);
            }
        });

        socket.on('server:notify', (data) => {
            try {
                const { to, msg } = data;
                console.log(`🚀 Notify request from ${socket.id}: ${to} -> ${msg}`);
                
                // Send notification to the target room
                io.to(to).emit('notify', { msg });
                console.log(`✉️ Sent notify to room ${to}: ${msg}`);
            } catch (error) {
                console.error('❌ Error sending notify:', error);
            }
        });

        // ================================
        // FRIEND REQUEST EVENTS
        // ================================

        socket.on('friend:request:send', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;
            
            try {
                const { receiverId, message } = data;
                
                if (!receiverId || isNaN(receiverId)) {
                    return callback({ success: false, error: 'Invalid receiver ID' });
                }

                // Check if receiver is blocked
                const isBlocked = await isUserBlocked(receiverId, userId);
                if (isBlocked) {
                    return callback({ success: false, error: 'Unable to send friend request' });
                }

                // Check if already friends
                const alreadyFriends = await areUsersFriends(userId, receiverId);
                if (alreadyFriends) {
                    return callback({ success: false, error: 'Already friends with this user' });
                }

                // Get user info for notification
                const senderInfo = socket.userInfo;

                // Send notification to receiver
                await notificationManager.sendFriendRequestNotification(
                    receiverId, 
                    userId, 
                    null, // request ID will be set by the API
                    senderInfo
                );

                // Create activity
                await activityManager.createActivity(
                    userId,
                    'friend_request_sent',
                    { receiver_id: receiverId }
                );

                // Log event
                await logRealtimeEvent('friend_request_sent', userId, receiverId, socket.id, data);

                callback({ success: true });
                console.log(`📤 Friend request notification sent from ${userId} to ${receiverId}`);

            } catch (error) {
                console.error('❌ Friend request send error:', error);
                callback({ success: false, error: 'Failed to send friend request' });
            }
        });

        socket.on('friend:request:accept', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { senderId, requestId } = data;

                // Get accepter info
                const accepterInfo = socket.userInfo;

                // Send notification to sender
                await notificationManager.sendFriendAcceptedNotification(
                    senderId,
                    userId,
                    accepterInfo
                );

                // Create activity for both users
                await activityManager.createActivity(
                    userId,
                    'friend_added',
                    { 
                        new_friend: {
                            id: senderId,
                            username: accepterInfo.username,
                            full_name: accepterInfo.full_name
                        }
                    }
                );

                // Broadcast friend list update
                await broadcastFriendListUpdate([userId, senderId], 'friend_added');

                // Log event
                await logRealtimeEvent('friend_request_accepted', userId, senderId, socket.id, data);

                callback({ success: true });
                console.log(`✅ Friend request accepted: ${senderId} <-> ${userId}`);

            } catch (error) {
                console.error('❌ Friend request accept error:', error);
                callback({ success: false, error: 'Failed to accept friend request' });
            }
        });

        socket.on('friend:request:decline', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { senderId, requestId } = data;

                // Send notification to sender (optional - could be disabled)
                // await notificationManager.sendNotification(senderId, {
                //     type: 'friend_request_declined',
                //     message: 'Your friend request was declined'
                // });

                // Log event
                await logRealtimeEvent('friend_request_declined', userId, senderId, socket.id, data);

                callback({ success: true });
                console.log(`❌ Friend request declined: ${senderId} -> ${userId}`);

            } catch (error) {
                console.error('❌ Friend request decline error:', error);
                callback({ success: false, error: 'Failed to decline friend request' });
            }
        });

        // ================================
        // FRIEND MANAGEMENT EVENTS
        // ================================

        socket.on('friend:remove', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { friendId } = data;

                // Broadcast friend list update
                await broadcastFriendListUpdate([userId, friendId], 'friend_removed', {
                    removed_by: userId,
                    removed_friend: friendId
                });

                // Log event
                await logRealtimeEvent('friend_removed', userId, friendId, socket.id, data);

                callback({ success: true });
                console.log(`🗑️ Friend removed: ${userId} <-> ${friendId}`);

            } catch (error) {
                console.error('❌ Friend removal error:', error);
                callback({ success: false, error: 'Failed to remove friend' });
            }
        });

        socket.on('user:block', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { blockedUserId, reason } = data;

                // Broadcast block event
                await broadcastToUser(blockedUserId, 'user:blocked', {
                    blocker_id: userId,
                    timestamp: new Date().toISOString()
                });

                // Create activity
                await activityManager.createActivity(
                    userId,
                    'user_blocked',
                    { blocked_user_id: blockedUserId, reason }
                );

                // Log event
                await logRealtimeEvent('user_blocked', userId, blockedUserId, socket.id, data);

                callback({ success: true });
                console.log(`🚫 User blocked: ${userId} blocked ${blockedUserId}`);

            } catch (error) {
                console.error('❌ User blocking error:', error);
                callback({ success: false, error: 'Failed to block user' });
            }
        });

        // ================================
        // PRESENCE EVENTS
        // ================================

        socket.on('presence:update', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { status, activityMessage } = data;

                // Check throttling
                if (isEventThrottled(userId, 'presence:update')) {
                    return callback({ success: false, error: 'Too frequent updates' });
                }

                // Update presence
                const updated = await presenceManager.updateUserPresence(userId, status, activityMessage);

                if (updated) {
                    // Create activity if significant status change
                    if (status === 'online' || status === 'offline') {
                        await activityManager.createActivity(
                            userId,
                            status === 'online' ? 'came_online' : 'went_offline',
                            { status, activity_message: activityMessage }
                        );
                    }

                    // Update throttle
                    updateEventThrottle(userId, 'presence:update');
                }

                // Log event
                await logRealtimeEvent('presence_updated', userId, null, socket.id, data);

                callback({ success: true, updated });
                console.log(`🔄 Presence updated for user ${userId}: ${status}`);

            } catch (error) {
                console.error('❌ Presence update error:', error);
                callback({ success: false, error: 'Failed to update presence' });
            }
        });

        socket.on('presence:get_friends', async (callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const friendsPresence = await presenceManager.getFriendsPresence(userId);
                callback({ success: true, friends: friendsPresence });

            } catch (error) {
                console.error('❌ Get friends presence error:', error);
                callback({ success: false, error: 'Failed to get friends presence' });
            }
        });

        // ================================
        // ACTIVITY FEED EVENTS
        // ================================

        socket.on('activity:get_feed', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { limit, offset, activity_type, since } = data || {};
                
                const activities = await activityManager.getActivityFeed(userId, {
                    limit,
                    offset,
                    activity_type,
                    since
                });

                callback({ success: true, activities });

            } catch (error) {
                console.error('❌ Get activity feed error:', error);
                callback({ success: false, error: 'Failed to get activity feed' });
            }
        });

        socket.on('activity:hide', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { activityId } = data;
                
                const hidden = await activityManager.hideActivity(userId, activityId);
                callback({ success: hidden });

            } catch (error) {
                console.error('❌ Hide activity error:', error);
                callback({ success: false, error: 'Failed to hide activity' });
            }
        });

        // ================================
        // NOTIFICATION EVENTS
        // ================================

        socket.on('notifications:get_unread', async (callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const notifications = await notificationManager.getUnreadNotifications(userId);
                callback({ success: true, notifications });

            } catch (error) {
                console.error('❌ Get notifications error:', error);
                callback({ success: false, error: 'Failed to get notifications' });
            }
        });

        socket.on('notifications:mark_read', async (data, callback) => {
            if (!requireAuth(socket, callback)) return;

            try {
                const { notificationId } = data;
                
                const marked = await notificationManager.markAsRead(notificationId, userId);
                callback({ success: marked });

            } catch (error) {
                console.error('❌ Mark notification read error:', error);
                callback({ success: false, error: 'Failed to mark notification as read' });
            }
        });

        // ================================
        // SIMPLE FRIEND CHAT (INTEGRATED)
        // ================================

        // User registers for chat
        socket.on('chat:register', (userId) => {
            console.log(`📝 chat:register event - userId: ${userId}, socket: ${socket.id}`);
            if (!userId) {
                console.log('❌ No userId provided to chat:register');
                return;
            }
            
            // CRITICAL: Set userId on socket for video calls and other features
            socket.userId = userId;
            
            socket.join(`user_${userId}`);
            console.log(`✅ User ${userId} (socket: ${socket.id}) registered for chat and joined room: user_${userId}`);
            console.log(`🔑 Socket userId set to: ${socket.userId}`);
        });

        // When someone sends a message, forward it to the recipient
        socket.on('chat:message', (data) => {
            const { recipientId, messageData } = data;
            console.log(`📨 Message from ${socket.userId} to ${recipientId}`);

            // Send to recipient's room
            io.to(`user_${recipientId}`).emit('chat:receive', messageData);
            console.log(`✅ Sent to user_${recipientId}`);
        });

        // Typing indicators
        socket.on('chat:typing', (recipientId) => {
            io.to(`user_${recipientId}`).emit('chat:typing_start', socket.userId);
        });

        socket.on('chat:stop_typing', (recipientId) => {
            io.to(`user_${recipientId}`).emit('chat:typing_stop', socket.userId);
        });

        // ================================
        // VIDEO CALL EVENTS
        // ================================

        // Setup comprehensive video call handlers (always set up, handle auth in handlers)
        setupVideoCallHandlers(io, socket, userId);

        // Legacy video call events (keep for backward compatibility)
        socket.on('friend:initiate_video_call', async (data) => {
            // Use socket.userId (set by auth or chat:register) instead of the userId from connection
            const callerId = socket.userId;
            console.log(`🔔 VIDEO CALL EVENT RECEIVED - Caller: ${callerId}, Data:`, data);

            if (!callerId) {
                console.log('❌ No userId on socket - rejecting call');
                console.log('🔍 Available socket properties:', {
                    userId: socket.userId,
                    roomUserId: socket.roomUserId,
                    authUserId: userId
                });
                return;
            }

            try {
                const { friendId } = data;
                console.log(`📋 Call details - From: ${callerId} (${socket.userInfo?.username}) → To: ${friendId}`);

                // Check if users are friends
                const areFriends = await areUsersFriends(callerId, friendId);
                console.log(`🤝 Are users friends? ${areFriends}`);

                if (!areFriends) {
                    console.log(`⚠️ Users ${callerId} and ${friendId} are not friends - call rejected`);
                    return;
                }

                console.log(`📞 Video call from ${callerId} to ${friendId}`);
                console.log(`📤 Emitting to room: user_${friendId}`);
                
                // Debug: Check if target room has any sockets
                const roomSockets = io.sockets.adapter.rooms.get(`user_${friendId}`);
                console.log(`🔍 Sockets in room user_${friendId}:`, roomSockets ? Array.from(roomSockets) : 'No sockets');

                // Send incoming call notification to friend
                const eventData = {
                    from: {
                        id: callerId,
                        name: socket.userInfo?.username || 'Friend',
                        avatar: socket.userInfo?.profile_picture_url || '/img/default-avatar.png'
                    },
                    timestamp: new Date().toISOString()
                };

                console.log(`📨 Event data:`, eventData);
                io.to(`user_${friendId}`).emit('friend:incoming_video_call', eventData);
                console.log(`✅ Event emitted to user_${friendId}`);

            } catch (error) {
                console.error('❌ Error initiating video call:', error);
                console.error('Stack:', error.stack);
            }
        });

        // Accept video call
        socket.on('friend:accept_video_call', async (data) => {
            if (!userId) return;

            try {
                const { friendId } = data;

                console.log(`✅ ${userId} accepted call from ${friendId}`);

                // Notify initiator that call was accepted
                io.to(`user_${friendId}`).emit('friend:call_accepted', {
                    friendId: userId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error accepting call:', error);
            }
        });

        // Decline video call
        socket.on('friend:decline_video_call', async (data) => {
            if (!userId) return;

            try {
                const { friendId } = data;

                console.log(`❌ ${userId} declined call from ${friendId}`);

                // Notify initiator that call was declined
                io.to(`user_${friendId}`).emit('friend:call_declined', {
                    friendId: userId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error declining call:', error);
            }
        });

        // End video call
        socket.on('friend:end_video_call', async (data) => {
            if (!userId) return;

            try {
                const { friendId } = data;

                console.log(`📴 ${userId} ended call with ${friendId}`);

                // Notify other participant
                io.to(`user_${friendId}`).emit('friend:call_ended', {
                    friendId: userId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Error ending call:', error);
            }
        });

        // WebRTC signaling for video calls
        socket.on('friend:webrtc_offer', (data) => {
            const { friendId, signal } = data;
            io.to(`user_${friendId}`).emit('friend:webrtc_offer', { signal, from: userId });
        });

        socket.on('friend:webrtc_answer', (data) => {
            const { friendId, signal } = data;
            io.to(`user_${friendId}`).emit('friend:webrtc_answer', { signal, from: userId });
        });

        socket.on('friend:webrtc_ice_candidate', (data) => {
            const { friendId, signal } = data;
            io.to(`user_${friendId}`).emit('friend:webrtc_ice_candidate', { signal, from: userId });
        });

        // ================================
        // TYPING INDICATORS (for future chat)
        // ================================

        socket.on('chat:typing:start', async (data) => {
            if (!userId) return;

            try {
                const { friendId } = data;

                // Check if users are friends
                const areFriends = await areUsersFriends(userId, friendId);
                if (!areFriends) return;

                // Send typing indicator to friend
                await broadcastToUser(friendId, 'chat:typing:start', {
                    user_id: userId,
                    user: socket.userInfo,
                    timestamp: new Date().toISOString()
                });

                // Auto-stop typing after timeout
                setTimeout(async () => {
                    await broadcastToUser(friendId, 'chat:typing:stop', {
                        user_id: userId,
                        timestamp: new Date().toISOString()
                    });
                }, FRIENDS_CONFIG.TYPING_TIMEOUT);

            } catch (error) {
                console.error('❌ Typing start error:', error);
            }
        });

        socket.on('chat:typing:stop', async (data) => {
            if (!userId) return;

            try {
                const { friendId } = data;

                // Check if users are friends
                const areFriends = await areUsersFriends(userId, friendId);
                if (!areFriends) return;

                // Send stop typing indicator to friend
                await broadcastToUser(friendId, 'chat:typing:stop', {
                    user_id: userId,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Typing stop error:', error);
            }
        });

        // ================================
        // CONNECTION MANAGEMENT
        // ================================

        // Task 4.1: Basic ping-pong functionality
        socket.on('ping', (data, callback) => {
            connectionManager.updateActivity(socket.id);
            
            // Handle both callback-style and data-style ping
            if (typeof data === 'function') {
                // Old callback style
                data('pong');
            } else {
                // New data style with timestamp
                console.log(`🏓 Ping received from ${socket.id}:`, data);
                socket.emit('pong', {
                    timestamp: data?.timestamp || Date.now(),
                    serverTime: Date.now(),
                    message: 'pong'
                });
                
                // Call callback if provided
                if (callback) callback('pong');
            }
        });

        socket.on('disconnect', async (reason) => {
            console.log(`🔌 Socket disconnected: ${socket.id} (Reason: ${reason})`);

            // Task 4.2: Clean up room membership
            if (socket.userRoom) {
                socket.leave(socket.userRoom);
                console.log(`🚊 Socket ${socket.id} left room: ${socket.userRoom}`);
            }

            // Handle disconnect in connection manager
            await connectionManager.removeConnection(socket.id);

            // Handle socket disconnect cleanup
            console.log(`🔌 Socket ${socket.id} disconnected properly`);

            if (userId) {
                // Check if user is still online (has other connections)
                const stillOnline = connectionManager.isUserOnline(userId);
                if (!stillOnline) {
                    await presenceManager.handleUserOffline(userId, socket.userInfo);
                }
            }
        });

        // Update activity on any event
        socket.onAny(() => {
            connectionManager.updateActivity(socket.id);
        });
    });

    console.log('✅ Enhanced friends Socket.IO events initialized');
}

/**
 * Send initial data to newly connected user
 * @param {Socket} socket - Socket instance
 * @param {number} userId - User ID
 */
async function sendInitialData(socket, userId) {
    try {
        // Send unread notifications
        const notifications = await notificationManager.getUnreadNotifications(userId, 10);
        socket.emit('initial:notifications', notifications);

        // Send friends presence
        const friendsPresence = await presenceManager.getFriendsPresence(userId);
        socket.emit('initial:friends_presence', friendsPresence);

        // Send recent activity
        const activities = await activityManager.getActivityFeed(userId, { limit: 20 });
        socket.emit('initial:activity_feed', activities);

        console.log(`📤 Initial data sent to user ${userId}`);

    } catch (error) {
        console.error('❌ Error sending initial data:', error);
    }
}

/**
 * Broadcast message to specific user
 * @param {number} userId - Target user ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
async function broadcastToUser(userId, event, data) {
    try {
        const userSockets = connectionManager.getUserSockets(userId);
        
        for (const socketId of userSockets) {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.emit(event, data);
            }
        }

    } catch (error) {
        console.error('❌ Error broadcasting to user:', error);
    }
}

/**
 * Broadcast friend list update
 * @param {Array<number>} userIds - User IDs to notify
 * @param {string} updateType - Type of update
 * @param {Object} updateData - Update data
 */
async function broadcastFriendListUpdate(userIds, updateType, updateData = {}) {
    try {
        const eventData = {
            type: updateType,
            data: updateData,
            timestamp: new Date().toISOString()
        };

        for (const userId of userIds) {
            await broadcastToUser(userId, 'friends:list:update', eventData);
        }

    } catch (error) {
        console.error('❌ Error broadcasting friend list update:', error);
    }
}

/**
 * Check if user is authenticated
 * @param {Socket} socket - Socket instance
 * @param {Function} callback - Callback function
 * @returns {boolean} True if authenticated
 */
function requireAuth(socket, callback) {
    if (!socket.userId) {
        if (callback) {
            callback({ success: false, error: 'Authentication required' });
        }
        socket.emit('error', {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required for this action'
        });
        return false;
    }
    return true;
}

/**
 * Check if event is throttled
 * @param {number} userId - User ID
 * @param {string} eventType - Event type
 * @returns {boolean} True if throttled
 */
function isEventThrottled(userId, eventType) {
    const key = `${userId}:${eventType}`;
    const lastEvent = eventThrottle.get(key);
    
    if (!lastEvent) {
        return false;
    }

    return Date.now() - lastEvent < FRIENDS_CONFIG.EVENT_THROTTLE;
}

/**
 * Update event throttle
 * @param {number} userId - User ID
 * @param {string} eventType - Event type
 */
function updateEventThrottle(userId, eventType) {
    const key = `${userId}:${eventType}`;
    eventThrottle.set(key, Date.now());
}

/**
 * Log real-time event
 * @param {string} eventType - Event type
 * @param {number} userId - User ID
 * @param {number} targetUserId - Target user ID
 * @param {string} socketId - Socket ID
 * @param {Object} eventData - Event data
 */
async function logRealtimeEvent(eventType, userId, targetUserId, socketId, eventData) {
    try {
        const { getDb } = require('../database/connection');
        const db = getDb();
        
        await db.query(`
            INSERT INTO realtime_events_log (
                event_type, user_id, target_user_id, socket_id, event_data, success
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            eventType,
            userId,
            targetUserId,
            socketId,
            JSON.stringify(eventData),
            true
        ]);

    } catch (error) {
        console.error('❌ Error logging realtime event:', error);
    }
}

/**
 * Shutdown enhanced friends events
 */
function shutdownEnhancedFriendsEvents() {
    console.log('🛑 Shutting down enhanced friends events...');
    
    connectionManager.shutdown();
    notificationManager.shutdown();
    presenceManager.shutdown();
    activityManager.shutdown();
    
    console.log('✅ Enhanced friends events shutdown complete');
}

module.exports = {
    initializeEnhancedFriendsEvents,
    shutdownEnhancedFriendsEvents,
    broadcastToUser,
    broadcastFriendListUpdate
};
