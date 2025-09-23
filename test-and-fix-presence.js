#!/usr/bin/env node

/**
 * 🧪 TEST AND FIX PRESENCE DATABASE ISSUE
 * This script tests the database connection and fixes the missing presence schema
 */

require('dotenv').config();

console.log('🔧 MIVTON DATABASE FIX TOOL');
console.log('============================');
console.log('');

async function testAndFix() {
    try {
        console.log('🔄 Step 1: Testing database connection...');
        
        // Initialize database connection
        const { initializeDatabase, getDb } = require('./database/connection');
        await initializeDatabase();
        
        const db = getDb();
        
        // Test basic connection
        const connectionTest = await db.query('SELECT NOW() as current_time, version() as postgres_version');
        console.log('✅ Database connection successful');
        console.log(`   Time: ${connectionTest.rows[0].current_time}`);
        console.log(`   PostgreSQL: ${connectionTest.rows[0].postgres_version.split(' ')[0]} ${connectionTest.rows[0].postgres_version.split(' ')[1]}`);
        console.log('');

        console.log('🔄 Step 2: Checking existing tables...');
        
        // Check what tables exist
        const tablesResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        const existingTables = tablesResult.rows.map(row => row.table_name);
        console.log('✅ Existing tables:', existingTables.join(', '));
        
        // Check if the problematic table exists
        const hasPresenceSettings = existingTables.includes('user_presence_settings');
        console.log(`   user_presence_settings table: ${hasPresenceSettings ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log('');

        if (!hasPresenceSettings) {
            console.log('🔄 Step 3: Running presence schema fix...');
            
            // Import and run the fix
            const { fixPresenceSchema } = require('./fix-presence-schema');
            const fixResult = await fixPresenceSchema();
            
            if (fixResult) {
                console.log('✅ Presence schema fix completed successfully!');
            } else {
                console.log('❌ Presence schema fix failed!');
                return false;
            }
        } else {
            console.log('✅ Step 3: user_presence_settings table already exists - no fix needed');
        }

        console.log('');
        console.log('🔄 Step 4: Final verification...');
        
        // Verify the fix worked
        const finalCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_presence_settings'
            )
        `);

        if (finalCheck.rows[0].exists) {
            console.log('✅ Final verification passed - user_presence_settings table is ready');
            
            // Check if any users have default settings
            const userCount = await db.query('SELECT COUNT(*) FROM users');
            const settingsCount = await db.query('SELECT COUNT(*) FROM user_presence_settings');
            
            console.log(`   Total users: ${userCount.rows[0].count}`);
            console.log(`   Users with presence settings: ${settingsCount.rows[0].count}`);
            
            if (parseInt(userCount.rows[0].count) > parseInt(settingsCount.rows[0].count)) {
                console.log('⚠️  Some users may need default presence settings');
            }
        } else {
            console.log('❌ Final verification failed - table still missing');
            return false;
        }

        console.log('');
        console.log('🎉 DATABASE FIX COMPLETED SUCCESSFULLY!');
        console.log('');
        console.log('📋 What was fixed:');
        console.log('   - Created user_presence_settings table');
        console.log('   - Created contact_restrictions table');
        console.log('   - Created user_activity_tracking table');
        console.log('   - Created dnd_exceptions table');
        console.log('   - Added performance indexes');
        console.log('   - Created default settings for existing users');
        console.log('   - Set up automatic timestamp triggers');
        console.log('');
        console.log('🚀 NEXT STEPS:');
        console.log('   1. Your app should now work without the presence errors');
        console.log('   2. Restart your server to see the fix in action');
        console.log('   3. Test the /api/presence/advanced/friends-filtered endpoint');
        console.log('');

        return true;

    } catch (error) {
        console.error('❌ Error during test and fix:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test and fix
testAndFix()
    .then((success) => {
        if (success) {
            console.log('✅ All done! Your presence error should be fixed.');
            process.exit(0);
        } else {
            console.log('❌ Fix failed. Check the error messages above.');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
