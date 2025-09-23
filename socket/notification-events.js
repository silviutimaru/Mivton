/**
 * 🚀 MIVTON PHASE 3.2 - REAL-TIME NOTIFICATION EVENTS
 * Advanced notification system with delivery tracking and preferences
 * 
 * Features:
 * - Real-time notification delivery via Socket.IO
 * - Delivery status tracking
 * - User notification preferences
 * - Retry mechanism for failed deliveries
 * - Notification batching and throttling
 */

const { getDb } = require('../database/connection');
const { connectionManager } = require('./connection-manager');

/**
 * Notification configuration
 */
const NOTIFICATION_CONFIG = {
    MAX_BATCH_SIZE: 50,
    DELIVERY_TIMEOUT: 5000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    THROTTLE_WINDOW: 1000, // 1 second
    MAX_NOTIFICATIONS_PER_USER: 100
};

/**
 * Notification types and their default settings
 */
const NOTIFICATION_TYPES = {
    friend_request: {
        default_enabled: true,
        sound: true,
        desktop: true,
        email: false
    },
    friend_accepted: {
        default_enabled: true,
        sound: true,
        desktop: true,
        email: false
    },
    friend_online: {
        default_enabled: true,
        sound: false,
        desktop: false,
        email: false
    },
    friend_offline: {
        default_enabled: false,
        sound: false,
        desktop: false,
        email: false
    },
    friend_message: {
        default_enabled: true,
        sound: true,
        desktop: true,
        email: false
    },
    friend_removed: {
        default_enabled: true,
        sound: false,
        desktop: true,
        email: false
    },
    user_blocked: {
        default_enabled: false,
        sound: false,
        desktop: false,
        email: false
    }
};

/**
 * Real-time notification event manager
 */
class NotificationEventManager {
    constructor() {
        this.deliveryQueue = new Map(); // userId -> Array of notifications
        this.throttleMap = new Map();   // userId -> last notification time
        this.processingQueue = false;
        this.queueInterval = null;
    }

    /**
     * Initialize notification event manager
     * @param {SocketIO.Server} io - Socket.IO server instance
     */
    initialize(io) {
        console.log('🔄 Initializing notification event manager...');
        
        this.io = io;
        this.startQueueProcessor();
        
        console.log('✅ Notification event manager initialized');
    }

    /**
     * Send real-time notification to user
     * @param {number} userId - Target user ID
     * @param {Object} notification - Notification data
     * @returns {Promise<boolean>} True if delivered successfully
     */
    async sendNotification(userId, notification) {
        try {
            // Check if user preferences allow this notification
            const preferences = await this.getUserPreferences(userId, notification.type);
            if (!preferences.enabled) {
                console.log(`🔕 Notification ${notification.type} disabled for user ${userId}`);
                return false;
            }

            // Check throttling
            if (this.isThrottled(userId)) {
                this.addToQueue(userId, notification);
                return true;
            }

            // Get user's socket connections
            const userSockets = connectionManager.getUserSockets(userId);
            if (userSockets.size === 0) {
                console.log(`📴 User ${userId} not online, storing notification for later`);
                await this.storeNotification(userId, notification);
                return false;
            }

            // Prepare notification with preferences
            const enrichedNotification = {
                ...notification,
                id: await this.storeNotification(userId, notification),
                timestamp: new Date().toISOString(),
                preferences: {
                    sound: preferences.sound_enabled,
                    desktop: preferences.desktop_enabled
                }
            };

            // Send to all user's sockets
            let deliveredCount = 0;
            const deliveryPromises = [];

            for (const socketId of userSockets) {
                const promise = this.deliverToSocket(socketId, enrichedNotification);
                deliveryPromises.push(promise);
            }

            // Wait for all deliveries
            const results = await Promise.allSettled(deliveryPromises);
            deliveredCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

            // Log delivery
            await this.logDelivery(enrichedNotification.id, userId, 'socket', 
                deliveredCount > 0 ? 'delivered' : 'failed', Array.from(userSockets));

            // Update throttle
            this.updateThrottle(userId);

            console.log(`📤 Notification sent to user ${userId}: ${notification.type} (${deliveredCount}/${userSockets.size} sockets)`);
            
            return deliveredCount > 0;

        } catch (error) {
            console.error('❌ Error sending notification:', error);
            return false;
        }
    }

    /**
     * Deliver notification to specific socket
     * @param {string} socketId - Socket ID
     * @param {Object} notification - Notification data
     * @returns {Promise<boolean>} True if delivered
     */
    async deliverToSocket(socketId, notification) {
        return new Promise((resolve) => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (!socket) {
                resolve(false);
                return;
            }

            const timeout = setTimeout(() => {
                resolve(false);
            }, NOTIFICATION_CONFIG.DELIVERY_TIMEOUT);

            socket.emit('notification', notification, (ack) => {
                clearTimeout(timeout);
                resolve(ack === 'received');
            });
        });
    }

    /**
     * Send batch notification to multiple users
     * @param {Array<number>} userIds - Array of user IDs
     * @param {Object} notification - Notification data
     * @returns {Promise<Object>} Delivery results
     */
    async sendBatchNotification(userIds, notification) {
        try {
            console.log(`📤 Sending batch notification to ${userIds.length} users: ${notification.type}`);

            const results = {
                total: userIds.length,
                delivered: 0,
                failed: 0,
                queued: 0
            };

            // Process in batches to avoid overwhelming the system
            const batches = this.chunkArray(userIds, NOTIFICATION_CONFIG.MAX_BATCH_SIZE);

            for (const batch of batches) {
                const batchPromises = batch.map(userId => 
                    this.sendNotification(userId, { ...notification })
                );

                const batchResults = await Promise.allSettled(batchPromises);
                
                batchResults.forEach(result => {
                    if (result.status === 'fulfilled') {
                        if (result.value) {
                            results.delivered++;
                        } else {
                            results.queued++;
                        }
                    } else {
                        results.failed++;
                    }
                });

                // Small delay between batches
                if (batches.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log(`✅ Batch notification complete:`, results);
            return results;

        } catch (error) {
            console.error('❌ Error sending batch notification:', error);
            throw error;
        }
    }

    /**
     * Send friend request notification
     * @param {number} receiverId - Receiver user ID
     * @param {number} senderId - Sender user ID
     * @param {number} requestId - Friend request ID
     * @param {Object} senderInfo - Sender information
     */
    async sendFriendRequestNotification(receiverId, senderId, requestId, senderInfo) {
        const notification = {
            type: 'friend_request',
            title: 'New Friend Request',
            message: `${senderInfo.full_name} sent you a friend request`,
            data: {
                sender_id: senderId,
                request_id: requestId,
                sender: senderInfo
            },
            actions: [
                { type: 'accept', label: 'Accept' },
                { type: 'decline', label: 'Decline' }
            ]
        };

        return await this.sendNotification(receiverId, notification);
    }

    /**
     * Send friend accepted notification
     * @param {number} senderId - Original sender ID
     * @param {number} accepterId - User who accepted
     * @param {Object} accepterInfo - Accepter information
     */
    async sendFriendAcceptedNotification(senderId, accepterId, accepterInfo) {
        const notification = {
            type: 'friend_accepted',
            title: 'Friend Request Accepted',
            message: `${accepterInfo.full_name} accepted your friend request`,
            data: {
                accepter_id: accepterId,
                accepter: accepterInfo
            }
        };

        return await this.sendNotification(senderId, notification);
    }

    /**
     * Send friend online notification
     * @param {Array<number>} friendIds - Array of friend IDs
     * @param {number} userId - User who came online
     * @param {Object} userInfo - User information
     */
    async sendFriendOnlineNotification(friendIds, userId, userInfo) {
        const notification = {
            type: 'friend_online',
            title: 'Friend Online',
            message: `${userInfo.full_name} is now online`,
            data: {
                user_id: userId,
                friend: userInfo // Use 'friend' key to match client expectations
            }
        };

        // Send the standard notification
        const result = await this.sendBatchNotification(friendIds, notification);
        
        // Also emit specific friend online events for real-time UI updates
        await this.emitFriendOnlineEvents(friendIds, userId, userInfo);
        
        return result;
    }
    
    /**
     * Emit specific friend online events for real-time updates
     * @param {Array<number>} friendIds - Array of friend IDs
     * @param {number} userId - User who came online
     * @param {Object} userInfo - User information
     */
    async emitFriendOnlineEvents(friendIds, userId, userInfo) {
        try {
            const eventData = {
                friend: {
                    id: userId,
                    username: userInfo.username,
                    full_name: userInfo.full_name
                },
                timestamp: new Date().toISOString()
            };
            
            // Send to each friend's sockets
            for (const friendId of friendIds) {
                const userSockets = connectionManager.getUserSockets(friendId);
                
                for (const socketId of userSockets) {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        // Emit multiple event types for different handlers
                        socket.emit('notification:friend_online', eventData);
                        socket.emit('notification:friend_came_online', eventData);
                        socket.emit('friend:online_status_changed', {
                            user_id: userId,
                            status: 'online',
                            ...eventData
                        });
                    }
                }
            }
            
            console.log(`📡 Emitted friend online events for user ${userId} to ${friendIds.length} friends`);
            
        } catch (error) {
            console.error('❌ Error emitting friend online events:', error);
        }
    }

    /**
     * Get user notification preferences
     * @param {number} userId - User ID
     * @param {string} notificationType - Notification type
     * @returns {Promise<Object>} User preferences
     */
    async getUserPreferences(userId, notificationType) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT * FROM notification_preferences 
                WHERE user_id = $1 AND notification_type = $2
            `, [userId, notificationType]);

            if (result.rows.length > 0) {
                return result.rows[0];
            }

            // Return default preferences if not found
            const defaultPrefs = NOTIFICATION_TYPES[notificationType] || {
                default_enabled: true,
                sound: false,
                desktop: false,
                email: false
            };

            return {
                enabled: defaultPrefs.default_enabled,
                sound_enabled: defaultPrefs.sound,
                desktop_enabled: defaultPrefs.desktop,
                email_enabled: defaultPrefs.email,
                delivery_methods: ['socket', 'database']
            };

        } catch (error) {
            console.error('❌ Error getting user preferences:', error);
            return {
                enabled: true,
                sound_enabled: false,
                desktop_enabled: false,
                email_enabled: false,
                delivery_methods: ['socket', 'database']
            };
        }
    }

    /**
     * Store notification in database with deduplication
     * @param {number} userId - User ID
     * @param {Object} notification - Notification data
     * @returns {Promise<number>} Notification ID
     */
    async storeNotification(userId, notification) {
        try {
            const db = getDb();
            const senderId = notification.data?.sender_id || notification.data?.user_id || null;
            
            // For friend_online notifications, check if there's a recent unread one
            if (notification.type === 'friend_online' && senderId) {
                const existingCheck = await db.query(`
                    SELECT id FROM friend_notifications
                    WHERE user_id = $1 
                    AND sender_id = $2 
                    AND type = 'friend_online'
                    AND is_read = FALSE
                    AND created_at > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
                    LIMIT 1
                `, [userId, senderId]);

                if (existingCheck.rows.length > 0) {
                    console.log(`🔄 Updating existing friend_online notification instead of creating new one`);
                    
                    // Update the existing notification timestamp
                    await db.query(`
                        UPDATE friend_notifications 
                        SET created_at = CURRENT_TIMESTAMP, message = $3
                        WHERE id = $1 AND user_id = $2
                    `, [existingCheck.rows[0].id, userId, notification.message]);
                    
                    return existingCheck.rows[0].id;
                }
            }
            
            const result = await db.query(`
                INSERT INTO friend_notifications (
                    user_id, sender_id, type, message, data, is_read
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [
                userId,
                senderId,
                notification.type,
                notification.message,
                JSON.stringify(notification.data || {}),
                false
            ]);

            console.log(`✅ Created notification ${result.rows[0].id} for user ${userId}: ${notification.type}`);
            return result.rows[0].id;

        } catch (error) {
            console.error('❌ Error storing notification:', error);
            throw error;
        }
    }

    /**
     * Log notification delivery
     * @param {number} notificationId - Notification ID
     * @param {number} userId - User ID
     * @param {string} method - Delivery method
     * @param {string} status - Delivery status
     * @param {Array<string>} socketIds - Socket IDs used
     */
    async logDelivery(notificationId, userId, method, status, socketIds = []) {
        try {
            const db = getDb();
            
            await db.query(`
                INSERT INTO notification_delivery (
                    notification_id, user_id, delivery_method, 
                    delivery_status, socket_id
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                notificationId,
                userId,
                method,
                status,
                socketIds.length > 0 ? socketIds[0] : null
            ]);

        } catch (error) {
            console.error('❌ Error logging delivery:', error);
        }
    }

    /**
     * Check if user is throttled
     * @param {number} userId - User ID
     * @returns {boolean} True if throttled
     */
    isThrottled(userId) {
        const lastNotification = this.throttleMap.get(userId);
        if (!lastNotification) {
            return false;
        }

        return Date.now() - lastNotification < NOTIFICATION_CONFIG.THROTTLE_WINDOW;
    }

    /**
     * Update throttle timestamp
     * @param {number} userId - User ID
     */
    updateThrottle(userId) {
        this.throttleMap.set(userId, Date.now());
    }

    /**
     * Add notification to queue
     * @param {number} userId - User ID
     * @param {Object} notification - Notification data
     */
    addToQueue(userId, notification) {
        if (!this.deliveryQueue.has(userId)) {
            this.deliveryQueue.set(userId, []);
        }

        const queue = this.deliveryQueue.get(userId);
        if (queue.length < NOTIFICATION_CONFIG.MAX_NOTIFICATIONS_PER_USER) {
            queue.push(notification);
        }
    }

    /**
     * Start queue processor
     */
    startQueueProcessor() {
        this.queueInterval = setInterval(() => {
            this.processQueue();
        }, NOTIFICATION_CONFIG.THROTTLE_WINDOW);
    }

    /**
     * Process queued notifications
     */
    async processQueue() {
        if (this.processingQueue || this.deliveryQueue.size === 0) {
            return;
        }

        this.processingQueue = true;

        try {
            for (const [userId, notifications] of this.deliveryQueue) {
                if (notifications.length === 0) {
                    this.deliveryQueue.delete(userId);
                    continue;
                }

                if (!this.isThrottled(userId)) {
                    const notification = notifications.shift();
                    await this.sendNotification(userId, notification);

                    if (notifications.length === 0) {
                        this.deliveryQueue.delete(userId);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error processing notification queue:', error);
        } finally {
            this.processingQueue = false;
        }
    }

    /**
     * Get unread notifications for user
     * @param {number} userId - User ID
     * @param {number} limit - Maximum notifications to return
     * @returns {Promise<Array>} Array of notifications
     */
    async getUnreadNotifications(userId, limit = 50) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT * FROM v_unread_notifications
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            `, [userId, limit]);

            return result.rows;

        } catch (error) {
            console.error('❌ Error getting unread notifications:', error);
            return [];
        }
    }

    /**
     * Mark notification as read
     * @param {number} notificationId - Notification ID
     * @param {number} userId - User ID
     * @returns {Promise<boolean>} True if marked as read
     */
    async markAsRead(notificationId, userId) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                UPDATE friend_notifications 
                SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2 AND is_read = FALSE
                RETURNING id
            `, [notificationId, userId]);

            if (result.rows.length > 0) {
                // Emit real-time update
                const userSockets = connectionManager.getUserSockets(userId);
                for (const socketId of userSockets) {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        socket.emit('notification:read', { id: notificationId });
                    }
                }
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            return false;
        }
    }

    /**
     * Utility function to chunk array
     * @param {Array} array - Array to chunk
     * @param {number} size - Chunk size
     * @returns {Array} Chunked array
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Shutdown notification manager
     */
    shutdown() {
        console.log('🛑 Shutting down notification event manager...');
        
        if (this.queueInterval) {
            clearInterval(this.queueInterval);
        }
        
        console.log('✅ Notification event manager shutdown complete');
    }
}

// Export singleton instance
const notificationManager = new NotificationEventManager();

module.exports = {
    notificationManager,
    NOTIFICATION_TYPES,
    NOTIFICATION_CONFIG
};
