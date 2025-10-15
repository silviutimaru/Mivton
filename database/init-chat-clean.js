const { pool } = require('./connection');

async function initializeChatDatabase() {
    console.log('🔄 Initializing chat database schema...');
    
    try {
        // Create chat_conversations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_conversations (
                id SERIAL PRIMARY KEY,
                participant_1 INTEGER REFERENCES users(id) ON DELETE CASCADE,
                participant_2 INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_message_id INTEGER,
                UNIQUE(participant_1, participant_2),
                CHECK (participant_1 != participant_2)
            )
        `);
        console.log('✅ chat_conversations table created/verified');

        // Create chat_messages table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES chat_conversations(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                message_content TEXT NOT NULL,
                message_type VARCHAR(50) DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                edited_at TIMESTAMP NULL
            )
        `);
        console.log('✅ chat_messages table created/verified');

        // Create message_status table for read receipts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS message_status (
                id SERIAL PRIMARY KEY,
                message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'sent',
                status_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(message_id, user_id)
            )
        `);
        console.log('✅ message_status table created/verified');

        // Create indexes for performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants 
            ON chat_conversations(participant_1, participant_2)
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
            ON chat_messages(conversation_id, created_at DESC)
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_message_status_message 
            ON message_status(message_id, user_id)
        `);
        
        console.log('✅ Chat database indexes created/verified');

        // Update last_message_id foreign key constraint
        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'chat_conversations_last_message_id_fkey'
                ) THEN
                    ALTER TABLE chat_conversations 
                    ADD CONSTRAINT chat_conversations_last_message_id_fkey 
                    FOREIGN KEY (last_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;
                END IF;
            END $$
        `);
        console.log('✅ Foreign key constraint added for last_message_id');

        console.log('✅ Chat database schema initialization completed');
        return true;
        
    } catch (error) {
        console.error('❌ Chat database initialization failed:', error);
        throw error;
    }
}

async function isChatDatabaseInitialized() {
    try {
        // Check if the main chat tables exist
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'chat_conversations'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'chat_messages'  
            ) AND EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'message_status'
            ) as all_tables_exist
        `);
        
        return result.rows[0].all_tables_exist;
    } catch (error) {
        console.error('❌ Error checking chat database initialization:', error);
        return false;
    }
}

module.exports = { 
    initializeChatDatabase,
    isChatDatabaseInitialized 
};