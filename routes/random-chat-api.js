const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');

/**
 * 🎲 RANDOM CHAT REST API
 * HTTP endpoints for random chat system
 */

// Middleware to ensure user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.user && !req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// GET /api/random-chat/status - Check user's current status
router.get('/status', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;

        // Check if in queue
        const queueResult = await pool.query(`
            SELECT id, joined_at, status, gender_preference, language_preference
            FROM chat_queue
            WHERE user_id = $1 AND status = 'waiting'
        `, [userId]);

        if (queueResult.rows.length > 0) {
            return res.json({
                status: 'in_queue',
                data: queueResult.rows[0]
            });
        }

        // Check if in active chat
        const activeRoomResult = await pool.query(`
            SELECT
                cr.id as room_id,
                cr.user1_id,
                cr.user2_id,
                cr.started_at,
                CASE
                    WHEN cr.user1_id = $1 THEN u2.username
                    ELSE u1.username
                END as partner_username,
                CASE
                    WHEN cr.user1_id = $1 THEN cr.user2_id
                    ELSE cr.user1_id
                END as partner_id
            FROM chat_rooms cr
            LEFT JOIN users u1 ON cr.user1_id = u1.id
            LEFT JOIN users u2 ON cr.user2_id = u2.id
            WHERE (cr.user1_id = $1 OR cr.user2_id = $1)
            AND cr.status = 'active'
            ORDER BY cr.started_at DESC
            LIMIT 1
        `, [userId]);

        if (activeRoomResult.rows.length > 0) {
            return res.json({
                status: 'in_chat',
                data: activeRoomResult.rows[0]
            });
        }

        // User is idle
        res.json({
            status: 'idle',
            data: null
        });

    } catch (error) {
        console.error('❌ Error checking status:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// GET /api/random-chat/statistics - Get user's chat statistics
router.get('/statistics', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;

        const statsResult = await pool.query(`
            SELECT
                total_chats,
                total_messages_sent,
                total_messages_received,
                total_skips,
                times_skipped,
                times_reported,
                created_at
            FROM chat_statistics
            WHERE user_id = $1
        `, [userId]);

        if (statsResult.rows.length === 0) {
            // Create initial statistics record
            await pool.query(`
                INSERT INTO chat_statistics (user_id)
                VALUES ($1)
            `, [userId]);

            return res.json({
                total_chats: 0,
                total_messages_sent: 0,
                total_messages_received: 0,
                total_skips: 0,
                times_skipped: 0,
                times_reported: 0
            });
        }

        res.json(statsResult.rows[0]);

    } catch (error) {
        console.error('❌ Error fetching statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/random-chat/history - Get chat history
router.get('/history', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        const historyResult = await pool.query(`
            SELECT
                cr.id as room_id,
                cr.started_at,
                cr.ended_at,
                cr.total_messages,
                cr.status,
                CASE
                    WHEN cr.user1_id = $1 THEN u2.username
                    ELSE u1.username
                END as partner_username,
                CASE
                    WHEN cr.user1_id = $1 THEN cr.user2_id
                    ELSE cr.user1_id
                END as partner_id
            FROM chat_rooms cr
            LEFT JOIN users u1 ON cr.user1_id = u1.id
            LEFT JOIN users u2 ON cr.user2_id = u2.id
            WHERE (cr.user1_id = $1 OR cr.user2_id = $1)
            AND cr.status IN ('ended', 'skipped', 'abandoned')
            ORDER BY cr.started_at DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        // Get total count
        const countResult = await pool.query(`
            SELECT COUNT(*) as total
            FROM chat_rooms
            WHERE (user1_id = $1 OR user2_id = $1)
            AND status IN ('ended', 'skipped', 'abandoned')
        `, [userId]);

        res.json({
            history: historyResult.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].total),
                hasMore: offset + limit < parseInt(countResult.rows[0].total)
            }
        });

    } catch (error) {
        console.error('❌ Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// GET /api/random-chat/messages/:roomId - Get messages for a specific room
router.get('/messages/:roomId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const roomId = parseInt(req.params.roomId);

        // Verify user is participant in this room
        const roomCheck = await pool.query(`
            SELECT 1 FROM chat_rooms
            WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
        `, [roomId, userId]);

        if (roomCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get messages
        const messagesResult = await pool.query(`
            SELECT
                cm.id,
                cm.sender_id,
                cm.message_text,
                cm.message_type,
                cm.created_at,
                u.username as sender_username
            FROM chat_messages cm
            LEFT JOIN users u ON cm.sender_id = u.id
            WHERE cm.room_id = $1
            ORDER BY cm.created_at ASC
        `, [roomId]);

        res.json({
            roomId,
            messages: messagesResult.rows
        });

    } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/random-chat/report - Submit a user report
router.post('/report', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const { reportedUserId, roomId, reason, description } = req.body;

        if (!reportedUserId || !reason) {
            return res.status(400).json({ error: 'Reported user and reason are required' });
        }

        if (reportedUserId === userId) {
            return res.status(400).json({ error: 'Cannot report yourself' });
        }

        // Verify room exists and user was participant
        if (roomId) {
            const roomCheck = await pool.query(`
                SELECT 1 FROM chat_rooms
                WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
            `, [roomId, userId]);

            if (roomCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid room ID' });
            }
        }

        // Submit report
        await pool.query(`
            INSERT INTO chat_reports (reporter_id, reported_user_id, room_id, reason, description)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, reportedUserId, roomId || null, reason, description || null]);

        // Update statistics
        await pool.query(`
            INSERT INTO chat_statistics (user_id, times_reported)
            VALUES ($1, 1)
            ON CONFLICT (user_id)
            DO UPDATE SET times_reported = chat_statistics.times_reported + 1
        `, [reportedUserId]);

        res.json({
            success: true,
            message: 'Report submitted successfully'
        });

    } catch (error) {
        console.error('❌ Error submitting report:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// GET /api/random-chat/queue-size - Get current queue size (public)
router.get('/queue-size', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as size
            FROM chat_queue
            WHERE status = 'waiting'
        `);

        res.json({
            queueSize: parseInt(result.rows[0].size)
        });

    } catch (error) {
        console.error('❌ Error getting queue size:', error);
        res.status(500).json({ error: 'Failed to get queue size' });
    }
});

// GET /api/random-chat/global-stats - Get global statistics (public)
router.get('/global-stats', async (req, res) => {
    try {
        const statsResult = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM chat_rooms WHERE status = 'active') as active_chats,
                (SELECT COUNT(*) FROM chat_queue WHERE status = 'waiting') as users_in_queue,
                (SELECT COUNT(*) FROM chat_rooms) as total_chats_created,
                (SELECT SUM(total_messages) FROM chat_rooms) as total_messages_sent
        `);

        res.json(statsResult.rows[0]);

    } catch (error) {
        console.error('❌ Error fetching global stats:', error);
        res.status(500).json({ error: 'Failed to fetch global stats' });
    }
});

module.exports = router;
