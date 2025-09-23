/**
 * AUTO SOCKET SESSIONS SCHEMA FIX
 * This will run when the server starts and fix the missing column
 */

const { getDb } = require('../database/connection');

async function autoFixSocketSessionsSchema() {
    try {
        console.log('🔍 Checking socket_sessions schema...');
        const db = getDb();
        
        // Check if updated_at column exists
        const hasUpdatedAt = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'socket_sessions' 
                AND column_name = 'updated_at'
                AND table_schema = 'public'
            )
        `);
        
        if (!hasUpdatedAt.rows[0].exists) {
            console.log('🔧 Adding missing updated_at column to socket_sessions...');
            
            await db.query(`
                ALTER TABLE socket_sessions 
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            
            console.log('✅ socket_sessions schema fixed - updated_at column added');
        } else {
            console.log('✅ socket_sessions schema is correct');
        }
        
        // Also check for created_at column
        const hasCreatedAt = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'socket_sessions' 
                AND column_name = 'created_at'
                AND table_schema = 'public'
            )
        `);
        
        if (!hasCreatedAt.rows[0].exists) {
            console.log('🔧 Adding missing created_at column to socket_sessions...');
            
            await db.query(`
                ALTER TABLE socket_sessions 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            
            console.log('✅ created_at column added to socket_sessions');
        }
        
    } catch (error) {
        // Don't fail the entire app startup if this fails
        console.warn('⚠️ Could not auto-fix socket_sessions schema:', error.message);
        console.log('ℹ️ Socket functionality may be limited until schema is fixed manually');
    }
}

module.exports = {
    autoFixSocketSessionsSchema
};
