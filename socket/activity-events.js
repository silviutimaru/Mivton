/**
 * 🚀 MIVTON PHASE 3.2 - ACTIVITY EVENTS SYSTEM
 * Real-time friend activity feed and event streaming
 * 
 * Features:
 * - Live friend activity streaming
 * - Activity feed management
 * - Real-time activity notifications
 * - Activity filtering and preferences
 * - Performance optimized batching
 */

const { getDb } = require('../database/connection');
const { connectionManager } = require('./connection-manager');

/**
 * Activity configuration
 */
const ACTIVITY_CONFIG = {
    MAX_FEED_ITEMS: 100,
    BATCH_SIZE: 25,
    UPDATE_THROTTLE: 2000,      // 2 seconds between activity updates
    CLEANUP_INTERVAL: 300000,   // 5 minutes cleanup interval
    MAX_ACTIVITY_AGE: 7,        // 7 days max activity age
    NOTIFICATION_TYPES: [
        'friend_added',
        'status_changed', 
        'profile_updated',
        'came_online',
        'went_offline',
        'language_changed'
    ]
};

/**
 * Activity events manager
 */
class ActivityEventManager {
    constructor() {
        this.activityCache = new Map();     // userId -> recent activities
        this.lastUpdateMap = new Map();     // userId -> last update timestamp
        this.cleanupInterval = null;
        this.lastSchemaWarning = null;      // Track when we last warned about missing schema
    }

    /**
     * Initialize activity event manager
     * @param {SocketIO.Server} io - Socket.IO server instance
     */
    initialize(io) {
        console.log('🔄 Initializing activity event manager...');
        
        this.io = io;
        this.startCleanupInterval();
        
        console.log('✅ Activity event manager initialized');
    }

    /**
     * Create and broadcast activity event
     * @param {number} actorId - User who performed the activity
     * @param {string} activityType - Type of activity
     * @param {Object} activityData - Activity data
     * @param {Array<number>} targetUserIds - Specific users to notify (optional)
     * @returns {Promise<boolean>} True if created successfully
     */
    async createActivity(actorId, activityType, activityData = {}, targetUserIds = null) {
        try {
            // Validate activity type
            if (!ACTIVITY_CONFIG.NOTIFICATION_TYPES.includes(activityType)) {
                console.error(`❌ Invalid activity type: ${activityType}`);
                return false;
            }

            // Check throttling
            if (this.isActivityThrottled(actorId, activityType)) {
                return false;
            }

            console.log(`📝 Creating activity: ${activityType} for user ${actorId}`);

            // Get actor information
            const actorInfo = await this.getUserInfo(actorId);
            if (!actorInfo) {
                console.error(`❌ Actor info not found for user ${actorId}`);
                return false;
            }

            // Get target users (friends) if not specified
            let friendIds = targetUserIds;
            if (!friendIds) {
                friendIds = await this.getUserFriends(actorId);
            }

            if (friendIds.length === 0) {
                console.log(`ℹ️ No friends to notify for activity ${activityType}`);
                return true;
            }

            // Check if tables exist before storing
            const db = getDb();
            const schemaCheck = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'friend_activity_feed'
                )
            `);
            
            if (!schemaCheck.rows[0].exists) {
                // Only log this once per hour to reduce spam
                const now = Date.now();
                if (!this.lastSchemaWarning || now - this.lastSchemaWarning > 3600000) {
                    console.log('⚠️ friend_activity_feed table not found - Phase 3.2 real-time features not initialized');
                    this.lastSchemaWarning = now;
                }
                return false;
            }

            // Create activity entries in database
            await this.storeActivityEntries(friendIds, actorId, activityType, activityData);

            // Broadcast real-time activity updates
            await this.broadcastActivityUpdate(friendIds, {
                actor_id: actorId,
                actor: actorInfo,
                activity_type: activityType,
                activity_data: activityData,
                timestamp: new Date().toISOString()
            });

            // Update throttle
            this.updateActivityThrottle(actorId, activityType);

            console.log(`✅ Activity ${activityType} created and broadcasted to ${friendIds.length} users`);
            return true;

        } catch (error) {
            console.error('❌ Error creating activity:', error);
            return false;
        }
    }

    /**
     * Get user's activity feed
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of activity items
     */
    async getActivityFeed(userId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                activity_type = null,
                since = null
            } = options;

            console.log(`📋 Getting activity feed for user ${userId}`);

            const db = getDb();
            
            // Check if table exists
            const schemaCheck = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'friend_activity_feed'
                )
            `);
            
            if (!schemaCheck.rows[0].exists) {
                // Only log this once per hour to reduce spam
                const now = Date.now();
                if (!this.lastSchemaWarning || now - this.lastSchemaWarning > 3600000) {
                    console.log('⚠️ friend_activity_feed table not found - Phase 3.2 real-time features not initialized');
                    this.lastSchemaWarning = now;
                }
                return [];
            }
            
            let query = `
                SELECT 
                    faf.id,
                    faf.actor_id,
                    u.username as actor_username,
                    u.full_name as actor_full_name,
                    u.is_verified as actor_verified,
                    faf.activity_type,
                    faf.activity_data,
                    faf.created_at
                FROM friend_activity_feed faf
                JOIN users u ON u.id = faf.actor_id
                WHERE faf.user_id = $1 
                AND faf.is_visible = TRUE
                AND u.is_blocked = FALSE
            `;

            const queryParams = [userId];
            let paramIndex = 2;

            // Add activity type filter
            if (activity_type) {
                query += ` AND faf.activity_type = $${paramIndex}`;
                queryParams.push(activity_type);
                paramIndex++;
            }

            // Add since filter
            if (since) {
                query += ` AND faf.created_at > $${paramIndex}`;
                queryParams.push(since);
                paramIndex++;
            }

            query += `
                ORDER BY faf.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            queryParams.push(limit, offset);

            const result = await db.query(query, queryParams);

            // Process and enrich activity data
            const activities = result.rows.map(activity => ({
                id: activity.id,
                actor: {
                    id: activity.actor_id,
                    username: activity.actor_username,
                    full_name: activity.actor_full_name,
                    is_verified: activity.actor_verified
                },
                activity_type: activity.activity_type,
                activity_data: activity.activity_data,
                created_at: activity.created_at,
                formatted_message: this.formatActivityMessage(activity)
            }));

            console.log(`✅ Retrieved ${activities.length} activities for user ${userId}`);
            return activities;

        } catch (error) {
            console.error('❌ Error getting activity feed:', error);
            return [];
        }
    }

    /**
     * Get real-time activity updates
     * @param {number} userId - User ID
     * @param {string} since - ISO timestamp to get activities since
     * @returns {Promise<Array>} Array of new activities
     */
    async getActivityUpdates(userId, since) {
        try {
            return await this.getActivityFeed(userId, {
                since: since,
                limit: 25
            });

        } catch (error) {
            console.error('❌ Error getting activity updates:', error);
            return [];
        }
    }

    /**
     * Mark activity as read/seen
     * @param {number} userId - User ID
     * @param {number} activityId - Activity ID
     * @returns {Promise<boolean>} True if marked successfully
     */
    async markActivityAsSeen(userId, activityId) {
        try {
            // For now, we don't track individual activity read status
            // This could be extended in the future if needed
            console.log(`👁️ Activity ${activityId} seen by user ${userId}`);
            return true;

        } catch (error) {
            console.error('❌ Error marking activity as seen:', error);
            return false;
        }
    }

    /**
     * Hide activity from feed
     * @param {number} userId - User ID
     * @param {number} activityId - Activity ID
     * @returns {Promise<boolean>} True if hidden successfully
     */
    async hideActivity(userId, activityId) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                UPDATE friend_activity_feed 
                SET is_visible = FALSE
                WHERE id = $1 AND user_id = $2
                RETURNING id
            `, [activityId, userId]);

            if (result.rows.length > 0) {
                // Broadcast update to user's sockets
                const userSockets = connectionManager.getUserSockets(userId);
                for (const socketId of userSockets) {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (socket) {
                        socket.emit('activity:hidden', { activity_id: activityId });
                    }
                }

                console.log(`🙈 Activity ${activityId} hidden for user ${userId}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Error hiding activity:', error);
            return false;
        }
    }

    /**
     * Store activity entries in database
     * @param {Array<number>} userIds - Array of user IDs to create activities for
     * @param {number} actorId - Actor user ID
     * @param {string} activityType - Activity type
     * @param {Object} activityData - Activity data
     */
    async storeActivityEntries(userIds, actorId, activityType, activityData) {
        try {
            const db = getDb();
            
            // Batch insert activity entries
            const values = userIds.map((userId, index) => {
                const paramOffset = index * 4;
                return `($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${paramOffset + 4})`;
            }).join(', ');

            const params = [];
            userIds.forEach(userId => {
                params.push(userId, actorId, activityType, JSON.stringify(activityData));
            });

            const query = `
                INSERT INTO friend_activity_feed (user_id, actor_id, activity_type, activity_data)
                VALUES ${values}
            `;

            await db.query(query, params);

            console.log(`💾 Stored ${userIds.length} activity entries`);

        } catch (error) {
            console.error('❌ Error storing activity entries:', error);
            throw error;
        }
    }

    /**
     * Broadcast activity update to users
     * @param {Array<number>} userIds - Array of user IDs
     * @param {Object} activityData - Activity data to broadcast
     */
    async broadcastActivityUpdate(userIds, activityData) {
        try {
            // Process users in batches
            const batches = this.chunkArray(userIds, ACTIVITY_CONFIG.BATCH_SIZE);

            for (const batch of batches) {
                const broadcastPromises = batch.map(userId => {
                    const userSockets = connectionManager.getUserSockets(userId);
                    const socketPromises = [];

                    for (const socketId of userSockets) {
                        const socket = this.io.sockets.sockets.get(socketId);
                        if (socket) {
                            socketPromises.push(
                                new Promise(resolve => {
                                    socket.emit('activity:new', {
                                        ...activityData,
                                        formatted_message: this.formatActivityMessage({
                                            actor_full_name: activityData.actor.full_name,
                                            activity_type: activityData.activity_type,
                                            activity_data: activityData.activity_data
                                        })
                                    });
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
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            console.log(`📡 Broadcasted activity to ${userIds.length} users`);

        } catch (error) {
            console.error('❌ Error broadcasting activity update:', error);
        }
    }

    /**
     * Format activity message for display
     * @param {Object} activity - Activity object
     * @returns {string} Formatted message
     */
    formatActivityMessage(activity) {
        const actorName = activity.actor_full_name || 'Someone';
        const activityData = activity.activity_data || {};

        switch (activity.activity_type) {
            case 'friend_added':
                const newFriendName = activityData.new_friend?.full_name || 'someone';
                return `${actorName} became friends with ${newFriendName}`;
                
            case 'status_changed':
                const newStatus = activityData.new_status || 'their status';
                return `${actorName} changed their status to ${newStatus}`;
                
            case 'profile_updated':
                return `${actorName} updated their profile`;
                
            case 'came_online':
                return `${actorName} came online`;
                
            case 'went_offline':
                return `${actorName} went offline`;
                
            case 'language_changed':
                const newLanguage = activityData.new_language || 'a new language';
                return `${actorName} is now learning ${newLanguage}`;
                
            default:
                return `${actorName} had some activity`;
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
     * @returns {Promise<Array<number>>} Array of friend IDs
     */
    async getUserFriends(userId) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT friend_id as id
                FROM v_user_friends 
                WHERE user_id = $1
            `, [userId]);

            return result.rows.map(row => row.id);

        } catch (error) {
            console.error('❌ Error getting user friends:', error);
            return [];
        }
    }

    /**
     * Check if activity is throttled
     * @param {number} userId - User ID
     * @param {string} activityType - Activity type
     * @returns {boolean} True if throttled
     */
    isActivityThrottled(userId, activityType) {
        const key = `${userId}:${activityType}`;
        const lastUpdate = this.lastUpdateMap.get(key);
        
        if (!lastUpdate) {
            return false;
        }

        return Date.now() - lastUpdate < ACTIVITY_CONFIG.UPDATE_THROTTLE;
    }

    /**
     * Update activity throttle
     * @param {number} userId - User ID
     * @param {string} activityType - Activity type
     */
    updateActivityThrottle(userId, activityType) {
        const key = `${userId}:${activityType}`;
        this.lastUpdateMap.set(key, Date.now());
    }

    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, ACTIVITY_CONFIG.CLEANUP_INTERVAL);
    }

    /**
     * Perform activity cleanup
     */
    async performCleanup() {
        try {
            // Check if schema exists first
            const db = getDb();
            const schemaCheck = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'friend_activity_feed'
                )
            `);
            
            if (!schemaCheck.rows[0].exists) {
                // Only log this once per hour to reduce spam
                const now = Date.now();
                if (!this.lastSchemaWarning || now - this.lastSchemaWarning > 3600000) {
                    console.log('⚠️ Skipping activity cleanup - Phase 3.2 real-time tables not initialized');
                    this.lastSchemaWarning = now;
                }
                return;
            }

            console.log('🧹 Performing activity cleanup...');
            
            // Delete old activities
            const result = await db.query(`
                DELETE FROM friend_activity_feed 
                WHERE created_at < NOW() - INTERVAL '${ACTIVITY_CONFIG.MAX_ACTIVITY_AGE} days'
            `);

            const deletedCount = result.rowCount;
            
            if (deletedCount > 0) {
                console.log(`🗑️ Cleaned up ${deletedCount} old activities`);
            }

            // Clean up throttle map
            const now = Date.now();
            for (const [key, timestamp] of this.lastUpdateMap) {
                if (now - timestamp > ACTIVITY_CONFIG.UPDATE_THROTTLE * 10) {
                    this.lastUpdateMap.delete(key);
                }
            }

        } catch (error) {
            console.error('❌ Error in activity cleanup:', error);
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
     * Shutdown activity manager
     */
    shutdown() {
        console.log('🛑 Shutting down activity event manager...');
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        console.log('✅ Activity event manager shutdown complete');
    }
}

// Export singleton instance
const activityManager = new ActivityEventManager();

module.exports = {
    activityManager,
    ACTIVITY_CONFIG
};
