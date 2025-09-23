/**
 * 🚀 MIVTON PHASE 3.2 - REAL-TIME DATABASE INITIALIZATION
 * Initializes real-time social updates database schema
 * 
 * Features:
 * - Socket session tracking
 * - Real-time notification delivery
 * - User presence management
 * - Activity feed system
 * - Performance optimizations
 */

const fs = require('fs');
const path = require('path');
const { getDb } = require('./connection');

/**
 * Check if real-time schema is initialized
 * @returns {Promise<boolean>} True if schema exists
 */
async function isRealtimeSchemaInitialized() {
    try {
        const db = getDb();
        
        // Check for key real-time tables
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'socket_sessions', 
                'notification_delivery', 
                'user_presence', 
                'realtime_events_log',
                'notification_preferences',
                'friend_activity_feed'
            )
        `);
        
        const expectedTables = 6;
        const actualTables = result.rows.length;
        
        console.log(`📊 Real-time schema check: ${actualTables}/${expectedTables} tables found`);
        
        return actualTables === expectedTables;
        
    } catch (error) {
        console.error('❌ Error checking real-time schema:', error);
        return false;
    }
}

/**
 * Initialize real-time database schema
 * @returns {Promise<boolean>} True if successful
 */
async function initializeRealtimeSchema() {
    try {
        console.log('🔄 Initializing real-time database schema...');
        
        const db = getDb();
        
        // Read the schema file
        const schemaPath = path.join(__dirname, 'realtime-schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('📄 Executing real-time schema SQL...');
        
        // Execute the schema in a transaction
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            // Split the schema into individual statements and execute
            const statements = schemaSQL
                .split(';')
                .map(statement => statement.trim())
                .filter(statement => statement.length > 0 && !statement.startsWith('--'));
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement) {
                    try {
                        await client.query(statement + ';');
                    } catch (statementError) {
                        // Log but don't fail for IF NOT EXISTS statements
                        if (!statementError.message.includes('already exists')) {
                            console.error(`❌ Error in statement ${i + 1}:`, statementError.message);
                            throw statementError;
                        }
                    }
                }
            }
            
            await client.query('COMMIT');
            console.log('✅ Real-time schema executed successfully');
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
        // Verify schema creation
        const isInitialized = await isRealtimeSchemaInitialized();
        if (!isInitialized) {
            throw new Error('Schema verification failed after initialization');
        }
        
        // Initialize default data
        await initializeRealtimeDefaults();
        
        console.log('✅ Real-time database schema initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Real-time schema initialization failed:', error);
        return false;
    }
}

/**
 * Initialize default real-time data
 * @returns {Promise<void>}
 */
async function initializeRealtimeDefaults() {
    try {
        console.log('🔄 Initializing real-time default data...');
        
        const db = getDb();
        
        // Create default notification preferences for existing users
        await db.query(`
            INSERT INTO notification_preferences (user_id, notification_type, enabled, delivery_methods)
            SELECT 
                u.id,
                unnest(ARRAY[
                    'friend_request', 
                    'friend_accepted', 
                    'friend_online', 
                    'friend_offline', 
                    'friend_message',
                    'friend_removed',
                    'user_blocked'
                ]) as notification_type,
                TRUE,
                '["socket", "database"]'::jsonb
            FROM users u
            WHERE u.id NOT IN (SELECT DISTINCT user_id FROM notification_preferences)
            ON CONFLICT (user_id, notification_type) DO NOTHING
        `);
        
        // Initialize user presence for existing users
        await db.query(`
            INSERT INTO user_presence (user_id, status, last_seen, socket_count)
            SELECT 
                u.id,
                'offline',
                COALESCE(ua.last_activity, u.created_at),
                0
            FROM users u
            LEFT JOIN user_activity ua ON ua.user_id = u.id
            WHERE u.id NOT IN (SELECT user_id FROM user_presence)
            ON CONFLICT (user_id) DO NOTHING
        `);
        
        // Clean up any orphaned data
        await db.query(`
            DELETE FROM socket_sessions WHERE user_id NOT IN (SELECT id FROM users)
        `);
        
        await db.query(`
            DELETE FROM notification_delivery WHERE user_id NOT IN (SELECT id FROM users)
        `);
        
        console.log('✅ Real-time default data initialized');
        
    } catch (error) {
        console.error('❌ Error initializing real-time defaults:', error);
        throw error;
    }
}

/**
 * Validate real-time schema integrity
 * @returns {Promise<boolean>} True if valid
 */
async function validateRealtimeSchema() {
    try {
        console.log('🔍 Validating real-time schema integrity...');
        
        const db = getDb();
        
        // Check for required functions
        const functionsResult = await db.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN (
                'get_online_friends_count',
                'update_user_presence',
                'cleanup_inactive_sockets',
                'create_activity_feed_entry',
                'realtime_maintenance_cleanup'
            )
        `);
        
        if (functionsResult.rows.length < 5) {
            console.error('❌ Missing required real-time functions');
            return false;
        }
        
        // Check for required indexes
        const indexesResult = await db.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE '%socket_sessions%'
            OR indexname LIKE '%user_presence%'
            OR indexname LIKE '%notification_delivery%'
        `);
        
        if (indexesResult.rows.length < 3) {
            console.error('❌ Missing required real-time indexes');
            return false;
        }
        
        // Check for required views
        const viewsResult = await db.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name IN ('v_friend_presence', 'v_unread_notifications')
        `);
        
        if (viewsResult.rows.length < 2) {
            console.error('❌ Missing required real-time views');
            return false;
        }
        
        console.log('✅ Real-time schema integrity validated');
        return true;
        
    } catch (error) {
        console.error('❌ Error validating real-time schema:', error);
        return false;
    }
}

/**
 * Get real-time schema statistics
 * @returns {Promise<Object>} Schema statistics
 */
async function getRealtimeStats() {
    try {
        const db = getDb();
        
        const stats = {};
        
        // Get table counts
        const tables = [
            'socket_sessions',
            'notification_delivery', 
            'user_presence',
            'realtime_events_log',
            'notification_preferences',
            'friend_activity_feed'
        ];
        
        for (const table of tables) {
            try {
                const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
                stats[table] = parseInt(result.rows[0].count);
            } catch (error) {
                stats[table] = 0;
            }
        }
        
        // Get active connections count
        const activeResult = await db.query(`
            SELECT COUNT(*) as active_sockets 
            FROM socket_sessions 
            WHERE is_active = TRUE
        `);
        stats.active_sockets = parseInt(activeResult.rows[0].active_sockets);
        
        // Get online users count
        const onlineResult = await db.query(`
            SELECT COUNT(*) as online_users 
            FROM user_presence 
            WHERE status = 'online' AND socket_count > 0
        `);
        stats.online_users = parseInt(onlineResult.rows[0].online_users);
        
        return stats;
        
    } catch (error) {
        console.error('❌ Error getting real-time stats:', error);
        return {};
    }
}

/**
 * Perform real-time maintenance cleanup
 * @returns {Promise<Object>} Cleanup results
 */
async function performRealtimeCleanup() {
    try {
        console.log('🧹 Performing real-time maintenance cleanup...');
        
        const db = getDb();
        
        // Call the cleanup function
        const result = await db.query('SELECT * FROM realtime_maintenance_cleanup()');
        const cleanup = result.rows[0];
        
        console.log('✅ Real-time cleanup completed:', cleanup);
        
        return {
            cleaned_sockets: cleanup.cleaned_sockets,
            cleaned_notifications: cleanup.cleaned_notifications,
            cleaned_events: cleanup.cleaned_events,
            cleaned_activities: cleanup.cleaned_activities
        };
        
    } catch (error) {
        console.error('❌ Error performing real-time cleanup:', error);
        throw error;
    }
}

module.exports = {
    isRealtimeSchemaInitialized,
    initializeRealtimeSchema,
    validateRealtimeSchema,
    getRealtimeStats,
    performRealtimeCleanup
};

// Run initialization if called directly
if (require.main === module) {
    require('dotenv').config();
    
    async function runInitialization() {
        try {
            console.log('🚀 MIVTON PHASE 3.2 - REAL-TIME SCHEMA INITIALIZATION');
            console.log('📊 Environment:', process.env.NODE_ENV || 'development');
            console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Missing!');
            
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is required');
            }
            
            const success = await initializeRealtimeSchema();
            if (success) {
                console.log('🎉 Real-time schema initialization completed successfully!');
                process.exit(0);
            } else {
                throw new Error('Real-time schema initialization failed');
            }
        } catch (error) {
            console.error('❌ Real-time schema initialization failed:', error.message);
            process.exit(1);
        }
    }
    
    runInitialization();
}
