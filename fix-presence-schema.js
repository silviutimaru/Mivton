#!/usr/bin/env node

/**
 * 🔧 FIX PRESENCE SCHEMA - Direct database fix
 * This script creates the missing user_presence_settings table and related schema
 */

const { getDb } = require('./database/connection');

async function fixPresenceSchema() {
    console.log('🔧 Starting presence schema fix...');

    try {
        const db = getDb();

        console.log('📊 Checking current database state...');

        // Check if user_presence_settings exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_presence_settings'
            )
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ user_presence_settings table already exists');
            return true;
        }

        console.log('🔄 Creating user_presence_settings table...');

        // Create user_presence_settings table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_presence_settings (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                
                -- Privacy visibility modes
                privacy_mode VARCHAR(20) DEFAULT 'friends' CHECK (privacy_mode IN (
                    'everyone',      -- Visible to all users
                    'friends',       -- Visible only to friends  
                    'active_chats',  -- Only users with active conversations
                    'selected',      -- Only chosen contacts
                    'nobody'         -- Completely private
                )),
                
                -- Specific allowed contacts (JSON array of user IDs)
                allowed_contacts JSONB DEFAULT '[]'::jsonb,
                
                -- Auto-away settings
                auto_away_enabled BOOLEAN DEFAULT TRUE,
                auto_away_minutes INTEGER DEFAULT 5 CHECK (auto_away_minutes BETWEEN 1 AND 60),
                
                -- Advanced privacy controls
                block_unknown_users BOOLEAN DEFAULT FALSE,     -- Block messages from non-friends
                show_activity_to_friends BOOLEAN DEFAULT TRUE, -- Show activity message to friends
                allow_urgent_override BOOLEAN DEFAULT TRUE,    -- Allow urgent messages in DND mode
                
                -- Last seen visibility
                show_last_seen VARCHAR(20) DEFAULT 'friends' CHECK (show_last_seen IN (
                    'everyone', 'friends', 'nobody'
                )),
                
                -- Online indicator visibility  
                show_online_status VARCHAR(20) DEFAULT 'friends' CHECK (show_online_status IN (
                    'everyone', 'friends', 'nobody'
                )),
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ user_presence_settings table created');

        console.log('🔄 Creating contact_restrictions table...');

        // Create contact_restrictions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS contact_restrictions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                -- Restriction types
                can_see_online BOOLEAN DEFAULT TRUE,
                can_see_activity BOOLEAN DEFAULT TRUE,
                can_send_messages BOOLEAN DEFAULT TRUE,
                can_make_calls BOOLEAN DEFAULT TRUE,
                can_see_last_seen BOOLEAN DEFAULT TRUE,
                
                -- Quiet hours (JSON with time ranges)
                quiet_hours JSONB,
                
                -- Temporary restrictions
                restriction_until TIMESTAMP,
                restriction_reason VARCHAR(200),
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                UNIQUE(user_id, contact_id),
                CHECK (user_id != contact_id)
            )
        `);

        console.log('✅ contact_restrictions table created');

        console.log('🔄 Creating user_activity_tracking table...');

        // Create user_activity_tracking table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_activity_tracking (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                
                -- Activity timestamps
                last_mouse_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_keyboard_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_page_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_api_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Activity counters (for analytics)
                daily_actions INTEGER DEFAULT 0,
                session_actions INTEGER DEFAULT 0,
                
                -- Auto-away state
                is_auto_away BOOLEAN DEFAULT FALSE,
                auto_away_since TIMESTAMP,
                
                -- Timestamps
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ user_activity_tracking table created');

        console.log('🔄 Creating dnd_exceptions table...');

        // Create dnd_exceptions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS dnd_exceptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                -- Exception types
                exception_type VARCHAR(30) NOT NULL CHECK (exception_type IN (
                    'urgent_contact',    -- Specific user can always contact
                    'active_chat',       -- Active conversation exception
                    'keyword_override',  -- Message contains urgent keywords
                    'time_based',        -- Time-based exception (work hours, etc.)
                    'group_chat'         -- Group chat exceptions
                )),
                
                -- Exception data (JSON with specific rules)
                exception_data JSONB NOT NULL,
                
                -- Validity period
                valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                valid_until TIMESTAMP,
                
                -- Status
                is_active BOOLEAN DEFAULT TRUE,
                
                -- Usage tracking
                times_used INTEGER DEFAULT 0,
                last_used TIMESTAMP,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ dnd_exceptions table created');

        console.log('🔄 Creating indexes for performance...');

        // Create indexes for performance
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_user_presence_settings_privacy 
                ON user_presence_settings(privacy_mode, updated_at);
            
            CREATE INDEX IF NOT EXISTS idx_contact_restrictions_user 
                ON contact_restrictions(user_id, contact_id);
            
            CREATE INDEX IF NOT EXISTS idx_user_activity_auto_away 
                ON user_activity_tracking(is_auto_away, auto_away_since);
            
            CREATE INDEX IF NOT EXISTS idx_dnd_exceptions_user_active 
                ON dnd_exceptions(user_id, is_active, exception_type);
        `);

        console.log('✅ Performance indexes created');

        console.log('🔄 Creating default settings for existing users...');

        // Create default settings for existing users
        const userDefaultsResult = await db.query(`
            INSERT INTO user_presence_settings (user_id, privacy_mode, auto_away_enabled, auto_away_minutes)
            SELECT 
                id,
                'friends',
                TRUE,
                5
            FROM users
            WHERE NOT EXISTS (
                SELECT 1 FROM user_presence_settings ups WHERE ups.user_id = users.id
            )
            RETURNING user_id
        `);

        console.log(`✅ Created default settings for ${userDefaultsResult.rows.length} users`);

        console.log('🔄 Creating activity tracking entries for existing users...');

        // Create activity tracking entries for existing users
        const activityResult = await db.query(`
            INSERT INTO user_activity_tracking (user_id)
            SELECT id
            FROM users
            WHERE NOT EXISTS (
                SELECT 1 FROM user_activity_tracking uat WHERE uat.user_id = users.id
            )
            RETURNING user_id
        `);

        console.log(`✅ Created activity tracking for ${activityResult.rows.length} users`);

        console.log('🔄 Creating update trigger for timestamp management...');

        // Create trigger for automatic timestamp updates
        await db.query(`
            CREATE OR REPLACE FUNCTION update_presence_settings_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_presence_settings_updated_at ON user_presence_settings;
            CREATE TRIGGER trigger_presence_settings_updated_at
                BEFORE UPDATE ON user_presence_settings
                FOR EACH ROW
                EXECUTE FUNCTION update_presence_settings_timestamp();
        `);

        console.log('✅ Trigger created for automatic timestamp updates');

        console.log('');
        console.log('🎉 PRESENCE SCHEMA FIX COMPLETED SUCCESSFULLY!');
        console.log('');
        console.log('✅ Tables created:');
        console.log('   - user_presence_settings (advanced privacy controls)');
        console.log('   - contact_restrictions (per-contact permissions)');
        console.log('   - user_activity_tracking (auto-away functionality)');
        console.log('   - dnd_exceptions (Do Not Disturb overrides)');
        console.log('');
        console.log('📊 Features now available:');
        console.log('   - Privacy modes: Everyone, Friends, Active Chats, Selected, Nobody');
        console.log('   - Auto-away detection and configuration');
        console.log('   - Do Not Disturb with urgent message overrides');
        console.log('   - Per-contact visibility restrictions');
        console.log('   - Activity tracking for better presence management');
        console.log('');
        console.log('🚀 Your app should now work without the presence errors!');
        console.log('');

        return true;

    } catch (error) {
        console.error('❌ Error fixing presence schema:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the fix
if (require.main === module) {
    fixPresenceSchema()
        .then((success) => {
            if (success) {
                console.log('✅ Fix completed successfully - you can now restart your server');
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
    module.exports = { fixPresenceSchema };
}
