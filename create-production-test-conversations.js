// Create test conversations directly on Railway production
const { Pool } = require('pg');

// This script connects directly to Railway's production database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createProductionTestConversations() {
    try {
        console.log('🌐 Connecting to production database...');
        
        // Get available users from production
        const usersResult = await pool.query(`
            SELECT id, username FROM users 
            WHERE username IN ('IrinelT', 'SilviuT') OR id IN (13, 14) 
            ORDER BY id LIMIT 5
        `);
        
        console.log('👥 Found users in production:', usersResult.rows);
        
        if (usersResult.rows.length < 2) {
            console.log('❌ Need at least 2 users in production');
            return;
        }
        
        // Create conversations between users
        for (let i = 0; i < usersResult.rows.length - 1; i++) {
            const user1 = usersResult.rows[i];
            const user2 = usersResult.rows[i + 1];
            
            console.log(`💬 Creating conversation: ${user1.username} ↔ ${user2.username}`);
            
            // Check if conversation exists
            const existingConv = await pool.query(`
                SELECT id FROM chat_conversations 
                WHERE (participant_1 = $1 AND participant_2 = $2) 
                   OR (participant_1 = $2 AND participant_2 = $1)
            `, [user1.id, user2.id]);
            
            if (existingConv.rows.length > 0) {
                console.log(`✅ Conversation already exists: ${existingConv.rows[0].id}`);
                continue;
            }
            
            // Create new conversation
            const convResult = await pool.query(`
                INSERT INTO chat_conversations (participant_1, participant_2, created_at, updated_at)
                VALUES ($1, $2, NOW(), NOW())
                RETURNING *
            `, [user1.id, user2.id]);
            
            console.log(`✅ Created conversation ${convResult.rows[0].id}`);
            
            // Add test messages
            const messages = [
                `Hey ${user2.username}! How are you?`,
                `Hello ${user1.username}! I'm doing great, thanks for asking!`,
                `That's wonderful! Ready to test the chat system?`,
                `Absolutely! This looks amazing! 🚀`
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
                console.log(`  📝 Added message: "${messages[j]}"`);
            }
            
            // Update conversation with last message
            await pool.query(`
                UPDATE chat_conversations 
                SET last_message_id = $1, updated_at = NOW()
                WHERE id = $2
            `, [lastMessageId, convResult.rows[0].id]);
            
            console.log(`🔗 Updated conversation with last message`);
        }
        
        // Verify what we created
        const finalCheck = await pool.query(`
            SELECT 
                c.id,
                c.participant_1,
                c.participant_2,
                u1.username as user1,
                u2.username as user2,
                lm.message_content as last_message
            FROM chat_conversations c
            LEFT JOIN users u1 ON c.participant_1 = u1.id
            LEFT JOIN users u2 ON c.participant_2 = u2.id
            LEFT JOIN chat_messages lm ON c.last_message_id = lm.id
            ORDER BY c.updated_at DESC
        `);
        
        console.log('🎉 Final production conversations:');
        finalCheck.rows.forEach(conv => {
            console.log(`  ${conv.id}: ${conv.user1} ↔ ${conv.user2} - "${conv.last_message}"`);
        });
        
        console.log('✅ Production test data creation complete!');
        
    } catch (error) {
        console.error('❌ Error creating production test data:', error);
    } finally {
        await pool.end();
    }
}

createProductionTestConversations();