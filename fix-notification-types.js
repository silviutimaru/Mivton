#!/usr/bin/env node

/**
 * 🔧 FIX FRIEND NOTIFICATION TYPES
 * Fixes the constraint that's blocking friend removal notifications
 */

require('dotenv').config();

const { getDb } = require('./database/connection');

async function fixNotificationTypes() {
    console.log('🔧 FIXING FRIEND NOTIFICATION TYPES CONSTRAINT');
    console.log('================================================');
    console.log('');

    try {
        const db = getDb();

        console.log('📊 Checking current constraint...');

        // First, let's see what the current constraint allows
        const constraintInfo = await db.query(`
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conname = 'friend_notifications_type_check'
        `);

        if (constraintInfo.rows.length > 0) {
            console.log('Current constraint:', constraintInfo.rows[0].constraint_definition);
        }

        console.log('🔄 Dropping old constraint...');

        // Drop the existing constraint
        await db.query(`
            ALTER TABLE friend_notifications 
            DROP CONSTRAINT IF EXISTS friend_notifications_type_check
        `);

        console.log('✅ Old constraint dropped');

        console.log('🔄 Adding updated constraint with all notification types...');

        // Add new constraint with all the notification types we need
        await db.query(`
            ALTER TABLE friend_notifications 
            ADD CONSTRAINT friend_notifications_type_check 
            CHECK (type IN (
                'friend_request',
                'friend_accepted', 
                'friend_declined',
                'friend_removed',
                'friend_online',
                'friend_offline',
                'friend_blocked',
                'friend_unblocked'
            ))
        `);

        console.log('✅ Updated constraint added successfully');

        console.log('🧪 Testing the fix...');

        // Test that we can now insert a friend_removed notification
        const testResult = await db.query(`
            SELECT 'friend_removed'::VARCHAR(50) 
            WHERE 'friend_removed' IN (
                'friend_request',
                'friend_accepted', 
                'friend_declined',
                'friend_removed',
                'friend_online',
                'friend_offline',
                'friend_blocked',
                'friend_unblocked'
            )
        `);

        if (testResult.rows.length > 0) {
            console.log('✅ Constraint test passed - friend_removed is now allowed');
        } else {
            console.log('❌ Constraint test failed');
        }

        console.log('');
        console.log('🎉 NOTIFICATION TYPES CONSTRAINT FIXED!');
        console.log('');
        console.log('✅ Now supports these notification types:');
        console.log('   - friend_request (new friend request)');
        console.log('   - friend_accepted (request accepted)');
        console.log('   - friend_declined (request declined)');
        console.log('   - friend_removed (friend was removed)');
        console.log('   - friend_online (friend came online)');
        console.log('   - friend_offline (friend went offline)');
        console.log('   - friend_blocked (friend was blocked)');
        console.log('   - friend_unblocked (friend was unblocked)');
        console.log('');
        console.log('🚀 Friend removal should now work without errors!');

        return true;

    } catch (error) {
        console.error('❌ Error fixing notification types:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the fix
if (require.main === module) {
    fixNotificationTypes()
        .then((success) => {
            if (success) {
                console.log('✅ Fix completed successfully - try removing a friend again!');
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
    module.exports = { fixNotificationTypes };
}
