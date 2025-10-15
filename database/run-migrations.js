/**
 * Database Migration Runner
 * Automatically runs migrations on server startup
 */

const { getDb } = require('./connection');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
    console.log('🔄 Running database migrations...');

    try {
        const db = getDb();

        // 1. Add profile features
        const profileSQL = fs.readFileSync(
            path.join(__dirname, 'add-profile-features.sql'),
            'utf8'
        );
        await db.query(profileSQL);
        console.log('✅ Profile features migration completed');

        // 2. Optimize with indexes
        const optimizeSQL = fs.readFileSync(
            path.join(__dirname, 'optimize-indexes.sql'),
            'utf8'
        );
        await db.query(optimizeSQL);
        console.log('✅ Database optimization completed');

        // 3. Fix random chat cleanup function
        const randomChatFixSQL = fs.readFileSync(
            path.join(__dirname, 'fix-random-chat-function.sql'),
            'utf8'
        );
        await db.query(randomChatFixSQL);
        console.log('✅ Random chat function fix completed');

        console.log('✅ All database migrations completed successfully');
        return true;

    } catch (error) {
        console.error('❌ Migration error:', error.message);
        // Don't throw - let the server start even if migrations fail
        return false;
    }
}

module.exports = { runMigrations };
