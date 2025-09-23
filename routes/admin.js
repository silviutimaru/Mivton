// Admin API Routes for Mivton
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { getDb } = require('../database/connection');

/**
 * 🚀 MIVTON ADMIN API ROUTES
 * 
 * These routes provide admin-specific functionality:
 * - User management
 * - System monitoring
 * - Analytics and statistics
 * - Admin controls
 */

// All admin routes require admin authentication
router.use(requireAdmin);

// Get all users (admin only)
router.get('/users', async (req, res) => {
    try {
        const db = getDb();
        
        const users = await db.query(`
            SELECT 
                id, username, email, full_name, 
                is_admin, admin_level, is_verified, 
                status, created_at, last_login
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            users: users.rows,
            total: users.rows.length,
            admins: users.rows.filter(u => u.is_admin).length
        });
        
    } catch (error) {
        console.error('❌ Admin users API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});

// Promote user to admin
router.post('/promote', async (req, res) => {
    try {
        const { username, email } = req.body;
        
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                error: 'Username or email is required'
            });
        }
        
        const db = getDb();
        
        const result = await db.query(
            'UPDATE users SET is_admin = true, admin_level = 2, updated_at = CURRENT_TIMESTAMP WHERE username = $1 OR email = $2 RETURNING *',
            [username || email, email || username]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User promoted to admin successfully',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Admin promote API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to promote user'
        });
    }
});

// Demote admin to regular user
router.post('/demote', async (req, res) => {
    try {
        const { username, email } = req.body;
        
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                error: 'Username or email is required'
            });
        }
        
        const db = getDb();
        
        const result = await db.query(
            'UPDATE users SET is_admin = false, admin_level = 0, updated_at = CURRENT_TIMESTAMP WHERE username = $1 OR email = $2 RETURNING *',
            [username || email, email || username]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User demoted from admin successfully',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Admin demote API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to demote user'
        });
    }
});

// Block user
router.post('/block', async (req, res) => {
    try {
        const { username, email, reason } = req.body;
        
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                error: 'Username or email is required'
            });
        }
        
        const db = getDb();
        
        const result = await db.query(
            'UPDATE users SET is_blocked = true, updated_at = CURRENT_TIMESTAMP WHERE username = $1 OR email = $2 RETURNING *',
            [username || email, email || username]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User blocked successfully',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Admin block API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to block user'
        });
    }
});

// Unblock user
router.post('/unblock', async (req, res) => {
    try {
        const { username, email } = req.body;
        
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                error: 'Username or email is required'
            });
        }
        
        const db = getDb();
        
        const result = await db.query(
            'UPDATE users SET is_blocked = false, updated_at = CURRENT_TIMESTAMP WHERE username = $1 OR email = $2 RETURNING *',
            [username || email, email || username]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User unblocked successfully',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Admin unblock API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unblock user'
        });
    }
});

// Delete user completely
router.delete('/delete-user', async (req, res) => {
    try {
        const { username, email } = req.body;
        
        if (!username && !email) {
            return res.status(400).json({
                success: false,
                error: 'Username or email is required'
            });
        }
        
        const db = getDb();
        
        // Find user by username or email
        const userResult = await db.query(
            'SELECT id, username, email, is_admin FROM users WHERE username = $1 OR email = $1',
            [username || email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        
        // Prevent admin from deleting themselves
        if (user.id === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete yourself'
            });
        }
        
        // Prevent deletion of other admins (optional security measure)
        if (user.is_admin) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete admin users'
            });
        }
        
        console.log(`🗑️ Admin ${req.user.username} deleting user ${user.username} (ID: ${user.id})`);
        
        // Start transaction for complete user deletion
        await db.query('BEGIN');
        
        try {
            // Delete from all related tables (with error handling for missing tables)
            
            // 1. Delete friend relationships
            try {
                await db.query('DELETE FROM friendships WHERE user_id = $1 OR friend_id = $1', [user.id]);
                console.log(`✅ Deleted friendships for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ Friendships table not found or error: ${err.message}`);
            }
            
            // 2. Delete friend requests
            try {
                await db.query('DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1', [user.id]);
                console.log(`✅ Deleted friend requests for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ Friend requests table not found or error: ${err.message}`);
            }
            
            // 3. Delete blocked users relationships
            try {
                await db.query('DELETE FROM blocked_users WHERE blocker_id = $1 OR blocked_id = $1', [user.id]);
                console.log(`✅ Deleted blocked users for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ Blocked users table not found or error: ${err.message}`);
            }
            
            // 4. Delete notifications
            try {
                await db.query('DELETE FROM notifications WHERE user_id = $1', [user.id]);
                console.log(`✅ Deleted notifications for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ Notifications table not found or error: ${err.message}`);
            }
            
            // 5. Delete social notifications
            try {
                await db.query('DELETE FROM social_notifications WHERE user_id = $1', [user.id]);
                console.log(`✅ Deleted social notifications for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ Social notifications table not found or error: ${err.message}`);
            }
            
            // 6. Delete presence data
            try {
                await db.query('DELETE FROM user_presence WHERE user_id = $1', [user.id]);
                console.log(`✅ Deleted presence data for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ User presence table not found or error: ${err.message}`);
            }
            
            // 7. Delete socket sessions
            try {
                await db.query('DELETE FROM socket_sessions WHERE user_id = $1', [user.id]);
                console.log(`✅ Deleted socket sessions for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ Socket sessions table not found or error: ${err.message}`);
            }
            
            // 8. Delete activity logs
            try {
                await db.query('DELETE FROM user_activity WHERE user_id = $1', [user.id]);
                console.log(`✅ Deleted activity logs for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ User activity table not found or error: ${err.message}`);
            }
            
            // 9. Delete user preferences
            try {
                await db.query('DELETE FROM user_preferences WHERE user_id = $1', [user.id]);
                console.log(`✅ Deleted user preferences for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ User preferences table not found or error: ${err.message}`);
            }
            
            // 10. Delete messages (if any)
            try {
                await db.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [user.id]);
                console.log(`✅ Deleted messages for user ${user.id}`);
            } catch (err) {
                console.log(`⚠️ Messages table not found or error: ${err.message}`);
            }
            
            // 11. Finally, delete the user
            await db.query('DELETE FROM users WHERE id = $1', [user.id]);
            console.log(`✅ Deleted user ${user.id} from users table`);
            
            // Commit transaction
            await db.query('COMMIT');
            
            console.log(`✅ User ${user.username} (ID: ${user.id}) completely deleted from all tables`);
            
            res.json({
                success: true,
                message: `User ${user.username} has been completely deleted from the system`,
                deletedUser: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
            
        } catch (deleteError) {
            // Rollback transaction on error
            await db.query('ROLLBACK');
            console.error('❌ Error during user deletion:', deleteError);
            throw deleteError;
        }
        
    } catch (error) {
        console.error('❌ Admin delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

// Get system statistics
router.get('/stats', async (req, res) => {
    try {
        const db = getDb();
        
        // Get user statistics
        const userStats = await db.query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users,
                COUNT(CASE WHEN status = 'online' THEN 1 END) as online_users,
                COUNT(CASE WHEN is_blocked = true THEN 1 END) as blocked_users,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today
            FROM users
        `);
        
        // Get friendship statistics
        let friendshipStats = { total_friendships: 0, pending_requests: 0 };
        try {
            const friendshipResult = await db.query(`
                SELECT 
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as total_friendships,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests
                FROM friendships
            `);
            friendshipStats = friendshipResult.rows[0];
        } catch (error) {
            console.log('ℹ️ Friendships table not available');
        }
        
        // Get waitlist statistics
        let waitlistStats = { total_waitlist: 0 };
        try {
            const waitlistResult = await db.query('SELECT COUNT(*) as total_waitlist FROM waitlist');
            waitlistStats = waitlistResult.rows[0];
        } catch (error) {
            console.log('ℹ️ Waitlist table not available');
        }
        
        const stats = {
            users: userStats.rows[0],
            friendships: friendshipStats,
            waitlist: waitlistStats,
            system: {
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                node_version: process.version,
                platform: process.platform
            },
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            stats
        });
        
    } catch (error) {
        console.error('❌ Admin stats API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch system statistics'
        });
    }
});

// Get system health
router.get('/health', async (req, res) => {
    try {
        const db = getDb();
        
        // Test database connection
        const dbTest = await db.query('SELECT NOW() as current_time');
        
        // Get basic system info
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                response_time: Date.now(),
                current_time: dbTest.rows[0].current_time
            },
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu_usage: process.cpuUsage(),
                platform: process.platform,
                node_version: process.version
            },
            services: {
                authentication: 'active',
                database: 'connected',
                api: 'operational'
            }
        };
        
        res.json({
            success: true,
            health
        });
        
    } catch (error) {
        console.error('❌ Admin health API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check system health',
            health: {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            }
        });
    }
});

// Get admin activity log
router.get('/activity', async (req, res) => {
    try {
        // This would typically come from a logs table
        // For now, return a placeholder
        const activity = [
            {
                id: 1,
                action: 'admin_login',
                user: req.user.username,
                timestamp: new Date().toISOString(),
                details: 'Admin user logged in'
            },
            {
                id: 2,
                action: 'system_check',
                user: req.user.username,
                timestamp: new Date(Date.now() - 300000).toISOString(),
                details: 'System health check performed'
            }
        ];
        
        res.json({
            success: true,
            activity
        });
        
    } catch (error) {
        console.error('❌ Admin activity API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activity log'
        });
    }
});

module.exports = router;
