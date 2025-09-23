#!/usr/bin/env node

/**
 * 🔧 ADMIN USER SETUP SCRIPT
 * Ensures silviu@mivton.com has proper admin privileges in the database
 */

const { Pool } = require('pg');

async function setupAdminUser() {
    console.log('🔧 ADMIN USER SETUP');
    console.log('==================');
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
        
        // Check if silviu@mivton.com exists
        console.log('🔍 Checking if silviu@mivton.com exists...');
        const checkUserQuery = `
            SELECT id, username, email, is_admin, admin_level 
            FROM users 
            WHERE email = $1
        `;
        
        const checkResult = await client.query(checkUserQuery, ['silviu@mivton.com']);
        
        if (checkResult.rows.length === 0) {
            console.log('❌ silviu@mivton.com user not found in database');
            console.log('');
            console.log('🔧 CREATING ADMIN USER:');
            console.log('----------------------');
            
            // Create the admin user
            const createUserQuery = `
                INSERT INTO users (
                    username, 
                    email, 
                    password_hash, 
                    full_name, 
                    gender, 
                    native_language, 
                    is_verified, 
                    is_admin, 
                    admin_level, 
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, username, email, is_admin, admin_level
            `;
            
            const createResult = await client.query(createUserQuery, [
                'silviu',                    // username
                'silviu@mivton.com',        // email
                '$2b$10$dummy.hash.for.now', // password_hash (needs to be set properly)
                'Silviu Timaru',            // full_name
                'male',                     // gender
                'en',                       // native_language
                true,                       // is_verified
                true,                       // is_admin
                3,                          // admin_level (highest)
                'online'                    // status
            ]);
            
            const newUser = createResult.rows[0];
            console.log('✅ Admin user created:');
            console.log(`   ID: ${newUser.id}`);
            console.log(`   Username: ${newUser.username}`);
            console.log(`   Email: ${newUser.email}`);
            console.log(`   Admin Status: ${newUser.is_admin}`);
            console.log(`   Admin Level: ${newUser.admin_level}`);
            
        } else {
            const existingUser = checkResult.rows[0];
            console.log('✅ silviu@mivton.com user found:');
            console.log(`   ID: ${existingUser.id}`);
            console.log(`   Username: ${existingUser.username}`);
            console.log(`   Email: ${existingUser.email}`);
            console.log(`   Current Admin Status: ${existingUser.is_admin}`);
            console.log(`   Current Admin Level: ${existingUser.admin_level}`);
            console.log('');
            
            // Update admin privileges if needed
            if (!existingUser.is_admin || existingUser.admin_level < 3) {
                console.log('🔧 UPDATING ADMIN PRIVILEGES:');
                console.log('-----------------------------');
                
                const updateUserQuery = `
                    UPDATE users 
                    SET is_admin = $1, admin_level = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE email = $3
                    RETURNING id, username, email, is_admin, admin_level
                `;
                
                const updateResult = await client.query(updateUserQuery, [
                    true,                    // is_admin
                    3,                      // admin_level (highest)
                    'silviu@mivton.com'     // email
                ]);
                
                const updatedUser = updateResult.rows[0];
                console.log('✅ Admin privileges updated:');
                console.log(`   ID: ${updatedUser.id}`);
                console.log(`   Username: ${updatedUser.username}`);
                console.log(`   Email: ${updatedUser.email}`);
                console.log(`   Admin Status: ${updatedUser.is_admin}`);
                console.log(`   Admin Level: ${updatedUser.admin_level}`);
                
            } else {
                console.log('✅ Admin privileges already properly set');
            }
        }
        
        console.log('');
        console.log('📋 FINAL ADMIN STATUS:');
        console.log('======================');
        
        // Verify final status
        const finalCheckResult = await client.query(checkUserQuery, ['silviu@mivton.com']);
        const finalUser = finalCheckResult.rows[0];
        
        console.log(`👤 User: ${finalUser.username} (${finalUser.email})`);
        console.log(`👑 Admin Status: ${finalUser.is_admin ? '✅ ADMIN' : '❌ NOT ADMIN'}`);
        console.log(`🎯 Admin Level: ${finalUser.admin_level}`);
        console.log('');
        
        if (finalUser.is_admin) {
            console.log('🎉 silviu@mivton.com now has proper admin privileges!');
            console.log('🔒 Admin access is controlled by database only');
            console.log('✅ No hardcoded admin checks in frontend');
        } else {
            console.log('❌ ERROR: Admin privileges not set properly');
        }
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.log('');
        console.log('🔧 TROUBLESHOOTING:');
        console.log('1. Check DATABASE_URL environment variable');
        console.log('2. Ensure database is accessible');
        console.log('3. Verify users table exists');
        console.log('4. Check is_admin and admin_level columns exist');
    } finally {
        if (pool) {
            await pool.end();
            console.log('');
            console.log('✅ Database connection closed');
        }
    }
}

// Run the setup
setupAdminUser().catch(console.error);