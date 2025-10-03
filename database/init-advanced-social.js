/**
 * 🚀 MIVTON PHASE 3.3 - ADVANCED SOCIAL FEATURES DATABASE INITIALIZATION
 * Initializes advanced social analytics and features database schema
 */

require('dotenv').config();

const { getDb } = require('./connection');

/**
 * Check if advanced social schema is initialized
 * @returns {Promise<boolean>} True if schema exists
 */
async function isAdvancedSocialSchemaInitialized() {
    try {
        const db = getDb();
        
        // Check for key advanced social tables (conversation_previews removed)
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'friend_groups', 
                'social_analytics'
            )
        `);
        
        return result.rows.length > 0;
        
    } catch (error) {
        console.error('❌ Error checking advanced social schema:', error);
        return false;
    }
}

/**
 * Initialize advanced social database schema
 * @returns {Promise<boolean>} True if successful
 */
async function initializeAdvancedSocial() {
    try {
        console.log('🔄 Initializing advanced social database schema...');
        
        const db = getDb();
        
        // Create friend groups table
        await db.query(`
            CREATE TABLE IF NOT EXISTS friend_groups (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                color_hex VARCHAR(7) DEFAULT '#3B82F6',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create social analytics table
        await db.query(`
            CREATE TABLE IF NOT EXISTS social_analytics (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                metric_type VARCHAR(50) NOT NULL,
                metric_value INTEGER DEFAULT 0,
                date_recorded DATE DEFAULT CURRENT_DATE,
                additional_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(user_id, metric_type, date_recorded)
            )
        `);
        
        // Conversation previews table removed (chat functionality)
        
        console.log('✅ Advanced social schema created successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Advanced social schema initialization failed:', error);
        return false;
    }
}

module.exports = {
    isAdvancedSocialSchemaInitialized,
    initializeAdvancedSocial
};

// Run initialization if called directly
if (require.main === module) {
    async function runInitialization() {
        try {
            console.log('🚀 MIVTON PHASE 3.3 - ADVANCED SOCIAL SCHEMA INITIALIZATION');
            console.log('📊 Environment:', process.env.NODE_ENV || 'development');
            console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Missing!');
            
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL environment variable is required');
            }
            
            const success = await initializeAdvancedSocial();
            if (success) {
                console.log('🎉 Advanced social schema initialization completed successfully!');
                process.exit(0);
            } else {
                throw new Error('Advanced social schema initialization failed');
            }
        } catch (error) {
            console.error('❌ Advanced social schema initialization failed:', error.message);
            process.exit(1);
        }
    }
    
    runInitialization();
}
