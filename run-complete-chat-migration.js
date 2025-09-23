/**
 * Run Complete Chat System Migration
 * Executes the complete chat system database migration
 */

const fs = require('fs');
const path = require('path');
const { query } = require('./database/connection');

async function runCompleteChatMigration() {
    try {
        console.log('🔄 Running complete chat system migration...');
        
        const migrationPath = path.join(__dirname, 'database', 'migrations', '003_complete_chat_system.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error('Migration file not found: 003_complete_chat_system.sql');
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await query(migrationSQL);
        
        console.log('✅ Complete chat system migration completed successfully');
        
        return {
            success: true,
            message: 'Complete chat system migration completed',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Complete chat system migration failed:', error);
        throw error;
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runCompleteChatMigration()
        .then(result => {
            console.log('Migration result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runCompleteChatMigration };
