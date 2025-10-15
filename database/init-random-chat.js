const { getDb } = require('./connection');

/**
 * 🎲 RANDOM CHAT DATABASE SCHEMA (COOMEET MODEL)
 * Instant 1-on-1 random video/text chat with PostgreSQL persistence
 */

let isInitialized = false;

async function initializeRandomChatSchema() {
    if (isInitialized) {
        return true;
    }

    const db = getDb();

    try {
        console.log('🎲 Initializing random chat database schema...');

        // ============================================================================
        // 1. CHAT ROOMS TABLE - Active chat sessions
        // ============================================================================
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_rooms (
                id SERIAL PRIMARY KEY,
                user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'abandoned')),
                room_type VARCHAR(20) NOT NULL DEFAULT 'random' CHECK (room_type IN ('random', 'direct')),
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP,
                total_messages INTEGER DEFAULT 0,

                -- Constraints
                CHECK (user1_id != user2_id),

                -- Indexes for performance
                INDEX idx_chat_rooms_user1 (user1_id, status),
                INDEX idx_chat_rooms_user2 (user2_id, status),
                INDEX idx_chat_rooms_status (status, started_at)
            )
        `);
        console.log('✅ chat_rooms table created');

        // ============================================================================
        // 2. CHAT MESSAGES TABLE - Message history
        // ============================================================================
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                message_text TEXT NOT NULL,
                message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'image', 'file')),
                is_translated BOOLEAN DEFAULT FALSE,
                original_language VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Indexes for performance
                INDEX idx_chat_messages_room (room_id, created_at),
                INDEX idx_chat_messages_sender (sender_id, created_at)
            )
        `);
        console.log('✅ chat_messages table created');

        // ============================================================================
        // 3. CHAT QUEUE TABLE - Waiting queue for matching
        // ============================================================================
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_queue (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                preferences JSONB DEFAULT '{}'::jsonb,
                gender_preference VARCHAR(20),
                language_preference VARCHAR(10),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
                matched_with INTEGER REFERENCES users(id) ON DELETE SET NULL,

                -- Indexes for matching performance
                INDEX idx_chat_queue_status (status, joined_at),
                INDEX idx_chat_queue_user (user_id),
                INDEX idx_chat_queue_preferences (gender_preference, language_preference)
            )
        `);
        console.log('✅ chat_queue table created');

        // ============================================================================
        // 4. CHAT REPORTS TABLE - User reporting system
        // ============================================================================
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_reports (
                id SERIAL PRIMARY KEY,
                reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                room_id INTEGER REFERENCES chat_rooms(id) ON DELETE SET NULL,
                reason VARCHAR(100) NOT NULL,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

                -- Constraints
                CHECK (reporter_id != reported_user_id),

                -- Indexes
                INDEX idx_chat_reports_status (status, created_at),
                INDEX idx_chat_reports_reporter (reporter_id),
                INDEX idx_chat_reports_reported (reported_user_id)
            )
        `);
        console.log('✅ chat_reports table created');

        // ============================================================================
        // 5. CHAT STATISTICS TABLE - Analytics and insights
        // ============================================================================
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_statistics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                total_chats INTEGER DEFAULT 0,
                total_messages_sent INTEGER DEFAULT 0,
                total_messages_received INTEGER DEFAULT 0,
                average_chat_duration INTERVAL,
                total_chat_time INTERVAL DEFAULT '0 seconds'::interval,
                total_skips INTEGER DEFAULT 0,
                times_skipped INTEGER DEFAULT 0,
                times_reported INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                INDEX idx_chat_stats_user (user_id)
            )
        `);
        console.log('✅ chat_statistics table created');

        // ============================================================================
        // 6. TRIGGERS & FUNCTIONS
        // ============================================================================

        // Auto-increment message counter on chat_rooms
        await db.query(`
            CREATE OR REPLACE FUNCTION increment_room_messages()
            RETURNS TRIGGER AS $$
            BEGIN
                UPDATE chat_rooms
                SET total_messages = total_messages + 1
                WHERE id = NEW.room_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_increment_messages ON chat_messages;
            CREATE TRIGGER trigger_increment_messages
                AFTER INSERT ON chat_messages
                FOR EACH ROW
                EXECUTE FUNCTION increment_room_messages();
        `);
        console.log('✅ Message counter trigger created');

        // Auto-update chat statistics
        await db.query(`
            CREATE OR REPLACE FUNCTION update_chat_statistics()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Create stats record if doesn't exist
                INSERT INTO chat_statistics (user_id)
                VALUES (NEW.sender_id)
                ON CONFLICT (user_id) DO NOTHING;

                -- Update message count
                UPDATE chat_statistics
                SET total_messages_sent = total_messages_sent + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = NEW.sender_id;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_stats ON chat_messages;
            CREATE TRIGGER trigger_update_stats
                AFTER INSERT ON chat_messages
                FOR EACH ROW
                EXECUTE FUNCTION update_chat_statistics();
        `);
        console.log('✅ Statistics update trigger created');

        // Auto-cleanup old queue entries (abandoned after 30 minutes)
        await db.query(`
            CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
            RETURNS void AS $$
            BEGIN
                DELETE FROM chat_queue
                WHERE status = 'waiting'
                AND joined_at < NOW() - INTERVAL '30 minutes';
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Queue cleanup function created');

        // Verify tables were created
        const tablesResult = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('chat_rooms', 'chat_messages', 'chat_queue', 'chat_reports', 'chat_statistics')
        `);

        const createdTables = tablesResult.rows.map(r => r.table_name);
        console.log('📋 Random chat tables verified:', createdTables);

        if (createdTables.length === 5) {
            isInitialized = true;
            console.log('✅ Random chat database schema initialized successfully!');
            return true;
        } else {
            throw new Error(`Expected 5 tables, got ${createdTables.length}`);
        }

    } catch (error) {
        console.error('❌ Random chat schema initialization failed:', error);
        throw error;
    }
}

async function isRandomChatSchemaInitialized() {
    if (isInitialized) {
        return true;
    }

    const db = getDb();
    try {
        const tablesResult = await db.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('chat_rooms', 'chat_messages', 'chat_queue', 'chat_reports', 'chat_statistics')
        `);

        const existingTables = tablesResult.rows.map(r => r.table_name);
        if (existingTables.length === 5) {
            isInitialized = true;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking random chat schema:', error);
        return false;
    }
}

module.exports = {
    initializeRandomChatSchema,
    isRandomChatSchemaInitialized
};
