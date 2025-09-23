/**
 * Database Cleanup Script for Friend Request Duplicates
 * 
 * This script cleans up existing duplicate friend requests that are causing
 * the unique constraint violation error.
 */

const { pool } = require('./database/connection');

async function cleanupDuplicateFriendRequests() {
    try {
        console.log('🧹 Starting friend request cleanup...');
        
        // Find and remove duplicate friend requests, keeping only the most recent one
        const cleanupQuery = `
            WITH ranked_requests AS (
                SELECT id, 
                       sender_id, 
                       receiver_id, 
                       status,
                       created_at,
                       ROW_NUMBER() OVER (
                           PARTITION BY sender_id, receiver_id 
                           ORDER BY created_at DESC
                       ) as rn
                FROM friend_requests
            ),
            duplicates_to_delete AS (
                SELECT id 
                FROM ranked_requests 
                WHERE rn > 1
            )
            DELETE FROM friend_requests 
            WHERE id IN (SELECT id FROM duplicates_to_delete);
        `;
        
        const result = await pool.query(cleanupQuery);
        console.log(`✅ Deleted ${result.rowCount || 0} duplicate friend requests`);
        
        // Also clean up old expired/declined/cancelled requests that are older than 30 days
        const oldRequestsQuery = `
            DELETE FROM friend_requests 
            WHERE status IN ('expired', 'declined', 'cancelled') 
            AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
        `;
        
        const oldResult = await pool.query(oldRequestsQuery);
        console.log(`✅ Deleted ${oldResult.rowCount || 0} old expired/declined/cancelled requests`);
        
        // Check for any remaining constraint violations
        const checkQuery = `
            SELECT sender_id, receiver_id, COUNT(*) as count
            FROM friend_requests 
            GROUP BY sender_id, receiver_id 
            HAVING COUNT(*) > 1;
        `;
        
        const checkResult = await pool.query(checkQuery);
        
        if (checkResult.rows.length > 0) {
            console.log('⚠️ Still have duplicate requests:');
            checkResult.rows.forEach(row => {
                console.log(`   Sender ${row.sender_id} -> Receiver ${row.receiver_id}: ${row.count} requests`);
            });
        } else {
            console.log('✅ No duplicate requests found - all clean!');
        }
        
        console.log('🎉 Friend request cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
    cleanupDuplicateFriendRequests()
        .then(() => {
            console.log('✅ Cleanup completed, exiting...');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupDuplicateFriendRequests };
