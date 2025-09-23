/**
 * 🚀 MIVTON PHASE 3.2 - PRESENCE CLEANUP UTILITY (SAFE VERSION)
 * Maintains clean socket sessions and user presence data
 * 
 * Features:
 * - Cleanup inactive socket sessions
 * - Update user presence status
 * - Remove orphaned connections
 * - Performance monitoring
 * - Safe table existence checking
 */

const { getDb } = require('./connection');

/**
 * Check if required tables exist
 * @returns {Promise<Object>} Table existence status
 */
async function checkTablesExist() {
    try {
        const db = getDb();
        
        const tableCheck = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('user_presence', 'socket_sessions', 'realtime_events_log', 'friend_activity_feed')
        `);
        
        const existingTables = tableCheck.rows.map(row => row.table_name);
        
        return {
            user_presence: existingTables.includes('user_presence'),
            socket_sessions: existingTables.includes('socket_sessions'),
            realtime_events_log: existingTables.includes('realtime_events_log'),
            friend_activity_feed: existingTables.includes('friend_activity_feed')
        };
        
    } catch (error) {
        console.error('❌ Error checking table existence:', error);
        return {
            user_presence: false,
            socket_sessions: false,
            realtime_events_log: false,
            friend_activity_feed: false
        };
    }
}

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
        // Check if required tables exist
        const tablesExist = await checkTablesExist();
        
        if (!tablesExist.user_presence) {
            // Silent return instead of warning spam
            return {
                success: true,
                message: 'Presence tables not initialized - skipping cleanup',
                results: { skipped: true }
            };
        }
        
        console.log('🧹 Starting presence cleanup...');
        
        const db = getDb();
        const client = await db.connect();
        
        let totalCleaned = 0;
        let totalUpdated = 0;
        
        try {
            await client.query('BEGIN');
            
            let inactiveCount = 0;
            let presenceCount = 0;
            let deletedCount = 0;
            let orphanCount = 0;
            let syncCount = 0;
            
            // 1. Mark inactive sessions as inactive (only if socket_sessions exists)
            if (tablesExist.socket_sessions) {
                const inactiveResult = await client.query(`
                    UPDATE socket_sessions 
                    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                    WHERE is_active = TRUE 
                    AND last_activity < NOW() - INTERVAL '${maxInactiveMinutes} minutes'
                    RETURNING user_id
                `);
                
                inactiveCount = inactiveResult.rows.length;
                console.log(`📊 Marked ${inactiveCount} sessions as inactive`);
            }
            
            // 2. Update user presence for users with no active sessions
            if (tablesExist.user_presence && tablesExist.socket_sessions) {
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
                
                presenceCount = presenceResult.rows.length;
                console.log(`📊 Updated presence for ${presenceCount} users`);
            }
            
            // 3. Delete old inactive sessions
            if (tablesExist.socket_sessions) {
                const deleteResult = await client.query(`
                    DELETE FROM socket_sessions 
                    WHERE is_active = FALSE 
                    AND connected_at < NOW() - INTERVAL '${maxSessionAge} minutes'
                `);
                
                deletedCount = deleteResult.rowCount;
                console.log(`📊 Deleted ${deletedCount} old sessions`);
            }
            
            // 4. Clean up orphaned presence records
            if (tablesExist.user_presence) {
                const orphanResult = await client.query(`
                    DELETE FROM user_presence 
                    WHERE user_id NOT IN (SELECT id FROM users)
                `);
                
                orphanCount = orphanResult.rowCount;
                console.log(`📊 Cleaned ${orphanCount} orphaned presence records`);
            }
            
            // 5. Fix socket counts that may be out of sync
            if (tablesExist.user_presence && tablesExist.socket_sessions) {
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
                
                syncCount = syncResult.rowCount;
                console.log(`📊 Synchronized ${syncCount} socket counts`);
            }
            
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
        // Check if required tables exist
        const tablesExist = await checkTablesExist();
        
        if (!tablesExist.user_presence) {
            return {
                presence: { total_users: 0, online_users: 0, away_users: 0, busy_users: 0, offline_users: 0, users_with_sockets: 0 },
                sessions: { total_sessions: 0, active_sessions: 0, inactive_sessions: 0, recent_activity: 0, total_sockets: 0, avg_session_duration_minutes: 0 },
                activity: { recent_events: 0, successful_events: 0, failed_events: 0 },
                generated_at: new Date(),
                message: 'Presence tables not initialized'
            };
        }
        
        const db = getDb();
        
        // Build query based on available tables
        let queryParts = [];
        
        if (tablesExist.user_presence) {
            queryParts.push(`
                presence_stats AS (
                    SELECT 
                        COUNT(*) as total_users,
                        COUNT(CASE WHEN status = 'online' THEN 1 END) as online_users,
                        COUNT(CASE WHEN status = 'away' THEN 1 END) as away_users,
                        COUNT(CASE WHEN status = 'busy' THEN 1 END) as busy_users,
                        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_users,
                        COUNT(CASE WHEN socket_count > 0 THEN 1 END) as users_with_sockets,
                        SUM(socket_count) as total_sockets
                    FROM user_presence
                )
            `);
        }
        
        if (tablesExist.socket_sessions) {
            queryParts.push(`
                session_stats AS (
                    SELECT 
                        COUNT(*) as total_sessions,
                        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_sessions,
                        COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_sessions,
                        COUNT(CASE WHEN last_activity > NOW() - INTERVAL '5 minutes' THEN 1 END) as recent_activity,
                        AVG(EXTRACT(EPOCH FROM (NOW() - connected_at))/60) as avg_session_duration_minutes
                    FROM socket_sessions
                )
            `);
        }
        
        if (tablesExist.realtime_events_log) {
            queryParts.push(`
                activity_stats AS (
                    SELECT 
                        COUNT(*) as recent_events,
                        COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_events,
                        COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_events
                    FROM realtime_events_log 
                    WHERE created_at > NOW() - INTERVAL '1 hour'
                )
            `);
        }
        
        if (queryParts.length === 0) {
            // No tables available, return empty stats
            return {
                presence: { total_users: 0, online_users: 0, away_users: 0, busy_users: 0, offline_users: 0, users_with_sockets: 0 },
                sessions: { total_sessions: 0, active_sessions: 0, inactive_sessions: 0, recent_activity: 0, total_sockets: 0, avg_session_duration_minutes: 0 },
                activity: { recent_events: 0, successful_events: 0, failed_events: 0 },
                generated_at: new Date()
            };
        }
        
        const query = `WITH ${queryParts.join(', ')} SELECT * FROM ${queryParts.map((_, i) => ['presence_stats', 'session_stats', 'activity_stats'][i]).filter(Boolean).join(', ')}`;
        
        const result = await db.query(query);
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
            generated_at: new Date()
        };
        
    } catch (error) {
        console.error('❌ Error getting presence stats:', error);
        // Return empty stats instead of throwing
        return {
            presence: { total_users: 0, online_users: 0, away_users: 0, busy_users: 0, offline_users: 0, users_with_sockets: 0 },
            sessions: { total_sessions: 0, active_sessions: 0, inactive_sessions: 0, recent_activity: 0, total_sockets: 0, avg_session_duration_minutes: 0 },
            activity: { recent_events: 0, successful_events: 0, failed_events: 0 },
            generated_at: new Date(),
            error: error.message
        };
    }
}

/**
 * Force cleanup for a specific user
 * @param {number} userId - User ID to cleanup
 * @returns {Promise<Object>} Cleanup results
 */
async function cleanupUserPresence(userId) {
    try {
        const tablesExist = await checkTablesExist();
        
        if (!tablesExist.user_presence) {
            return {
                success: true,
                message: 'Presence tables not initialized - skipping cleanup',
                cleaned_sessions: 0
            };
        }
        
        console.log(`🧹 Cleaning up presence for user ${userId}`);
        
        const db = getDb();
        const client = await db.connect();
        
        try {
            await client.query('BEGIN');
            
            let sessionCount = 0;
            
            // Remove all socket sessions for user (if table exists)
            if (tablesExist.socket_sessions) {
                const sessionResult = await client.query(`
                    DELETE FROM socket_sessions 
                    WHERE user_id = $1
                    RETURNING socket_id
                `, [userId]);
                
                sessionCount = sessionResult.rows.length;
            }
            
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
            
            console.log(`✅ Cleaned up ${sessionCount} sessions for user ${userId}`);
            
            return {
                success: true,
                cleaned_sessions: sessionCount
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
 * Auto-cleanup scheduler function
 * @param {number} intervalMinutes - Cleanup interval in minutes
 */
function schedulePresenceCleanup(intervalMinutes = 60) {
    console.log(`⏰ Scheduling presence cleanup every ${intervalMinutes} minutes`);
    
    const interval = setInterval(async () => {
        try {
            const result = await cleanupPresence();
            
            if (result.success && !result.results?.skipped) {
                console.log('✅ Scheduled cleanup completed:', result.results);
            }
            // Don't log if tables don't exist - reduces spam
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
    checkTablesExist,
    schedulePresenceCleanup
};
