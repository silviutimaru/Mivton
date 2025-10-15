const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');

// Middleware to ensure user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.user && !req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// GET /api/chat/conversations - Get user's conversations
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        console.log(`🔍 Loading conversations for user ${userId}`);
        
        // First, check if chat tables exist
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'chat_conversations'
            ) as table_exists
        `);
        
        if (!tableCheck.rows[0].table_exists) {
            console.log('⚠️ Chat tables do not exist yet');
            return res.json({
                success: true,
                conversations: [],
                message: 'Chat tables not initialized yet'
            });
        }

        // Debug: Check what conversations exist
        const debugResult = await pool.query(`
            SELECT id, participant_1, participant_2 FROM chat_conversations
        `);
        console.log(`🔍 All conversations in DB:`, debugResult.rows);
        console.log(`🔍 Looking for userId: ${userId} (type: ${typeof userId})`);

        const result = await pool.query(`
            SELECT
                c.id,
                c.participant_1,
                c.participant_2,
                c.created_at,
                c.updated_at,
                c.last_message_id,
                CASE
                    WHEN c.participant_1 = $1 THEN (SELECT username FROM users WHERE id = c.participant_2)
                    ELSE (SELECT username FROM users WHERE id = c.participant_1)
                END as other_username,
                CASE
                    WHEN c.participant_1 = $1 THEN c.participant_2
                    ELSE c.participant_1
                END as other_user_id,
                (SELECT message_content FROM chat_messages WHERE id = c.last_message_id) as last_message_content,
                (SELECT created_at FROM chat_messages WHERE id = c.last_message_id) as last_message_time,
                (SELECT sender_id FROM chat_messages WHERE id = c.last_message_id) as last_message_sender,
                (
                    SELECT COUNT(*)::integer
                    FROM chat_messages cm
                    WHERE cm.conversation_id = c.id
                    AND cm.sender_id != $1
                    AND NOT EXISTS (
                        SELECT 1 FROM message_status ms
                        WHERE ms.message_id = cm.id
                        AND ms.user_id = $1
                        AND ms.status = 'read'
                    )
                ) as unread_count
            FROM chat_conversations c
            WHERE c.participant_1 = $1 OR c.participant_2 = $1
            ORDER BY COALESCE(c.updated_at, c.created_at) DESC
        `, [userId]);

        console.log(`✅ Found ${result.rows.length} conversations for user ${userId}`);
        console.log(`📋 Conversations data:`, JSON.stringify(result.rows, null, 2));
        
        res.json({
            success: true,
            conversations: result.rows
        });

    } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        console.error('❌ Full error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch conversations',
            details: error.message 
        });
    }
});

// POST /api/chat/messages - Send a new message
router.post('/messages', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const { recipientId, content } = req.body;

        console.log(`💬 POST /messages - User ${userId} sending to ${recipientId}`);
        console.log(`📝 Message content length: ${content?.length}`);

        if (!recipientId || !content || content.trim().length === 0) {
            console.log('❌ Missing recipient or content');
            return res.status(400).json({
                success: false,
                error: 'Recipient and message content are required'
            });
        }

        if (recipientId === userId) {
            console.log('❌ User trying to message themselves');
            return res.status(400).json({
                success: false,
                error: 'Cannot send message to yourself'
            });
        }

        // Check if chat tables exist
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'chat_conversations'
            ) as table_exists
        `);

        if (!tableCheck.rows[0].table_exists) {
            console.log('❌ Chat tables do not exist!');
            return res.status(500).json({
                success: false,
                error: 'Chat system not initialized'
            });
        }

        console.log('✅ Chat tables exist');

        // Check if recipient exists and is friends with sender
        const friendCheck = await pool.query(`
            SELECT 1 FROM friendships 
            WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            AND status = 'active'
        `, [userId, recipientId]);

        if (friendCheck.rows.length === 0) {
            console.log(`❌ Users ${userId} and ${recipientId} are not friends`);
            return res.status(403).json({
                success: false,
                error: 'Can only send messages to friends'
            });
        }

        console.log(`✅ Friendship verified`);

        // Find or create conversation
        let conversationResult = await pool.query(`
            SELECT id FROM chat_conversations
            WHERE (participant_1 = $1 AND participant_2 = $2)
               OR (participant_1 = $2 AND participant_2 = $1)
        `, [userId, recipientId]);

        let conversationId;
        if (conversationResult.rows.length === 0) {
            console.log(`📝 Creating new conversation between ${userId} and ${recipientId}`);
            // Create new conversation
            const newConv = await pool.query(`
                INSERT INTO chat_conversations (participant_1, participant_2)
                VALUES ($1, $2)
                RETURNING id
            `, [Math.min(userId, recipientId), Math.max(userId, recipientId)]);
            conversationId = newConv.rows[0].id;
            console.log(`✅ Created conversation ${conversationId}`);
        } else {
            conversationId = conversationResult.rows[0].id;
            console.log(`✅ Using existing conversation ${conversationId}`);
        }

        // Insert message
        console.log(`💾 Saving message to conversation ${conversationId}`);
        const messageResult = await pool.query(`
            INSERT INTO chat_messages (conversation_id, sender_id, message_content)
            VALUES ($1, $2, $3)
            RETURNING id, created_at
        `, [conversationId, userId, content.trim()]);

        console.log(`✅ Message saved with ID ${messageResult.rows[0].id}`);

        const messageId = messageResult.rows[0].id;

        // Update conversation's last message
        await pool.query(`
            UPDATE chat_conversations 
            SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [messageId, conversationId]);

        // Create message status for recipient
        await pool.query(`
            INSERT INTO message_status (message_id, user_id, status)
            VALUES ($1, $2, 'delivered')
        `, [messageId, recipientId]);

        res.json({
            success: true,
            message: {
                id: messageId,
                conversation_id: conversationId,
                sender_id: userId,
                message_content: content.trim(),
                created_at: messageResult.rows[0].created_at
            }
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send message' 
        });
    }
});

// GET /api/chat/messages/:conversationId - Get messages in a conversation
router.get('/messages/:conversationId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const conversationId = parseInt(req.params.conversationId);
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = (page - 1) * limit;

        // Verify user is participant in conversation
        const convCheck = await pool.query(`
            SELECT 1 FROM chat_conversations 
            WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)
        `, [conversationId, userId]);

        if (convCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied to this conversation' 
            });
        }

        // Get messages with sender info
        const messages = await pool.query(`
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.message_content as content,
                m.created_at,
                u.username as sender_username,
                ms.status as read_status
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = $2
            WHERE m.conversation_id = $1
            ORDER BY m.created_at DESC
            LIMIT $3 OFFSET $4
        `, [conversationId, userId, limit, offset]);

        res.json({
            success: true,
            messages: messages.rows.reverse(), // Show oldest first
            pagination: {
                page,
                limit,
                hasMore: messages.rows.length === limit
            }
        });

    } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch messages' 
        });
    }
});

// PUT /api/chat/conversations/:conversationId/read - Mark all messages in conversation as read
router.put('/conversations/:conversationId/read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const conversationId = parseInt(req.params.conversationId);

        console.log(`📖 Marking conversation ${conversationId} as read for user ${userId}`);

        // Verify user is participant
        const convCheck = await pool.query(`
            SELECT 1 FROM chat_conversations
            WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)
        `, [conversationId, userId]);

        if (convCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Mark all messages from other user as read
        const result = await pool.query(`
            INSERT INTO message_status (message_id, user_id, status)
            SELECT cm.id, $2, 'read'
            FROM chat_messages cm
            WHERE cm.conversation_id = $1
            AND cm.sender_id != $2
            ON CONFLICT (message_id, user_id)
            DO UPDATE SET status = 'read', updated_at = CURRENT_TIMESTAMP
        `, [conversationId, userId]);

        console.log(`✅ Marked ${result.rowCount} messages as read`);

        res.json({ success: true, markedCount: result.rowCount });

    } catch (error) {
        console.error('❌ Error marking conversation as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
});

// PUT /api/chat/messages/:messageId/read - Mark message as read
router.put('/messages/:messageId/read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const messageId = parseInt(req.params.messageId);

        // Verify message exists and user is recipient
        const messageCheck = await pool.query(`
            SELECT m.id, m.sender_id, c.participant_1, c.participant_2
            FROM chat_messages m
            JOIN chat_conversations c ON m.conversation_id = c.id
            WHERE m.id = $1 
            AND (c.participant_1 = $2 OR c.participant_2 = $2)
            AND m.sender_id != $2
        `, [messageId, userId]);

        if (messageCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Cannot mark this message as read' 
            });
        }

        // Check if message_status table exists and update or insert message status
        try {
            await pool.query(`
                INSERT INTO message_status (message_id, user_id, status, updated_at)
                VALUES ($1, $2, 'read', CURRENT_TIMESTAMP)
                ON CONFLICT (message_id, user_id) 
                DO UPDATE SET status = 'read', updated_at = CURRENT_TIMESTAMP
            `, [messageId, userId]);
        } catch (statusError) {
            console.error('⚠️ Error updating message status (table might not exist):', statusError.message);
            // Continue anyway - message read status is not critical
        }

        res.json({
            success: true,
            message: 'Message marked as read'
        });

    } catch (error) {
        console.error('❌ Error marking message as read:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to mark message as read' 
        });
    }
});

module.exports = router;