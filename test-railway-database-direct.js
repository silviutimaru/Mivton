#!/usr/bin/env node

/**
 * Direct database test for Railway
 * This tests the database connection without the adapter
 */

const { query, getDb } = require('./database/connection');

async function testDirectDatabase() {
    console.log('🔍 Testing direct database connection on Railway...');
    
    try {
        // Test 1: Basic connection
        console.log('\n1. Testing basic connection...');
        const result = await query('SELECT 1 as test');
        console.log('✅ Basic query result:', result.rows[0]);
        
        // Test 2: Check if users table exists
        console.log('\n2. Checking users table...');
        const usersResult = await query('SELECT COUNT(*) as count FROM users');
        console.log('✅ Users table query result:', usersResult.rows[0]);
        
        // Test 3: Try to get a specific user
        console.log('\n3. Testing user query...');
        const userResult = await query('SELECT id, username, email, full_name FROM users LIMIT 1');
        console.log('✅ User query result:', userResult.rows[0]);
        
        // Test 4: Check database type
        console.log('\n4. Checking database type...');
        try {
            const versionResult = await query('SELECT version()');
            console.log('✅ PostgreSQL version:', versionResult.rows[0].version.substring(0, 50) + '...');
        } catch (versionError) {
            console.log('❌ PostgreSQL version query failed:', versionError.message);
        }
        
    } catch (error) {
        console.error('❌ Direct database test failed:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });
    }
}

// Run the test
testDirectDatabase();
