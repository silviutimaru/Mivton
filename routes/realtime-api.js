/**
 * 🚀 MIVTON PHASE 3.2 - REAL-TIME API ROUTES
 * RESTful API endpoints for real-time features management
 * 
 * Features:
 * - Real-time statistics and monitoring
 * - Notification management
 * - Presence status management
 * - Activity feed API
 * - Socket connection monitoring
 */

const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { connectionManager } = require('../socket/connection-manager');
const { notificationManager } = require('../socket/notification-events');
const { presenceManager } = require('../socket/presence-events');
const { activityManager } = require('../socket/activity-events');

// Rate limiting for real-time API
const realtimeRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        error: 'Too many real-time API requests. Please try again later.',
        code: 'REALTIME_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `realtime_${req.user?.id || req.ip}`
});

// Apply rate limiting and authentication
router.use(realtimeRateLimit);
router.use(requireAuth);

// ================================
// REAL-TIME STATISTICS
// ================================

/**
 * GET /api/realtime/stats
 * Get real-time system statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`📊 Getting real-time stats for user ${userId}`);

        // Get connection statistics
        const connectionStats = connectionManager.getStats();

        // Get presence statistics
        const db = pool.getDb();
        const presenceResult = await db.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN status = 'online' THEN 1 END) as online_users,
                COUNT(CASE WHEN status = 'away' THEN 1 END) as away_users,
                COUNT(CASE WHEN status = 'busy' THEN 1 END) as busy_users,
                COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_users
            FROM user_presence
        `);

        // Get notification statistics
        const notificationResult = await db.query(`
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_notifications,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_notifications
            FROM friend_notifications
            WHERE user_id = $1
        `, [userId]);

        // Get activity statistics
        const activityResult = await db.query(`
            SELECT 
                COUNT(*) as total_activities,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_activities
            FROM friend_activity_feed
            WHERE user_id = $1 AND is_visible = TRUE
        `, [userId]);

        const stats = {
            connections: connectionStats,
            presence: presenceResult.rows[0],
            notifications: notificationResult.rows[0],
            activities: activityResult.rows[0],
            user_online: connectionManager.isUserOnline(userId),
            timestamp: new Date().toISOString()
        };

        console.log(`✅ Real-time stats retrieved for user ${userId}`);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Error getting real-time stats:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve real-time statistics',
            code: 'REALTIME_STATS_ERROR'
        });
    }
});

// ================================
// NOTIFICATION MANAGEMENT
// ================================

/**
 * GET /api/realtime/notifications
 * Get user's notifications with pagination and filtering
 */
router.get('/notifications', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 50, unread_only = false, type } = req.query;

        console.log(`📋 Getting notifications for user ${userId}`);

        const db = pool.getDb();
        
        let query = `
            SELECT 
                fn.*,
                u.username as sender_username,
                u.full_name as sender_full_name,
                u.is_verified as sender_verified,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'method', nd.delivery_method,
                            'status', nd.delivery_status,
                            'delivered_at', nd.delivered_at
                        )
                        ORDER BY nd.delivered_at
                    ) FILTER (WHERE nd.id IS NOT NULL),
                    '[]'::json
                ) as delivery_history
            FROM friend_notifications fn
            LEFT JOIN users u ON u.id = fn.sender_id
            LEFT JOIN notification_delivery nd ON nd.notification_id = fn.id
            WHERE fn.user_id = $1
        `;

        const queryParams = [userId];
        let paramIndex = 2;

        if (unread_only === 'true') {
            query += ` AND fn.is_read = FALSE`;
        }

        if (type) {
            query += ` AND fn.type = $${paramIndex}`;
            queryParams.push(type);
            paramIndex++;
        }

        query += ` GROUP BY fn.id, u.username, u.full_name, u.is_verified`;
        query += ` ORDER BY fn.created_at DESC`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(parseInt(limit), offset);

        const result = await db.query(query, queryParams);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM friend_notifications fn
            WHERE user_id = $1
            ${unread_only === 'true' ? 'AND is_read = FALSE' : ''}
            ${type ? 'AND type = $2' : ''}
        `;
        const countParams = type ? [userId, type] : [userId];
        const countResult = await db.query(countQuery, countParams);

        const notifications = result.rows;
        const total = parseInt(countResult.rows[0].total);

        console.log(`✅ Retrieved ${notifications.length} notifications for user ${userId}`);

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ Error getting notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve notifications',
            code: 'NOTIFICATIONS_FETCH_ERROR'
        });
    }
});

/**
 * PUT /api/realtime/notifications/:id/read
 * Mark notification as read
 */
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = parseInt(req.params.id);

        if (!notificationId || isNaN(notificationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid notification ID',
                code: 'INVALID_NOTIFICATION_ID'
            });
        }

        console.log(`📖 Marking notification ${notificationId} as read for user ${userId}`);

        const marked = await notificationManager.markAsRead(notificationId, userId);

        if (marked) {
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Notification not found or already read',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to mark notification as read',
            code: 'MARK_READ_ERROR'
        });
    }
});

/**
 * PUT /api/realtime/notifications/read-all
 * Mark all notifications as read
 */
router.put('/notifications/read-all', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📖 Marking all notifications as read for user ${userId}`);

        const db = pool.getDb();
        
        const result = await db.query(`
            UPDATE friend_notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING id
        `, [userId]);

        const markedCount = result.rows.length;

        // Broadcast update to user's sockets
        const userSockets = connectionManager.getUserSockets(userId);
        for (const socketId of userSockets) {
            const socket = global.io?.sockets?.sockets?.get(socketId);
            if (socket) {
                socket.emit('notifications:all_read', { count: markedCount });
            }
        }

        console.log(`✅ Marked ${markedCount} notifications as read for user ${userId}`);

        res.json({
            success: true,
            message: `${markedCount} notifications marked as read`,
            count: markedCount
        });

    } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to mark notifications as read',
            code: 'MARK_ALL_READ_ERROR'
        });
    }
});

// ================================
// PRESENCE MANAGEMENT
// ================================

/**
 * GET /api/realtime/presence/friends
 * Get friends' presence status
 */
router.get('/presence/friends', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`👥 Getting friends presence for user ${userId}`);

        const friendsPresence = await presenceManager.getFriendsPresence(userId);

        console.log(`✅ Retrieved presence for ${friendsPresence.length} friends`);

        res.json({
            success: true,
            friends: friendsPresence,
            count: friendsPresence.length
        });

    } catch (error) {
        console.error('❌ Error getting friends presence:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friends presence',
            code: 'PRESENCE_FETCH_ERROR'
        });
    }
});

/**
 * PUT /api/realtime/presence/status
 * Update user presence status
 */
router.put('/presence/status', async (req, res) => {
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

        console.log(`🔄 Updating presence for user ${userId}: ${status}`);

        const updated = await presenceManager.updateUserPresence(userId, status, activity_message);

        if (updated) {
            res.json({
                success: true,
                message: 'Presence updated successfully',
                status,
                activity_message
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Unable to update presence',
                code: 'PRESENCE_UPDATE_FAILED'
            });
        }

    } catch (error) {
        console.error('❌ Error updating presence:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update presence status',
            code: 'PRESENCE_UPDATE_ERROR'
        });
    }
});

// ================================
// ACTIVITY FEED
// ================================

/**
 * GET /api/realtime/activity/feed
 * Get user's activity feed
 */
router.get('/activity/feed', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            page = 1, 
            limit = 50, 
            activity_type,
            since 
        } = req.query;

        console.log(`📋 Getting activity feed for user ${userId}`);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const activities = await activityManager.getActivityFeed(userId, {
            limit: parseInt(limit),
            offset,
            activity_type,
            since
        });

        // Get total count for pagination
        const db = pool.getDb();
        let countQuery = `
            SELECT COUNT(*) as total
            FROM friend_activity_feed faf
            WHERE faf.user_id = $1 AND faf.is_visible = TRUE
        `;
        const countParams = [userId];

        if (activity_type) {
            countQuery += ` AND faf.activity_type = $2`;
            countParams.push(activity_type);
        }

        if (since) {
            countQuery += ` AND faf.created_at > $${countParams.length + 1}`;
            countParams.push(since);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        console.log(`✅ Retrieved ${activities.length} activities for user ${userId}`);

        res.json({
            success: true,
            activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ Error getting activity feed:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve activity feed',
            code: 'ACTIVITY_FEED_ERROR'
        });
    }
});

/**
 * PUT /api/realtime/activity/:id/hide
 * Hide activity from feed
 */
router.put('/activity/:id/hide', async (req, res) => {
    try {
        const userId = req.user.id;
        const activityId = parseInt(req.params.id);

        if (!activityId || isNaN(activityId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid activity ID',
                code: 'INVALID_ACTIVITY_ID'
            });
        }

        console.log(`🙈 Hiding activity ${activityId} for user ${userId}`);

        const hidden = await activityManager.hideActivity(userId, activityId);

        if (hidden) {
            res.json({
                success: true,
                message: 'Activity hidden successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Activity not found',
                code: 'ACTIVITY_NOT_FOUND'
            });
        }

    } catch (error) {
        console.error('❌ Error hiding activity:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to hide activity',
            code: 'HIDE_ACTIVITY_ERROR'
        });
    }
});

// ================================
// SYSTEM MONITORING (Admin/Debug)
// ================================

/**
 * GET /api/realtime/system/health
 * Get real-time system health
 */
router.get('/system/health', async (req, res) => {
    try {
        const userId = req.user.id;

        // Basic health check - can be expanded for admin users
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            user_online: connectionManager.isUserOnline(userId),
            connection_stats: connectionManager.getStats()
        };

        res.json({
            success: true,
            health
        });

    } catch (error) {
        console.error('❌ Error getting system health:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve system health',
            code: 'SYSTEM_HEALTH_ERROR'
        });
    }
});

module.exports = router;
