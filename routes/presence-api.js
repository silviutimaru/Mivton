/**
 * 🚀 MIVTON PHASE 3.2 - PRESENCE API ROUTES
 * User presence and activity status management API
 * 
 * Features:
 * - User presence status management
 * - Friend presence monitoring
 * - Activity status updates
 * - Presence analytics
 * - Bulk presence operations
 */

const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { presenceManager, PRESENCE_STATUSES } = require('../socket/presence-events');
const { connectionManager } = require('../socket/connection-manager');

// Rate limiting for presence API
const presenceRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute (presence updates are frequent)
    message: {
        error: 'Too many presence requests. Please try again later.',
        code: 'PRESENCE_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `presence_${req.user?.id || req.ip}`
});

// Apply rate limiting and authentication
router.use(presenceRateLimit);
router.use(requireAuth);

// ================================
// PRESENCE STATUS MANAGEMENT
// ================================

/**
 * GET /api/presence/status
 * Get current user's presence status
 */
router.get('/status', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`👁️ Getting presence status for user ${userId}`);

        const presence = await presenceManager.getUserPresence(userId);
        const isOnline = connectionManager.isUserOnline(userId);
        const socketCount = connectionManager.getUserSockets(userId).size;

        const response = {
            user_id: userId,
            status: presence.status,
            activity_message: presence.activity_message,
            last_seen: presence.last_seen,
            socket_count: socketCount,
            is_online: isOnline,
            updated_at: presence.updated_at
        };

        console.log(`✅ Presence status retrieved for user ${userId}: ${presence.status}`);

        res.json({
            success: true,
            presence: response
        });

    } catch (error) {
        console.error('❌ Error getting presence status:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve presence status',
            code: 'PRESENCE_STATUS_ERROR'
        });
    }
});

/**
 * PUT /api/presence/status
 * Update user's presence status
 */
router.put('/status', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, activity_message } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required',
                code: 'MISSING_STATUS'
            });
        }

        // Validate status
        if (!Object.values(PRESENCE_STATUSES).includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid presence status',
                code: 'INVALID_STATUS',
                valid_statuses: Object.values(PRESENCE_STATUSES)
            });
        }

        console.log(`🔄 Updating presence status for user ${userId}: ${status}`);

        const updated = await presenceManager.updateUserPresence(userId, status, activity_message);

        if (updated) {
            // Get updated presence
            const presence = await presenceManager.getUserPresence(userId);
            
            res.json({
                success: true,
                message: 'Presence status updated successfully',
                presence: {
                    user_id: userId,
                    status: presence.status,
                    activity_message: presence.activity_message,
                    updated_at: presence.updated_at
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Unable to update presence status',
                code: 'PRESENCE_UPDATE_FAILED'
            });
        }

    } catch (error) {
        console.error('❌ Error updating presence status:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update presence status',
            code: 'PRESENCE_UPDATE_ERROR'
        });
    }
});

// ================================
// FRIENDS PRESENCE
// ================================

/**
 * GET /api/presence/friends
 * Get friends' presence status
 */
router.get('/friends', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status_filter, limit = 100 } = req.query;

        console.log(`👥 Getting friends presence for user ${userId}`);

        let friendsPresence = await presenceManager.getFriendsPresence(userId);

        // Apply status filter if provided
        if (status_filter && Object.values(PRESENCE_STATUSES).includes(status_filter)) {
            friendsPresence = friendsPresence.filter(friend => friend.presence_status === status_filter);
        }

        // Apply limit
        if (parseInt(limit) > 0) {
            friendsPresence = friendsPresence.slice(0, parseInt(limit));
        }

        // Add socket information
        const enrichedPresence = friendsPresence.map(friend => ({
            ...friend,
            socket_count: connectionManager.getUserSockets(friend.friend_id).size,
            is_connected: connectionManager.isUserOnline(friend.friend_id)
        }));

        // Calculate statistics
        const stats = {
            total_friends: friendsPresence.length,
            online: enrichedPresence.filter(f => f.presence_status === 'online').length,
            away: enrichedPresence.filter(f => f.presence_status === 'away').length,
            busy: enrichedPresence.filter(f => f.presence_status === 'busy').length,
            offline: enrichedPresence.filter(f => f.presence_status === 'offline').length
        };

        console.log(`✅ Retrieved presence for ${enrichedPresence.length} friends`);

        res.json({
            success: true,
            friends: enrichedPresence,
            stats,
            filter_applied: status_filter || null
        });

    } catch (error) {
        console.error('❌ Error getting friends presence:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friends presence',
            code: 'FRIENDS_PRESENCE_ERROR'
        });
    }
});

/**
 * GET /api/presence/friends/online
 * Get only online friends
 */
router.get('/friends/online', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`🟢 Getting online friends for user ${userId}`);

        const db = pool.getDb();
        
        const result = await db.query(`
            SELECT 
                vfp.friend_id,
                vfp.friend_username,
                vfp.friend_full_name,
                vfp.presence_status,
                vfp.activity_message,
                vfp.last_seen,
                vfp.socket_count
            FROM v_friend_presence vfp
            WHERE vfp.user_id = $1 
            AND vfp.presence_status = 'online'
            AND vfp.socket_count > 0
            ORDER BY vfp.last_seen DESC
        `, [userId]);

        const onlineFriends = result.rows.map(friend => ({
            ...friend,
            is_connected: true
        }));

        console.log(`✅ Found ${onlineFriends.length} online friends`);

        res.json({
            success: true,
            online_friends: onlineFriends,
            count: onlineFriends.length
        });

    } catch (error) {
        console.error('❌ Error getting online friends:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve online friends',
            code: 'ONLINE_FRIENDS_ERROR'
        });
    }
});

/**
 * GET /api/presence/friends/:friendId
 * Get specific friend's presence
 */
router.get('/friends/:friendId', async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        if (!friendId || isNaN(friendId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid friend ID',
                code: 'INVALID_FRIEND_ID'
            });
        }

        console.log(`👤 Getting presence for friend ${friendId} requested by user ${userId}`);

        // Check if users are friends
        const { areUsersFriends } = require('../utils/friends-utils');
        const areFriends = await areUsersFriends(userId, friendId);

        if (!areFriends) {
            return res.status(403).json({
                success: false,
                error: 'You can only view presence of your friends',
                code: 'NOT_FRIENDS'
            });
        }

        const db = pool.getDb();
        
        const result = await db.query(`
            SELECT 
                vfp.friend_id,
                vfp.friend_username,
                vfp.friend_full_name,
                vfp.presence_status,
                vfp.activity_message,
                vfp.last_seen,
                vfp.socket_count
            FROM v_friend_presence vfp
            WHERE vfp.user_id = $1 AND vfp.friend_id = $2
        `, [userId, friendId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Friend presence not found',
                code: 'FRIEND_PRESENCE_NOT_FOUND'
            });
        }

        const friendPresence = {
            ...result.rows[0],
            is_connected: connectionManager.isUserOnline(friendId),
            socket_count: connectionManager.getUserSockets(friendId).size
        };

        console.log(`✅ Retrieved presence for friend ${friendId}: ${friendPresence.presence_status}`);

        res.json({
            success: true,
            friend_presence: friendPresence
        });

    } catch (error) {
        console.error('❌ Error getting friend presence:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friend presence',
            code: 'FRIEND_PRESENCE_ERROR'
        });
    }
});

// ================================
// PRESENCE ANALYTICS
// ================================

/**
 * GET /api/presence/analytics
 * Get presence analytics and patterns
 */
router.get('/analytics', async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 7 } = req.query;

        console.log(`📊 Getting presence analytics for user ${userId} (${days} days)`);

        const db = pool.getDb();
        
        // Get presence history (if we track it)
        const historyResult = await db.query(`
            SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                event_type,
                COUNT(*) as count
            FROM realtime_events_log
            WHERE user_id = $1 
            AND event_type IN ('socket_connected', 'socket_disconnected', 'presence_updated')
            AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
            GROUP BY DATE_TRUNC('hour', created_at), event_type
            ORDER BY hour DESC
        `, [userId]);

        // Get current session statistics
        const sessionResult = await db.query(`
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_sessions,
                AVG(EXTRACT(EPOCH FROM (COALESCE(last_activity, NOW()) - connected_at))/3600) as avg_session_hours,
                MAX(last_activity) as last_activity
            FROM socket_sessions
            WHERE user_id = $1
            AND connected_at > NOW() - INTERVAL '${parseInt(days)} days'
        `, [userId]);

        // Get friends online statistics
        const friendsResult = await db.query(`
            SELECT 
                COUNT(*) as total_friends,
                COUNT(CASE WHEN vfp.presence_status = 'online' THEN 1 END) as friends_online,
                COUNT(CASE WHEN vfp.presence_status = 'away' THEN 1 END) as friends_away,
                COUNT(CASE WHEN vfp.presence_status = 'busy' THEN 1 END) as friends_busy,
                COUNT(CASE WHEN vfp.presence_status = 'offline' THEN 1 END) as friends_offline
            FROM v_friend_presence vfp
            WHERE vfp.user_id = $1
        `, [userId]);

        const analytics = {
            user_sessions: sessionResult.rows[0],
            friends_presence: friendsResult.rows[0],
            activity_history: historyResult.rows,
            period_days: parseInt(days),
            current_status: await presenceManager.getUserPresence(userId),
            generated_at: new Date().toISOString()
        };

        console.log(`✅ Generated presence analytics for user ${userId}`);

        res.json({
            success: true,
            analytics
        });

    } catch (error) {
        console.error('❌ Error getting presence analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve presence analytics',
            code: 'PRESENCE_ANALYTICS_ERROR'
        });
    }
});

// ================================
// PRESENCE MANAGEMENT
// ================================

/**
 * POST /api/presence/sync
 * Force presence synchronization
 */
router.post('/sync', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`🔄 Force syncing presence for user ${userId}`);

        // Sync user presence
        await presenceManager.syncUserPresence(userId);

        // Get updated presence
        const presence = await presenceManager.getUserPresence(userId);
        const isOnline = connectionManager.isUserOnline(userId);

        res.json({
            success: true,
            message: 'Presence synchronized successfully',
            presence: {
                user_id: userId,
                status: presence.status,
                activity_message: presence.activity_message,
                socket_count: presence.socket_count,
                is_online: isOnline,
                last_seen: presence.last_seen,
                updated_at: presence.updated_at
            }
        });

    } catch (error) {
        console.error('❌ Error syncing presence:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to sync presence',
            code: 'PRESENCE_SYNC_ERROR'
        });
    }
});

/**
 * GET /api/presence/history
 * Get presence change history
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 7, limit = 100 } = req.query;

        console.log(`📜 Getting presence history for user ${userId}`);

        const db = pool.getDb();
        
        const result = await db.query(`
            SELECT 
                event_type,
                event_data,
                success,
                created_at
            FROM realtime_events_log
            WHERE user_id = $1 
            AND event_type IN ('presence_updated', 'socket_connected', 'socket_disconnected')
            AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
            ORDER BY created_at DESC
            LIMIT $2
        `, [userId, parseInt(limit)]);

        const history = result.rows.map(event => ({
            type: event.event_type,
            data: event.event_data,
            success: event.success,
            timestamp: event.created_at
        }));

        console.log(`✅ Retrieved ${history.length} presence history events`);

        res.json({
            success: true,
            history,
            period_days: parseInt(days),
            count: history.length
        });

    } catch (error) {
        console.error('❌ Error getting presence history:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve presence history',
            code: 'PRESENCE_HISTORY_ERROR'
        });
    }
});

/**
 * GET /api/presence/available-statuses
 * Get available presence statuses
 */
router.get('/available-statuses', (req, res) => {
    try {
        const statuses = Object.entries(PRESENCE_STATUSES).map(([key, value]) => ({
            key,
            value,
            description: getStatusDescription(value)
        }));

        res.json({
            success: true,
            statuses
        });

    } catch (error) {
        console.error('❌ Error getting available statuses:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve available statuses',
            code: 'STATUSES_ERROR'
        });
    }
});

/**
 * Get status description
 * @param {string} status - Status value
 * @returns {string} Status description
 */
function getStatusDescription(status) {
    const descriptions = {
        [PRESENCE_STATUSES.ONLINE]: 'Available and active',
        [PRESENCE_STATUSES.AWAY]: 'Away from keyboard',
        [PRESENCE_STATUSES.BUSY]: 'Do not disturb',
        [PRESENCE_STATUSES.OFFLINE]: 'Not available',
        [PRESENCE_STATUSES.INVISIBLE]: 'Appear offline to others'
    };

    return descriptions[status] || 'Unknown status';
}

module.exports = router;
