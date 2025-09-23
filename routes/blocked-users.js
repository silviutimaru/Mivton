const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

/**
 * 🚀 MIVTON PHASE 3.1 - BLOCKED USERS API
 * Enterprise-grade user blocking system with privacy controls
 * 
 * Features:
 * - Block/unblock users with reasons
 * - Complete privacy protection
 * - Automatic cleanup of relationships
 * - Block list management
 * - Rate limiting and validation
 */

// Rate limiting for blocking operations
const blockingRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 blocking operations per hour per user
    message: {
        error: 'Too many blocking operations. Please try again later.',
        code: 'BLOCKING_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `blocking_${req.user?.id || req.ip}`
});

// All routes require authentication
router.use(requireAuth);
router.use(blockingRateLimit);

/**
 * POST /api/blocked-users
 * Block a user
 */
router.post('/', async (req, res) => {
    try {
        const blockerId = req.user.id;
        const { user_id, reason } = req.body;

        console.log(`🚫 Blocking user ${user_id} for user ${blockerId}`);

        // Validate input
        if (!user_id || isNaN(parseInt(user_id))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                code: 'INVALID_USER_ID'
            });
        }

        const blockedId = parseInt(user_id);

        // Cannot block self
        if (blockerId === blockedId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot block yourself',
                code: 'SELF_BLOCK'
            });
        }

        // Check if user exists
        const userCheck = await pool.query(`
            SELECT id, username, full_name, is_blocked
            FROM users 
            WHERE id = $1
        `, [blockedId]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const userToBlock = userCheck.rows[0];

        // Check if already blocked
        const existingBlock = await pool.query(`
            SELECT id FROM blocked_users 
            WHERE blocker_id = $1 AND blocked_id = $2
        `, [blockerId, blockedId]);

        if (existingBlock.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User is already blocked',
                code: 'ALREADY_BLOCKED'
            });
        }

        // Validate reason length
        if (reason && reason.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Reason is too long (max 100 characters)',
                code: 'REASON_TOO_LONG'
            });
        }

        // Start transaction for complete cleanup
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Add to blocked users
            const blockResult = await client.query(`
                INSERT INTO blocked_users (blocker_id, blocked_id, reason)
                VALUES ($1, $2, $3)
                RETURNING id, created_at
            `, [blockerId, blockedId, reason || null]);

            const newBlock = blockResult.rows[0];

            // Remove friendship if exists (bidirectional)
            await client.query(`
                DELETE FROM friendships 
                WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            `, [blockerId, blockedId]);

            // Cancel any pending friend requests (both directions)
            await client.query(`
                UPDATE friend_requests 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
                AND status = 'pending'
            `, [blockerId, blockedId]);

            // Remove any notifications between users
            await client.query(`
                DELETE FROM friend_notifications 
                WHERE (user_id = $1 AND sender_id = $2) OR (user_id = $2 AND sender_id = $1)
            `, [blockerId, blockedId]);

            // Log the activity
            await client.query(`
                INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                VALUES ($1, $2, 'user_blocked', $3, $4)
            `, [blockerId, blockedId, req.ip, req.get('User-Agent')]);

            await client.query('COMMIT');

            console.log(`✅ User ${blockedId} blocked successfully by user ${blockerId}`);

            res.json({
                success: true,
                message: `${userToBlock.full_name} has been blocked`,
                blocked_user: {
                    id: blockedId,
                    username: userToBlock.username,
                    full_name: userToBlock.full_name
                },
                block: {
                    id: newBlock.id,
                    reason: reason || null,
                    created_at: newBlock.created_at
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error blocking user:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to block user',
            code: 'BLOCK_USER_ERROR'
        });
    }
});

/**
 * DELETE /api/blocked-users/:userId
 * Unblock a user
 */
router.delete('/:userId', async (req, res) => {
    try {
        const blockerId = req.user.id;
        const blockedId = parseInt(req.params.userId);

        console.log(`✅ Unblocking user ${blockedId} for user ${blockerId}`);

        // Validate user ID
        if (!blockedId || isNaN(blockedId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                code: 'INVALID_USER_ID'
            });
        }

        // Check if user is actually blocked
        const blockCheck = await pool.query(`
            SELECT bu.*, u.username, u.full_name
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = $1 AND bu.blocked_id = $2
        `, [blockerId, blockedId]);

        if (blockCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User is not blocked',
                code: 'USER_NOT_BLOCKED'
            });
        }

        const blockedUser = blockCheck.rows[0];

        // Remove block
        await pool.query(`
            DELETE FROM blocked_users 
            WHERE blocker_id = $1 AND blocked_id = $2
        `, [blockerId, blockedId]);

        // Log the activity
        await pool.query(`
            INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
            VALUES ($1, $2, 'user_unblocked', $3, $4)
        `, [blockerId, blockedId, req.ip, req.get('User-Agent')]);

        console.log(`✅ User ${blockedId} unblocked successfully by user ${blockerId}`);

        res.json({
            success: true,
            message: `${blockedUser.full_name} has been unblocked`,
            unblocked_user: {
                id: blockedId,
                username: blockedUser.username,
                full_name: blockedUser.full_name
            }
        });

    } catch (error) {
        console.error('❌ Error unblocking user:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to unblock user',
            code: 'UNBLOCK_USER_ERROR'
        });
    }
});

/**
 * GET /api/blocked-users
 * Get list of blocked users
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, search } = req.query;

        console.log(`📋 Getting blocked users list for user ${userId}`);

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT 
                bu.id as block_id,
                bu.blocked_id as id,
                u.username,
                u.full_name,
                u.native_language,
                u.is_verified,
                bu.reason,
                bu.created_at as blocked_at
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = $1
        `;

        const queryParams = [userId];
        let paramIndex = 2;

        // Add search filter
        if (search && search.trim()) {
            query += ` AND (
                LOWER(u.username) LIKE LOWER($${paramIndex}) 
                OR LOWER(u.full_name) LIKE LOWER($${paramIndex})
            )`;
            queryParams.push(`%${search.trim()}%`);
            paramIndex++;
        }

        query += ` ORDER BY bu.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = $1
        `;

        const countParams = [userId];

        if (search && search.trim()) {
            countQuery += ` AND (
                LOWER(u.username) LIKE LOWER($2) 
                OR LOWER(u.full_name) LIKE LOWER($2)
            )`;
            countParams.push(`%${search.trim()}%`);
        }

        const countResult = await pool.query(countQuery, countParams);
        const totalBlocked = parseInt(countResult.rows[0].total);

        console.log(`✅ Retrieved ${result.rows.length} blocked users`);

        res.json({
            success: true,
            blocked_users: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalBlocked,
                pages: Math.ceil(totalBlocked / parseInt(limit))
            },
            stats: {
                total_blocked: totalBlocked
            }
        });

    } catch (error) {
        console.error('❌ Error getting blocked users:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve blocked users',
            code: 'GET_BLOCKED_USERS_ERROR'
        });
    }
});

/**
 * GET /api/blocked-users/:userId
 * Check if a specific user is blocked
 */
router.get('/:userId', async (req, res) => {
    try {
        const blockerId = req.user.id;
        const userId = parseInt(req.params.userId);

        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                code: 'INVALID_USER_ID'
            });
        }

        console.log(`🔍 Checking if user ${userId} is blocked by user ${blockerId}`);

        const result = await pool.query(`
            SELECT 
                bu.id as block_id,
                bu.reason,
                bu.created_at as blocked_at,
                u.username,
                u.full_name
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = $1 AND bu.blocked_id = $2
        `, [blockerId, userId]);

        const isBlocked = result.rows.length > 0;

        console.log(`✅ User ${userId} block status: ${isBlocked}`);

        res.json({
            success: true,
            is_blocked: isBlocked,
            block_details: isBlocked ? result.rows[0] : null
        });

    } catch (error) {
        console.error('❌ Error checking block status:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to check block status',
            code: 'CHECK_BLOCK_ERROR'
        });
    }
});

/**
 * PUT /api/blocked-users/:userId/reason
 * Update block reason
 */
router.put('/:userId/reason', async (req, res) => {
    try {
        const blockerId = req.user.id;
        const blockedId = parseInt(req.params.userId);
        const { reason } = req.body;

        console.log(`✏️ Updating block reason for user ${blockedId} by user ${blockerId}`);

        // Validate user ID
        if (!blockedId || isNaN(blockedId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                code: 'INVALID_USER_ID'
            });
        }

        // Validate reason length
        if (reason && reason.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Reason is too long (max 100 characters)',
                code: 'REASON_TOO_LONG'
            });
        }

        // Check if user is blocked
        const blockCheck = await pool.query(`
            SELECT bu.*, u.username, u.full_name
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = $1 AND bu.blocked_id = $2
        `, [blockerId, blockedId]);

        if (blockCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User is not blocked',
                code: 'USER_NOT_BLOCKED'
            });
        }

        const blockedUser = blockCheck.rows[0];

        // Update reason
        await pool.query(`
            UPDATE blocked_users 
            SET reason = $1 
            WHERE blocker_id = $2 AND blocked_id = $3
        `, [reason || null, blockerId, blockedId]);

        console.log(`✅ Block reason updated for user ${blockedId}`);

        res.json({
            success: true,
            message: `Block reason updated for ${blockedUser.full_name}`,
            blocked_user: {
                id: blockedId,
                username: blockedUser.username,
                full_name: blockedUser.full_name,
                reason: reason || null
            }
        });

    } catch (error) {
        console.error('❌ Error updating block reason:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update block reason',
            code: 'UPDATE_BLOCK_REASON_ERROR'
        });
    }
});

/**
 * GET /api/blocked-users/stats
 * Get blocking statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📊 Getting blocking stats for user ${userId}`);

        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_blocked,
                COUNT(CASE WHEN bu.created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 1 END) as recent_blocks,
                COUNT(CASE WHEN bu.reason IS NOT NULL THEN 1 END) as blocks_with_reason
            FROM blocked_users bu
            WHERE bu.blocker_id = $1
        `, [userId]);

        const stats = result.rows[0];

        // Get top block reasons
        const reasonsResult = await pool.query(`
            SELECT 
                bu.reason,
                COUNT(*) as count
            FROM blocked_users bu
            WHERE bu.blocker_id = $1
            AND bu.reason IS NOT NULL
            AND bu.reason != ''
            GROUP BY bu.reason
            ORDER BY count DESC
            LIMIT 5
        `, [userId]);

        console.log(`✅ Retrieved blocking stats for user ${userId}`);

        res.json({
            success: true,
            stats: {
                total_blocked: parseInt(stats.total_blocked) || 0,
                recent_blocks: parseInt(stats.recent_blocks) || 0,
                blocks_with_reason: parseInt(stats.blocks_with_reason) || 0,
                top_reasons: reasonsResult.rows
            }
        });

    } catch (error) {
        console.error('❌ Error getting blocking stats:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve blocking statistics',
            code: 'GET_BLOCKING_STATS_ERROR'
        });
    }
});

/**
 * POST /api/blocked-users/bulk-unblock
 * Unblock multiple users at once
 */
router.post('/bulk-unblock', async (req, res) => {
    try {
        const blockerId = req.user.id;
        const { user_ids } = req.body;

        console.log(`🔓 Bulk unblocking users for user ${blockerId}`);

        // Validate input
        if (!Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user IDs array',
                code: 'INVALID_USER_IDS'
            });
        }

        // Limit bulk operations
        if (user_ids.length > 50) {
            return res.status(400).json({
                success: false,
                error: 'Cannot unblock more than 50 users at once',
                code: 'BULK_LIMIT_EXCEEDED'
            });
        }

        // Validate all IDs are numbers
        const validIds = user_ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
        
        if (validIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid user IDs provided',
                code: 'NO_VALID_IDS'
            });
        }

        // Get currently blocked users from the list
        const blockedCheck = await pool.query(`
            SELECT bu.blocked_id, u.username, u.full_name
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = $1 AND bu.blocked_id = ANY($2)
        `, [blockerId, validIds]);

        if (blockedCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'None of the specified users are blocked',
                code: 'NO_BLOCKED_USERS'
            });
        }

        const blockedUserIds = blockedCheck.rows.map(row => row.blocked_id);

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Remove blocks
            await client.query(`
                DELETE FROM blocked_users 
                WHERE blocker_id = $1 AND blocked_id = ANY($2)
            `, [blockerId, blockedUserIds]);

            // Log activities
            for (const blockedId of blockedUserIds) {
                await client.query(`
                    INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                    VALUES ($1, $2, 'user_unblocked', $3, $4)
                `, [blockerId, blockedId, req.ip, req.get('User-Agent')]);
            }

            await client.query('COMMIT');

            console.log(`✅ Bulk unblocked ${blockedUserIds.length} users for user ${blockerId}`);

            res.json({
                success: true,
                message: `Successfully unblocked ${blockedUserIds.length} users`,
                unblocked_users: blockedCheck.rows.map(row => ({
                    id: row.blocked_id,
                    username: row.username,
                    full_name: row.full_name
                })),
                count: blockedUserIds.length
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error bulk unblocking users:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to bulk unblock users',
            code: 'BULK_UNBLOCK_ERROR'
        });
    }
});

module.exports = router;
