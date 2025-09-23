/**
 * ==============================================
 * MIVTON OFFLINE NOTIFICATIONS SYSTEM
 * Handles friend requests for offline users
 * ==============================================
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for notifications
const notificationsRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: {
        error: 'Too many notification requests',
        code: 'NOTIFICATIONS_RATE_LIMIT'
    }
});

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/notifications/unread
 * Get unread notifications for the current user
 */
router.get('/unread', notificationsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10, type } = req.query;
        
        console.log(`📱 Getting unread notifications for user ${userId}`);
        
        let query = `
            SELECT 
                fn.id,
                fn.type,
                fn.message,
                fn.data,
                fn.created_at,
                u.id as sender_id,
                u.username as sender_username,
                u.full_name as sender_full_name
            FROM friend_notifications fn
            LEFT JOIN users u ON fn.sender_id = u.id
            WHERE fn.user_id = $1 
            AND fn.is_read = FALSE
        `;
        
        const params = [userId];
        
        if (type) {
            query += ` AND fn.type = $${params.length + 1}`;
            params.push(type);
        }
        
        query += ` ORDER BY fn.created_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));
        
        const db = getDb();
        const result = await db.query(query, params);
        
        // Process notifications to add parsed data
        const notifications = result.rows.map(notification => {
            let parsedData = null;
            
            if (notification.data) {
                try {
                    // Check if data is already an object
                    if (typeof notification.data === 'object') {
                        parsedData = notification.data;
                    } else if (typeof notification.data === 'string') {
                        parsedData = JSON.parse(notification.data);
                    }
                } catch (parseError) {
                    console.warn(`⚠️ Failed to parse notification data for ID ${notification.id}:`, parseError);
                    parsedData = null;
                }
            }
            
            return {
                ...notification,
                data: parsedData
            };
        });
        
        console.log(`✅ Retrieved ${notifications.length} unread notifications`);
        
        res.json({
            success: true,
            notifications,
            count: notifications.length
        });
        
    } catch (error) {
        console.error('❌ Error getting unread notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve notifications',
            code: 'GET_NOTIFICATIONS_ERROR'
        });
    }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark a notification as read
 */
router.put('/:notificationId/read', notificationsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = parseInt(req.params.notificationId);
        
        console.log(`✅ Marking notification ${notificationId} as read for user ${userId}`);
        
        if (!notificationId || isNaN(notificationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid notification ID',
                code: 'INVALID_NOTIFICATION_ID'
            });
        }
        
        const db = getDb();
        
        // Update notification as read (only if it belongs to the user)
        const result = await db.query(`
            UPDATE friend_notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND is_read = FALSE
            RETURNING id
        `, [notificationId, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found or already read',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }
        
        console.log(`✅ Notification ${notificationId} marked as read`);
        
        res.json({
            success: true,
            message: 'Notification marked as read',
            notification_id: notificationId
        });
        
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read',
            code: 'MARK_READ_ERROR'
        });
    }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics for the current user
 */
router.get('/stats', notificationsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`📊 Getting notification stats for user ${userId}`);
        
        const db = getDb();
        
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_count,
                COUNT(CASE WHEN type = 'friend_request' AND is_read = FALSE THEN 1 END) as unread_friend_requests,
                COUNT(CASE WHEN type = 'friend_accepted' AND is_read = FALSE THEN 1 END) as unread_friend_accepted,
                COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as notifications_today
            FROM friend_notifications 
            WHERE user_id = $1
        `, [userId]);
        
        const stats = result.rows[0];
        
        console.log(`✅ Retrieved notification stats for user ${userId}`);
        
        res.json({
            success: true,
            stats: {
                total: parseInt(stats.total_notifications) || 0,
                unread: parseInt(stats.unread_count) || 0,
                unread_friend_requests: parseInt(stats.unread_friend_requests) || 0,
                unread_friend_accepted: parseInt(stats.unread_friend_accepted) || 0,
                today: parseInt(stats.notifications_today) || 0
            }
        });
        
    } catch (error) {
        console.error('❌ Error getting notification stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve notification statistics',
            code: 'GET_STATS_ERROR'
        });
    }
});

/**
 * PUT /api/notifications/mark-old-friend-online-read
 * Mark old friend_online notifications as read automatically
 */
router.put('/mark-old-friend-online-read', notificationsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`🧹 Auto-marking old friend_online notifications as read for user ${userId}`);
        
        const db = getDb();
        
        // Mark friend_online notifications older than 2 minutes as read
        const result = await db.query(`
            UPDATE friend_notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 
            AND type = 'friend_online'
            AND is_read = FALSE
            AND created_at < (CURRENT_TIMESTAMP - INTERVAL '2 minutes')
            RETURNING id
        `, [userId]);
        
        const markedCount = result.rows.length;
        
        console.log(`✅ Auto-marked ${markedCount} friend_online notifications as read`);
        
        res.json({
            success: true,
            message: `Marked ${markedCount} old friend_online notifications as read`,
            marked_count: markedCount
        });
        
    } catch (error) {
        console.error('❌ Error auto-marking old notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark old notifications as read',
            code: 'AUTO_MARK_READ_ERROR'
        });
    }
});

/**
 * POST /api/notifications/cleanup-duplicates
 * Clean up duplicate notifications to prevent spam
 */
router.post('/cleanup-duplicates', notificationsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`🧹 Cleaning up duplicate notifications for user ${userId}`);
        
        const db = getDb();
        
        // Find and delete duplicate friend_online notifications
        // Keep only the latest one for each user-sender pair within a time window
        const duplicateCleanup = await db.query(`
            DELETE FROM friend_notifications 
            WHERE user_id = $1 AND id IN (
                SELECT fn1.id
                FROM friend_notifications fn1
                INNER JOIN friend_notifications fn2 ON (
                    fn1.user_id = fn2.user_id 
                    AND fn1.sender_id = fn2.sender_id 
                    AND fn1.type = fn2.type
                    AND fn1.type = 'friend_online'
                    AND fn1.created_at < fn2.created_at
                    AND fn2.created_at - fn1.created_at < INTERVAL '5 minutes'
                )
                WHERE fn1.user_id = $1 AND fn1.id != fn2.id
            )
            RETURNING id
        `, [userId]);
        
        const deletedCount = duplicateCleanup.rows.length;
        
        // Also mark old friend_online notifications as read
        const oldNotificationsUpdate = await db.query(`
            UPDATE friend_notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1
            AND type = 'friend_online' 
            AND created_at < (CURRENT_TIMESTAMP - INTERVAL '1 hour')
            AND is_read = FALSE
            RETURNING id
        `, [userId]);
        
        const markedReadCount = oldNotificationsUpdate.rows.length;
        
        console.log(`✅ Cleaned up ${deletedCount} duplicates and marked ${markedReadCount} as read`);
        
        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} duplicate notifications and marked ${markedReadCount} as read`,
            deleted_count: deletedCount,
            marked_read_count: markedReadCount
        });
        
    } catch (error) {
        console.error('❌ Error cleaning up notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup notifications',
            code: 'CLEANUP_ERROR'
        });
    }
});

module.exports = router;
