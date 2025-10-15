const { getDb } = require('./connection');

/**
 * 💬 FRIEND CHAT DATABASE SCHEMA
 * Direct messaging between friends with persistence
 */

let isInitialized = false;

async function initializeChatSchema() {
    if (isInitialized) {
        return true;
    }

    const db = getDb();

    try {
        console.log('💬 Initializing friend chat database schema...');

        // 1. chat_conversations table - Stores conversation metadata
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_conversations (
                id SERIAL PRIMARY KEY,
                participant_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                participant_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_message_id INTEGER,

                UNIQUE(participant_1, participant_2),
                CHECK (participant_1 < participant_2),
                CHECK (participant_1 != participant_2)
            )
        `);
        console.log('✅ chat_conversations table created');

        // 2. chat_messages table - Stores all messages
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message_content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ chat_messages table created');

        // 3. message_status table - Tracks read/unread status
        await db.query(`
            CREATE TABLE IF NOT EXISTS message_status (
                id SERIAL PRIMARY KEY,
                message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'delivered' CHECK (status IN ('delivered', 'read')),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(message_id, user_id)
            )
        `);
        console.log('✅ message_status table created');

        // 4. Add foreign key for last_message_id
        await db.query(`
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
        console.log('✅ Foreign key constraint added');

        // 5. Create indexes for performance
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants
            ON chat_conversations(participant_1, participant_2)
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated
            ON chat_conversations(updated_at DESC)
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
            ON chat_messages(conversation_id, created_at DESC)
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
            ON chat_messages(sender_id)
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_message_status_user
            ON message_status(user_id, status)
        `);

        console.log('✅ Performance indexes created');

        // Verify tables
        const tablesResult = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('chat_conversations', 'chat_messages', 'message_status')
        `);

        const createdTables = tablesResult.rows.map(r => r.table_name);
        console.log('📋 Chat tables verified:', createdTables);

        if (createdTables.length === 3) {
            isInitialized = true;
            console.log('✅ Friend chat database schema initialized successfully!');
            return true;
        } else {
            throw new Error(`Expected 3 tables, got ${createdTables.length}`);
        }

    } catch (error) {
        console.error('❌ Chat schema initialization failed:', error);
        throw error;
    }
}

async function isChatSchemaInitialized() {
    if (isInitialized) {
        return true;
    }

    const db = getDb();
    try {
        const tablesResult = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('chat_conversations', 'chat_messages', 'message_status')
        `);

        const existingTables = tablesResult.rows.map(r => r.table_name);
        if (existingTables.length === 3) {
            isInitialized = true;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking chat schema:', error);
        return false;
    }
}

module.exports = {
    initializeChatSchema,
    isChatSchemaInitialized
};
