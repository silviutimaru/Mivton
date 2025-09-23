/**
 * Complete Chat System API Routes
 * Full-featured chat system with real-time messaging, notifications, and status tracking
 */

const express = require('express');
const router = express.Router();
const { query, saveMessage, getConversation } = require('../database/query-adapter');
const { getDb } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { chatMonitor } = require('../utils/chat-monitor');

// Rate limiting for chat operations
const chatRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 chat requests per minute
    message: {
        error: 'Too many chat requests. Please try again later.',
        code: 'CHAT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `chat_${req.user?.id || req.ip}`
});

// Apply rate limiting and authentication
router.use(chatRateLimit);
router.use(requireAuth);

/**
 * POST /api/chat/send
 * Send a message with complete status tracking
 */
router.post('/send', async (req, res) => {
    try {
        const { 
            recipientId, 
            message, 
            messageType = 'text',
            replyToId = null,
            originalText = null,
            translatedText = null,
            originalLang = 'en',
            translatedLang = 'en'
        } = req.body;
        
        const senderId = req.user.id;

        // Validate input
        if (!recipientId || !message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Recipient ID and message are required'
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Message too long (max 2000 characters)'
            });
        }

        if (senderId === parseInt(recipientId)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot send message to yourself'
            });
        }

           console.log(`💬 Sending message: ${senderId} -> ${recipientId}`);
           chatMonitor.logMessageSent(senderId, recipientId, message, Date.now());

           // Save message using database adapter
           const savedMessage = await saveMessage(
               senderId, 
               parseInt(recipientId), 
               message.trim(),
               originalText || message.trim(),
               translatedText || message.trim(),
               originalLang,
               translatedLang
           );

           if (!savedMessage) {
               return res.status(500).json({
                   success: false,
                   error: 'Failed to save message'
               });
           }

        // Get sender information
        const senderResult = await query(
            'SELECT id, full_name, username, status FROM users WHERE id = $1',
            [senderId]
        );

        const sender = senderResult.rows[0];

        // Send real-time notification to recipient
        try {
            if (global.io) {
                // Emit to recipient's personal room
                global.io.to(`user:${recipientId}`).emit('new_message', {
                    message: savedMessage,
                    sender: sender,
                    timestamp: new Date().toISOString()
                });
                
                // Also emit a notification
                global.io.to(`user:${recipientId}`).emit('message_notification', {
                    type: 'new_message',
                    from: sender.full_name,
                    message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                    timestamp: new Date().toISOString()
                });
                
                console.log(`📢 Notification sent to user ${recipientId} for new message from ${sender.full_name}`);
            }
        } catch (notificationError) {
            console.warn('⚠️ Failed to send real-time notification:', notificationError.message);
        }

        // Return success with complete message data
        res.json({
            success: true,
            message: {
                id: savedMessage.id,
                senderId: savedMessage.sender_id,
                recipientId: savedMessage.recipient_id,
                body: savedMessage.body,
                originalText: savedMessage.original_text,
                translatedText: savedMessage.translated_text,
                originalLang: savedMessage.original_lang,
                translatedLang: savedMessage.translated_lang,
                messageType: savedMessage.message_type,
                status: savedMessage.status,
                createdAt: savedMessage.created_at,
                sender: {
                    id: sender.id,
                    fullName: sender.full_name,
                    username: sender.username,
                    status: sender.status
                }
            }
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/conversation/:userId
 * Get conversation with a specific user
 */
router.get('/conversation/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (userId === currentUserId.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot get conversation with yourself'
            });
        }

           console.log(`📨 Getting conversation: ${currentUserId} <-> ${userId}`);

           // Get conversation messages using database adapter
           const messages = await getConversation(currentUserId, userId, parseInt(limit), parseInt(offset));

        // Get friend information
        const friendResult = await query(
            'SELECT id, full_name, username, status FROM users WHERE id = $1',
            [userId]
        );

        const friend = friendResult.rows[0];

        if (!friend) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            conversation: messages,
            friend: {
                id: friend.id,
                fullName: friend.full_name,
                username: friend.username,
                status: friend.status
            },
            count: messages.length
        });

    } catch (error) {
        console.error('❌ Error getting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/conversations
 * Get all conversations for current user
 */
router.get('/conversations', async (req, res) => {
    try {
        const currentUserId = req.user.id;

        console.log(`📬 Getting conversations for user: ${currentUserId}`);

        // Get user conversations
        const result = await query(
            `SELECT * FROM get_user_conversations($1)`,
            [currentUserId]
        );

        res.json({
            success: true,
            conversations: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Error getting conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/chat/mark-read/:userId
 * Mark messages from a user as read
 */
router.post('/mark-read/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        console.log(`👁️ Marking messages as read: ${userId} -> ${currentUserId}`);

        // Mark messages as read
        const result = await query(
            `SELECT mark_messages_as_read($1, $2)`,
            [currentUserId, parseInt(userId)]
        );

        const updatedCount = result.rows[0].mark_messages_as_read;

        res.json({
            success: true,
            updatedCount: updatedCount,
            message: `Marked ${updatedCount} messages as read`
        });

    } catch (error) {
        console.error('❌ Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/unread-count
 * Get total unread message count for current user
 */
router.get('/unread-count', async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Get total unread count
        const result = await query(
            `SELECT SUM(
                CASE 
                    WHEN user_a = $1 THEN unread_count_a 
                    ELSE unread_count_b 
                END
            ) as total_unread
            FROM conversations 
            WHERE user_a = $1 OR user_b = $1`,
            [currentUserId]
        );

        const totalUnread = result.rows[0].total_unread || 0;

        res.json({
            success: true,
            unreadCount: parseInt(totalUnread)
        });

    } catch (error) {
        console.error('❌ Error getting unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/chat/typing
 * Update typing indicator
 */
router.post('/typing', async (req, res) => {
    try {
        const { targetUserId, isTyping } = req.body;
        const currentUserId = req.user.id;

        if (!targetUserId || typeof isTyping !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'Target user ID and typing status are required'
            });
        }

        if (currentUserId === parseInt(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot set typing indicator for yourself'
            });
        }

        console.log(`⌨️ Typing indicator: ${currentUserId} -> ${targetUserId} (${isTyping})`);

        if (isTyping) {
            // Insert or update typing indicator
            await query(
                `INSERT INTO typing_indicators (user_id, target_user_id, is_typing, started_at)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                 ON CONFLICT (user_id, target_user_id)
                 DO UPDATE SET is_typing = $3, started_at = CURRENT_TIMESTAMP`,
                [currentUserId, parseInt(targetUserId), isTyping]
            );
        } else {
            // Remove typing indicator
            await query(
                `DELETE FROM typing_indicators WHERE user_id = $1 AND target_user_id = $2`,
                [currentUserId, parseInt(targetUserId)]
            );
        }

        res.json({
            success: true,
            message: `Typing indicator ${isTyping ? 'started' : 'stopped'}`
        });

    } catch (error) {
        console.error('❌ Error updating typing indicator:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/typing/:userId
 * Get typing indicator for a user
 */
router.get('/typing/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        // Get typing indicator
        const result = await query(
            `SELECT is_typing, started_at FROM typing_indicators 
             WHERE user_id = $1 AND target_user_id = $2`,
            [parseInt(userId), currentUserId]
        );

        const typing = result.rows[0];

        res.json({
            success: true,
            isTyping: typing ? typing.is_typing : false,
            startedAt: typing ? typing.started_at : null
        });

    } catch (error) {
        console.error('❌ Error getting typing indicator:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/chat/reaction
 * Add or remove message reaction
 */
router.post('/reaction', async (req, res) => {
    try {
        const { messageId, reaction } = req.body;
        const currentUserId = req.user.id;

        if (!messageId || !reaction) {
            return res.status(400).json({
                success: false,
                error: 'Message ID and reaction are required'
            });
        }

        console.log(`😊 Adding reaction: ${currentUserId} -> ${messageId} (${reaction})`);

        // Remove existing reaction if exists
        await query(
            `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
            [parseInt(messageId), currentUserId]
        );

        // Add new reaction
        const result = await query(
            `INSERT INTO message_reactions (message_id, user_id, reaction)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [parseInt(messageId), currentUserId, reaction]
        );

        res.json({
            success: true,
            reactionId: result.rows[0].id,
            message: 'Reaction added successfully'
        });

    } catch (error) {
        console.error('❌ Error adding reaction:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/reactions/:messageId
 * Get reactions for a message
 */
router.get('/reactions/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;

        // Get message reactions
        const result = await query(
            `SELECT mr.id, mr.reaction, mr.created_at, u.full_name, u.username
             FROM message_reactions mr
             LEFT JOIN users u ON u.id = mr.user_id
             WHERE mr.message_id = $1
             ORDER BY mr.created_at ASC`,
            [parseInt(messageId)]
        );

        res.json({
            success: true,
            reactions: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        console.error('❌ Error getting reactions:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/status
 * Get chat system status
 */
router.get('/status', async (req, res) => {
    try {
        // Check database connection and tables
        const tablesResult = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('messages', 'conversations', 'message_status', 'typing_indicators')
        `);

        const availableTables = tablesResult.rows.map(row => row.table_name);

        res.json({
            success: true,
            status: 'operational',
            features: {
                messaging: availableTables.includes('messages'),
                conversations: availableTables.includes('conversations'),
                statusTracking: availableTables.includes('message_status'),
                typingIndicators: availableTables.includes('typing_indicators'),
                reactions: true,
                notifications: true
            },
            availableTables: availableTables,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting chat status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            status: 'error'
        });
    }
});

/**
 * GET /api/chat/monitor/logs
 * Get chat system logs for monitoring
 */
router.get('/monitor/logs', async (req, res) => {
    try {
        const { category, level, limit = 100 } = req.query;
        
        let logs;
        if (category) {
            logs = chatMonitor.getLogsByCategory(category, parseInt(limit));
        } else if (level) {
            logs = chatMonitor.getLogsByLevel(level, parseInt(limit));
        } else {
            logs = chatMonitor.getRecentLogs(parseInt(limit));
        }

        res.json({
            success: true,
            logs: logs,
            count: logs.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting monitor logs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/monitor/metrics
 * Get chat system metrics for monitoring
 */
router.get('/monitor/metrics', async (req, res) => {
    try {
        const metrics = chatMonitor.getMetrics();
        
        res.json({
            success: true,
            metrics: metrics,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting monitor metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/monitor/health
 * Get chat system health status
 */
router.get('/monitor/health', async (req, res) => {
    try {
        const health = chatMonitor.getHealthStatus();
        
        res.json({
            success: true,
            health: health,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting monitor health:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * DELETE /api/chat/monitor/logs
 * Clear chat system logs
 */
router.delete('/monitor/logs', async (req, res) => {
    try {
        const clearedCount = chatMonitor.clearLogs();
        
        res.json({
            success: true,
            message: `Cleared ${clearedCount} log entries`,
            clearedCount: clearedCount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error clearing monitor logs:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
