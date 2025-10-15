const { query } = require('../database/connection');

/**
 * 🚀 MIVTON PHASE 3.1 - FRIENDS UTILITIES
 * Enterprise-grade utility functions for friends system
 * 
 * Features:
 * - Friend relationship management
 * - Validation functions
 * - Privacy checks
 * - Performance optimized queries
 */

/**
 * Check if two users are friends
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @returns {Promise<boolean>} True if users are friends
 */
async function areUsersFriends(userId1, userId2) {
    try {
        console.log(`🔍 areUsersFriends called with: userId1=${userId1}, userId2=${userId2}`);
        
        if (!userId1 || !userId2 || userId1 === userId2) {
            console.log(`🔍 Invalid parameters, returning false`);
            return false;
        }

        const result = await query(`
            SELECT EXISTS(
                SELECT 1 FROM friendships 
                WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
                AND status = 'active'
            ) as are_friends
        `, [userId1, userId2]);

        console.log(`🔍 Query result:`, result.rows[0].are_friends);
        return result.rows[0].are_friends;
    } catch (error) {
        console.error('Error checking friendship:', error);
        return false;
    }
}

/**
 * Check if user is blocked by another user
 * @param {number} blockerId - User who might have blocked
 * @param {number} blockedId - User who might be blocked
 * @returns {Promise<boolean>} True if user is blocked
 */
async function isUserBlocked(blockerId, blockedId) {
    try {
        if (!blockerId || !blockedId || blockerId === blockedId) {
            return false;
        }

        const result = await query(`
            SELECT EXISTS(
                SELECT 1 FROM blocked_users 
                WHERE blocker_id = $1 AND blocked_id = $2
            ) as is_blocked
        `, [blockerId, blockedId]);

        return result.rows[0].is_blocked;
    } catch (error) {
        console.error('Error checking block status:', error);
        return false;
    }
}

/**
 * Check if users can interact (not blocked by each other)
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @returns {Promise<boolean>} True if users can interact
 */
async function canUsersInteract(userId1, userId2) {
    try {
        if (!userId1 || !userId2 || userId1 === userId2) {
            return false;
        }

        const result = await query(`
            SELECT NOT EXISTS(
                SELECT 1 FROM blocked_users 
                WHERE (blocker_id = $1 AND blocked_id = $2) 
                OR (blocker_id = $2 AND blocked_id = $1)
            ) as can_interact
        `, [userId1, userId2]);

        return result.rows[0].can_interact;
    } catch (error) {
        console.error('Error checking interaction status:', error);
        return false;
    }
}

/**
 * Get friend request status between two users
 * @param {number} senderId - Sender user ID
 * @param {number} receiverId - Receiver user ID
 * @returns {Promise<Object|null>} Friend request object or null
 */
async function getFriendRequestStatus(senderId, receiverId) {
    try {
        if (!senderId || !receiverId || senderId === receiverId) {
            return null;
        }

        const result = await query(`
            SELECT id, status, created_at, expires_at, message
            FROM friend_requests
            WHERE sender_id = $1 AND receiver_id = $2
            ORDER BY created_at DESC
            LIMIT 1
        `, [senderId, receiverId]);

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error getting friend request status:', error);
        return null;
    }
}

/**
 * Get mutual friends between two users
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @param {number} limit - Maximum number of mutual friends to return
 * @returns {Promise<Array>} Array of mutual friends
 */
async function getMutualFriends(userId1, userId2, limit = 10) {
    try {
        if (!userId1 || !userId2 || userId1 === userId2) {
            return [];
        }

        const result = await query(`
            WITH user1_friends AS (
                SELECT CASE 
                    WHEN f.user1_id = $1 THEN f.user2_id 
                    ELSE f.user1_id 
                END as friend_id
                FROM friendships f
                WHERE (f.user1_id = $1 OR f.user2_id = $1) 
                AND f.status = 'active'
            ),
            user2_friends AS (
                SELECT CASE 
                    WHEN f.user1_id = $2 THEN f.user2_id 
                    ELSE f.user1_id 
                END as friend_id
                FROM friendships f
                WHERE (f.user1_id = $2 OR f.user2_id = $2) 
                AND f.status = 'active'
            )
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.is_verified,
                u.native_language
            FROM user1_friends uf1
            INNER JOIN user2_friends uf2 ON uf1.friend_id = uf2.friend_id
            INNER JOIN users u ON u.id = uf1.friend_id
            WHERE u.is_blocked = FALSE
            ORDER BY u.full_name
            LIMIT $3
        `, [userId1, userId2, limit]);

        return result.rows;
    } catch (error) {
        console.error('Error getting mutual friends:', error);
        return [];
    }
}

/**
 * Get mutual friends count between two users
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @returns {Promise<number>} Count of mutual friends
 */
async function getMutualFriendsCount(userId1, userId2) {
    try {
        if (!userId1 || !userId2 || userId1 === userId2) {
            return 0;
        }

        const result = await query(`
            WITH user1_friends AS (
                SELECT CASE 
                    WHEN f.user1_id = $1 THEN f.user2_id 
                    ELSE f.user1_id 
                END as friend_id
                FROM friendships f
                WHERE (f.user1_id = $1 OR f.user2_id = $1) 
                AND f.status = 'active'
            ),
            user2_friends AS (
                SELECT CASE 
                    WHEN f.user1_id = $2 THEN f.user2_id 
                    ELSE f.user1_id 
                END as friend_id
                FROM friendships f
                WHERE (f.user1_id = $2 OR f.user2_id = $2) 
                AND f.status = 'active'
            )
            SELECT COUNT(*) as mutual_count
            FROM user1_friends uf1
            INNER JOIN user2_friends uf2 ON uf1.friend_id = uf2.friend_id
            INNER JOIN users u ON u.id = uf1.friend_id
            WHERE u.is_blocked = FALSE
        `, [userId1, userId2]);

        return parseInt(result.rows[0].mutual_count) || 0;
    } catch (error) {
        console.error('Error getting mutual friends count:', error);
        return 0;
    }
}

/**
 * Get user's online friends count
 * @param {number} userId - User ID
 * @returns {Promise<number>} Count of online friends
 */
async function getOnlineFriendsCount(userId) {
    try {
        if (!userId) {
            return 0;
        }

        const result = await query(`
            SELECT COUNT(*) as online_count
            FROM v_user_friends vuf
            WHERE vuf.user_id = $1
            AND vuf.friend_last_activity > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
        `, [userId]);

        return parseInt(result.rows[0].online_count) || 0;
    } catch (error) {
        console.error('Error getting online friends count:', error);
        return 0;
    }
}

/**
 * Get user's friends count
 * @param {number} userId - User ID
 * @returns {Promise<number>} Count of friends
 */
async function getFriendsCount(userId) {
    try {
        if (!userId) {
            return 0;
        }

        const result = await query(`
            SELECT COUNT(*) as friends_count
            FROM friendships f
            WHERE (f.user1_id = $1 OR f.user2_id = $1)
            AND f.status = 'active'
        `, [userId]);

        return parseInt(result.rows[0].friends_count) || 0;
    } catch (error) {
        console.error('Error getting friends count:', error);
        return 0;
    }
}

/**
 * Get pending friend requests count for user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Object with sent and received counts
 */
async function getPendingRequestsCount(userId) {
    try {
        if (!userId) {
            return { sent: 0, received: 0 };
        }

        const result = await query(`
            SELECT 
                COUNT(CASE WHEN sender_id = $1 THEN 1 END) as sent_count,
                COUNT(CASE WHEN receiver_id = $1 THEN 1 END) as received_count
            FROM friend_requests fr
            JOIN users u ON (u.id = fr.sender_id OR u.id = fr.receiver_id)
            WHERE (fr.sender_id = $1 OR fr.receiver_id = $1)
            AND fr.status = 'pending'
            AND fr.expires_at > CURRENT_TIMESTAMP
            AND u.is_blocked = FALSE
        `, [userId]);

        const counts = result.rows[0];
        return {
            sent: parseInt(counts.sent_count) || 0,
            received: parseInt(counts.received_count) || 0
        };
    } catch (error) {
        console.error('Error getting pending requests count:', error);
        return { sent: 0, received: 0 };
    }
}

/**
 * Validate friend request data
 * @param {Object} requestData - Friend request data
 * @returns {Object} Validation result
 */
function validateFriendRequest(requestData) {
    const errors = [];

    // Validate receiver ID
    if (!requestData.receiver_id || isNaN(parseInt(requestData.receiver_id))) {
        errors.push('Invalid receiver ID');
    }

    // Validate message length
    if (requestData.message && requestData.message.length > 500) {
        errors.push('Message is too long (max 500 characters)');
    }

    // Validate message content (basic profanity check)
    if (requestData.message) {
        const profanityWords = ['spam', 'test123']; // Add actual profanity words
        const message = requestData.message.toLowerCase();
        const hasProfanity = profanityWords.some(word => message.includes(word));
        
        if (hasProfanity) {
            errors.push('Message contains inappropriate content');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Create notification for user
 * @param {number} userId - Target user ID
 * @param {number} senderId - Sender user ID (optional)
 * @param {string} type - Notification type
 * @param {string} message - Notification message
 * @param {Object} data - Additional notification data
 * @returns {Promise<Object|null>} Created notification or null
 */
async function createNotification(userId, senderId, type, message, data = {}) {
    try {
        if (!userId || !type || !message) {
            return null;
        }

        const result = await query(`
            INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        `, [userId, senderId || null, type, message, JSON.stringify(data)]);

        return result.rows[0];
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

/**
 * Log social activity
 * @param {number} userId - User ID
 * @param {number} targetUserId - Target user ID
 * @param {string} activityType - Activity type
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @returns {Promise<boolean>} Success status
 */
async function logSocialActivity(userId, targetUserId, activityType, ipAddress, userAgent) {
    try {
        if (!userId || !activityType) {
            return false;
        }

        await pool.query(`
            INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, targetUserId || null, activityType, ipAddress || null, userAgent || null]);

        return true;
    } catch (error) {
        console.error('Error logging social activity:', error);
        return false;
    }
}

/**
 * Get user's friend suggestions based on mutual friends
 * @param {number} userId - User ID
 * @param {number} limit - Maximum suggestions to return
 * @returns {Promise<Array>} Array of suggested friends
 */
async function getFriendSuggestions(userId, limit = 10) {
    try {
        if (!userId) {
            return [];
        }

        const result = await query(`
            WITH user_friends AS (
                SELECT CASE 
                    WHEN f.user1_id = $1 THEN f.user2_id 
                    ELSE f.user1_id 
                END as friend_id
                FROM friendships f
                WHERE (f.user1_id = $1 OR f.user2_id = $1) 
                AND f.status = 'active'
            ),
            friend_of_friends AS (
                SELECT 
                    CASE 
                        WHEN f2.user1_id = uf.friend_id THEN f2.user2_id 
                        ELSE f2.user1_id 
                    END as suggested_id,
                    COUNT(*) as mutual_count
                FROM user_friends uf
                JOIN friendships f2 ON (f2.user1_id = uf.friend_id OR f2.user2_id = uf.friend_id)
                WHERE f2.status = 'active'
                AND CASE 
                    WHEN f2.user1_id = uf.friend_id THEN f2.user2_id 
                    ELSE f2.user1_id 
                END != $1
                AND CASE 
                    WHEN f2.user1_id = uf.friend_id THEN f2.user2_id 
                    ELSE f2.user1_id 
                END NOT IN (SELECT friend_id FROM user_friends)
                GROUP BY CASE 
                    WHEN f2.user1_id = uf.friend_id THEN f2.user2_id 
                    ELSE f2.user1_id 
                END
            )
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.is_verified,
                u.native_language,
                fof.mutual_count
            FROM friend_of_friends fof
            JOIN users u ON u.id = fof.suggested_id
            WHERE u.is_blocked = FALSE
            AND NOT EXISTS (
                SELECT 1 FROM blocked_users bu 
                WHERE (bu.blocker_id = $1 AND bu.blocked_id = u.id)
                OR (bu.blocker_id = u.id AND bu.blocked_id = $1)
            )
            AND NOT EXISTS (
                SELECT 1 FROM friend_requests fr 
                WHERE ((fr.sender_id = $1 AND fr.receiver_id = u.id) 
                OR (fr.sender_id = u.id AND fr.receiver_id = $1))
                AND fr.status = 'pending'
            )
            ORDER BY fof.mutual_count DESC, u.full_name
            LIMIT $2
        `, [userId, limit]);

        return result.rows;
    } catch (error) {
        console.error('Error getting friend suggestions:', error);
        return [];
    }
}

/**
 * Clean up expired friend requests
 * @returns {Promise<number>} Number of expired requests cleaned up
 */
async function cleanupExpiredRequests() {
    try {
        const result = await query(`
            UPDATE friend_requests 
            SET status = 'expired', updated_at = CURRENT_TIMESTAMP
            WHERE status = 'pending' 
            AND expires_at < CURRENT_TIMESTAMP
        `);

        const expiredCount = result.rowCount;
        
        if (expiredCount > 0) {
            console.log(`🧹 Cleaned up ${expiredCount} expired friend requests`);
        }

        return expiredCount;
    } catch (error) {
        console.error('Error cleaning up expired requests:', error);
        return 0;
    }
}

/**
 * Get relationship status between two users
 * @param {number} userId1 - First user ID
 * @param {number} userId2 - Second user ID
 * @returns {Promise<Object>} Relationship status object
 */
async function getRelationshipStatus(userId1, userId2) {
    try {
        if (!userId1 || !userId2 || userId1 === userId2) {
            return {
                type: 'self',
                can_interact: false,
                details: null
            };
        }

        // Check if blocked
        const blockResult = await pool.query(`
            SELECT 
                CASE 
                    WHEN EXISTS(SELECT 1 FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2) THEN 'blocked_by_user1'
                    WHEN EXISTS(SELECT 1 FROM blocked_users WHERE blocker_id = $2 AND blocked_id = $1) THEN 'blocked_by_user2'
                    ELSE 'not_blocked'
                END as block_status
        `, [userId1, userId2]);

        const blockStatus = blockResult.rows[0].block_status;

        if (blockStatus !== 'not_blocked') {
            return {
                type: 'blocked',
                can_interact: false,
                details: { block_status: blockStatus }
            };
        }

        // Check if friends
        const friendResult = await pool.query(`
            SELECT 
                f.id,
                f.created_at as friendship_created
            FROM friendships f
            WHERE ((f.user1_id = $1 AND f.user2_id = $2) OR (f.user1_id = $2 AND f.user2_id = $1))
            AND f.status = 'active'
        `, [userId1, userId2]);

        if (friendResult.rows.length > 0) {
            return {
                type: 'friends',
                can_interact: true,
                details: {
                    friendship_id: friendResult.rows[0].id,
                    friendship_created: friendResult.rows[0].friendship_created
                }
            };
        }

        // Check for pending friend requests
        const requestResult = await pool.query(`
            SELECT 
                fr.id,
                fr.sender_id,
                fr.receiver_id,
                fr.status,
                fr.created_at,
                fr.expires_at,
                fr.message
            FROM friend_requests fr
            WHERE ((fr.sender_id = $1 AND fr.receiver_id = $2) OR (fr.sender_id = $2 AND fr.receiver_id = $1))
            AND fr.status = 'pending'
            AND fr.expires_at > CURRENT_TIMESTAMP
            ORDER BY fr.created_at DESC
            LIMIT 1
        `, [userId1, userId2]);

        if (requestResult.rows.length > 0) {
            const request = requestResult.rows[0];
            return {
                type: 'pending_request',
                can_interact: true,
                details: {
                    request_id: request.id,
                    sender_id: request.sender_id,
                    receiver_id: request.receiver_id,
                    direction: request.sender_id === userId1 ? 'sent' : 'received',
                    created_at: request.created_at,
                    expires_at: request.expires_at,
                    message: request.message
                }
            };
        }

        // No relationship - can send friend request
        return {
            type: 'none',
            can_interact: true,
            details: null
        };

    } catch (error) {
        console.error('Error getting relationship status:', error);
        return {
            type: 'error',
            can_interact: false,
            details: { error: error.message }
        };
    }
}

/**
 * Get user's social statistics
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Social statistics object
 */
async function getUserSocialStats(userId) {
    try {
        if (!userId) {
            return null;
        }

        const result = await query(`
            SELECT 
                -- Friends stats
                (SELECT COUNT(*) FROM friendships f 
                 WHERE (f.user1_id = $1 OR f.user2_id = $1) AND f.status = 'active') as total_friends,
                
                -- Online friends
                (SELECT COUNT(*) FROM v_user_friends vuf 
                 WHERE vuf.user_id = $1 AND vuf.friend_last_activity > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')) as online_friends,
                
                -- Pending requests (received)
                (SELECT COUNT(*) FROM friend_requests fr JOIN users u ON fr.sender_id = u.id
                 WHERE fr.receiver_id = $1 AND fr.status = 'pending' 
                 AND fr.expires_at > CURRENT_TIMESTAMP AND u.is_blocked = FALSE) as pending_received,
                
                -- Pending requests (sent)
                (SELECT COUNT(*) FROM friend_requests fr JOIN users u ON fr.receiver_id = u.id
                 WHERE fr.sender_id = $1 AND fr.status = 'pending' 
                 AND fr.expires_at > CURRENT_TIMESTAMP AND u.is_blocked = FALSE) as pending_sent,
                
                -- Blocked users
                (SELECT COUNT(*) FROM blocked_users WHERE blocker_id = $1) as blocked_count,
                
                -- Unread notifications
                (SELECT COUNT(*) FROM friend_notifications WHERE user_id = $1 AND is_read = FALSE) as unread_notifications,
                
                -- Recent activity (last 24 hours)
                (SELECT COUNT(*) FROM social_activity_log 
                 WHERE user_id = $1 AND created_at > (CURRENT_TIMESTAMP - INTERVAL '24 hours')) as recent_activity
        `, [userId]);

        const stats = result.rows[0];

        return {
            friends: {
                total: parseInt(stats.total_friends) || 0,
                online: parseInt(stats.online_friends) || 0
            },
            requests: {
                received_pending: parseInt(stats.pending_received) || 0,
                sent_pending: parseInt(stats.pending_sent) || 0
            },
            blocked_count: parseInt(stats.blocked_count) || 0,
            unread_notifications: parseInt(stats.unread_notifications) || 0,
            recent_activity: parseInt(stats.recent_activity) || 0
        };

    } catch (error) {
        console.error('Error getting user social stats:', error);
        return null;
    }
}

module.exports = {
    areUsersFriends,
    isUserBlocked,
    canUsersInteract,
    getFriendRequestStatus,
    getMutualFriends,
    getMutualFriendsCount,
    getOnlineFriendsCount,
    getFriendsCount,
    getPendingRequestsCount,
    validateFriendRequest,
    createNotification,
    logSocialActivity,
    getFriendSuggestions,
    cleanupExpiredRequests,
    getRelationshipStatus,
    getUserSocialStats
};
