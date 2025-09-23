/**
 * 🚀 INITIALIZE ADVANCED PRESENCE SCHEMA
 * Auto-creates the required tables for enhanced presence control
 */

const { getDb } = require('./connection');

async function initializeAdvancedPresenceSchema() {
    console.log('🔄 Initializing advanced presence schema...');

    try {
        const db = getDb();

        // Check if user_presence_settings already exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_presence_settings'
            )
        `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ Advanced presence schema already exists');
            return true;
        }

        console.log('📊 Creating advanced presence tables...');

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

        // Create default settings for existing users
        await db.query(`
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
        `);

        // Create activity tracking entries for existing users
        await db.query(`
            INSERT INTO user_activity_tracking (user_id)
            SELECT id
            FROM users
            WHERE NOT EXISTS (
                SELECT 1 FROM user_activity_tracking uat WHERE uat.user_id = users.id
            )
        `);

        console.log('✅ Advanced presence schema initialized successfully');
        return true;

    } catch (error) {
        console.error('❌ Error initializing advanced presence schema:', error);
        return false;
    }
}

async function isAdvancedPresenceSchemaInitialized() {
    try {
        const db = getDb();
        const result = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_presence_settings'
            )
        `);
        return result.rows[0].exists;
    } catch (error) {
        console.error('Error checking advanced presence schema:', error);
        return false;
    }
}

module.exports = {
    initializeAdvancedPresenceSchema,
    isAdvancedPresenceSchemaInitialized
};
