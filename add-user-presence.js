#!/usr/bin/env node

/**
 * 🚀 RAILWAY DEPLOYMENT - ADD USER PRESENCE TABLE
 * 
 * This script adds the missing user_presence table needed for Phase 3.1
 * Run this on Railway to complete the friends system setup
 */

const { pool } = require('./database/connection');
const fs = require('fs');
const path = require('path');

async function addUserPresenceTable() {
    try {
        console.log('🚀 Adding user_presence table for Phase 3.1...');
        
        // Check if table already exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'user_presence'
            )
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ user_presence table already exists');
            
            // Check if it has records
            const countResult = await pool.query('SELECT COUNT(*) FROM user_presence');
            console.log(`📊 Current user_presence records: ${countResult.rows[0].count}`);
            
        } else {
            console.log('🔄 Creating user_presence table...');
            
            // Read and execute the SQL file
            const sqlPath = path.join(__dirname, 'database', 'add-user-presence.sql');
            const sqlContent = fs.readFileSync(sqlPath, 'utf8');
            
            await pool.query(sqlContent);
            
            console.log('✅ user_presence table created successfully');
            
            // Verify creation
            const countResult = await pool.query('SELECT COUNT(*) FROM user_presence');
            console.log(`📊 User presence records created: ${countResult.rows[0].count}`);
        }
        
        // Test friends system queries
        console.log('🧪 Testing friends system compatibility...');
        
        try {
            // Test the query pattern used in friends.js
            const testQuery = `
                SELECT COUNT(*) as online_count
                FROM user_presence up
                WHERE up.status = 'online' 
                AND up.last_seen > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
            `;
            
            const testResult = await pool.query(testQuery);
            console.log(`✅ Friends system query test passed: ${testResult.rows[0].online_count} users online`);
            
        } catch (queryError) {
            console.error('❌ Friends system query test failed:', queryError.message);
        }
        
        console.log('🎉 User presence table setup complete!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Deploy with: railway up');
        console.log('2. Test at: https://mivton.com/dashboard');
        console.log('3. Check friends section works without errors');
        
    } catch (error) {
        console.error('❌ Failed to add user_presence table:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

// Run the function
addUserPresenceTable();
