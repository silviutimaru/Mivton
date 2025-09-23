#!/usr/bin/env node

/**
 * Test script to check what database is being used on Railway
 */

const { query, getDb } = require('./database/connection');

async function testDatabaseConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
        // Test 1: Basic connection
        console.log('\n1. Testing basic connection...');
        const result = await query('SELECT 1 as test');
        console.log('✅ Basic query result:', result.rows[0]);
        
        // Test 2: Check database type
        console.log('\n2. Checking database type...');
        try {
            const pgResult = await query('SELECT version()');
            console.log('✅ PostgreSQL detected:', pgResult.rows[0].version.substring(0, 50) + '...');
        } catch (pgError) {
            console.log('❌ PostgreSQL test failed:', pgError.message);
        }
        
        try {
            const sqliteResult = await query('SELECT sqlite_version()');
            console.log('✅ SQLite detected:', sqliteResult.rows[0].sqlite_version);
        } catch (sqliteError) {
            console.log('❌ SQLite test failed:', sqliteError.message);
        }
        
        // Test 3: Check if messages table exists
        console.log('\n3. Checking messages table...');
        try {
            const tableResult = await query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')");
            console.log('✅ Messages table exists (PostgreSQL):', tableResult.rows[0].exists);
        } catch (pgError) {
            try {
                const tableResult = await query("SELECT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='messages')");
                console.log('✅ Messages table exists (SQLite):', tableResult.rows[0][Object.keys(tableResult.rows[0])[0]] === 1);
            } catch (sqliteError) {
                console.log('❌ Could not check messages table:', sqliteError.message);
            }
        }
        
        // Test 4: Try to create messages table
        console.log('\n4. Testing table creation...');
        try {
            await query(`
                CREATE TABLE IF NOT EXISTS test_messages (
                    id BIGSERIAL PRIMARY KEY,
                    sender_id TEXT NOT NULL,
                    body TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `);
            console.log('✅ PostgreSQL table creation successful');
            
            // Clean up
            await query('DROP TABLE IF EXISTS test_messages');
        } catch (pgError) {
            try {
                await query(`
                    CREATE TABLE IF NOT EXISTS test_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sender_id TEXT NOT NULL,
                        body TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('✅ SQLite table creation successful');
                
                // Clean up
                await query('DROP TABLE IF EXISTS test_messages');
            } catch (sqliteError) {
                console.log('❌ Table creation failed for both databases');
                console.log('PostgreSQL error:', pgError.message);
                console.log('SQLite error:', sqliteError.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
    }
}

// Run the test
testDatabaseConnection();
