/**
 * User API Routes
 * Essential user management endpoints for chat system
 */

const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for user operations
const userRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 user requests per minute
    message: {
        error: 'Too many user requests. Please try again later.',
        code: 'USER_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `user_${req.user?.id || req.ip}`
});

// Apply rate limiting and authentication
router.use(userRateLimit);
router.use(requireAuth);

/**
 * GET /api/user/me
 * Get current user information (REQUIRED FOR CHAT SYSTEM)
 */
router.get('/me', async (req, res) => {
    try {
        const currentUserId = req.user.id;

        console.log(`👤 Getting user info for: ${currentUserId}`);

        // Get user information
        const result = await query(
            `SELECT id, username, email, full_name, gender, native_language, 
                    is_verified, is_admin, admin_level, status, last_login, created_at
             FROM users 
             WHERE id = $1`,
            [currentUserId]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                gender: user.gender,
                nativeLanguage: user.native_language,
                isVerified: user.is_verified,
                isAdmin: user.is_admin,
                adminLevel: user.admin_level,
                status: user.status,
                lastLogin: user.last_login,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('❌ Error getting user info:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/user/:userId
 * Get specific user information
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        console.log(`👤 Getting user info for: ${userId}`);

        // Get user information (public fields only)
        const result = await query(
            `SELECT id, username, full_name, gender, native_language, 
                    is_verified, status, created_at
             FROM users 
             WHERE id = $1`,
            [parseInt(userId)]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                gender: user.gender,
                nativeLanguage: user.native_language,
                isVerified: user.is_verified,
                status: user.status,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('❌ Error getting user info:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PUT /api/user/status
 * Update user status
 */
router.put('/status', async (req, res) => {
    try {
        const { status } = req.body;
        const currentUserId = req.user.id;

        const validStatuses = ['online', 'offline', 'away', 'busy'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Valid status is required (online, offline, away, busy)'
            });
        }

        console.log(`📱 Updating user status: ${currentUserId} -> ${status}`);

        // Update user status
        await query(
            `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [status, currentUserId]
        );

        res.json({
            success: true,
            message: 'Status updated successfully',
            status: status
        });

    } catch (error) {
        console.error('❌ Error updating user status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/user/friends
 * Get user's friends list
 */
router.get('/friends', async (req, res) => {
    try {
        const currentUserId = req.user.id;

        console.log(`👥 Getting friends for user: ${currentUserId}`);

        // Get friends list
        const result = await query(
            `SELECT f.friend_id, u.username, u.full_name, u.status, u.last_login
             FROM friendships f
             LEFT JOIN users u ON u.id = f.friend_id
             WHERE f.user_id = $1 AND f.status = 'accepted'
             ORDER BY u.status DESC, u.full_name ASC`,
            [currentUserId]
        );

        res.json({
            success: true,
            friends: result.rows.map(friend => ({
                id: friend.friend_id,
                username: friend.username,
                fullName: friend.full_name,
                status: friend.status,
                lastLogin: friend.last_login
            })),
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Error getting friends:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/user/online-friends
 * Get user's online friends
 */
router.get('/online-friends', async (req, res) => {
    try {
        const currentUserId = req.user.id;

        console.log(`🟢 Getting online friends for user: ${currentUserId}`);

        // Get online friends
        const result = await query(
            `SELECT f.friend_id, u.username, u.full_name, u.status, u.last_login
             FROM friendships f
             LEFT JOIN users u ON u.id = f.friend_id
             WHERE f.user_id = $1 AND f.status = 'accepted' AND u.status = 'online'
             ORDER BY u.full_name ASC`,
            [currentUserId]
        );

        res.json({
            success: true,
            friends: result.rows.map(friend => ({
                id: friend.friend_id,
                username: friend.username,
                fullName: friend.full_name,
                status: friend.status,
                lastLogin: friend.last_login
            })),
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Error getting online friends:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
