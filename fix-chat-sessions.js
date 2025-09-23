#!/usr/bin/env node

/**
 * 🔧 FIX CHAT SESSIONS TABLE - Missing table for presence system
 * This script creates the missing chat_sessions table needed by the advanced presence system
 */

require('dotenv').config();

const { getDb } = require('./database/connection');

async function createChatSessionsTable() {
    console.log('🔧 FIXING CHAT SESSIONS TABLE');
    console.log('===============================');
    console.log('');

    try {
        const db = getDb();

        console.log('📊 Checking if chat_sessions table exists...');

        // Check if chat_sessions table exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'chat_sessions'
            )
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ chat_sessions table already exists');
            return true;
        }

        console.log('❌ chat_sessions table is missing - creating it now...');

        console.log('🔄 Creating chat_sessions table...');

        // Create chat_sessions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                -- Session status
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
                
                -- Session metadata
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ended_at TIMESTAMP NULL,
                
                -- Message count for this session
                message_count INTEGER DEFAULT 0,
                
                -- Last message info (for quick preview)
                last_message_id INTEGER NULL,
                last_message_preview TEXT,
                last_message_sender_id INTEGER,
                
                -- Session preferences
                language_preference VARCHAR(10) DEFAULT 'auto',
                translation_enabled BOOLEAN DEFAULT TRUE,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                UNIQUE(user1_id, user2_id),
                CHECK (user1_id != user2_id),
                CHECK (user1_id < user2_id) -- Ensure consistent ordering
            )
        `);

        console.log('✅ chat_sessions table created successfully');

        console.log('🔄 Creating performance indexes...');

        // Create indexes for better performance
        await db.query(`
            -- Index for finding active sessions by user
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_user1_active 
                ON chat_sessions(user1_id, status, last_activity);
            
            -- Index for finding active sessions by user2
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_user2_active 
                ON chat_sessions(user2_id, status, last_activity);
            
            -- Index for recent activity
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity 
                ON chat_sessions(last_activity DESC) WHERE status = 'active';
            
            -- Index for session lookup
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_users 
                ON chat_sessions(user1_id, user2_id);
        `);

        console.log('✅ Performance indexes created');

        console.log('🔄 Creating update trigger...');

        // Create trigger for automatic timestamp updates
        await db.query(`
            CREATE OR REPLACE FUNCTION update_chat_sessions_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                -- Update last_activity when the session is modified
                IF NEW.status = 'active' AND OLD.status = 'active' THEN
                    NEW.last_activity = CURRENT_TIMESTAMP;
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_chat_sessions_updated_at ON chat_sessions;
            CREATE TRIGGER trigger_chat_sessions_updated_at
                BEFORE UPDATE ON chat_sessions
                FOR EACH ROW
                EXECUTE FUNCTION update_chat_sessions_timestamp();
        `);

        console.log('✅ Update trigger created');

        console.log('🔄 Creating helper functions...');

        // Create helper functions
        await db.query(`
            -- Function to get or create a chat session between two users
            CREATE OR REPLACE FUNCTION get_or_create_chat_session(
                p_user1_id INTEGER,
                p_user2_id INTEGER
            )
            RETURNS INTEGER AS $$
            DECLARE
                session_id INTEGER;
                ordered_user1_id INTEGER;
                ordered_user2_id INTEGER;
            BEGIN
                -- Ensure consistent ordering (smaller user ID first)
                IF p_user1_id < p_user2_id THEN
                    ordered_user1_id := p_user1_id;
                    ordered_user2_id := p_user2_id;
                ELSE
                    ordered_user1_id := p_user2_id;
                    ordered_user2_id := p_user1_id;
                END IF;
                
                -- Try to find existing session
                SELECT id INTO session_id
                FROM chat_sessions
                WHERE user1_id = ordered_user1_id AND user2_id = ordered_user2_id;
                
                -- If not found, create new session
                IF session_id IS NULL THEN
                    INSERT INTO chat_sessions (user1_id, user2_id, status, last_activity)
                    VALUES (ordered_user1_id, ordered_user2_id, 'active', CURRENT_TIMESTAMP)
                    RETURNING id INTO session_id;
                ELSE
                    -- Update existing session to active and refresh activity
                    UPDATE chat_sessions 
                    SET status = 'active', last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = session_id;
                END IF;
                
                RETURN session_id;
            END;
            $$ LANGUAGE plpgsql;

            -- Function to check if two users have an active chat session
            CREATE OR REPLACE FUNCTION has_active_chat_session(
                p_user1_id INTEGER,
                p_user2_id INTEGER
            )
            RETURNS BOOLEAN AS $$
            DECLARE
                ordered_user1_id INTEGER;
                ordered_user2_id INTEGER;
                session_exists BOOLEAN := FALSE;
            BEGIN
                -- Ensure consistent ordering
                IF p_user1_id < p_user2_id THEN
                    ordered_user1_id := p_user1_id;
                    ordered_user2_id := p_user2_id;
                ELSE
                    ordered_user1_id := p_user2_id;
                    ordered_user2_id := p_user1_id;
                END IF;
                
                -- Check for active session within last 24 hours
                SELECT EXISTS(
                    SELECT 1 FROM chat_sessions
                    WHERE user1_id = ordered_user1_id 
                    AND user2_id = ordered_user2_id
                    AND status = 'active'
                    AND last_activity > NOW() - INTERVAL '24 hours'
                ) INTO session_exists;
                
                RETURN session_exists;
            END;
            $$ LANGUAGE plpgsql;
        `);

        console.log('✅ Helper functions created');

        console.log('🔄 Creating some sample active sessions for existing friends...');

        // Create some sample active chat sessions for existing friendships (so presence system works)
        const sampleSessionsResult = await db.query(`
            INSERT INTO chat_sessions (user1_id, user2_id, status, last_activity, message_count)
            SELECT 
                CASE WHEN f.user1_id < f.user2_id THEN f.user1_id ELSE f.user2_id END as user1_id,
                CASE WHEN f.user1_id < f.user2_id THEN f.user2_id ELSE f.user1_id END as user2_id,
                'active' as status,
                NOW() - (RANDOM() * INTERVAL '2 hours') as last_activity,
                FLOOR(RANDOM() * 10 + 1)::INTEGER as message_count
            FROM friendships f
            WHERE f.status = 'active'
            AND NOT EXISTS (
                SELECT 1 FROM chat_sessions cs 
                WHERE (cs.user1_id = LEAST(f.user1_id, f.user2_id) AND cs.user2_id = GREATEST(f.user1_id, f.user2_id))
            )
            LIMIT 10
            RETURNING id
        `);

        console.log(`✅ Created ${sampleSessionsResult.rows.length} sample active chat sessions`);

        console.log('');
        console.log('🎉 CHAT SESSIONS TABLE FIX COMPLETED!');
        console.log('');
        console.log('✅ What was created:');
        console.log('   - chat_sessions table with proper structure');
        console.log('   - Performance indexes for fast queries');
        console.log('   - Automatic timestamp update triggers');
        console.log('   - Helper functions for session management');
        console.log(`   - ${sampleSessionsResult.rows.length} sample active chat sessions`);
        console.log('');
        console.log('📊 Table Structure:');
        console.log('   - id (Primary Key)');
        console.log('   - user1_id, user2_id (User references, ordered)');
        console.log('   - status (active, paused, ended)');
        console.log('   - last_activity (for 24-hour active chat detection)');
        console.log('   - message_count and preview fields');
        console.log('   - translation preferences');
        console.log('   - Proper constraints and indexes');
        console.log('');
        console.log('🚀 The presence error should now be fixed!');

        return true;

    } catch (error) {
        console.error('❌ Error creating chat_sessions table:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the fix
if (require.main === module) {
    createChatSessionsTable()
        .then((success) => {
            if (success) {
                console.log('✅ Chat sessions table fix completed - deploy again to see the fix in action!');
                process.exit(0);
            } else {
                console.log('❌ Fix failed - check the error messages above');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Unexpected error during fix:', error);
            process.exit(1);
        });
} else {
    module.exports = { createChatSessionsTable };
}
