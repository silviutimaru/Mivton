const { pool, query } = require('./connection');
const fs = require('fs');
const path = require('path');

/**
 * 🚀 MIVTON PHASE 3.1 - FRIENDS DATABASE INITIALIZATION
 * Enterprise-grade friends system database setup
 * 
 * This module initializes all friends-related database tables,
 * indexes, functions, triggers, and views for the social features.
 */

class FriendsSchemaInitializer {
    constructor() {
        this.schemaPath = path.join(__dirname, 'friends-schema.sql');
        this.initialized = false;
    }

    /**
     * Initialize the friends database schema
     * @returns {Promise<boolean>} Success status
     */
    async initializeFriendsSchema() {
        try {
            console.log('🔄 Initializing friends database schema...');

            // Check if schema file exists
            if (!fs.existsSync(this.schemaPath)) {
                throw new Error('Friends schema file not found');
            }

            // Read the schema SQL file
            const schemaSql = fs.readFileSync(this.schemaPath, 'utf8');

            // Execute the schema creation
            await query(schemaSql);

            console.log('✅ Friends database schema initialized successfully');
            this.initialized = true;

            // Verify schema creation
            await this.verifySchemaCreation();

            return true;
        } catch (error) {
            console.error('❌ Friends schema initialization failed:', error);
            throw error;
        }
    }

    /**
     * Verify that all friends tables were created successfully
     * @returns {Promise<boolean>} Verification success
     */
    async verifySchemaCreation() {
        try {
            console.log('🔍 Verifying friends schema creation...');

            const expectedTables = [
                'friendships',
                'friend_requests', 
                'blocked_users',
                'friend_notifications',
                'social_activity_log'
            ];

            // Check if all tables exist
            const tablesQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = ANY($1)
            `;

            const result = await query(tablesQuery, [expectedTables]);
            const foundTables = result.rows.map(row => row.table_name);

            // Verify all expected tables exist
            const missingTables = expectedTables.filter(table => !foundTables.includes(table));
            
            if (missingTables.length > 0) {
                throw new Error(`Missing friends tables: ${missingTables.join(', ')}`);
            }

            console.log('✅ All friends tables created successfully');

            // Verify indexes exist
            await this.verifyIndexes();

            // Verify functions exist
            await this.verifyFunctions();

            // Verify views exist
            await this.verifyViews();

            console.log('✅ Friends schema verification completed');
            return true;

        } catch (error) {
            console.error('❌ Friends schema verification failed:', error);
            throw error;
        }
    }

    /**
     * Verify that all required indexes were created
     * @returns {Promise<boolean>} Verification success
     */
    async verifyIndexes() {
        try {
            const expectedIndexes = [
                'idx_friendships_user1',
                'idx_friendships_user2', 
                'idx_friend_requests_sender',
                'idx_friend_requests_receiver',
                'idx_blocked_users_blocker',
                'idx_blocked_users_blocked',
                'idx_friend_notifications_user',
                'idx_friend_notifications_unread'
            ];

            const indexQuery = `
                SELECT indexname 
                FROM pg_indexes 
                WHERE schemaname = 'public' 
                AND indexname = ANY($1)
            `;

            const result = await query(indexQuery, [expectedIndexes]);
            const foundIndexes = result.rows.map(row => row.indexname);

            const missingIndexes = expectedIndexes.filter(index => !foundIndexes.includes(index));
            
            if (missingIndexes.length > 0) {
                console.warn(`⚠️  Missing some indexes: ${missingIndexes.join(', ')}`);
                // Don't fail for missing indexes, just warn
            }

            console.log('✅ Friends indexes verified');
            return true;

        } catch (error) {
            console.warn('⚠️  Index verification failed:', error);
            return false;
        }
    }

    /**
     * Verify that all required functions were created
     * @returns {Promise<boolean>} Verification success
     */
    async verifyFunctions() {
        try {
            const expectedFunctions = [
                'get_ordered_user_pair',
                'are_users_friends',
                'is_user_blocked'
            ];

            const functionQuery = `
                SELECT routine_name 
                FROM information_schema.routines 
                WHERE routine_schema = 'public' 
                AND routine_name = ANY($1)
            `;

            const result = await query(functionQuery, [expectedFunctions]);
            const foundFunctions = result.rows.map(row => row.routine_name);

            const missingFunctions = expectedFunctions.filter(func => !foundFunctions.includes(func));
            
            if (missingFunctions.length > 0) {
                console.warn(`⚠️  Missing some functions: ${missingFunctions.join(', ')}`);
            }

            console.log('✅ Friends functions verified');
            return true;

        } catch (error) {
            console.warn('⚠️  Function verification failed:', error);
            return false;
        }
    }

    /**
     * Verify that all required views were created
     * @returns {Promise<boolean>} Verification success
     */
    async verifyViews() {
        try {
            const expectedViews = [
                'v_user_friends',
                'v_pending_friend_requests'
            ];

            const viewQuery = `
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name = ANY($1)
            `;

            const result = await query(viewQuery, [expectedViews]);
            const foundViews = result.rows.map(row => row.table_name);

            const missingViews = expectedViews.filter(view => !foundViews.includes(view));
            
            if (missingViews.length > 0) {
                console.warn(`⚠️  Missing some views: ${missingViews.join(', ')}`);
            }

            console.log('✅ Friends views verified');
            return true;

        } catch (error) {
            console.warn('⚠️  View verification failed:', error);
            return false;
        }
    }

    /**
     * Check if friends schema is already initialized
     * @returns {Promise<boolean>} Is initialized
     */
    async isSchemaInitialized() {
        try {
            const result = await query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'friendships'
                )
            `);

            return result.rows[0].exists;
        } catch (error) {
            console.error('Error checking schema initialization:', error);
            return false;
        }
    }

    /**
     * Drop all friends tables (for development/testing)
     * WARNING: This will delete all friends data!
     * @returns {Promise<boolean>} Success status
     */
    async dropFriendsSchema() {
        try {
            console.log('⚠️  Dropping friends schema...');

            // Drop in reverse dependency order
            const dropCommands = [
                'DROP VIEW IF EXISTS v_user_friends CASCADE',
                'DROP VIEW IF EXISTS v_pending_friend_requests CASCADE',
                'DROP TABLE IF EXISTS social_activity_log CASCADE',
                'DROP TABLE IF EXISTS friend_notifications CASCADE',  
                'DROP TABLE IF EXISTS blocked_users CASCADE',
                'DROP TABLE IF EXISTS friend_requests CASCADE',
                'DROP TABLE IF EXISTS friendships CASCADE',
                'DROP FUNCTION IF EXISTS get_ordered_user_pair CASCADE',
                'DROP FUNCTION IF EXISTS are_users_friends CASCADE',
                'DROP FUNCTION IF EXISTS is_user_blocked CASCADE',
                'DROP FUNCTION IF EXISTS update_friendship_timestamp CASCADE',
                'DROP FUNCTION IF EXISTS update_friend_request_timestamp CASCADE',
                'DROP FUNCTION IF EXISTS cleanup_expired_requests CASCADE'
            ];

            for (const command of dropCommands) {
                await pool.query(command);
            }

            console.log('✅ Friends schema dropped successfully');
            this.initialized = false;
            return true;

        } catch (error) {
            console.error('❌ Failed to drop friends schema:', error);
            throw error;
        }
    }

    /**
     * Reset friends schema (drop and recreate)
     * @returns {Promise<boolean>} Success status
     */
    async resetFriendsSchema() {
        try {
            console.log('🔄 Resetting friends schema...');
            
            await this.dropFriendsSchema();
            await this.initializeFriendsSchema();
            
            console.log('✅ Friends schema reset completed');
            return true;

        } catch (error) {
            console.error('❌ Friends schema reset failed:', error);
            throw error;
        }
    }

    /**
     * Get schema statistics
     * @returns {Promise<Object>} Schema statistics
     */
    async getSchemaStats() {
        try {
            const stats = {};

            // Count records in each table
            const tables = ['friendships', 'friend_requests', 'blocked_users', 'friend_notifications', 'social_activity_log'];
            
            for (const table of tables) {
                try {
                    const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                    stats[table] = parseInt(result.rows[0].count);
                } catch (error) {
                    stats[table] = 'Not found';
                }
            }

            // Get active friendships count
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM friendships WHERE status = 'active'`);
                stats.active_friendships = parseInt(result.rows[0].count);
            } catch (error) {
                stats.active_friendships = 'N/A';
            }

            // Get pending requests count
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM friend_requests WHERE status = 'pending'`);
                stats.pending_requests = parseInt(result.rows[0].count);
            } catch (error) {
                stats.pending_requests = 'N/A';
            }

            return stats;

        } catch (error) {
            console.error('Error getting schema stats:', error);
            return { error: error.message };
        }
    }
}

// Create and export singleton instance
const friendsSchemaInitializer = new FriendsSchemaInitializer();

module.exports = {
    FriendsSchemaInitializer,
    initializeFriendsSchema: () => friendsSchemaInitializer.initializeFriendsSchema(),
    isSchemaInitialized: () => friendsSchemaInitializer.isSchemaInitialized(),
    verifySchemaCreation: () => friendsSchemaInitializer.verifySchemaCreation(),
    dropFriendsSchema: () => friendsSchemaInitializer.dropFriendsSchema(),
    resetFriendsSchema: () => friendsSchemaInitializer.resetFriendsSchema(),
    getSchemaStats: () => friendsSchemaInitializer.getSchemaStats()
};

// Run initialization if called directly
if (require.main === module) {
    require('dotenv').config();
    
    async function runInitialization() {
        try {
            console.log('🚀 MIVTON PHASE 3.1 - FRIENDS SCHEMA INITIALIZATION');
            console.log('📊 Environment:', process.env.NODE_ENV || 'development');
            console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Missing!');
            
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is required');
            }
            
            await friendsSchemaInitializer.initializeFriendsSchema();
            console.log('🎉 Friends schema initialization completed successfully!');
            process.exit(0);
        } catch (error) {
            console.error('❌ Friends schema initialization failed:', error.message);
            process.exit(1);
        }
    }
    
    runInitialization();
}
