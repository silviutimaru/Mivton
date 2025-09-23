/**
 * 🚀 MIVTON PHASE 3.2 - PRESENCE EVENTS SYSTEM
 * Real-time user presence broadcasting and management
 * 
 * Features:
 * - Real-time presence status updates
 * - Friend presence notifications
 * - Activity status management
 * - Presence synchronization
 * - Efficient friend list updates
 */

const { getDb } = require('../database/connection');
const { connectionManager } = require('./connection-manager');
const { notificationManager } = require('./notification-events');

/**
 * Presence configuration
 */
const PRESENCE_CONFIG = {
    ONLINE_THRESHOLD: 5 * 60 * 1000,    // 5 minutes in milliseconds
    AWAY_THRESHOLD: 30 * 60 * 1000,     // 30 minutes in milliseconds
    UPDATE_THROTTLE: 5000,              // 5 seconds between presence updates
    BATCH_SIZE: 50,                     // Maximum friends to notify at once
    PRESENCE_SYNC_INTERVAL: 60000       // 1 minute presence sync
};

/**
 * Valid presence statuses
 */
const PRESENCE_STATUSES = {
    ONLINE: 'online',
    AWAY: 'away',
    BUSY: 'busy',
    OFFLINE: 'offline',
    INVISIBLE: 'invisible'
};

/**
 * Presence events manager
 */
class PresenceEventManager {
    constructor() {
        this.presenceCache = new Map();     // userId -> presence info
        this.lastUpdateMap = new Map();     // userId -> last update timestamp
        this.syncInterval = null;
        this.lastSchemaWarning = null;      // Track when we last warned about missing schema
    }

    /**
     * Initialize presence event manager
     * @param {SocketIO.Server} io - Socket.IO server instance
     */
    initialize(io) {
        console.log('🔄 Initializing presence event manager...');
        
        this.io = io;
        
        // Start presence sync after a delay to avoid blocking server startup
        setTimeout(() => {
            this.startPresenceSync();
        }, 2000);
        
        console.log('✅ Presence event manager initialized');
    }

    /**
     * Update user presence status
     * @param {number} userId - User ID
     * @param {string} status - Presence status
     * @param {string} activityMessage - Optional activity message
     * @returns {Promise<boolean>} True if updated successfully
     */
    async updateUserPresence(userId, status, activityMessage = null) {
        try {
            // Validate status
            if (!Object.values(PRESENCE_STATUSES).includes(status)) {
                console.error(`❌ Invalid presence status: ${status}`);
                return false;
            }

            // Check throttling
            if (this.isUpdateThrottled(userId)) {
                return false;
            }

            // Get current presence
            const currentPresence = await this.getUserPresence(userId);
            const hasChanged = currentPresence.status !== status || 
                             currentPresence.activity_message !== activityMessage;

            if (!hasChanged) {
                return false;
            }

            // Update in database
            const db = getDb();
            await db.query(`
                INSERT INTO user_presence (user_id, status, activity_message, last_seen, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    status = $2,
                    activity_message = $3,
                    last_seen = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            `, [userId, status, activityMessage]);

            // Update cache
            this.presenceCache.set(userId, {
                status,
                activity_message: activityMessage,
                last_seen: new Date(),
                updated_at: new Date()
            });

            // Update throttle
            this.lastUpdateMap.set(userId, Date.now());

            // Broadcast to friends
            await this.broadcastPresenceUpdate(userId, status, activityMessage, currentPresence.status);

            console.log(`🔄 Updated presence for user ${userId}: ${status}`);
            return true;

        } catch (error) {
            console.error('❌ Error updating user presence:', error);
            return false;
        }
    }

    /**
     * Handle user coming online
     * @param {number} userId - User ID
     * @param {Object} userInfo - User information
     */
    async handleUserOnline(userId, userInfo = null) {
        try {
            // Update presence to online
            await this.updateUserPresence(userId, PRESENCE_STATUSES.ONLINE);

            // Get user info if not provided
            if (!userInfo) {
                userInfo = await this.getUserInfo(userId);
            }

            // Get user's friends
            const friends = await this.getUserFriends(userId);
            
            if (friends.length > 0) {
                // Send online notification to friends (if they have it enabled)
                await notificationManager.sendFriendOnlineNotification(
                    friends.map(f => f.id), 
                    userId, 
                    userInfo
                );

                // Broadcast presence update to friends' sockets
                await this.broadcastToFriends(friends, 'friend:online', {
                    friend_id: userId,
                    friend: userInfo,
                    status: PRESENCE_STATUSES.ONLINE,
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`🟢 User ${userId} came online, notified ${friends.length} friends`);

        } catch (error) {
            console.error('❌ Error handling user online:', error);
        }
    }

    /**
     * Handle user going offline
     * @param {number} userId - User ID
     * @param {Object} userInfo - User information
     */
    async handleUserOffline(userId, userInfo = null) {
        try {
            // Update presence to offline
            await this.updateUserPresence(userId, PRESENCE_STATUSES.OFFLINE);

            // Get user info if not provided
            if (!userInfo) {
                userInfo = await this.getUserInfo(userId);
            }

            // Get user's friends
            const friends = await this.getUserFriends(userId);
            
            if (friends.length > 0) {
                // Broadcast presence update to friends' sockets
                await this.broadcastToFriends(friends, 'friend:offline', {
                    friend_id: userId,
                    friend: userInfo,
                    status: PRESENCE_STATUSES.OFFLINE,
                    timestamp: new Date().toISOString()
                });
            }

            // Remove from cache
            this.presenceCache.delete(userId);

            console.log(`🔴 User ${userId} went offline, notified ${friends.length} friends`);

        } catch (error) {
            console.error('❌ Error handling user offline:', error);
        }
    }

    /**
     * Broadcast presence update to friends
     * @param {number} userId - User ID
     * @param {string} newStatus - New presence status
     * @param {string} activityMessage - Activity message
     * @param {string} oldStatus - Previous status
     */
    async broadcastPresenceUpdate(userId, newStatus, activityMessage, oldStatus) {
        try {
            // Don't broadcast if status is invisible
            if (newStatus === PRESENCE_STATUSES.INVISIBLE) {
                return;
            }

            // Get user info and friends
            const [userInfo, friends] = await Promise.all([
                this.getUserInfo(userId),
                this.getUserFriends(userId)
            ]);

            if (friends.length === 0) {
                return;
            }

            // Create presence update event
            const presenceUpdate = {
                friend_id: userId,
                friend: userInfo,
                status: newStatus,
                activity_message: activityMessage,
                previous_status: oldStatus,
                timestamp: new Date().toISOString()
            };

            // Broadcast to friends
            await this.broadcastToFriends(friends, 'friend:presence:update', presenceUpdate);

            // Send specific notifications for status changes
            if (oldStatus === PRESENCE_STATUSES.OFFLINE && newStatus === PRESENCE_STATUSES.ONLINE) {
                // Send "came online" notification
                await this.broadcastToFriends(friends, 'friend:came_online', {
                    friend: userInfo,
                    activity_message: activityMessage,
                    timestamp: new Date().toISOString()
                });
            } else if (newStatus === PRESENCE_STATUSES.OFFLINE && oldStatus !== PRESENCE_STATUSES.OFFLINE) {
                // Send "went offline" notification
                await this.broadcastToFriends(friends, 'friend:went_offline', {
                    friend: userInfo,
                    timestamp: new Date().toISOString()
                });
            } else if (oldStatus !== newStatus) {
                // Send general status change notification
                await this.broadcastToFriends(friends, 'friend:status:changed', {
                    user_id: userId,
                    friend: userInfo,
                    old_status: oldStatus,
                    new_status: newStatus,
                    activity_message: activityMessage,
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`📡 Broadcasted presence update for user ${userId} to ${friends.length} friends`);

        } catch (error) {
            console.error('❌ Error broadcasting presence update:', error);
        }
    }

    /**
     * Get user's current presence
     * @param {number} userId - User ID
     * @returns {Promise<Object>} User presence data
     */
    async getUserPresence(userId) {
        try {
            // Check cache first
            if (this.presenceCache.has(userId)) {
                return this.presenceCache.get(userId);
            }

            // Get from database
            const db = getDb();
            const result = await db.query(`
                SELECT status, activity_message, last_seen, updated_at, socket_count
                FROM user_presence 
                WHERE user_id = $1
            `, [userId]);

            if (result.rows.length > 0) {
                const presence = result.rows[0];
                
                // Cache the result
                this.presenceCache.set(userId, presence);
                
                return presence;
            }

            // Return default presence if not found
            const defaultPresence = {
                status: PRESENCE_STATUSES.OFFLINE,
                activity_message: null,
                last_seen: new Date(),
                updated_at: new Date(),
                socket_count: 0
            };

            return defaultPresence;

        } catch (error) {
            console.error('❌ Error getting user presence:', error);
            return {
                status: PRESENCE_STATUSES.OFFLINE,
                activity_message: null,
                last_seen: new Date(),
                updated_at: new Date(),
                socket_count: 0
            };
        }
    }

    /**
     * Get friends' presence for a user
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Array of friends with presence
     */
    async getFriendsPresence(userId) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT * FROM v_friend_presence
                WHERE user_id = $1
                ORDER BY 
                    CASE 
                        WHEN presence_status = 'online' THEN 1
                        WHEN presence_status = 'away' THEN 2
                        WHEN presence_status = 'busy' THEN 3
                        ELSE 4
                    END,
                    friend_full_name ASC
            `, [userId]);

            return result.rows;

        } catch (error) {
            console.error('❌ Error getting friends presence:', error);
            return [];
        }
    }

    /**
     * Sync user presence based on socket connections
     * @param {number} userId - User ID
     */
    async syncUserPresence(userId) {
        try {
            const isOnline = connectionManager.isUserOnline(userId);
            const currentPresence = await this.getUserPresence(userId);

            // Update presence based on socket connections
            if (isOnline && currentPresence.status === PRESENCE_STATUSES.OFFLINE) {
                await this.updateUserPresence(userId, PRESENCE_STATUSES.ONLINE);
            } else if (!isOnline && currentPresence.status !== PRESENCE_STATUSES.OFFLINE) {
                await this.updateUserPresence(userId, PRESENCE_STATUSES.OFFLINE);
            }

        } catch (error) {
            console.error(`❌ Error syncing presence for user ${userId}:`, error);
        }
    }

    /**
     * Get user information
     * @param {number} userId - User ID
     * @returns {Promise<Object>} User information
     */
    async getUserInfo(userId) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT id, username, full_name, is_verified, native_language
                FROM users 
                WHERE id = $1
            `, [userId]);

            return result.rows[0] || null;

        } catch (error) {
            console.error('❌ Error getting user info:', error);
            return null;
        }
    }

    /**
     * Get user's friends
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Array of friends
     */
    async getUserFriends(userId) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT friend_id as id, friend_username as username, friend_full_name as full_name
                FROM v_user_friends 
                WHERE user_id = $1
            `, [userId]);

            return result.rows;

        } catch (error) {
            console.error('❌ Error getting user friends:', error);
            return [];
        }
    }

    /**
     * Broadcast event to friends
     * @param {Array} friends - Array of friend objects
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    async broadcastToFriends(friends, event, data) {
        try {
            // Process friends in batches
            const batches = this.chunkArray(friends, PRESENCE_CONFIG.BATCH_SIZE);

            for (const batch of batches) {
                const broadcastPromises = batch.map(friend => {
                    const userSockets = connectionManager.getUserSockets(friend.id);
                    const socketPromises = [];

                    for (const socketId of userSockets) {
                        const socket = this.io.sockets.sockets.get(socketId);
                        if (socket) {
                            socketPromises.push(
                                new Promise(resolve => {
                                    socket.emit(event, data);
                                    resolve();
                                })
                            );
                        }
                    }

                    return Promise.all(socketPromises);
                });

                await Promise.all(broadcastPromises);

                // Small delay between batches
                if (batches.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

        } catch (error) {
            console.error('❌ Error broadcasting to friends:', error);
        }
    }

    /**
     * Check if presence update is throttled
     * @param {number} userId - User ID
     * @returns {boolean} True if throttled
     */
    isUpdateThrottled(userId) {
        const lastUpdate = this.lastUpdateMap.get(userId);
        if (!lastUpdate) {
            return false;
        }

        return Date.now() - lastUpdate < PRESENCE_CONFIG.UPDATE_THROTTLE;
    }

    /**
     * Start presence synchronization interval
     */
    startPresenceSync() {
        this.syncInterval = setInterval(() => {
            this.performPresenceSync();
        }, PRESENCE_CONFIG.PRESENCE_SYNC_INTERVAL);
    }

    /**
     * Perform presence synchronization
     */
    async performPresenceSync() {
        try {
            // Check if schema exists first
            const db = getDb();
            const schemaCheck = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'user_presence'
                )
            `);
            
            if (!schemaCheck.rows[0].exists) {
                // Only log this once per hour to reduce spam
                const now = Date.now();
                if (!this.lastSchemaWarning || now - this.lastSchemaWarning > 3600000) {
                    console.log('⚠️ Skipping presence sync - Phase 3.2 real-time tables not initialized');
                    this.lastSchemaWarning = now;
                }
                return;
            }

            console.log('🔄 Performing presence synchronization...');
            
            // Get users with inconsistent presence
            const result = await db.query(`
                SELECT 
                    up.user_id,
                    up.status,
                    up.socket_count,
                    COUNT(ss.id) as actual_sockets
                FROM user_presence up
                LEFT JOIN socket_sessions ss ON ss.user_id = up.user_id AND ss.is_active = TRUE
                GROUP BY up.user_id, up.status, up.socket_count
                HAVING 
                    (up.status = 'online' AND COUNT(ss.id) = 0) OR
                    (up.status = 'offline' AND COUNT(ss.id) > 0) OR
                    (up.socket_count != COUNT(ss.id))
                LIMIT 100
            `);

            const inconsistentUsers = result.rows;
            
            if (inconsistentUsers.length > 0) {
                console.log(`🔄 Syncing presence for ${inconsistentUsers.length} users`);

                for (const user of inconsistentUsers) {
                    await this.syncUserPresence(user.user_id);
                }
            }

            // Clean cache of offline users
            for (const [userId, presence] of this.presenceCache) {
                if (presence.status === PRESENCE_STATUSES.OFFLINE && 
                    !connectionManager.isUserOnline(userId)) {
                    this.presenceCache.delete(userId);
                }
            }

        } catch (error) {
            console.error('❌ Error in presence sync:', error);
            // Don't throw - let the app continue
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
     * Shutdown presence manager
     */
    shutdown() {
        console.log('🛑 Shutting down presence event manager...');
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        console.log('✅ Presence event manager shutdown complete');
    }
}

// Export singleton instance
const presenceManager = new PresenceEventManager();

module.exports = {
    presenceManager,
    PRESENCE_STATUSES,
    PRESENCE_CONFIG
};
