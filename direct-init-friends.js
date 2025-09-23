#!/usr/bin/env node

/**
 * 🚀 MIVTON PHASE 3.1 - FRIENDS SCHEMA DIRECT INITIALIZER
 * Direct SQL execution without connection pooling issues
 */

require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeFriendsSchema() {
    let client;
    
    try {
        console.log('🚀 MIVTON PHASE 3.1 - FRIENDS SCHEMA INITIALIZATION');
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
        
        // Read the schema file
        const schemaPath = path.join(__dirname, 'database', 'friends-schema.sql');
        console.log('📄 Reading schema file:', schemaPath);
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found: ${schemaPath}`);
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
        
        // Check views
        const viewsResult = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name IN ('v_user_friends', 'v_pending_friend_requests')
        `);
        
        console.log('👁️ Views created:', viewsResult.rows.length);
        
        console.log('🎉 Friends schema initialization completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - Tables: ${tablesResult.rows.length}/5`);
        console.log(`   - Functions: ${functionsResult.rows.length}/3`);
        console.log(`   - Views: ${viewsResult.rows.length}/2`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Friends schema initialization failed:', error.message);
        console.error('Stack:', error.stack);
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
