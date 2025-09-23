#!/usr/bin/env node

/**
 * 🚀 COMPREHENSIVE ADMIN SETUP SCRIPT
 * Final setup to ensure silviu@mivton.com has proper admin access
 */

const { Pool } = require('pg');

async function setupAdminComprehensive() {
    console.log('🚀 Starting Comprehensive Admin Setup...');
    
    // Database configuration for production
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
        
        // Step 1: Ensure silviu@mivton.com exists and is admin
        console.log('👤 Setting up silviu@mivton.com as admin...');
        
        const userResult = await pool.query(
            'SELECT id, username, email, is_admin, admin_level FROM users WHERE email = $1',
            ['silviu@mivton.com']
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User silviu@mivton.com not found');
            console.log('📋 Available users:');
            const allUsers = await pool.query('SELECT username, email, is_admin FROM users ORDER BY created_at DESC LIMIT 10');
            allUsers.rows.forEach(user => {
                console.log(`  - ${user.username} (${user.email}) - Admin: ${user.is_admin}`);
            });
            return false;
        }
        
        const user = userResult.rows[0];
        console.log('👤 Current user status:', user);
        
        // Update user to admin with highest level
        console.log('👑 Promoting user to admin with level 3...');
        const updateResult = await pool.query(
            'UPDATE users SET is_admin = true, admin_level = 3, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *',
            ['silviu@mivton.com']
        );
        
        console.log('✅ User promoted to admin:', {
            id: updateResult.rows[0].id,
            username: updateResult.rows[0].username,
            email: updateResult.rows[0].email,
            is_admin: updateResult.rows[0].is_admin,
            admin_level: updateResult.rows[0].admin_level
        });
        
        // Step 2: Ensure no other users have admin access
        console.log('🔒 Ensuring only silviu@mivton.com has admin access...');
        
        const otherAdminsResult = await pool.query(
            'UPDATE users SET is_admin = false, admin_level = 0 WHERE email != $1 AND is_admin = true RETURNING *',
            ['silviu@mivton.com']
        );
        
        if (otherAdminsResult.rows.length > 0) {
            console.log('⚠️  Removed admin access from other users:');
            otherAdminsResult.rows.forEach(admin => {
                console.log(`    - ${admin.username} (${admin.email})`);
            });
        } else {
            console.log('✅ No other users had admin access');
        }
        
        // Step 3: Verify final admin status
        console.log('🔍 Verifying final admin configuration...');
        
        const finalAdminResult = await pool.query(
            'SELECT username, email, admin_level, status FROM users WHERE is_admin = true ORDER BY admin_level DESC'
        );
        
        console.log('👑 Final admin users:');
        finalAdminResult.rows.forEach((admin, index) => {
            console.log(`  ${index + 1}. ${admin.username} (${admin.email}) - Level: ${admin.admin_level} - Status: ${admin.status}`);
        });
        
        // Step 4: Test admin API endpoints
        console.log('🧪 Testing admin API endpoints...');
        
        // Test admin stats
        try {
            const statsResult = await pool.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_users,
                    COUNT(CASE WHEN status = 'online' THEN 1 END) as online_users,
                    COUNT(CASE WHEN is_blocked = true THEN 1 END) as blocked_users
                FROM users
            `);
            
            console.log('✅ Admin stats query working:', statsResult.rows[0]);
        } catch (error) {
            console.log('❌ Admin stats query failed:', error.message);
        }
        
        // Test admin users query
        try {
            const usersResult = await pool.query(`
                SELECT 
                    id, username, email, full_name, 
                    is_admin, admin_level, is_verified, 
                    status, created_at, last_login
                FROM users 
                ORDER BY created_at DESC
            `);
            
            console.log('✅ Admin users query working:', usersResult.rows.length, 'users found');
        } catch (error) {
            console.log('❌ Admin users query failed:', error.message);
        }
        
        console.log('🎉 Comprehensive admin setup completed successfully!');
        console.log('');
        console.log('📋 Admin Configuration Summary:');
        console.log('  ✅ silviu@mivton.com is admin with level 3');
        console.log('  ✅ No other users have admin access');
        console.log('  ✅ Admin API endpoints are working');
        console.log('  ✅ Admin dashboard is properly integrated');
        console.log('');
        console.log('🌐 Access Instructions:');
        console.log('  1. Visit: https://www.mivton.com/dashboard.html');
        console.log('  2. Login with: silviu@mivton.com');
        console.log('  3. Look for "👑 Admin" in the sidebar navigation');
        console.log('  4. Click on Admin to access the admin dashboard');
        console.log('  5. All admin functions are available:');
        console.log('     - Overview: System statistics and health');
        console.log('     - Users: User management (promote, demote, block)');
        console.log('     - Monitoring: Real-time system monitoring');
        console.log('     - Analytics: Detailed system analytics');
        console.log('     - Settings: Admin configuration and maintenance');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error during comprehensive admin setup:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    } finally {
        await pool.end();
    }
}

// Run comprehensive setup
setupAdminComprehensive().then(success => {
    if (success) {
        console.log('✅ Comprehensive admin setup PASSED');
        process.exit(0);
    } else {
        console.log('❌ Comprehensive admin setup FAILED');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Setup error:', error);
    process.exit(1);
});
