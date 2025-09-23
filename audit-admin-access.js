#!/usr/bin/env node

/**
 * 🔍 ADMIN ACCESS AUDIT
 * Audits which users will see the Admin button
 */

const { Pool } = require('pg');

async function auditAdminAccess() {
    console.log('🔍 ADMIN ACCESS AUDIT');
    console.log('====================');
    console.log('');
    
    let pool;
    
    try {
        // Connect to database
        console.log('📊 Connecting to database...');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        const client = await pool.connect();
        console.log('✅ Database connected');
        console.log('');
        
        // Get all users with their admin status
        console.log('👥 FETCHING ALL USERS:');
        console.log('----------------------');
        const usersQuery = `
            SELECT 
                id, 
                username, 
                email, 
                full_name, 
                is_admin, 
                admin_level, 
                status,
                created_at
            FROM users 
            ORDER BY created_at DESC
        `;
        
        const usersResult = await client.query(usersQuery);
        const users = usersResult.rows;
        
        console.log(`📊 Total users in database: ${users.length}`);
        console.log('');
        
        // Analyze each user
        let adminUsers = [];
        let regularUsers = [];
        
        users.forEach((user, index) => {
            const isAdmin = user.is_admin === true;
            const adminLevel = user.admin_level || 0;
            const status = user.status || 'offline';
            
            const userInfo = {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                isAdmin: isAdmin,
                adminLevel: adminLevel,
                status: status,
                createdAt: user.created_at
            };
            
            if (isAdmin) {
                adminUsers.push(userInfo);
            } else {
                regularUsers.push(userInfo);
            }
            
            console.log(`${index + 1}. ${user.username} (${user.email})`);
            console.log(`   Full Name: ${user.full_name}`);
            console.log(`   Admin Status: ${isAdmin ? '✅ ADMIN' : '❌ Regular User'}`);
            console.log(`   Admin Level: ${adminLevel}`);
            console.log(`   Status: ${status}`);
            console.log(`   Created: ${user.created_at}`);
            console.log('');
        });
        
        // Summary
        console.log('📋 ADMIN ACCESS SUMMARY:');
        console.log('========================');
        console.log('');
        
        console.log(`👑 ADMIN USERS (${adminUsers.length}):`);
        console.log('------------------------------------');
        if (adminUsers.length > 0) {
            adminUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.username} (${user.email})`);
                console.log(`   - Admin Level: ${user.adminLevel}`);
                console.log(`   - Status: ${user.status}`);
                console.log(`   - Will see Admin button: ✅ YES`);
                console.log('');
            });
        } else {
            console.log('   No admin users found');
            console.log('');
        }
        
        console.log(`👤 REGULAR USERS (${regularUsers.length}):`);
        console.log('----------------------------------------');
        if (regularUsers.length > 0) {
            regularUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.username} (${user.email})`);
                console.log(`   - Status: ${user.status}`);
                console.log(`   - Will see Admin button: ❌ NO`);
                console.log('');
            });
        } else {
            console.log('   No regular users found');
            console.log('');
        }
        
        // Special case analysis
        console.log('🔍 SPECIAL CASE ANALYSIS:');
        console.log('---------------------------');
        console.log('');
        
        const silviuUser = users.find(user => user.email === 'silviu@mivton.com');
        if (silviuUser) {
            console.log('👑 SILVIU USER ANALYSIS:');
            console.log(`   Email: ${silviuUser.email}`);
            console.log(`   Username: ${silviuUser.username}`);
            console.log(`   Database is_admin: ${silviuUser.is_admin}`);
            console.log(`   Database admin_level: ${silviuUser.admin_level}`);
            console.log(`   Will see Admin button: ${silviuUser.is_admin ? '✅ YES (Database)' : '✅ YES (Hardcoded)'}`);
            console.log('');
        } else {
            console.log('❌ silviu@mivton.com user not found in database');
            console.log('');
        }
        
        // Frontend logic analysis
        console.log('💻 FRONTEND ADMIN LOGIC:');
        console.log('------------------------');
        console.log('');
        console.log('The Admin button visibility is controlled by:');
        console.log('');
        console.log('1. DATABASE CHECK:');
        console.log('   - Checks user.is_admin === true from /api/auth/me');
        console.log('   - If true, shows Admin button');
        console.log('');
        console.log('2. HARDCODED CHECK:');
        console.log('   - Special case for silviu@mivton.com');
        console.log('   - Forces admin mode even if database says false');
        console.log('   - Also checks if username contains "silviu"');
        console.log('   - Also checks if page contains "silviu@mivton.com" text');
        console.log('');
        console.log('3. HTML STRUCTURE:');
        console.log('   - Admin button is in dashboard.html with style="display: block;"');
        console.log('   - JavaScript can hide it with adminNavItem.style.display = "none"');
        console.log('');
        
        // Final conclusion
        console.log('🎯 FINAL CONCLUSION:');
        console.log('===================');
        console.log('');
        console.log('Users who will see the Admin button:');
        console.log('');
        
        if (adminUsers.length > 0) {
            adminUsers.forEach(user => {
                console.log(`✅ ${user.username} (${user.email}) - Database admin`);
            });
        }
        
        if (silviuUser && !silviuUser.is_admin) {
            console.log(`✅ ${silviuUser.username} (${silviuUser.email}) - Hardcoded admin`);
        }
        
        if (adminUsers.length === 0 && (!silviuUser || silviuUser.is_admin)) {
            console.log('❌ No users will see the Admin button');
        }
        
        console.log('');
        console.log('🔒 SECURITY NOTE:');
        console.log('The hardcoded admin check for silviu@mivton.com is a security risk');
        console.log('and should be removed in production. Admin access should only be');
        console.log('controlled by the database is_admin field.');
        
    } catch (error) {
        console.error('❌ Audit failed:', error.message);
        console.log('');
        console.log('🔧 TROUBLESHOOTING:');
        console.log('1. Check DATABASE_URL environment variable');
        console.log('2. Ensure database is accessible');
        console.log('3. Verify users table exists');
        console.log('4. Check is_admin column exists');
    } finally {
        if (pool) {
            await pool.end();
            console.log('');
            console.log('✅ Database connection closed');
        }
    }
}

// Run the audit
auditAdminAccess().catch(console.error);
