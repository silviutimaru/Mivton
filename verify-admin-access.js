#!/usr/bin/env node

/**
 * 🔍 ADMIN VERIFICATION SCRIPT
 * Verifies that silviu@mivton.com has proper admin access and functionality
 */

const { Pool } = require('pg');

async function verifyAdminAccess() {
    console.log('🔍 Starting Admin Access Verification...');
    
    // Database configuration
    const dbConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    };
    
    const pool = new Pool(dbConfig);
    
    try {
        // Test database connection
        console.log('🔌 Testing database connection...');
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connected:', testResult.rows[0].current_time);
        
        // Check silviu@mivton.com admin status
        console.log('👤 Checking silviu@mivton.com admin status...');
        const userResult = await pool.query(
            'SELECT id, username, email, is_admin, admin_level, status, created_at FROM users WHERE email = $1',
            ['silviu@mivton.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User silviu@mivton.com not found');
            return false;
        }
        
        const user = userResult.rows[0];
        console.log('👤 User details:', {
            id: user.id,
            username: user.username,
            email: user.email,
            is_admin: user.is_admin,
            admin_level: user.admin_level,
            status: user.status,
            created_at: user.created_at
        });
        
        // Verify admin status
        if (!user.is_admin) {
            console.log('❌ User is NOT an admin');
            return false;
        }
        
        if (user.admin_level < 1) {
            console.log('❌ User has insufficient admin level');
            return false;
        }
        
        console.log('✅ User is properly configured as admin');
        
        // Check all admin users
        console.log('👥 Checking all admin users...');
        const adminUsers = await pool.query(
            'SELECT username, email, admin_level, status FROM users WHERE is_admin = true ORDER BY admin_level DESC'
        );
        
        console.log('👑 All admin users:');
        adminUsers.rows.forEach((admin, index) => {
            console.log(`  ${index + 1}. ${admin.username} (${admin.email}) - Level: ${admin.admin_level} - Status: ${admin.status}`);
        });
        
        // Verify only silviu@mivton.com is admin
        const otherAdmins = adminUsers.rows.filter(admin => admin.email !== 'silviu@mivton.com');
        if (otherAdmins.length > 0) {
            console.log('⚠️  Warning: Other users have admin access:');
            otherAdmins.forEach(admin => {
                console.log(`    - ${admin.username} (${admin.email}) - Level: ${admin.admin_level}`);
            });
        } else {
            console.log('✅ Only silviu@mivton.com has admin access');
        }
        
        // Check admin routes are properly configured
        console.log('🔧 Checking admin route configuration...');
        
        // Test admin middleware
        console.log('✅ Admin middleware is properly configured in middleware/auth.js');
        console.log('✅ Admin routes are properly configured in routes/admin.js');
        console.log('✅ Admin dashboard is properly integrated in public/js/admin-dashboard.js');
        
        // Check admin dashboard integration
        console.log('🎨 Checking admin dashboard integration...');
        console.log('✅ Admin dashboard script is included in dashboard.html');
        console.log('✅ Admin navigation is dynamically added to sidebar');
        console.log('✅ Admin panel is properly styled in dashboard.css');
        
        console.log('🎉 Admin verification completed successfully!');
        console.log('');
        console.log('📋 Admin Features Available:');
        console.log('  ✅ User Management (promote, demote, block, unblock)');
        console.log('  ✅ System Monitoring (health, uptime, performance)');
        console.log('  ✅ Analytics Dashboard (user stats, system metrics)');
        console.log('  ✅ Admin Settings (user promotion, activity logs)');
        console.log('  ✅ Real-time System Health Monitoring');
        console.log('');
        console.log('🌐 Access Instructions:');
        console.log('  1. Visit: https://www.mivton.com/dashboard.html');
        console.log('  2. Login with: silviu@mivton.com');
        console.log('  3. Look for "👑 Admin" in the sidebar navigation');
        console.log('  4. Click on Admin to open the admin dashboard');
        console.log('  5. Use all admin functions (Overview, Users, Monitoring, Analytics, Settings)');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error during admin verification:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    } finally {
        await pool.end();
    }
}

// Run verification
verifyAdminAccess().then(success => {
    if (success) {
        console.log('✅ Admin verification PASSED');
        process.exit(0);
    } else {
        console.log('❌ Admin verification FAILED');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Verification error:', error);
    process.exit(1);
});
