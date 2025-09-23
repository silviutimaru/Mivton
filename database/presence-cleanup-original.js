/**
 * 🚀 MIVTON PHASE 3.2 - PRESENCE CLEANUP UTILITY
 * Maintains clean socket sessions and user presence data
 * 
 * Features:
 * - Cleanup inactive socket sessions
 * - Update user presence status
 * - Remove orphaned connections
 * - Performance monitoring
 */

const { getDb } = require('./connection');

/**
 * Cleanup inactive socket sessions and update user presence
 * @param {Object} options - Cleanup options
 * @returns {Promise<Object>} Cleanup results
 */
async function cleanupPresence(options = {}) {
    const {
        maxInactiveMinutes = 10,
        maxSessionAge = 24 * 60, // 24 hours in minutes
        batchSize = 1000
    } = options;
    
    try {
        console.log('🧹 Starting presence cleanup...');
        
        const db = getDb();
        const client = await db.connect();
        
        let totalCleaned = 0;
        let totalUpdated = 0;
        
        try {
            await client.query('BEGIN');
            
            // 1. Mark inactive sessions as inactive
            const inactiveResult = await client.query(`
                UPDATE socket_sessions 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE is_active = TRUE 
                AND last_activity < NOW() - INTERVAL '${maxInactiveMinutes} minutes'
                RETURNING user_id
            `);
            
            const inactiveCount = inactiveResult.rows.length;
            console.log(`📊 Marked ${inactiveCount} sessions as inactive`);
            
            // 2. Update user presence for users with no active sessions
            const presenceResult = await client.query(`
                UPDATE user_presence 
                SET 
                    status = 'offline',
                    socket_count = (
                        SELECT COUNT(*) 
                        FROM socket_sessions ss 
                        WHERE ss.user_id = user_presence.user_id 
                        AND ss.is_active = TRUE
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id IN (
                    SELECT DISTINCT user_id 
                    FROM socket_sessions 
                    WHERE is_active = FALSE
                )
                AND status != 'offline'
                RETURNING user_id
            `);
            
            const presenceCount = presenceResult.rows.length;
            console.log(`📊 Updated presence for ${presenceCount} users`);
            
            // 3. Delete old inactive sessions
            const deleteResult = await client.query(`
                DELETE FROM socket_sessions 
                WHERE is_active = FALSE 
                AND connected_at < NOW() - INTERVAL '${maxSessionAge} minutes'
            `);
            
            const deletedCount = deleteResult.rowCount;
            console.log(`📊 Deleted ${deletedCount} old sessions`);
            
            // 4. Clean up orphaned presence records
            const orphanResult = await client.query(`
                DELETE FROM user_presence 
                WHERE user_id NOT IN (SELECT id FROM users)
            `);
            
            const orphanCount = orphanResult.rowCount;
            console.log(`📊 Cleaned ${orphanCount} orphaned presence records`);
            
            // 5. Fix socket counts that may be out of sync
            const syncResult = await client.query(`
                UPDATE user_presence 
                SET socket_count = (
                    SELECT COUNT(*) 
                    FROM socket_sessions ss 
                    WHERE ss.user_id = user_presence.user_id 
                    AND ss.is_active = TRUE
                ),
                updated_at = CURRENT_TIMESTAMP
                WHERE socket_count != (
                    SELECT COUNT(*) 
                    FROM socket_sessions ss 
                    WHERE ss.user_id = user_presence.user_id 
                    AND ss.is_active = TRUE
                )
            `);
            
            const syncCount = syncResult.rowCount;
            console.log(`📊 Synchronized ${syncCount} socket counts`);
            
            await client.query('COMMIT');
            
            totalCleaned = inactiveCount + deletedCount + orphanCount;
            totalUpdated = presenceCount + syncCount;
            
            console.log('✅ Presence cleanup completed successfully');
            
            return {
                success: true,
                results: {
                    inactive_sessions: inactiveCount,
                    updated_presence: presenceCount,
                    deleted_sessions: deletedCount,
                    orphaned_records: orphanCount,
                    synchronized_counts: syncCount,
                    total_cleaned: totalCleaned,
                    total_updated: totalUpdated
                }
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Presence cleanup error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get current presence statistics
 * @returns {Promise<Object>} Presence statistics
 */
async function getPresenceStats() {
    try {
        const db = getDb();
        
        // Get comprehensive presence statistics
        const result = await db.query(`
            WITH presence_stats AS (
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN status = 'online' THEN 1 END) as online_users,
                    COUNT(CASE WHEN status = 'away' THEN 1 END) as away_users,
                    COUNT(CASE WHEN status = 'busy' THEN 1 END) as busy_users,
                    COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_users,
                    COUNT(CASE WHEN socket_count > 0 THEN 1 END) as users_with_sockets,
                    SUM(socket_count) as total_sockets
                FROM user_presence
            ),
            session_stats AS (
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_sessions,
                    COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_sessions,
                    COUNT(CASE WHEN last_activity > NOW() - INTERVAL '5 minutes' THEN 1 END) as recent_activity,
                    AVG(EXTRACT(EPOCH FROM (NOW() - connected_at))/60) as avg_session_duration_minutes
                FROM socket_sessions
            ),
            activity_stats AS (
                SELECT 
                    COUNT(*) as recent_events,
                    COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_events,
                    COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_events
                FROM realtime_events_log 
                WHERE created_at > NOW() - INTERVAL '1 hour'
            )
            SELECT 
                ps.*,
                ss.*,
                as.*,
                NOW() as generated_at
            FROM presence_stats ps, session_stats ss, activity_stats as
        `);
        
        const stats = result.rows[0];
        
        return {
            presence: {
                total_users: parseInt(stats.total_users) || 0,
                online_users: parseInt(stats.online_users) || 0,
                away_users: parseInt(stats.away_users) || 0,
                busy_users: parseInt(stats.busy_users) || 0,
                offline_users: parseInt(stats.offline_users) || 0,
                users_with_sockets: parseInt(stats.users_with_sockets) || 0
            },
            sessions: {
                total_sessions: parseInt(stats.total_sessions) || 0,
                active_sessions: parseInt(stats.active_sessions) || 0,
                inactive_sessions: parseInt(stats.inactive_sessions) || 0,
                recent_activity: parseInt(stats.recent_activity) || 0,
                total_sockets: parseInt(stats.total_sockets) || 0,
                avg_session_duration_minutes: parseFloat(stats.avg_session_duration_minutes) || 0
            },
            activity: {
                recent_events: parseInt(stats.recent_events) || 0,
                successful_events: parseInt(stats.successful_events) || 0,
                failed_events: parseInt(stats.failed_events) || 0
            },
            generated_at: stats.generated_at
        };
        
    } catch (error) {
        console.error('❌ Error getting presence stats:', error);
        throw error;
    }
}

/**
 * Force cleanup for a specific user
 * @param {number} userId - User ID to cleanup
 * @returns {Promise<Object>} Cleanup results
 */
async function cleanupUserPresence(userId) {
    try {
        console.log(`🧹 Cleaning up presence for user ${userId}`);
        
        const db = getDb();
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');
            
            // Remove all socket sessions for user
            const sessionResult = await client.query(`
                DELETE FROM socket_sessions 
                WHERE user_id = $1
                RETURNING socket_id
            `, [userId]);
            
            // Update user presence to offline
            await client.query(`
                UPDATE user_presence 
                SET 
                    status = 'offline',
                    socket_count = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
            `, [userId]);
            
            await client.query('COMMIT');
            
            console.log(`✅ Cleaned up ${sessionResult.rows.length} sessions for user ${userId}`);
            
            return {
                success: true,
                cleaned_sessions: sessionResult.rows.length
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error(`❌ Error cleaning up user ${userId} presence:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Validate user presence consistency
 * @returns {Promise<Object>} Validation results
 */
async function validatePresenceConsistency() {
    try {
        console.log('🔍 Validating presence consistency...');
        
        const db = getDb();
        
        // Check for inconsistencies
        const inconsistencies = await db.query(`
            SELECT 
                up.user_id,
                up.status,
                up.socket_count as presence_socket_count,
                COUNT(ss.id) as actual_socket_count,
                up.socket_count - COUNT(ss.id) as count_difference
            FROM user_presence up
            LEFT JOIN socket_sessions ss ON ss.user_id = up.user_id AND ss.is_active = TRUE
            GROUP BY up.user_id, up.status, up.socket_count
            HAVING up.socket_count != COUNT(ss.id)
            ORDER BY ABS(up.socket_count - COUNT(ss.id)) DESC
            LIMIT 100
        `);
        
        // Check for users without presence records
        const missingPresence = await db.query(`
            SELECT u.id as user_id, u.username
            FROM users u
            LEFT JOIN user_presence up ON up.user_id = u.id
            WHERE up.user_id IS NULL
            LIMIT 50
        `);
        
        // Check for orphaned socket sessions
        const orphanedSessions = await db.query(`
            SELECT ss.user_id, COUNT(*) as session_count
            FROM socket_sessions ss
            LEFT JOIN users u ON u.id = ss.user_id
            WHERE u.id IS NULL
            GROUP BY ss.user_id
            LIMIT 50
        `);
        
        console.log(`🔍 Found ${inconsistencies.rows.length} socket count inconsistencies`);
        console.log(`🔍 Found ${missingPresence.rows.length} users without presence records`);
        console.log(`🔍 Found ${orphanedSessions.rows.length} orphaned session groups`);
        
        return {
            socket_count_inconsistencies: inconsistencies.rows,
            missing_presence_records: missingPresence.rows,
            orphaned_sessions: orphanedSessions.rows,
            total_issues: inconsistencies.rows.length + missingPresence.rows.length + orphanedSessions.rows.length
        };
        
    } catch (error) {
        console.error('❌ Error validating presence consistency:', error);
        throw error;
    }
}

/**
 * Auto-cleanup scheduler function
 * @param {number} intervalMinutes - Cleanup interval in minutes
 */
function schedulePresenceCleanup(intervalMinutes = 60) {
    console.log(`⏰ Scheduling presence cleanup every ${intervalMinutes} minutes`);
    
    const interval = setInterval(async () => {
        try {
            console.log('🕐 Running scheduled presence cleanup...');
            const result = await cleanupPresence();
            
            if (result.success) {
                console.log('✅ Scheduled cleanup completed:', result.results);
            } else {
                console.error('❌ Scheduled cleanup failed:', result.error);
            }
        } catch (error) {
            console.error('❌ Scheduled cleanup error:', error);
        }
    }, intervalMinutes * 60 * 1000);
    
    // Return function to stop the scheduler
    return () => {
        console.log('⏹️ Stopping scheduled presence cleanup');
        clearInterval(interval);
    };
}

module.exports = {
    cleanupPresence,
    getPresenceStats,
    cleanupUserPresence,
    validatePresenceConsistency,
    schedulePresenceCleanup
};
