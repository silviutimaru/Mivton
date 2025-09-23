/**
 * 🚀 MIVTON PHASE 3.2 - NOTIFICATION MANAGEMENT API
 * Comprehensive notification system API endpoints
 * 
 * Features:
 * - Notification CRUD operations
 * - Notification preferences management
 * - Delivery tracking and analytics
 * - Batch operations
 * - Performance optimized queries
 */

const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
// Import notification modules with fallback
let notificationManager = null;
let NOTIFICATION_TYPES = {};

try {
    const notificationEvents = require('../socket/notification-events');
    notificationManager = notificationEvents.notificationManager;
    NOTIFICATION_TYPES = notificationEvents.NOTIFICATION_TYPES;
} catch (error) {
    console.warn('⚠️ Notification events module not available, using fallback');
    // Fallback notification types
    NOTIFICATION_TYPES = {
        friend_request: { default_enabled: true, sound: true, desktop: true, email: false },
        friend_accepted: { default_enabled: true, sound: true, desktop: true, email: false },
        friend_online: { default_enabled: true, sound: false, desktop: false, email: false },
        friend_offline: { default_enabled: false, sound: false, desktop: false, email: false },
        friend_message: { default_enabled: true, sound: true, desktop: true, email: false }
    };
}

// Rate limiting for notification API
const notificationRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    message: {
        error: 'Too many notification requests. Please try again later.',
        code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `notifications_${req.user?.id || req.ip}`
});

// Apply rate limiting and authentication
router.use(notificationRateLimit);
router.use(requireAuth);

// ================================
// NOTIFICATION RETRIEVAL
// ================================

/**
 * GET /api/notifications
 * Get user notifications with advanced filtering and pagination
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            page = 1, 
            limit = 50, 
            unread_only = false,
            type,
            sender_id,
            since,
            before,
            include_delivery = false
        } = req.query;

        console.log(`📋 Getting notifications for user ${userId} with filters`);

        // Use the connection pool directly
        const db = pool;
        
        // Build dynamic query
        let query = `
            SELECT 
                fn.id,
                fn.type,
                fn.message,
                fn.data,
                fn.is_read,
                fn.created_at,
                fn.read_at,
                u.id as sender_id,
                u.username as sender_username,
                u.full_name as sender_full_name,
                u.is_verified as sender_verified
        `;

        if (include_delivery === 'true') {
            query += `,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'method', nd.delivery_method,
                            'status', nd.delivery_status,
                            'delivered_at', nd.delivered_at,
                            'error_message', nd.error_message
                        )
                        ORDER BY nd.delivered_at
                    ) FILTER (WHERE nd.id IS NOT NULL),
                    '[]'::json
                ) as delivery_history
            `;
        }

        query += `
            FROM friend_notifications fn
            LEFT JOIN users u ON u.id = fn.sender_id
        `;

        if (include_delivery === 'true') {
            query += ` LEFT JOIN notification_delivery nd ON nd.notification_id = fn.id`;
        }

        query += ` WHERE fn.user_id = $1`;

        const queryParams = [userId];
        let paramIndex = 2;

        // Add filters
        if (unread_only === 'true') {
            query += ` AND fn.is_read = FALSE`;
        }

        if (type) {
            query += ` AND fn.type = $${paramIndex}`;
            queryParams.push(type);
            paramIndex++;
        }

        if (sender_id) {
            query += ` AND fn.sender_id = $${paramIndex}`;
            queryParams.push(parseInt(sender_id));
            paramIndex++;
        }

        if (since) {
            query += ` AND fn.created_at > $${paramIndex}`;
            queryParams.push(since);
            paramIndex++;
        }

        if (before) {
            query += ` AND fn.created_at < $${paramIndex}`;
            queryParams.push(before);
            paramIndex++;
        }

        if (include_delivery === 'true') {
            query += ` GROUP BY fn.id, u.id, u.username, u.full_name, u.is_verified`;
        }

        query += ` ORDER BY fn.created_at DESC`;

        // Add pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(parseInt(limit), offset);

        const result = await db.query(query, queryParams);

        // Get total count
        let countQuery = `
            SELECT COUNT(DISTINCT fn.id) as total
            FROM friend_notifications fn
            LEFT JOIN users u ON u.id = fn.sender_id
            WHERE fn.user_id = $1
        `;
        const countParams = [userId];
        let countParamIndex = 2;

        if (unread_only === 'true') {
            countQuery += ` AND fn.is_read = FALSE`;
        }

        if (type) {
            countQuery += ` AND fn.type = $${countParamIndex}`;
            countParams.push(type);
            countParamIndex++;
        }

        if (sender_id) {
            countQuery += ` AND fn.sender_id = $${countParamIndex}`;
            countParams.push(parseInt(sender_id));
            countParamIndex++;
        }

        if (since) {
            countQuery += ` AND fn.created_at > $${countParamIndex}`;
            countParams.push(since);
            countParamIndex++;
        }

        if (before) {
            countQuery += ` AND fn.created_at < $${countParamIndex}`;
            countParams.push(before);
            countParamIndex++;
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        // Get unread count
        const unreadResult = await db.query(`
            SELECT COUNT(*) as unread_count
            FROM friend_notifications
            WHERE user_id = $1 AND is_read = FALSE
        `, [userId]);

        const unreadCount = parseInt(unreadResult.rows[0].unread_count);

        console.log(`✅ Retrieved ${result.rows.length} notifications for user ${userId}`);

        res.json({
            success: true,
            notifications: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            stats: {
                unread_count: unreadCount,
                total_count: total
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
 * GET /api/notifications/unread/count
 * Get unread notifications count
 */
router.get('/unread/count', async (req, res) => {
    try {
        const userId = req.user.id;

        // Use the connection pool directly
        const db = pool;
        
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_unread,
                COUNT(CASE WHEN type = 'friend_request' THEN 1 END) as friend_requests,
                COUNT(CASE WHEN type = 'friend_accepted' THEN 1 END) as friend_accepted,
                COUNT(CASE WHEN type = 'friend_message' THEN 1 END) as messages,
                COUNT(CASE WHEN type = 'friend_online' THEN 1 END) as friend_online
            FROM friend_notifications
            WHERE user_id = $1 AND is_read = FALSE
        `, [userId]);

        const counts = result.rows[0];

        res.json({
            success: true,
            counts: {
                total_unread: parseInt(counts.total_unread),
                friend_requests: parseInt(counts.friend_requests),
                friend_accepted: parseInt(counts.friend_accepted),
                messages: parseInt(counts.messages),
                friend_online: parseInt(counts.friend_online)
            }
        });

    } catch (error) {
        console.error('❌ Error getting unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to get unread count',
            code: 'UNREAD_COUNT_ERROR'
        });
    }
});

// ================================
// NOTIFICATION ACTIONS
// ================================

/**
 * PUT /api/notifications/:id/read
 * Mark specific notification as read
 */
router.put('/:id/read', async (req, res) => {
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

        // Use database directly for marking as read
        // Use the connection pool directly
        const db = pool;
        
        const result = await db.query(`
            UPDATE friend_notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND is_read = FALSE
            RETURNING id
        `, [notificationId, userId]);

        if (result.rows.length > 0) {
            // Broadcast update to user's sockets if available
            try {
                const { connectionManager } = require('../socket/connection-manager');
                const userSockets = connectionManager.getUserSockets(userId);
                for (const socketId of userSockets) {
                    const socket = global.io?.sockets?.sockets?.get(socketId);
                    if (socket) {
                        socket.emit('notification:read', { id: notificationId });
                    }
                }
            } catch (socketError) {
                // Ignore socket errors - notification was still marked as read
                console.warn('⚠️ Socket broadcast failed:', socketError.message);
            }
            
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
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.body; // Optional: mark only specific type as read

        console.log(`📖 Marking all notifications as read for user ${userId}${type ? ` (type: ${type})` : ''}`);

        // Use the connection pool directly
        const db = pool;
        
        let query = `
            UPDATE friend_notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND is_read = FALSE
        `;
        const params = [userId];

        if (type) {
            query += ` AND type = $2`;
            params.push(type);
        }

        query += ` RETURNING id`;

        const result = await db.query(query, params);
        const markedCount = result.rows.length;

        // Broadcast update to user's sockets if available
        try {
            const { connectionManager } = require('../socket/connection-manager');
            const userSockets = connectionManager.getUserSockets(userId);
            for (const socketId of userSockets) {
                const socket = global.io?.sockets?.sockets?.get(socketId);
                if (socket) {
                    socket.emit('notifications:read_all', { 
                        count: markedCount,
                        type: type || 'all'
                    });
                }
            }
        } catch (socketError) {
            // Ignore socket errors - notifications were still marked as read
            console.warn('⚠️ Socket broadcast failed:', socketError.message);
        }

        console.log(`✅ Marked ${markedCount} notifications as read for user ${userId}`);

        res.json({
            success: true,
            message: `${markedCount} notifications marked as read`,
            count: markedCount,
            type: type || 'all'
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

/**
 * DELETE /api/notifications/:id
 * Delete specific notification
 */
router.delete('/:id', async (req, res) => {
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

        console.log(`🗑️ Deleting notification ${notificationId} for user ${userId}`);

        // Use the connection pool directly
        const db = pool;
        
        const result = await db.query(`
            DELETE FROM friend_notifications 
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [notificationId, userId]);

        if (result.rows.length > 0) {
            // Broadcast update to user's sockets if available
            try {
                const { connectionManager } = require('../socket/connection-manager');
                const userSockets = connectionManager.getUserSockets(userId);
                for (const socketId of userSockets) {
                    const socket = global.io?.sockets?.sockets?.get(socketId);
                    if (socket) {
                        socket.emit('notification:deleted', { 
                            notification_id: notificationId 
                        });
                    }
                }
            } catch (socketError) {
                // Ignore socket errors - notification was still deleted
                console.warn('⚠️ Socket broadcast failed:', socketError.message);
            }

            res.json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Notification not found',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

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
 * POST /api/notifications/batch/read
 * Mark multiple notifications as read
 */
router.post('/batch/read', async (req, res) => {
    try {
        const userId = req.user.id;
        const { notification_ids } = req.body;

        if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid notification IDs array',
                code: 'INVALID_NOTIFICATION_IDS'
            });
        }

        // Validate all IDs are numbers
        const validIds = notification_ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
        
        if (validIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid notification IDs provided',
                code: 'NO_VALID_IDS'
            });
        }

        console.log(`📖 Batch marking ${validIds.length} notifications as read for user ${userId}`);

        // Use the connection pool directly
        const db = pool;
        
        const result = await db.query(`
            UPDATE friend_notifications 
            SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
            WHERE id = ANY($1::int[]) AND user_id = $2 AND is_read = FALSE
            RETURNING id
        `, [validIds, userId]);

        const markedCount = result.rows.length;

        // Broadcast update to user's sockets if available
        try {
            const { connectionManager } = require('../socket/connection-manager');
            const userSockets = connectionManager.getUserSockets(userId);
            for (const socketId of userSockets) {
                const socket = global.io?.sockets?.sockets?.get(socketId);
                if (socket) {
                    socket.emit('notifications:batch_read', { 
                        notification_ids: result.rows.map(row => row.id),
                        count: markedCount
                    });
                }
            }
        } catch (socketError) {
            // Ignore socket errors - notifications were still marked as read
            console.warn('⚠️ Socket broadcast failed:', socketError.message);
        }

        console.log(`✅ Batch marked ${markedCount} notifications as read for user ${userId}`);

        res.json({
            success: true,
            message: `${markedCount} notifications marked as read`,
            count: markedCount,
            processed_ids: result.rows.map(row => row.id)
        });

    } catch (error) {
        console.error('❌ Error batch marking notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to batch mark notifications as read',
            code: 'BATCH_READ_ERROR'
        });
    }
});

// ================================
// NOTIFICATION PREFERENCES
// ================================

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`⚙️ Getting notification preferences for user ${userId}`);

        // Use the connection pool directly
        const db = pool;
        
        const result = await db.query(`
            SELECT 
                notification_type,
                enabled,
                delivery_methods,
                sound_enabled,
                desktop_enabled,
                email_enabled,
                created_at,
                updated_at
            FROM notification_preferences
            WHERE user_id = $1
            ORDER BY notification_type
        `, [userId]);

        // If no preferences exist, create defaults
        if (result.rows.length === 0) {
            console.log(`📝 Creating default notification preferences for user ${userId}`);
            
            const defaultPrefs = Object.keys(NOTIFICATION_TYPES).map(type => ({
                user_id: userId,
                notification_type: type,
                enabled: NOTIFICATION_TYPES[type].default_enabled,
                sound_enabled: NOTIFICATION_TYPES[type].sound,
                desktop_enabled: NOTIFICATION_TYPES[type].desktop,
                email_enabled: NOTIFICATION_TYPES[type].email,
                delivery_methods: JSON.stringify(['socket', 'database'])
            }));

            // Insert default preferences
            for (const pref of defaultPrefs) {
                await db.query(`
                    INSERT INTO notification_preferences (
                        user_id, notification_type, enabled, 
                        sound_enabled, desktop_enabled, email_enabled, delivery_methods
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (user_id, notification_type) DO NOTHING
                `, [
                    pref.user_id, pref.notification_type, pref.enabled,
                    pref.sound_enabled, pref.desktop_enabled, pref.email_enabled,
                    pref.delivery_methods
                ]);
            }

            // Re-fetch preferences
            const newResult = await db.query(`
                SELECT 
                    notification_type,
                    enabled,
                    delivery_methods,
                    sound_enabled,
                    desktop_enabled,
                    email_enabled,
                    created_at,
                    updated_at
                FROM notification_preferences
                WHERE user_id = $1
                ORDER BY notification_type
            `, [userId]);

            res.json({
                success: true,
                preferences: newResult.rows,
                available_types: Object.keys(NOTIFICATION_TYPES)
            });
        } else {
            res.json({
                success: true,
                preferences: result.rows,
                available_types: Object.keys(NOTIFICATION_TYPES)
            });
        }

    } catch (error) {
        console.error('❌ Error getting notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve notification preferences',
            code: 'PREFERENCES_FETCH_ERROR'
        });
    }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', async (req, res) => {
    try {
        const userId = req.user.id;
        const { preferences } = req.body;

        if (!Array.isArray(preferences)) {
            return res.status(400).json({
                success: false,
                error: 'Preferences must be an array',
                code: 'INVALID_PREFERENCES_FORMAT'
            });
        }

        console.log(`⚙️ Updating notification preferences for user ${userId}`);

        // Use the connection pool directly
        const db = pool;
        
        // Validate and update each preference
        const updatedPrefs = [];
        
        for (const pref of preferences) {
            const { 
                notification_type, 
                enabled, 
                sound_enabled, 
                desktop_enabled, 
                email_enabled,
                delivery_methods 
            } = pref;

            // Validate notification type
            if (!Object.keys(NOTIFICATION_TYPES).includes(notification_type)) {
                continue; // Skip invalid types
            }

            // Update preference
            const result = await db.query(`
                INSERT INTO notification_preferences (
                    user_id, notification_type, enabled, 
                    sound_enabled, desktop_enabled, email_enabled, 
                    delivery_methods, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, notification_type) DO UPDATE SET
                    enabled = EXCLUDED.enabled,
                    sound_enabled = EXCLUDED.sound_enabled,
                    desktop_enabled = EXCLUDED.desktop_enabled,
                    email_enabled = EXCLUDED.email_enabled,
                    delivery_methods = EXCLUDED.delivery_methods,
                    updated_at = EXCLUDED.updated_at
                RETURNING *
            `, [
                userId,
                notification_type,
                Boolean(enabled),
                Boolean(sound_enabled),
                Boolean(desktop_enabled),
                Boolean(email_enabled),
                JSON.stringify(delivery_methods || ['socket', 'database'])
            ]);

            updatedPrefs.push(result.rows[0]);
        }

        console.log(`✅ Updated ${updatedPrefs.length} notification preferences for user ${userId}`);

        res.json({
            success: true,
            message: `${updatedPrefs.length} preferences updated successfully`,
            updated_preferences: updatedPrefs
        });

    } catch (error) {
        console.error('❌ Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update notification preferences',
            code: 'PREFERENCES_UPDATE_ERROR'
        });
    }
});

// ================================
// NOTIFICATION ANALYTICS
// ================================

/**
 * GET /api/notifications/analytics
 * Get notification analytics and statistics
 */
router.get('/analytics', async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 30 } = req.query;

        console.log(`📊 Getting notification analytics for user ${userId} (${days} days)`);

        // Use the connection pool directly
        const db = pool;
        
        // Get notification statistics
        const statsResult = await db.query(`
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_notifications,
                COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_notifications,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
                AVG(CASE 
                    WHEN is_read = TRUE AND read_at IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (read_at - created_at))/60 
                END) as avg_read_time_minutes
            FROM friend_notifications
            WHERE user_id = $1 
            AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
        `, [userId]);

        // Get notifications by type
        const typeResult = await db.query(`
            SELECT 
                type,
                COUNT(*) as count,
                COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_count,
                COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_count
            FROM friend_notifications
            WHERE user_id = $1 
            AND created_at > NOW() - INTERVAL '${parseInt(days)} days'
            GROUP BY type
            ORDER BY count DESC
        `, [userId]);

        // Get delivery statistics
        const deliveryResult = await db.query(`
            SELECT 
                nd.delivery_method,
                nd.delivery_status,
                COUNT(*) as count
            FROM friend_notifications fn
            JOIN notification_delivery nd ON nd.notification_id = fn.id
            WHERE fn.user_id = $1 
            AND fn.created_at > NOW() - INTERVAL '${parseInt(days)} days'
            GROUP BY nd.delivery_method, nd.delivery_status
            ORDER BY nd.delivery_method, count DESC
        `, [userId]);

        const analytics = {
            overview: statsResult.rows[0],
            by_type: typeResult.rows,
            delivery_stats: deliveryResult.rows,
            period_days: parseInt(days),
            generated_at: new Date().toISOString()
        };

        console.log(`✅ Generated notification analytics for user ${userId}`);

        res.json({
            success: true,
            analytics
        });

    } catch (error) {
        console.error('❌ Error getting notification analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve notification analytics',
            code: 'ANALYTICS_ERROR'
        });
    }
});

module.exports = router;
