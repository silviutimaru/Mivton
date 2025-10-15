// Simple test to create a conversation for testing
const { Pool } = require('pg');

// Load environment variables from .env file if it exists
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTestConversation() {
    try {
        console.log('🔍 Checking for existing users...');
        
        const usersResult = await pool.query('SELECT id, username FROM users ORDER BY id LIMIT 10');
        console.log('👥 Available users:', usersResult.rows);
        
        if (usersResult.rows.length < 2) {
            console.log('❌ Need at least 2 users to create a conversation');
            return;
        }
        
        const user1 = usersResult.rows[0];
        const user2 = usersResult.rows[1];
        
        console.log(`💬 Creating test conversation between ${user1.username} and ${user2.username}`);
        
        // First check if conversation already exists
        const existingConv = await pool.query(`
            SELECT * FROM chat_conversations 
            WHERE (participant_1 = $1 AND participant_2 = $2) 
               OR (participant_1 = $2 AND participant_2 = $1)
        `, [user1.id, user2.id]);
        
        if (existingConv.rows.length > 0) {
            console.log('✅ Conversation already exists:', existingConv.rows[0]);
            return;
        }
        
        // Create conversation
        const convResult = await pool.query(`
            INSERT INTO chat_conversations (participant_1, participant_2, created_at, updated_at)
            VALUES ($1, $2, NOW(), NOW())
            RETURNING *
        `, [user1.id, user2.id]);
        
        console.log('✅ Created conversation:', convResult.rows[0]);
        
        // Add a test message
        const messageResult = await pool.query(`
            INSERT INTO chat_messages (conversation_id, sender_id, message_content, created_at)
            VALUES ($1, $2, 'Hello! This is a test message.', NOW())
            RETURNING *
        `, [convResult.rows[0].id, user1.id]);
        
        console.log('✅ Created test message:', messageResult.rows[0]);
        
        // Update conversation with last message
        await pool.query(`
            UPDATE chat_conversations 
            SET last_message_id = $1, updated_at = NOW()
            WHERE id = $2
        `, [messageResult.rows[0].id, convResult.rows[0].id]);
        
        console.log('🎉 Test conversation setup complete!');
        
    } catch (error) {
        console.error('❌ Error creating test conversation:', error);
    }
}

createTestConversation();