// Test endpoint to create chat conversations
const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');

// POST /api/admin/create-test-conversations - Create test chat data
router.post('/create-test-conversations', async (req, res) => {
    try {
        console.log('🧪 Creating test conversations...');
        
        // Get available users
        const usersResult = await pool.query(`
            SELECT id, username FROM users 
            ORDER BY id LIMIT 5
        `);
        
        if (usersResult.rows.length < 2) {
            return res.json({
                success: false,
                error: 'Need at least 2 users to create conversations'
            });
        }
        
        let conversationsCreated = 0;
        const results = [];
        
        // Create conversations between users
        for (let i = 0; i < usersResult.rows.length - 1; i++) {
            const user1 = usersResult.rows[i];
            const user2 = usersResult.rows[i + 1];
            
            // Check if conversation exists
            const existingConv = await pool.query(`
                SELECT id FROM chat_conversations 
                WHERE (participant_1 = $1 AND participant_2 = $2) 
                   OR (participant_1 = $2 AND participant_2 = $1)
            `, [user1.id, user2.id]);
            
            if (existingConv.rows.length > 0) {
                results.push(`Conversation exists: ${user1.username} ↔ ${user2.username}`);
                continue;
            }
            
            // Create new conversation
            const convResult = await pool.query(`
                INSERT INTO chat_conversations (participant_1, participant_2, created_at, updated_at)
                VALUES ($1, $2, NOW(), NOW())
                RETURNING *
            `, [user1.id, user2.id]);
            
            // Add test messages
            const messages = [
                `Hey ${user2.username}! How are you doing?`,
                `Hello ${user1.username}! I'm great, thanks!`,
                `Perfect! This chat system looks amazing! 🚀`,
                `I agree! Ready to start chatting properly?`
            ];
            
            let lastMessageId = null;
            
            for (let j = 0; j < messages.length; j++) {
                const sender = j % 2 === 0 ? user1.id : user2.id;
                const messageResult = await pool.query(`
                    INSERT INTO chat_messages (conversation_id, sender_id, message_content, created_at)
                    VALUES ($1, $2, $3, NOW() - interval '${messages.length - j} minutes')
                    RETURNING *
                `, [convResult.rows[0].id, sender, messages[j]]);
                
                lastMessageId = messageResult.rows[0].id;
            }
            
            // Update conversation with last message
            await pool.query(`
                UPDATE chat_conversations 
                SET last_message_id = $1, updated_at = NOW()
                WHERE id = $2
            `, [lastMessageId, convResult.rows[0].id]);
            
            conversationsCreated++;
            results.push(`Created: ${user1.username} ↔ ${user2.username} (${messages.length} messages)`);
        }
        
        res.json({
            success: true,
            message: `Created ${conversationsCreated} test conversations`,
            details: results,
            users_found: usersResult.rows.length
        });
        
    } catch (error) {
        console.error('❌ Error creating test conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create test conversations',
            details: error.message
        });
    }
});

// GET /api/admin/conversations-status - Check conversation status
router.get('/conversations-status', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.id,
                u1.username as user1,
                u2.username as user2,
                lm.message_content as last_message,
                c.updated_at
            FROM chat_conversations c
            LEFT JOIN users u1 ON c.participant_1 = u1.id
            LEFT JOIN users u2 ON c.participant_2 = u2.id
            LEFT JOIN chat_messages lm ON c.last_message_id = lm.id
            ORDER BY c.updated_at DESC
        `);
        
        res.json({
            success: true,
            total_conversations: result.rows.length,
            conversations: result.rows
        });
        
    } catch (error) {
        console.error('❌ Error checking conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check conversations',
            details: error.message
        });
    }
});

module.exports = router;