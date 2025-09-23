const express = require('express');
const router = express.Router();
const { pool, getClient } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

/**
 * 🚀 MIVTON PHASE 3.1 - FRIEND REQUESTS API
 * Enterprise-grade friend request system with validation and rate limiting
 * 
 * Features:
 * - Send friend requests with optional messages
 * - Accept/decline friend requests
 * - Cancel sent requests
 * - View sent and received requests
 * - Rate limiting to prevent spam
 * - Comprehensive validation and error handling
 */

// Rate limiting for friend requests (more restrictive)
const friendRequestsRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 friend requests per hour per user
    message: {
        error: 'Too many friend requests. Please try again later.',
        code: 'FRIEND_REQUEST_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Since this runs after requireAuth middleware, req.user should exist
        return req.user ? `friend_requests_${req.user.id}` : `friend_requests_${req.ip}`;
    }
});

// Separate rate limit for accept/decline actions
const friendActionsRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour  
    max: 30, // 30 actions per hour per user
    message: {
        error: 'Too many friend actions. Please try again later.',
        code: 'FRIEND_ACTIONS_RATE_LIMIT'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Since this runs after requireAuth middleware, req.user should exist
        return req.user ? `friend_actions_${req.user.id}` : `friend_actions_${req.ip}`;
    }
});

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/friend-requests
 * Send a friend request to another user
 */
router.post('/', friendRequestsRateLimit, async (req, res) => {
    try {
        console.log('🔍 DEBUG: req.user =', req.user);
        console.log('🔍 DEBUG: req.session =', req.session);
        
        if (!req.user || !req.user.id) {
            console.error('❌ ERROR: req.user is undefined or missing id');
            return res.status(401).json({
                success: false,
                error: 'Authentication failed - user data not available',
                code: 'AUTH_USER_MISSING'
            });
        }
        
        const senderId = req.user.id;
        const { receiver_id, friend_id, message } = req.body;
        const receiverId = parseInt(receiver_id || friend_id);

        console.log(`📤 Sending friend request from ${senderId} to ${receiverId}`);

        // Validate input
        if (!receiverId || isNaN(receiverId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid receiver ID',
                code: 'INVALID_RECEIVER_ID'
            });
        }

        // Cannot send request to self
        if (senderId === receiverId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot send friend request to yourself',
                code: 'SELF_FRIEND_REQUEST'
            });
        }

        // Check if receiver exists and is not blocked
        const receiverCheck = await pool.query(`
            SELECT id, username, full_name, is_blocked
            FROM users 
            WHERE id = $1
        `, [receiverId]);

        if (receiverCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        const receiver = receiverCheck.rows[0];

        if (receiver.is_blocked) {
            return res.status(403).json({
                success: false,
                error: 'Cannot send friend request to this user',
                code: 'USER_BLOCKED'
            });
        }

        // Check if sender is blocked by receiver
        const blockCheck = await pool.query(`
            SELECT id FROM blocked_users 
            WHERE blocker_id = $1 AND blocked_id = $2
        `, [receiverId, senderId]);

        if (blockCheck.rows.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Cannot send friend request to this user',
                code: 'BLOCKED_BY_USER'
            });
        }

        // Check if users are already friends
        const friendshipCheck = await pool.query(`
            SELECT id FROM friendships 
            WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            AND status = 'active'
        `, [senderId, receiverId]);

        if (friendshipCheck.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Users are already friends',
                code: 'ALREADY_FRIENDS'
            });
        }

        // Check if friend request already exists (check for any request)
        const existingRequest = await pool.query(`
            SELECT id, status, expires_at FROM friend_requests 
            WHERE sender_id = $1 AND receiver_id = $2
            ORDER BY created_at DESC
            LIMIT 1
        `, [senderId, receiverId]);

        if (existingRequest.rows.length > 0) {
            const request = existingRequest.rows[0];
            
            // If there's an active pending request, don't allow duplicate
            if (request.status === 'pending' && new Date(request.expires_at) > new Date()) {
                return res.status(409).json({
                    success: false,
                    error: 'Friend request already sent',
                    code: 'REQUEST_EXISTS'
                });
            }
            
            // If there's an old request (expired, declined, cancelled), delete it and allow new one
            if (request.status !== 'pending' || new Date(request.expires_at) <= new Date()) {
                console.log(`🗑️ Deleting old friend request with status: ${request.status}`);
                await pool.query('DELETE FROM friend_requests WHERE id = $1', [request.id]);
            }
        }

        // Check if there's a reverse request (receiver sent to sender)
        const reverseRequest = await pool.query(`
            SELECT id FROM friend_requests 
            WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
        `, [receiverId, senderId]);

        if (reverseRequest.rows.length > 0) {
            // Auto-accept the reverse request instead of creating new one
            const client = await getClient();
            try {
                await client.query('BEGIN');

                // Update the existing request to accepted
                await client.query(`
                    UPDATE friend_requests 
                    SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [reverseRequest.rows[0].id]);

                // Create friendship (ensure proper ordering)
                const [user1, user2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
                
                // Check if friendship already exists
                const existingFriendship = await client.query(`
                    SELECT id FROM friendships 
                    WHERE user1_id = $1 AND user2_id = $2 AND status = 'active'
                `, [user1, user2]);
                
                if (existingFriendship.rows.length === 0) {
                    await client.query(`
                        INSERT INTO friendships (user1_id, user2_id, status)
                        VALUES ($1, $2, 'active')
                    `, [user1, user2]);
                    console.log(`✅ Created new friendship between users ${user1} and ${user2}`);
                } else {
                    console.log(`ℹ️ Friendship already exists between users ${user1} and ${user2}`);
                }

                // Create notifications for both users
                await client.query(`
                    INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
                    VALUES ($1, $2, 'friend_accepted', $3, $4)
                `, [
                    receiverId,
                    senderId,
                    `${req.user.username} accepted your friend request`,
                    JSON.stringify({ auto_accepted: true })
                ]);
                
                await client.query(`
                    INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
                    VALUES ($1, $2, 'friend_accepted', $3, $4)
                `, [
                    senderId,
                    receiverId,
                    `${receiver.username} is now your friend`,
                    JSON.stringify({ auto_accepted: true })
                ]);

                // Log activities
                await client.query(`
                    INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                    VALUES ($1, $2, 'friend_request_accepted', $3, $4)
                `, [senderId, receiverId, req.ip, req.get('User-Agent')]);
                
                await client.query(`
                    INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                    VALUES ($1, $2, 'friend_request_accepted', $3, $4)
                `, [receiverId, senderId, req.ip, req.get('User-Agent')]);

                await client.query('COMMIT');

                console.log(`✅ Auto-accepted reverse friend request between ${senderId} and ${receiverId}`);

                return res.json({
                    success: true,
                    message: `You are now friends with ${receiver.full_name}!`,
                    auto_accepted: true,
                    friend: {
                        id: receiverId,
                        username: receiver.username,
                        full_name: receiver.full_name
                    }
                });

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }

        // Validate message length
        if (message && message.length > 500) {
            return res.status(400).json({
                success: false,
                error: 'Message is too long (max 500 characters)',
                code: 'MESSAGE_TOO_LONG'
            });
        }

        // Create new friend request
        const result = await pool.query(`
            INSERT INTO friend_requests (sender_id, receiver_id, message, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING id, created_at, expires_at
        `, [senderId, receiverId, message || null]);

        const newRequest = result.rows[0];

        // Create notification for receiver
        await pool.query(`
            INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
            VALUES ($1, $2, 'friend_request', $3, $4)
        `, [
            receiverId,
            senderId,
            `${req.user.username} sent you a friend request`,
            JSON.stringify({
                request_id: newRequest.id,
                message: message || null,
                sender: {
                    id: senderId,
                    username: req.user.username,
                    full_name: req.user.full_name
                }
            })
        ]);

        // Send real-time notification if user is online
        if (global.io) {
            const receiverSockets = await getSocketsForUser(receiverId);
            if (receiverSockets.length > 0) {
                const notificationData = {
                    type: 'friend_request',
                    title: 'New Friend Request',
                    message: `${req.user.full_name || req.user.username} sent you a friend request`,
                    sender: {
                        id: senderId,
                        username: req.user.username,
                        full_name: req.user.full_name || req.user.username
                    },
                    request_id: newRequest.id,
                    sound: true,
                    timestamp: new Date().toISOString()
                };
                
                receiverSockets.forEach(socketId => {
                    global.io.to(socketId).emit('friend_request_received', notificationData);
                });
                
                console.log(`🔔 Real-time friend request notification sent to user ${receiverId}`);
            }
        }

        // Log the activity
        await pool.query(`
            INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
            VALUES ($1, $2, 'friend_request_sent', $3, $4)
        `, [senderId, receiverId, req.ip, req.get('User-Agent')]);

        console.log(`✅ Friend request sent successfully from ${senderId} to ${receiverId}`);

        res.json({
            success: true,
            message: `Friend request sent to ${receiver.full_name}`,
            request: {
                id: newRequest.id,
                receiver: {
                    id: receiverId,
                    username: receiver.username,
                    full_name: receiver.full_name
                },
                message: message || null,
                created_at: newRequest.created_at,
                expires_at: newRequest.expires_at
            }
        });

    } catch (error) {
        console.error('❌ Error sending friend request:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to send friend request',
            code: 'SEND_REQUEST_ERROR'
        });
    }
});

/**
 * PUT /api/friend-requests/:requestId/accept
 * Accept a friend request
 */
router.put('/:requestId/accept', friendActionsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        console.log(`✅ Accepting friend request ${requestId} for user ${userId}`);

        if (!requestId || isNaN(requestId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request ID',
                code: 'INVALID_REQUEST_ID'
            });
        }

        // Get the friend request
        const requestResult = await pool.query(`
            SELECT fr.*, u.username, u.full_name
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            WHERE fr.id = $1 AND fr.receiver_id = $2 AND fr.status = 'pending'
        `, [requestId, userId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Friend request not found or already processed',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        const request = requestResult.rows[0];
        const senderId = request.sender_id;

        // Check if request has expired
        if (new Date(request.expires_at) < new Date()) {
            await pool.query(`
                UPDATE friend_requests 
                SET status = 'expired', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [requestId]);

            return res.status(410).json({
                success: false,
                error: 'Friend request has expired',
                code: 'REQUEST_EXPIRED'
            });
        }

        // Start transaction
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // Update request status
            await client.query(`
                UPDATE friend_requests 
                SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [requestId]);

            // Create friendship (ensure proper ordering)
            const [user1, user2] = senderId < userId ? [senderId, userId] : [userId, senderId];
            
            // Check if friendship already exists
            const existingFriendship = await client.query(`
                SELECT id FROM friendships 
                WHERE user1_id = $1 AND user2_id = $2 AND status = 'active'
            `, [user1, user2]);
            
            if (existingFriendship.rows.length === 0) {
                await client.query(`
                    INSERT INTO friendships (user1_id, user2_id, status)
                    VALUES ($1, $2, 'active')
                `, [user1, user2]);
                console.log(`✅ Created new friendship between users ${user1} and ${user2}`);
            } else {
                console.log(`ℹ️ Friendship already exists between users ${user1} and ${user2}`);
            }

            // Create notifications for both users
            await client.query(`
                INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
                VALUES ($1, $2, 'friend_accepted', $3, $4)
            `, [
                senderId,
                userId,
                `${req.user.username} accepted your friend request`,
                JSON.stringify({
                    request_id: requestId,
                    accepted_by: {
                        id: userId,
                        username: req.user.username,
                        full_name: req.user.full_name
                    }
                })
            ]);
            
            await client.query(`
                INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
                VALUES ($1, $2, 'friend_accepted', $3, $4)
            `, [
                userId,
                senderId,
                `You are now friends with ${request.full_name}`,
                JSON.stringify({
                    request_id: requestId,
                    friend: {
                        id: senderId,
                        username: request.username,
                        full_name: request.full_name
                    }
                })
            ]);

            // Log activities for both users
            await client.query(`
                INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                VALUES ($1, $2, 'friend_request_accepted', $3, $4)
            `, [userId, senderId, req.ip, req.get('User-Agent')]);
            
            await client.query(`
                INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
                VALUES ($1, $2, 'friend_request_accepted', $3, $4)
            `, [senderId, userId, req.ip, req.get('User-Agent')]);

            await client.query('COMMIT');

            // Send real-time notification to sender
            if (global.io) {
                const senderSockets = await getSocketsForUser(senderId);
                if (senderSockets.length > 0) {
                    const notificationData = {
                        type: 'friend_accepted',
                        title: 'Friend Request Accepted',
                        message: `${req.user.full_name || req.user.username} accepted your friend request`,
                        friend: {
                            id: userId,
                            username: req.user.username,
                            full_name: req.user.full_name || req.user.username
                        },
                        sound: true,
                        timestamp: new Date().toISOString()
                    };
                    
                    senderSockets.forEach(socketId => {
                        global.io.to(socketId).emit('friend_request_accepted', notificationData);
                    });
                    
                    console.log(`🔔 Friend accepted notification sent to user ${senderId}`);
                }
            }

            console.log(`✅ Friend request ${requestId} accepted successfully`);

            res.json({
                success: true,
                message: `You are now friends with ${request.full_name}!`,
                friend: {
                    id: senderId,
                    username: request.username,
                    full_name: request.full_name
                },
                request_id: requestId
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error accepting friend request:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to accept friend request',
            code: 'ACCEPT_REQUEST_ERROR'
        });
    }
});

/**
 * PUT /api/friend-requests/:requestId/decline
 * Decline a friend request
 */
router.put('/:requestId/decline', friendActionsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        console.log(`❌ Declining friend request ${requestId} for user ${userId}`);

        if (!requestId || isNaN(requestId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request ID',
                code: 'INVALID_REQUEST_ID'
            });
        }

        // Get the friend request
        const requestResult = await pool.query(`
            SELECT fr.*, u.username, u.full_name
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            WHERE fr.id = $1 AND fr.receiver_id = $2 AND fr.status = 'pending'
        `, [requestId, userId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Friend request not found or already processed',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        const request = requestResult.rows[0];
        const senderId = request.sender_id;

        // Update request status
        await pool.query(`
            UPDATE friend_requests 
            SET status = 'declined', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [requestId]);

        // Create notification for sender
        await pool.query(`
            INSERT INTO friend_notifications (user_id, sender_id, type, message, data)
            VALUES ($1, $2, 'friend_declined', $3, $4)
        `, [
            senderId,
            userId,
            `${req.user.username} declined your friend request`,
            JSON.stringify({
                request_id: requestId,
                declined_by: {
                    id: userId,
                    username: req.user.username,
                    full_name: req.user.full_name
                }
            })
        ]);

        // Log the activity
        await pool.query(`
            INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
            VALUES ($1, $2, 'friend_request_declined', $3, $4)
        `, [userId, senderId, req.ip, req.get('User-Agent')]);

        console.log(`✅ Friend request ${requestId} declined successfully`);

        res.json({
            success: true,
            message: 'Friend request declined',
            request_id: requestId,
            sender: {
                id: senderId,
                username: request.username,
                full_name: request.full_name
            }
        });

    } catch (error) {
        console.error('❌ Error declining friend request:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to decline friend request',
            code: 'DECLINE_REQUEST_ERROR'
        });
    }
});

/**
 * DELETE /api/friend-requests/:requestId
 * Cancel a sent friend request
 */
router.delete('/:requestId', friendActionsRateLimit, async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = parseInt(req.params.requestId);

        console.log(`🗑️ Cancelling friend request ${requestId} for user ${userId}`);

        if (!requestId || isNaN(requestId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request ID',
                code: 'INVALID_REQUEST_ID'
            });
        }

        // Get the friend request (only sender can cancel)
        const requestResult = await pool.query(`
            SELECT fr.*, u.username, u.full_name
            FROM friend_requests fr
            JOIN users u ON fr.receiver_id = u.id
            WHERE fr.id = $1 AND fr.sender_id = $2 AND fr.status = 'pending'
        `, [requestId, userId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Friend request not found or cannot be cancelled',
                code: 'REQUEST_NOT_FOUND'
            });
        }

        const request = requestResult.rows[0];
        const receiverId = request.receiver_id;

        // Update request status
        await pool.query(`
            UPDATE friend_requests 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [requestId]);

        // Log the activity
        await pool.query(`
            INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
            VALUES ($1, $2, 'friend_request_cancelled', $3, $4)
        `, [userId, receiverId, req.ip, req.get('User-Agent')]);

        console.log(`✅ Friend request ${requestId} cancelled successfully`);

        res.json({
            success: true,
            message: 'Friend request cancelled',
            request_id: requestId,
            receiver: {
                id: receiverId,
                username: request.username,
                full_name: request.full_name
            }
        });

    } catch (error) {
        console.error('❌ Error cancelling friend request:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to cancel friend request',
            code: 'CANCEL_REQUEST_ERROR'
        });
    }
});

/**
 * GET /api/friend-requests/received
 * Get received friend requests (pending)
 */
router.get('/received', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        console.log(`📨 Getting received friend requests for user ${userId}`);

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await pool.query(`
            SELECT 
                fr.id,
                fr.sender_id,
                u.username as sender_username,
                u.full_name as sender_full_name,
                u.native_language as sender_language,
                u.is_verified as sender_verified,
                u.status as sender_status,
                fr.message,
                fr.created_at,
                fr.expires_at,
                COALESCE(up.last_seen, u.last_login) as sender_last_activity,
                CASE 
                    WHEN up.status = 'online' AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes') 
                    THEN 'online'
                    WHEN up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '30 minutes') 
                    THEN 'away'
                    WHEN u.last_login > (CURRENT_TIMESTAMP - INTERVAL '1 hour') 
                    THEN 'away'
                    ELSE 'offline'
                END as sender_online_status
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            LEFT JOIN user_presence up ON up.user_id = u.id
            WHERE fr.receiver_id = $1 
            AND fr.status = 'pending'
            AND fr.expires_at > CURRENT_TIMESTAMP
            AND u.is_blocked = FALSE
            ORDER BY fr.created_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, parseInt(limit), offset]);

        // Get total count for pagination
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            WHERE fr.receiver_id = $1 
            AND fr.status = 'pending'
            AND fr.expires_at > CURRENT_TIMESTAMP
            AND u.is_blocked = FALSE
        `, [userId]);

        const totalRequests = parseInt(countResult.rows[0].total);

        console.log(`✅ Retrieved ${result.rows.length} received friend requests`);

        res.json({
            success: true,
            requests: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalRequests,
                pages: Math.ceil(totalRequests / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ Error getting received friend requests:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friend requests',
            code: 'GET_RECEIVED_REQUESTS_ERROR'
        });
    }
});

/**
 * GET /api/friend-requests/sent
 * Get sent friend requests
 */
router.get('/sent', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status = 'pending' } = req.query;

        console.log(`📤 Getting sent friend requests for user ${userId}`);

        const validStatuses = ['pending', 'accepted', 'declined', 'cancelled', 'expired'];
        const filterStatus = validStatuses.includes(status) ? status : 'pending';

        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `
            SELECT 
                fr.id,
                fr.receiver_id,
                u.username as receiver_username,
                u.full_name as receiver_full_name,
                u.native_language as receiver_language,
                u.is_verified as receiver_verified,
                u.status as receiver_status,
                fr.message,
                fr.status,
                fr.created_at,
                fr.updated_at,
                fr.expires_at,
                COALESCE(up.last_seen, u.last_login) as receiver_last_activity,
                CASE 
                    WHEN up.status = 'online' AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes') 
                    THEN 'online'
                    WHEN up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '30 minutes') 
                    THEN 'away'
                    WHEN u.last_login > (CURRENT_TIMESTAMP - INTERVAL '1 hour') 
                    THEN 'away'
                    ELSE 'offline'
                END as receiver_online_status
            FROM friend_requests fr
            JOIN users u ON fr.receiver_id = u.id
            LEFT JOIN user_presence up ON up.user_id = u.id
            WHERE fr.sender_id = $1 
            AND fr.status = $2
            AND u.is_blocked = FALSE
        `;

        // For pending requests, only show non-expired ones
        if (filterStatus === 'pending') {
            query += ` AND fr.expires_at > CURRENT_TIMESTAMP`;
        }

        query += ` ORDER BY fr.created_at DESC LIMIT $3 OFFSET $4`;

        const result = await pool.query(query, [userId, filterStatus, parseInt(limit), offset]);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM friend_requests fr
            JOIN users u ON fr.receiver_id = u.id
            WHERE fr.sender_id = $1 
            AND fr.status = $2
            AND u.is_blocked = FALSE
        `;

        if (filterStatus === 'pending') {
            countQuery += ` AND fr.expires_at > CURRENT_TIMESTAMP`;
        }

        const countResult = await pool.query(countQuery, [userId, filterStatus]);
        const totalRequests = parseInt(countResult.rows[0].total);

        console.log(`✅ Retrieved ${result.rows.length} sent friend requests`);

        res.json({
            success: true,
            requests: result.rows,
            status: filterStatus,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalRequests,
                pages: Math.ceil(totalRequests / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ Error getting sent friend requests:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve sent friend requests',  
            code: 'GET_SENT_REQUESTS_ERROR'
        });
    }
});

/**
 * GET /api/friend-requests/stats
 * Get friend request statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📊 Getting friend request stats for user ${userId}`);

        const result = await pool.query(`
            SELECT 
                COUNT(CASE WHEN fr.receiver_id = $1 AND fr.status = 'pending' AND fr.expires_at > CURRENT_TIMESTAMP THEN 1 END) as received_pending,
                COUNT(CASE WHEN fr.sender_id = $1 AND fr.status = 'pending' AND fr.expires_at > CURRENT_TIMESTAMP THEN 1 END) as sent_pending,
                COUNT(CASE WHEN fr.receiver_id = $1 AND fr.status = 'accepted' THEN 1 END) as received_accepted,
                COUNT(CASE WHEN fr.sender_id = $1 AND fr.status = 'accepted' THEN 1 END) as sent_accepted,
                COUNT(CASE WHEN fr.receiver_id = $1 AND fr.status = 'declined' THEN 1 END) as received_declined,
                COUNT(CASE WHEN fr.sender_id = $1 AND fr.status = 'declined' THEN 1 END) as sent_declined
            FROM friend_requests fr
            JOIN users u ON (u.id = fr.sender_id OR u.id = fr.receiver_id)
            WHERE (fr.receiver_id = $1 OR fr.sender_id = $1)
            AND u.is_blocked = FALSE
        `, [userId]);

        const stats = result.rows[0];

        console.log(`✅ Retrieved friend request stats for user ${userId}`);

        res.json({
            success: true,
            stats: {
                received: {
                    pending: parseInt(stats.received_pending) || 0,
                    accepted: parseInt(stats.received_accepted) || 0,
                    declined: parseInt(stats.received_declined) || 0
                },
                sent: {
                    pending: parseInt(stats.sent_pending) || 0,
                    accepted: parseInt(stats.sent_accepted) || 0,
                    declined: parseInt(stats.sent_declined) || 0
                },
                total_pending: (parseInt(stats.received_pending) || 0) + (parseInt(stats.sent_pending) || 0)
            }
        });

    } catch (error) {
        console.error('❌ Error getting friend request stats:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friend request statistics',
            code: 'GET_STATS_ERROR'
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
    const connectedSockets = await global.io.fetchSockets();
    
    for (const socket of connectedSockets) {
        if (socket.userId === userId) {
            sockets.push(socket.id);
        }
    }
    
    return sockets;
}

module.exports = router;
