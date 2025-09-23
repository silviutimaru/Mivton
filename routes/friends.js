const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

/**
 * 🚀 MIVTON PHASE 3.1 - FRIENDS MANAGEMENT API
 * Enterprise-grade friends system with rate limiting and validation
 * 
 * Features:
 * - Friend list management with online status
 * - Real-time friend status updates
 * - Search and filter friends
 * - Remove friends with confirmation
 * - Mobile-optimized responses
 */

// Rate limiting for friend operations - more generous limits for better UX
const friendsRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes per user
    message: {
        error: 'Too many friend operations. Please try again in a few minutes.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `friends_${req.user?.id || req.ip}`,
    skip: (req) => {
        // Skip rate limiting for GET requests to friends list (read operations)
        return req.method === 'GET' && req.path === '/';
    }
});

// Apply rate limiting to all routes
router.use(friendsRateLimit);

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/friends
 * Get user's friends list with online status and search
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { search, status, language, page = 1, limit = 20 } = req.query;

        console.log(`📋 Getting friends list for user ${userId}`);

        // Simplified query without dynamic parameter building
        const query = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.status,
                u.native_language,
                u.is_verified,
                u.last_login,
                f.created_at as friendship_created,
                COALESCE(up.last_seen, u.last_login) as last_activity,
                CASE 
                    WHEN up.status = 'online' AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes') 
                    THEN 'online'
                    WHEN up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '30 minutes') 
                    THEN 'away'
                    WHEN u.last_login > (CURRENT_TIMESTAMP - INTERVAL '1 hour') 
                    THEN 'away'
                    ELSE 'offline'
                END as online_status
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.user1_id = $1 THEN u.id = f.user2_id
                    WHEN f.user2_id = $1 THEN u.id = f.user1_id
                END
            )
            LEFT JOIN user_presence up ON up.user_id = u.id
            WHERE (f.user1_id = $1 OR f.user2_id = $1)
            AND f.status = 'active'
            AND u.is_blocked = FALSE
            ORDER BY 
                CASE 
                    WHEN up.status = 'online' AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes') THEN 1
                    WHEN up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '30 minutes') THEN 2
                    ELSE 3
                END,
                COALESCE(up.last_seen, u.last_login) DESC NULLS LAST,
                u.full_name ASC
            LIMIT $2 OFFSET $3
        `;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const queryParams = [userId, parseInt(limit), offset];

        const result = await pool.query(query, queryParams);

        // Get friends count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.user1_id = $1 THEN u.id = f.user2_id
                    WHEN f.user2_id = $1 THEN u.id = f.user1_id
                END
            )
            WHERE (f.user1_id = $1 OR f.user2_id = $1)
            AND f.status = 'active'
            AND u.is_blocked = FALSE
        `;
        const countResult = await pool.query(countQuery, [userId]);
        const totalFriends = parseInt(countResult.rows[0].total);

        // Calculate online friends count
        const onlineCount = result.rows.filter(friend => friend.online_status === 'online').length;

        console.log(`✅ Retrieved ${result.rows.length} friends for user ${userId}`);

        res.json({
            success: true,
            friends: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalFriends,
                pages: Math.ceil(totalFriends / parseInt(limit))
            },
            stats: {
                total_friends: totalFriends,
                online_friends: onlineCount,
                away_friends: result.rows.filter(f => f.online_status === 'away').length,
                offline_friends: result.rows.filter(f => f.online_status === 'offline').length
            }
        });

    } catch (error) {
        console.error('❌ Error getting friends list:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friends list',
            code: 'FRIENDS_FETCH_ERROR'
        });
    }
});

/**
 * GET /api/friends/online
 * Get only online friends (optimized for real-time updates)
 */
router.get('/online', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`🟢 Getting online friends for user ${userId}`);

        const result = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.status,
                COALESCE(up.last_seen, u.last_login) as last_activity,
                'online' as online_status
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.user1_id = $1 THEN u.id = f.user2_id
                    WHEN f.user2_id = $1 THEN u.id = f.user1_id
                END
            )
            LEFT JOIN user_presence up ON up.user_id = u.id
            WHERE (f.user1_id = $1 OR f.user2_id = $1)
            AND f.status = 'active'
            AND u.is_blocked = FALSE
            AND up.status = 'online' 
            AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
            ORDER BY up.last_seen DESC
        `, [userId]);

        console.log(`✅ Found ${result.rows.length} online friends`);

        res.json({
            success: true,
            online_friends: result.rows,
            count: result.rows.length
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
 * DELETE /api/friends/:friendId
 * Remove a friend (bidirectional removal)
 */
router.delete('/:friendId', async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        console.log(`🗑️ Removing friend ${friendId} for user ${userId}`);

        // Validate friend ID
        if (!friendId || isNaN(friendId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid friend ID',
                code: 'INVALID_FRIEND_ID'
            });
        }

        // Check if users are actually friends
        const friendshipCheck = await pool.query(`
            SELECT id FROM friendships 
            WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            AND status = 'active'
        `, [userId, friendId]);

        if (friendshipCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Friendship not found',
                code: 'FRIENDSHIP_NOT_FOUND'
            });
        }

        // Get friend details for logging
        const friendDetails = await pool.query(`
            SELECT username, full_name FROM users WHERE id = $1
        `, [friendId]);

        // Remove friendship (bidirectional)
        await pool.query(`
            DELETE FROM friendships 
            WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
        `, [userId, friendId]);

        // Log the activity
        await pool.query(`
            INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
            VALUES ($1, $2, 'friend_removed', $3, $4)
        `, [userId, friendId, req.ip, req.get('User-Agent')]);

        // Create notification for removed friend
        if (friendDetails.rows.length > 0) {
            await pool.query(`
                INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
                VALUES ($1, $2, 'friend_removed', $3, $4)
            `, [
                friendId, 
                userId, 
                `${req.user.username} removed you as a friend`,
                JSON.stringify({
                    removed_by: {
                        id: userId,
                        username: req.user.username,
                        full_name: req.user.full_name
                    }
                })
            ]);
        }

        console.log(`✅ Friend ${friendId} removed successfully for user ${userId}`);

        res.json({
            success: true,
            message: `Friend ${friendDetails.rows[0]?.full_name || 'User'} removed successfully`,
            removed_friend: {
                id: friendId,
                username: friendDetails.rows[0]?.username,
                full_name: friendDetails.rows[0]?.full_name
            }
        });

    } catch (error) {
        console.error('❌ Error removing friend:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to remove friend',
            code: 'FRIEND_REMOVAL_ERROR'
        });
    }
});

/**
 * GET /api/friends/search
 * Search friends by name or username
 */
router.get('/search', async (req, res) => {
    try {
        const userId = req.user.id;
        const { q: searchQuery, limit = 10 } = req.query;

        if (!searchQuery || searchQuery.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters',
                code: 'INVALID_SEARCH_QUERY'
            });
        }

        console.log(`🔍 Searching friends for user ${userId} with query: "${searchQuery}"`);

        const result = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.status,
                u.native_language,
                u.is_verified,
                COALESCE(up.last_seen, u.last_login) as last_activity,
                CASE 
                    WHEN up.status = 'online' AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes') 
                    THEN 'online'
                    WHEN up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '30 minutes') 
                    THEN 'away'
                    ELSE 'offline'
                END as online_status
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.user1_id = $1 THEN u.id = f.user2_id
                    WHEN f.user2_id = $1 THEN u.id = f.user1_id
                END
            )
            LEFT JOIN user_presence up ON up.user_id = u.id
            WHERE (f.user1_id = $1 OR f.user2_id = $1)
            AND f.status = 'active'
            AND u.is_blocked = FALSE
            AND (
                LOWER(u.username) LIKE LOWER($2) 
                OR LOWER(u.full_name) LIKE LOWER($2)
            )
            ORDER BY 
                CASE 
                    WHEN LOWER(u.username) = LOWER($3) THEN 1
                    WHEN LOWER(u.full_name) = LOWER($3) THEN 2
                    WHEN LOWER(u.username) LIKE LOWER($4) THEN 3
                    WHEN LOWER(u.full_name) LIKE LOWER($4) THEN 4
                    ELSE 5
                END,
                u.full_name ASC
            LIMIT $5
        `, [
            userId,
            `%${searchQuery.trim()}%`,
            searchQuery.trim(),
            `${searchQuery.trim()}%`,
            parseInt(limit)
        ]);

        console.log(`✅ Found ${result.rows.length} matching friends`);

        res.json({
            success: true,
            friends: result.rows,
            search_query: searchQuery.trim(),
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Error searching friends:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to search friends',
            code: 'FRIEND_SEARCH_ERROR'
        });
    }
});

/**
 * GET /api/friends/stats
 * Get friends statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📊 Getting friends stats for user ${userId}`);

        // Get comprehensive stats - simplified query
        const statsQuery = `
            SELECT 
                COUNT(*) as total_friends,
                COUNT(CASE 
                    WHEN up.status = 'online' AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes') 
                    THEN 1 
                END) as online_friends,
                COUNT(CASE 
                    WHEN up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '30 minutes') 
                    AND up.last_seen <= (CURRENT_TIMESTAMP - INTERVAL '5 minutes') 
                    THEN 1 
                END) as away_friends,
                COUNT(CASE 
                    WHEN up.last_seen IS NULL OR up.last_seen <= (CURRENT_TIMESTAMP - INTERVAL '30 minutes') 
                    THEN 1 
                END) as offline_friends,
                COUNT(CASE WHEN u.is_verified = true THEN 1 END) as verified_friends,
                COUNT(CASE WHEN f.created_at > (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 1 END) as recent_friendships
            FROM friendships f
            JOIN users u ON (
                CASE 
                    WHEN f.user1_id = $1 THEN u.id = f.user2_id
                    WHEN f.user2_id = $1 THEN u.id = f.user1_id
                END
            )
            LEFT JOIN user_presence up ON up.user_id = u.id
            WHERE (f.user1_id = $1 OR f.user2_id = $1)
            AND f.status = 'active'
            AND u.is_blocked = FALSE
        `;

        const result = await pool.query(statsQuery, [userId]);
        const stats = result.rows[0];

        console.log(`✅ Retrieved friends stats for user ${userId}`);

        res.json({
            success: true,
            stats: {
                total_friends: parseInt(stats.total_friends) || 0,
                online_friends: parseInt(stats.online_friends) || 0,
                away_friends: parseInt(stats.away_friends) || 0,
                offline_friends: parseInt(stats.offline_friends) || 0,
                verified_friends: parseInt(stats.verified_friends) || 0,
                recent_friendships: parseInt(stats.recent_friendships) || 0,
                language_distribution: []
            }
        });

    } catch (error) {
        console.error('❌ Error getting friends stats:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friends statistics',
            code: 'FRIENDS_STATS_ERROR'
        });
    }
});

/**
 * DELETE /api/friends/:friendId
 * Remove a friend (bidirectional removal with complete cleanup)
 */
router.delete('/:friendId', async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);

        console.log(`🗑️ Removing friend ${friendId} for user ${userId}`);

        // Validate friend ID
        if (!friendId || isNaN(friendId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid friend ID',
                code: 'INVALID_FRIEND_ID'
            });
        }

        // Check if users are actually friends
        const friendshipCheck = await pool.query(`
            SELECT id FROM friendships 
            WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            AND status = 'active'
        `, [userId, friendId]);

        if (friendshipCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Friendship not found',
                code: 'FRIENDSHIP_NOT_FOUND'
            });
        }

        // Get friend details for logging
        const friendDetails = await pool.query(`
            SELECT username, full_name FROM users WHERE id = $1
        `, [friendId]);

        // Start transaction for complete cleanup
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Remove friendship (bidirectional)
            await client.query(`
                DELETE FROM friendships 
                WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            `, [userId, friendId]);

            // 2. CRITICAL FIX: Clean up ALL friend request history between these users
            // This prevents "already accepted" errors when re-adding
            await client.query(`
                DELETE FROM friend_requests 
                WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
            `, [userId, friendId]);

            // 3. Clean up friend-related notifications (keeps history clean)
            await client.query(`
                DELETE FROM friend_notifications 
                WHERE ((user_id = $1 AND sender_id = $2) OR (user_id = $2 AND sender_id = $1))
                AND type IN ('friend_request', 'friend_accepted')
            `, [userId, friendId]);

            // 4. Log the activity
            await client.query(`
                INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                VALUES ($1, $2, 'friend_removed', $3, $4)
            `, [userId, friendId, req.ip, req.get('User-Agent')]);

            // 5. Create removal notification for the removed friend
            if (friendDetails.rows.length > 0) {
                await client.query(`
                    INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
                    VALUES ($1, $2, 'friend_removed', $3, $4)
                `, [
                    friendId, 
                    userId, 
                    `${req.user.username} removed you as a friend`,
                    JSON.stringify({
                        removed_by: {
                            id: userId,
                            username: req.user.username,
                            full_name: req.user.full_name
                        }
                    })
                ]);
            }

            await client.query('COMMIT');

            console.log(`✅ Friend ${friendId} removed completely for user ${userId}`);

            // Send real-time notification about friend removal
            if (global.io) {
                try {
                    const friendSockets = await getSocketsForUser(friendId);
                    const userSockets = await getSocketsForUser(userId);
                    
                    // Notify both users to refresh their friends lists
                    [...friendSockets, ...userSockets].forEach(socketId => {
                        global.io.to(socketId).emit('friend_removed', {
                            removed_user_id: socketId.includes(String(friendId)) ? userId : friendId,
                            timestamp: new Date().toISOString()
                        });
                    });
                } catch (socketError) {
                    console.log('⚠️ Real-time notification failed:', socketError.message);
                }
            }

            res.json({
                success: true,
                message: `Friend ${friendDetails.rows[0]?.full_name || 'User'} removed successfully`,
                removed_friend: {
                    id: friendId,
                    username: friendDetails.rows[0]?.username,
                    full_name: friendDetails.rows[0]?.full_name
                },
                cleanup_performed: {
                    friendship_removed: true,
                    request_history_cleared: true,
                    notifications_cleaned: true
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error removing friend:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to remove friend',
            code: 'FRIEND_REMOVAL_ERROR'
        });
    }
});

/**
 * POST /api/friends/:friendId/block
 * Block a friend (moves to blocked list and removes friendship)
 */
router.post('/:friendId/block', async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = parseInt(req.params.friendId);
        const { reason } = req.body;

        console.log(`🚫 Blocking friend ${friendId} for user ${userId}`);

        // Validate friend ID
        if (!friendId || isNaN(friendId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid friend ID',
                code: 'INVALID_FRIEND_ID'
            });
        }

        // Check if already blocked
        const existingBlock = await pool.query(`
            SELECT id FROM blocked_users 
            WHERE blocker_id = $1 AND blocked_id = $2
        `, [userId, friendId]);

        if (existingBlock.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'User is already blocked',
                code: 'ALREADY_BLOCKED'
            });
        }

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Add to blocked users
            await client.query(`
                INSERT INTO blocked_users (blocker_id, blocked_id, reason)
                VALUES ($1, $2, $3)
            `, [userId, friendId, reason || null]);

            // Remove friendship if exists
            await client.query(`
                DELETE FROM friendships 
                WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            `, [userId, friendId]);

            // Cancel any pending friend requests
            await client.query(`
                UPDATE friend_requests 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
                AND status = 'pending'
            `, [userId, friendId]);

            // Log the activity
            await client.query(`
                INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                VALUES ($1, $2, 'user_blocked', $3, $4)
            `, [userId, friendId, req.ip, req.get('User-Agent')]);

            await client.query('COMMIT');

            console.log(`✅ Friend ${friendId} blocked successfully for user ${userId}`);

            res.json({
                success: true,
                message: 'User blocked successfully',
                blocked_user_id: friendId
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error blocking friend:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to block user',
            code: 'BLOCK_USER_ERROR'
        });
    }
});

/**
 * Helper function to get socket IDs for a user
 * @param {number} userId - User ID
 * @returns {Array} Array of socket IDs
 */
async function getSocketsForUser(userId) {
    if (!global.io) return [];
    
    const sockets = [];
    try {
        const connectedSockets = await global.io.fetchSockets();
        
        for (const socket of connectedSockets) {
            if (socket.userId === userId) {
                sockets.push(socket.id);
            }
        }
    } catch (error) {
        console.log('⚠️ Error fetching sockets for user:', error.message);
    }
    
    return sockets;
}

module.exports = router;
