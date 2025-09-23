const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');

/**
 * 🚀 MIVTON PHASE 3.1 - SOCIAL NOTIFICATIONS API
 * Real-time notification system for friend activities
 * 
 * Features:
 * - Friend request notifications
 * - Friend status change notifications
 * - Notification management (read/unread)
 * - Bulk notification operations
 * - Mobile-optimized responses
 */

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/social-notifications
 * Get user's social notifications
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            page = 1, 
            limit = 20, 
            type = 'all', 
            unread_only = false 
        } = req.query;

        console.log(`🔔 Getting social notifications for user ${userId}`);

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build dynamic query - SIMPLIFIED VERSION FOR DEBUGGING
        let query = `
            SELECT 
                fn.id,
                fn.type,
                fn.message,
                fn.data,
                fn.is_read,
                fn.created_at,
                fn.read_at,
                fn.sender_id,
                u.username,
                u.full_name,
                u.is_verified,
                u.native_language
            FROM friend_notifications fn
            LEFT JOIN users u ON fn.sender_id = u.id
            WHERE fn.user_id = $1
        `;

        const queryParams = [userId];
        let paramIndex = 2;

        // Add type filter
        if (type !== 'all') {
            const validTypes = ['friend_request', 'friend_accepted', 'friend_declined', 'friend_online', 'friend_offline'];
            if (validTypes.includes(type)) {
                query += ` AND fn.type = $${paramIndex}`;
                queryParams.push(type);
                paramIndex++;
            }
        }

        // Add unread filter
        if (unread_only === 'true' || unread_only === true) {
            query += ` AND fn.is_read = false`;
        }

        // Add ordering and pagination
        query += ` ORDER BY fn.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM friend_notifications fn
            WHERE fn.user_id = $1
        `;
        
        const countParams = [userId];
        let countParamIndex = 2;

        if (type !== 'all') {
            const validTypes = ['friend_request', 'friend_accepted', 'friend_declined', 'friend_online', 'friend_offline'];
            if (validTypes.includes(type)) {
                countQuery += ` AND fn.type = $${countParamIndex}`;
                countParams.push(type);
                countParamIndex++;
            }
        }

        if (unread_only === 'true' || unread_only === true) {
            countQuery += ` AND fn.is_read = false`;
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalNotifications = parseInt(countResult.rows[0].total);

        // Get unread count
        const unreadResult = await pool.query(`
            SELECT COUNT(*) as unread_count
            FROM friend_notifications
            WHERE user_id = $1 AND is_read = false
        `, [userId]);

        const unreadCount = parseInt(unreadResult.rows[0].unread_count);

        // Parse JSON data for each notification and build sender object - with error handling
        const notifications = result.rows.map(notification => {
            let parsedData = null;
            
            // Safely parse JSON data
            if (notification.data) {
                try {
                    // Check if data is already an object (already parsed by PostgreSQL)
                    if (typeof notification.data === 'object') {
                        parsedData = notification.data;
                    } else if (typeof notification.data === 'string') {
                        parsedData = JSON.parse(notification.data);
                    }
                } catch (parseError) {
                    console.warn(`Failed to parse notification data for ID ${notification.id}:`, parseError);
                    parsedData = null;
                }
            }
            
            return {
                ...notification,
                data: parsedData,
                sender: notification.sender_id ? {
                    id: notification.sender_id,
                    username: notification.username,
                    full_name: notification.full_name,
                    is_verified: notification.is_verified,
                    native_language: notification.native_language
                } : null
            };
        });
        
        // Remove the individual sender fields to clean up the response
        notifications.forEach(notif => {
            delete notif.sender_id;
            delete notif.username;
            delete notif.full_name;
            delete notif.is_verified;
            delete notif.native_language;
        });

        console.log(`✅ Retrieved ${notifications.length} notifications for user ${userId}`);

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalNotifications,
                pages: Math.ceil(totalNotifications / parseInt(limit))
            },
            stats: {
                total_notifications: totalNotifications,
                unread_count: unreadCount
            }
        });

    } catch (error) {
        console.error('❌ Error getting social notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve notifications',
            code: 'GET_NOTIFICATIONS_ERROR'
        });
    }
});

/**
 * PUT /api/social-notifications/:notificationId/read
 * Mark a notification as read
 */
router.put('/:notificationId/read', async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = parseInt(req.params.notificationId);

        console.log(`📖 Marking notification ${notificationId} as read for user ${userId}`);

        if (!notificationId || isNaN(notificationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid notification ID',
                code: 'INVALID_NOTIFICATION_ID'
            });
        }

        // Check if notification exists and belongs to user
        const notificationCheck = await pool.query(`
            SELECT id, is_read FROM friend_notifications
            WHERE id = $1 AND user_id = $2
        `, [notificationId, userId]);

        if (notificationCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

        const notification = notificationCheck.rows[0];

        if (notification.is_read) {
            return res.status(409).json({
                success: false,
                error: 'Notification is already read',
                code: 'ALREADY_READ'
            });
        }

        // Mark as read
        await pool.query(`
            UPDATE friend_notifications 
            SET is_read = true, read_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [notificationId]);

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
            error: 'Unable to mark notification as read',
            code: 'MARK_READ_ERROR'
        });
    }
});

/**
 * PUT /api/social-notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/mark-all-read', async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.body;

        console.log(`📚 Marking all notifications as read for user ${userId}`);

        let query = `
            UPDATE friend_notifications 
            SET is_read = true, read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND is_read = false
        `;

        const queryParams = [userId];

        // Add type filter if specified
        if (type && type !== 'all') {
            const validTypes = ['friend_request', 'friend_accepted', 'friend_declined', 'friend_online', 'friend_offline'];
            if (validTypes.includes(type)) {
                query += ` AND type = $2`;
                queryParams.push(type);
            }
        }

        const result = await pool.query(query, queryParams);
        const markedCount = result.rowCount;

        console.log(`✅ Marked ${markedCount} notifications as read`);

        res.json({
            success: true,
            message: `Marked ${markedCount} notifications as read`,
            marked_count: markedCount
        });

    } catch (error) {
        console.error('❌ Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to mark all notifications as read',
            code: 'MARK_ALL_READ_ERROR'
        });
    }
});

/**
 * DELETE /api/social-notifications/:notificationId
 * Delete a notification
 */
router.delete('/:notificationId', async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = parseInt(req.params.notificationId);

        console.log(`🗑️ Deleting notification ${notificationId} for user ${userId}`);

        if (!notificationId || isNaN(notificationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid notification ID',
                code: 'INVALID_NOTIFICATION_ID'
            });
        }

        // Check if notification exists and belongs to user
        const notificationCheck = await pool.query(`
            SELECT id FROM friend_notifications
            WHERE id = $1 AND user_id = $2
        `, [notificationId, userId]);

        if (notificationCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

        // Delete notification
        await pool.query(`
            DELETE FROM friend_notifications 
            WHERE id = $1
        `, [notificationId]);

        console.log(`✅ Notification ${notificationId} deleted successfully`);

        res.json({
            success: true,
            message: 'Notification deleted successfully',
            notification_id: notificationId
        });

    } catch (error) {
        console.error('❌ Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to delete notification',
            code: 'DELETE_NOTIFICATION_ERROR'
        });
    }
});

/**
 * DELETE /api/social-notifications/bulk-delete
 * Delete multiple notifications
 */
router.delete('/bulk-delete', async (req, res) => {
    try {
        const userId = req.user.id;
        const { notification_ids, type, older_than_days } = req.body;

        console.log(`🗑️ Bulk deleting notifications for user ${userId}`);

        let query = `DELETE FROM friend_notifications WHERE user_id = $1`;
        const queryParams = [userId];
        let paramIndex = 2;

        // Delete specific notification IDs
        if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
            const validIds = notification_ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
            
            if (validIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No valid notification IDs provided',
                    code: 'NO_VALID_IDS'
                });
            }

            query += ` AND id = ANY($${paramIndex})`;
            queryParams.push(validIds);
            paramIndex++;
        }

        // Delete by type
        if (type && type !== 'all') {
            const validTypes = ['friend_request', 'friend_accepted', 'friend_declined', 'friend_online', 'friend_offline'];
            if (validTypes.includes(type)) {
                query += ` AND type = $${paramIndex}`;
                queryParams.push(type);
                paramIndex++;
            }
        }

        // Delete notifications older than specified days
        if (older_than_days && !isNaN(parseInt(older_than_days))) {
            const days = parseInt(older_than_days);
            if (days > 0) {
                query += ` AND created_at < (CURRENT_TIMESTAMP - INTERVAL '${days} days')`;
            }
        }

        const result = await pool.query(query, queryParams);
        const deletedCount = result.rowCount;

        console.log(`✅ Bulk deleted ${deletedCount} notifications`);

        res.json({
            success: true,
            message: `Successfully deleted ${deletedCount} notifications`,
            deleted_count: deletedCount
        });

    } catch (error) {
        console.error('❌ Error bulk deleting notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to bulk delete notifications',
            code: 'BULK_DELETE_ERROR'
        });
    }
});

/**
 * GET /api/social-notifications/stats
 * Get notification statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📊 Getting notification stats for user ${userId}`);

        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN fn.is_read = false THEN 1 END) as unread_count,
                COUNT(CASE WHEN fn.type = 'friend_request' THEN 1 END) as friend_requests,
                COUNT(CASE WHEN fn.type = 'friend_accepted' THEN 1 END) as friend_accepted,
                COUNT(CASE WHEN fn.type = 'friend_declined' THEN 1 END) as friend_declined,
                COUNT(CASE WHEN fn.type = 'friend_online' THEN 1 END) as friend_online,
                COUNT(CASE WHEN fn.type = 'friend_offline' THEN 1 END) as friend_offline,
                COUNT(CASE WHEN fn.created_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours') THEN 1 END) as recent_notifications
            FROM friend_notifications fn
            WHERE fn.user_id = $1
        `, [userId]);

        const stats = result.rows[0];

        console.log(`✅ Retrieved notification stats for user ${userId}`);

        res.json({
            success: true,
            stats: {
                total_notifications: parseInt(stats.total_notifications) || 0,
                unread_count: parseInt(stats.unread_count) || 0,
                recent_notifications: parseInt(stats.recent_notifications) || 0,
                by_type: {
                    friend_requests: parseInt(stats.friend_requests) || 0,
                    friend_accepted: parseInt(stats.friend_accepted) || 0,
                    friend_declined: parseInt(stats.friend_declined) || 0,
                    friend_online: parseInt(stats.friend_online) || 0,
                    friend_offline: parseInt(stats.friend_offline) || 0
                }
            }
        });

    } catch (error) {
        console.error('❌ Error getting notification stats:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve notification statistics',
            code: 'GET_NOTIFICATION_STATS_ERROR'
        });
    }
});

/**
 * GET /api/social-notifications/unread-count
 * Get unread notifications count (for real-time updates)
 */
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await pool.query(`
            SELECT 
                COUNT(*) as unread_count,
                COUNT(CASE WHEN fn.type = 'friend_request' THEN 1 END) as unread_friend_requests
            FROM friend_notifications fn
            WHERE fn.user_id = $1 AND fn.is_read = false
        `, [userId]);

        const stats = result.rows[0];

        res.json({
            success: true,
            unread_count: parseInt(stats.unread_count) || 0,
            unread_friend_requests: parseInt(stats.unread_friend_requests) || 0
        });

    } catch (error) {
        console.error('❌ Error getting unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve unread count',
            code: 'GET_UNREAD_COUNT_ERROR'
        });
    }
});

/**
 * POST /api/social-notifications/test
 * Create test notification (development only)
 */
router.post('/test', async (req, res) => {
    try {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Test notifications not allowed in production',
                code: 'PRODUCTION_MODE'
            });
        }

        const userId = req.user.id;
        const { type = 'friend_request', message = 'Test notification' } = req.body;

        console.log(`🧪 Creating test notification for user ${userId}`);

        const result = await pool.query(`
            INSERT INTO friend_notifications (user_id, type, message, data)
            VALUES ($1, $2, $3, $4)
            RETURNING id, created_at
        `, [
            userId,
            type,
            message,
            JSON.stringify({
                test: true,
                created_by: 'test_endpoint',
                timestamp: new Date().toISOString()
            })
        ]);

        const notification = result.rows[0];

        console.log(`✅ Test notification ${notification.id} created`);

        res.json({
            success: true,
            message: 'Test notification created',
            notification: {
                id: notification.id,
                type,
                message,
                created_at: notification.created_at
            }
        });

    } catch (error) {
        console.error('❌ Error creating test notification:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to create test notification',
            code: 'CREATE_TEST_NOTIFICATION_ERROR'
        });
    }
});

module.exports = router;
