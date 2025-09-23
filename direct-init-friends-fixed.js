#!/usr/bin/env node

/**
 * 🚀 MIVTON PHASE 3.1 - FRIENDS SCHEMA DIRECT INITIALIZER (FIXED)
 * Direct SQL execution with corrected schema
 */

require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeFriendsSchema() {
    let client;
    
    try {
        console.log('🚀 MIVTON PHASE 3.1 - FRIENDS SCHEMA INITIALIZATION (FIXED)');
        console.log('📊 Environment:', process.env.NODE_ENV || 'development');
        console.log('🔗 Database URL:', process.env.DATABASE_URL ? 'Connected' : 'Missing!');
        
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        
        // Create direct client connection
        client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        console.log('🔄 Connecting to database...');
        await client.connect();
        
        console.log('✅ Database connection established');
        
        // Read the FIXED schema file
        const schemaPath = path.join(__dirname, 'database', 'friends-schema-fixed.sql');
        console.log('📄 Reading fixed schema file:', schemaPath);
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Fixed schema file not found: ${schemaPath}`);
        }
        
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('📄 Schema file loaded, size:', schemaSql.length, 'characters');
        
        console.log('🔄 Executing friends schema SQL...');
        
        // Execute the schema creation
        await client.query(schemaSql);
        
        console.log('✅ Friends database schema executed successfully');
        
        // Verify schema creation
        console.log('🔍 Verifying schema creation...');
        
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('friendships', 'friend_requests', 'blocked_users', 'friend_notifications', 'social_activity_log')
            ORDER BY table_name
        `);
        
        console.log('📋 Friends tables created:');
        tablesResult.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        if (tablesResult.rows.length === 5) {
            console.log('🎉 All 5 friends tables created successfully!');
        } else {
            console.warn(`⚠️ Expected 5 tables, found ${tablesResult.rows.length}`);
        }
        
        // Check functions
        const functionsResult = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('get_ordered_user_pair', 'are_users_friends', 'is_user_blocked')
        `);
        
        console.log('🔧 Functions created:', functionsResult.rows.length);
        functionsResult.rows.forEach(row => {
            console.log(`   ✅ ${row.routine_name}`);
        });
        
        // Check views
        const viewsResult = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name IN ('v_user_friends', 'v_pending_friend_requests')
        `);
        
        console.log('👁️ Views created:', viewsResult.rows.length);
        viewsResult.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        // Check indexes
        const indexesResult = await client.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE '%friend%'
            ORDER BY indexname
        `);
        
        console.log('📊 Indexes created:', indexesResult.rows.length);
        
        console.log('');
        console.log('🎉 Friends schema initialization completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - Tables: ${tablesResult.rows.length}/5`);
        console.log(`   - Functions: ${functionsResult.rows.length}/3`);
        console.log(`   - Views: ${viewsResult.rows.length}/2`);
        console.log(`   - Indexes: ${indexesResult.rows.length}`);
        console.log('');
        console.log('✅ Your database now supports:');
        console.log('   - Friend requests and management');
        console.log('   - User blocking system');
        console.log('   - Social notifications');
        console.log('   - Activity logging');
        console.log('   - Optimized queries with indexes');
        
        return true;
        
    } catch (error) {
        console.error('❌ Friends schema initialization failed:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        return false;
        
    } finally {
        if (client) {
            await client.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run if called directly
if (require.main === module) {
    initializeFriendsSchema()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeFriendsSchema };
