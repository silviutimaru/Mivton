/**
 * ==============================================
 * MIVTON - USER PROFILE API ROUTES
 * Profile viewing and management endpoints
 * ==============================================
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../database/connection');

/**
 * Get user profile by ID
 * GET /api/user-profile/:userId
 */
router.get('/:userId', requireAuth, async (req, res) => {
    try {
        const viewerId = req.session.userId;
        const targetUserId = parseInt(req.params.userId);
        
        if (!targetUserId || isNaN(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const db = getDb();

        // Get basic user profile information
        const userQuery = `
            SELECT 
                u.id,
                u.username,
                u.email,
                u.full_name,
                u.native_language,
                u.gender,
                u.is_verified,
                u.is_admin,
                u.profile_visibility,
                u.show_language,
                u.show_online_status,
                u.created_at,
                u.updated_at,
                u.last_seen
            FROM users u
            WHERE u.id = $1 AND u.is_blocked = false
        `;

        const userResult = await db.query(userQuery, [targetUserId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found or unavailable'
            });
        }

        const user = userResult.rows[0];

        // Check privacy settings
        if (user.profile_visibility === 'private' && viewerId !== targetUserId) {
            return res.status(403).json({
                success: false,
                error: 'This profile is private'
            });
        }

        // Check if viewer is blocked by target user
        if (viewerId !== targetUserId) {
            const blockedQuery = `
                SELECT 1 FROM blocked_users 
                WHERE blocker_id = $1 AND blocked_id = $2
            `;
            const blockedResult = await db.query(blockedQuery, [targetUserId, viewerId]);
            
            if (blockedResult.rows.length > 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Profile unavailable'
                });
            }
        }

        // Determine online status
        let onlineStatus = 'offline';
        try {
            const presenceQuery = `
                SELECT status, last_seen, activity_message
                FROM user_presence 
                WHERE user_id = $1
            `;
            const presenceResult = await db.query(presenceQuery, [targetUserId]);
            
            if (presenceResult.rows.length > 0) {
                const presence = presenceResult.rows[0];
                if (user.show_online_status || viewerId === targetUserId) {
                    onlineStatus = presence.status || 'offline';
                    user.activity_message = presence.activity_message;
                    user.last_seen = presence.last_seen;
                }
            }
        } catch (presenceError) {
            console.log('Presence data not available');
        }

        // Check friendship status
        let friendshipStatus = 'none';
        let mutualFriendsCount = 0;
        let friendSince = null;

        if (viewerId !== targetUserId) {
            try {
                // Check friendship status
                const friendshipQuery = `
                    SELECT status, created_at
                    FROM friendships 
                    WHERE (user1_id = $1 AND user2_id = $2) 
                       OR (user1_id = $2 AND user2_id = $1)
                `;
                const friendshipResult = await db.query(friendshipQuery, [viewerId, targetUserId]);
                
                if (friendshipResult.rows.length > 0) {
                    const friendship = friendshipResult.rows[0];
                    if (friendship.status === 'active') {
                        friendshipStatus = 'friends';
                        friendSince = friendship.created_at;
                    }
                } else {
                    // Check for pending friend requests
                    const requestQuery = `
                        SELECT status, sender_id
                        FROM friend_requests 
                        WHERE (sender_id = $1 AND receiver_id = $2)
                           OR (sender_id = $2 AND receiver_id = $1)
                        AND status = 'pending'
                        ORDER BY created_at DESC
                        LIMIT 1
                    `;
                    const requestResult = await db.query(requestQuery, [viewerId, targetUserId]);
                    
                    if (requestResult.rows.length > 0) {
                        const request = requestResult.rows[0];
                        if (request.sender_id === viewerId) {
                            friendshipStatus = 'request_sent';
                        } else {
                            friendshipStatus = 'request_received';
                        }
                    }
                }

                // Get mutual friends count if they're friends or viewer has permission
                if (friendshipStatus === 'friends' || user.profile_visibility === 'public') {
                    const mutualQuery = `
                        SELECT COUNT(DISTINCT f2.user2_id) as count
                        FROM friendships f1
                        JOIN friendships f2 ON (
                            (f1.user2_id = f2.user1_id OR f1.user2_id = f2.user2_id)
                            AND f2.user1_id != f1.user1_id AND f2.user2_id != f1.user1_id
                        )
                        WHERE f1.user1_id = $1 AND f1.status = 'active'
                        AND f2.status = 'active'
                        AND (f2.user1_id = $2 OR f2.user2_id = $2)
                    `;
                    const mutualResult = await db.query(mutualQuery, [viewerId, targetUserId]);
                    mutualFriendsCount = parseInt(mutualResult.rows[0]?.count) || 0;
                }
            } catch (friendshipError) {
                console.log('Friendship data not available');
            }
        }

        // Get total friends count
        let totalFriendsCount = 0;
        try {
            const friendsCountQuery = `
                SELECT COUNT(*) as count
                FROM friendships 
                WHERE (user1_id = $1 OR user2_id = $1) 
                AND status = 'active'
            `;
            const friendsCountResult = await db.query(friendsCountQuery, [targetUserId]);
            totalFriendsCount = parseInt(friendsCountResult.rows[0].count) || 0;
        } catch (friendsError) {
            console.log('Friends count not available');
        }

        // Build profile response
        const profile = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            native_language: user.show_language !== false ? user.native_language : null,
            gender: user.gender,
            is_verified: user.is_verified,
            is_admin: user.is_admin,
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_seen: user.last_seen,
            online_status: onlineStatus,
            activity_message: user.activity_message,
            
            // Privacy-aware fields
            email: viewerId === targetUserId ? user.email : null,
            
            // Social information
            friendship_status: friendshipStatus,
            friend_since: friendSince,
            mutual_friends_count: mutualFriendsCount,
            total_friends_count: user.profile_visibility === 'private' && viewerId !== targetUserId ? null : totalFriendsCount,
            
            // Profile settings (only visible to self)
            profile_visibility: viewerId === targetUserId ? user.profile_visibility : null,
            show_language: viewerId === targetUserId ? user.show_language : null,
            show_online_status: viewerId === targetUserId ? user.show_online_status : null,
            
            // Metadata
            is_own_profile: viewerId === targetUserId,
            can_send_friend_request: friendshipStatus === 'none' && viewerId !== targetUserId,
            can_message: friendshipStatus === 'friends' || viewerId === targetUserId
        };

        res.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load user profile'
        });
    }
});

/**
 * Get mutual friends between viewer and target user
 * GET /api/user-profile/:userId/mutual-friends
 */
router.get('/:userId/mutual-friends', requireAuth, async (req, res) => {
    try {
        const viewerId = req.session.userId;
        const targetUserId = parseInt(req.params.userId);
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        
        if (!targetUserId || isNaN(targetUserId) || viewerId === targetUserId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request'
            });
        }

        const db = getDb();

        // Check if users are friends first
        const friendshipQuery = `
            SELECT 1 FROM friendships 
            WHERE (user1_id = $1 AND user2_id = $2) 
               OR (user1_id = $2 AND user2_id = $1)
            AND status = 'active'
        `;
        const friendshipResult = await db.query(friendshipQuery, [viewerId, targetUserId]);
        
        if (friendshipResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Can only view mutual friends with existing friends'
            });
        }

        // Get mutual friends
        const mutualQuery = `
            SELECT DISTINCT 
                u.id,
                u.username,
                u.full_name,
                u.native_language,
                u.is_verified,
                up.status as online_status
            FROM users u
            JOIN friendships f1 ON (u.id = f1.user1_id OR u.id = f1.user2_id)
            JOIN friendships f2 ON (u.id = f2.user1_id OR u.id = f2.user2_id)
            LEFT JOIN user_presence up ON u.id = up.user_id
            WHERE f1.status = 'active' AND f2.status = 'active'
            AND ((f1.user1_id = $1 AND f1.user2_id != $1) OR (f1.user2_id = $1 AND f1.user1_id != $1))
            AND ((f2.user1_id = $2 AND f2.user2_id != $2) OR (f2.user2_id = $2 AND f2.user1_id != $2))
            AND u.id != $1 AND u.id != $2
            AND u.is_blocked = false
            ORDER BY u.full_name, u.username
            LIMIT $3
        `;

        const mutualResult = await db.query(mutualQuery, [viewerId, targetUserId, limit]);
        
        const mutualFriends = mutualResult.rows.map(friend => ({
            id: friend.id,
            username: friend.username,
            full_name: friend.full_name,
            native_language: friend.native_language,
            is_verified: friend.is_verified,
            online_status: friend.online_status || 'offline'
        }));

        res.json({
            success: true,
            mutual_friends: mutualFriends,
            count: mutualFriends.length
        });

    } catch (error) {
        console.error('❌ Error fetching mutual friends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load mutual friends'
        });
    }
});

/**
 * Get user activity/stats (privacy-aware)
 * GET /api/user-profile/:userId/activity
 */
router.get('/:userId/activity', requireAuth, async (req, res) => {
    try {
        const viewerId = req.session.userId;
        const targetUserId = parseInt(req.params.userId);
        
        if (!targetUserId || isNaN(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const db = getDb();

        // Check if viewer has permission to see activity
        if (viewerId !== targetUserId) {
            // Check friendship status and privacy settings
            const permissionQuery = `
                SELECT u.profile_visibility,
                       EXISTS(
                           SELECT 1 FROM friendships 
                           WHERE (user1_id = $1 AND user2_id = $2) 
                              OR (user1_id = $2 AND user2_id = $1)
                           AND status = 'active'
                       ) as is_friend
                FROM users u
                WHERE u.id = $2
            `;
            const permissionResult = await db.query(permissionQuery, [viewerId, targetUserId]);
            
            if (permissionResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const { profile_visibility, is_friend } = permissionResult.rows[0];
            
            if (profile_visibility === 'private' || (profile_visibility === 'friends' && !is_friend)) {
                return res.status(403).json({
                    success: false,
                    error: 'Activity information is private'
                });
            }
        }

        // Get basic activity stats
        const activity = {
            joined_date: null,
            last_activity: null,
            total_friends: 0,
            languages_spoken: [],
            badges: []
        };

        // Get user creation date
        const userQuery = `
            SELECT created_at, updated_at, native_language
            FROM users 
            WHERE id = $1
        `;
        const userResult = await db.query(userQuery, [targetUserId]);
        
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            activity.joined_date = user.created_at;
            activity.last_activity = user.updated_at;
            if (user.native_language) {
                activity.languages_spoken.push(user.native_language);
            }
        }

        // Get friends count
        try {
            const friendsQuery = `
                SELECT COUNT(*) as count
                FROM friendships 
                WHERE (user1_id = $1 OR user2_id = $1) 
                AND status = 'active'
            `;
            const friendsResult = await db.query(friendsQuery, [targetUserId]);
            activity.total_friends = parseInt(friendsResult.rows[0].count) || 0;
        } catch (error) {
            console.log('Friends count not available');
        }

        // Add badges based on activity
        if (activity.total_friends >= 10) {
            activity.badges.push({ name: 'Social Butterfly', icon: '🦋', description: '10+ friends' });
        }
        if (activity.total_friends >= 50) {
            activity.badges.push({ name: 'Super Connector', icon: '🌟', description: '50+ friends' });
        }

        // Check if user is new (joined within last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (activity.joined_date && new Date(activity.joined_date) > thirtyDaysAgo) {
            activity.badges.push({ name: 'New Member', icon: '🎉', description: 'Recently joined Mivton' });
        }

        res.json({
            success: true,
            activity
        });

    } catch (error) {
        console.error('❌ Error fetching user activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load user activity'
        });
    }
});

module.exports = router;
