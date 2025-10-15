/**
 * Manual script to create the cleanup_old_queue_entries function
 * Run with: node fix-cleanup-function-manual.js
 */

const { getDb } = require('./database/connection');

async function fixCleanupFunction() {
    console.log('🔧 Creating cleanup_old_queue_entries function...');

    try {
        const db = getDb();

        const sql = `
            CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
            RETURNS void AS $$
            BEGIN
                -- No-op: Random chat system uses in-memory queue (Map objects)
                -- No database tables to clean up
                RETURN;
            END;
            $$ LANGUAGE plpgsql;
        `;

        await db.query(sql);
        console.log('✅ Function created successfully!');

        // Test the function
        await db.query('SELECT cleanup_old_queue_entries()');
        console.log('✅ Function test passed!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixCleanupFunction();
