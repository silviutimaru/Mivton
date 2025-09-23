/**
 * ==============================================
 * MIVTON - USER PROFILE API ROUTES (SAFE VERSION)
 * Profile viewing with graceful fallbacks for missing columns
 * ==============================================
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../database/connection');

/**
 * Get user profile by ID - Safe version with column existence checks
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

        // First, check which columns exist in the users table
        const columnsQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
        `;
        
        let availableColumns = [];
        try {
            const columnsResult = await db.query(columnsQuery);
            availableColumns = columnsResult.rows.map(row => row.column_name);
        } catch (error) {
            // Fallback to basic columns if we can't check schema
            availableColumns = ['id', 'username', 'email', 'full_name', 'created_at'];
        }

        // Build safe query with only existing columns
        const baseColumns = ['id', 'username', 'email', 'full_name', 'created_at'];
        const optionalColumns = {
            'native_language': 'native_language',
            'gender': 'gender', 
            'is_verified': 'is_verified',
            'is_admin': 'is_admin',
            'profile_visibility': 'profile_visibility',
            'show_language': 'show_language', 
            'show_online_status': 'show_online_status',
            'updated_at': 'updated_at',
            'last_seen': 'last_seen',
            'is_blocked': 'is_blocked'
        };

        let selectColumns = [...baseColumns];
        let safeColumns = {};

        // Add optional columns if they exist
        for (const [key, column] of Object.entries(optionalColumns)) {
            if (availableColumns.includes(column)) {
                selectColumns.push(column);
                safeColumns[key] = true;
            } else {
                safeColumns[key] = false;
            }
        }

        // Get basic user profile information with safe columns
        const userQuery = `
            SELECT ${selectColumns.join(', ')}
            FROM users 
            WHERE id = $1 
            ${safeColumns.is_blocked ? 'AND (is_blocked = false OR is_blocked IS NULL)' : ''}
        `;

        console.log('🔍 Profile query for user:', targetUserId, 'by viewer:', viewerId);
        const userResult = await db.query(userQuery, [targetUserId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found or unavailable'
            });
        }

        const user = userResult.rows[0];

        // Check privacy settings if column exists
        if (safeColumns.profile_visibility && user.profile_visibility === 'private' && viewerId !== targetUserId) {
            return res.status(403).json({
                success: false,
                error: 'This profile is private'
            });
        }

        // Check if viewer is blocked by target user (if tables exist)
        if (viewerId !== targetUserId) {
            try {
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
            } catch (blockedError) {
                console.log('ℹ️ Blocked users table not available');
            }
        }

        // Determine online status (with fallback)
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
                if (!safeColumns.show_online_status || user.show_online_status !== false || viewerId === targetUserId) {
                    onlineStatus = presence.status || 'offline';
                    user.activity_message = presence.activity_message;
                }
            }
        } catch (presenceError) {
            console.log('ℹ️ Presence data not available');
        }

        // Check friendship status (with fallbacks)
        let friendshipStatus = 'none';
        let mutualFriendsCount = 0;
        let friendSince = null;

        if (viewerId !== targetUserId) {
            try {
                // Try friendships table first
                let friendshipFound = false;
                try {
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
                            friendshipFound = true;
                        }
                    }
                } catch (friendshipError) {
                    console.log('ℹ️ Friendships table not available, trying friend_requests');
                }

                // Fallback to friend_requests if friendships not available
                if (!friendshipFound) {
                    try {
                        const requestQuery = `
                            SELECT status, sender_id, created_at
                            FROM friend_requests 
                            WHERE (sender_id = $1 AND receiver_id = $2)
                               OR (sender_id = $2 AND receiver_id = $1)
                            ORDER BY created_at DESC
                            LIMIT 1
                        `;
                        const requestResult = await db.query(requestQuery, [viewerId, targetUserId]);
                        
                        if (requestResult.rows.length > 0) {
                            const request = requestResult.rows[0];
                            if (request.status === 'accepted') {
                                friendshipStatus = 'friends';
                                friendSince = request.created_at;
                            } else if (request.status === 'pending') {
                                if (request.sender_id === viewerId) {
                                    friendshipStatus = 'request_sent';
                                } else {
                                    friendshipStatus = 'request_received';
                                }
                            }
                        }
                    } catch (requestError) {
                        console.log('ℹ️ Friend requests table not available');
                    }
                }
            } catch (friendshipError) {
                console.log('ℹ️ Friendship data not available');
            }
        }

        // Get total friends count (with fallback)
        let totalFriendsCount = 0;
        try {
            // Try friendships table first
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
                // Fallback to friend_requests
                try {
                    const friendsCountQuery = `
                        SELECT COUNT(*) as count
                        FROM friend_requests 
                        WHERE (sender_id = $1 OR receiver_id = $1) 
                        AND status = 'accepted'
                    `;
                    const friendsCountResult = await db.query(friendsCountQuery, [targetUserId]);
                    totalFriendsCount = parseInt(friendsCountResult.rows[0].count) || 0;
                } catch (requestsError) {
                    console.log('ℹ️ Friends count not available');
                }
            }
        } catch (error) {
            console.log('ℹ️ Friends count not available');
        }

        // Build profile response with safe fallbacks
        const profile = {
            id: user.id,
            username: user.username,
            full_name: user.full_name || user.username,
            native_language: safeColumns.native_language && safeColumns.show_language && user.show_language !== false ? user.native_language : null,
            gender: safeColumns.gender ? user.gender : null,
            is_verified: safeColumns.is_verified ? user.is_verified : false,
            is_admin: safeColumns.is_admin ? user.is_admin : false,
            created_at: user.created_at,
            updated_at: safeColumns.updated_at ? user.updated_at : user.created_at,
            last_seen: safeColumns.last_seen ? user.last_seen : null,
            online_status: onlineStatus,
            activity_message: user.activity_message || null,
            
            // Privacy-aware fields
            email: viewerId === targetUserId ? user.email : null,
            
            // Social information
            friendship_status: friendshipStatus,
            friend_since: friendSince,
            mutual_friends_count: mutualFriendsCount,
            total_friends_count: (!safeColumns.profile_visibility || user.profile_visibility !== 'private' || viewerId === targetUserId) ? totalFriendsCount : null,
            
            // Profile settings (only visible to self)
            profile_visibility: viewerId === targetUserId && safeColumns.profile_visibility ? user.profile_visibility : null,
            show_language: viewerId === targetUserId && safeColumns.show_language ? user.show_language : null,
            show_online_status: viewerId === targetUserId && safeColumns.show_online_status ? user.show_online_status : null,
            
            // Metadata
            is_own_profile: viewerId === targetUserId,
            can_send_friend_request: friendshipStatus === 'none' && viewerId !== targetUserId,
            can_message: friendshipStatus === 'friends' || viewerId === targetUserId
        };

        console.log('✅ Profile loaded successfully for user:', targetUserId);
        res.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Failed to load user profile'
        });
    }
});

/**
 * Get mutual friends - Safe version with fallbacks
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

        // Return empty list if friendship tables don't exist
        try {
            // Check if users are friends first (try friendships, fallback to friend_requests)
            let areFriends = false;
            
            try {
                const friendshipQuery = `
                    SELECT 1 FROM friendships 
                    WHERE (user1_id = $1 AND user2_id = $2) 
                       OR (user1_id = $2 AND user2_id = $1)
                    AND status = 'active'
                `;
                const friendshipResult = await db.query(friendshipQuery, [viewerId, targetUserId]);
                areFriends = friendshipResult.rows.length > 0;
            } catch (friendshipError) {
                // Fallback to friend_requests
                try {
                    const requestQuery = `
                        SELECT 1 FROM friend_requests 
                        WHERE (sender_id = $1 AND receiver_id = $2)
                           OR (sender_id = $2 AND receiver_id = $1)
                        AND status = 'accepted'
                    `;
                    const requestResult = await db.query(requestQuery, [viewerId, targetUserId]);
                    areFriends = requestResult.rows.length > 0;
                } catch (requestError) {
                    console.log('ℹ️ No friendship tables available');
                }
            }
            
            if (!areFriends) {
                return res.status(403).json({
                    success: false,
                    error: 'Can only view mutual friends with existing friends'
                });
            }

            // For now, return empty mutual friends list
            // This can be enhanced later when the friendship system is more mature
            res.json({
                success: true,
                mutual_friends: [],
                count: 0
            });

        } catch (error) {
            console.log('ℹ️ Mutual friends not available:', error.message);
            res.json({
                success: true,
                mutual_friends: [],
                count: 0
            });
        }

    } catch (error) {
        console.error('❌ Error fetching mutual friends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load mutual friends'
        });
    }
});

/**
 * Get user activity - Safe version with basic info
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

        // Get basic user info for activity
        const userQuery = `
            SELECT created_at, updated_at, native_language
            FROM users 
            WHERE id = $1
        `;
        const userResult = await db.query(userQuery, [targetUserId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Build basic activity info
        const activity = {
            joined_date: user.created_at,
            last_activity: user.updated_at || user.created_at,
            total_friends: 0,
            languages_spoken: user.native_language ? [user.native_language] : [],
            badges: []
        };

        // Get friends count (with fallback)
        try {
            // Try friendships first
            try {
                const friendsQuery = `
                    SELECT COUNT(*) as count
                    FROM friendships 
                    WHERE (user1_id = $1 OR user2_id = $1) 
                    AND status = 'active'
                `;
                const friendsResult = await db.query(friendsQuery, [targetUserId]);
                activity.total_friends = parseInt(friendsResult.rows[0].count) || 0;
            } catch (friendsError) {
                // Fallback to friend_requests
                try {
                    const friendsQuery = `
                        SELECT COUNT(*) as count
                        FROM friend_requests 
                        WHERE (sender_id = $1 OR receiver_id = $1) 
                        AND status = 'accepted'
                    `;
                    const friendsResult = await db.query(friendsQuery, [targetUserId]);
                    activity.total_friends = parseInt(friendsResult.rows[0].count) || 0;
                } catch (requestsError) {
                    console.log('ℹ️ Friends count not available');
                }
            }
        } catch (error) {
            console.log('ℹ️ Friends count not available');
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
