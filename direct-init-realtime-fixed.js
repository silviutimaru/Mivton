#!/usr/bin/env node

/**
 * 🚀 MIVTON PHASE 3.2 - REAL-TIME SCHEMA DIRECT INITIALIZER (FIXED)
 * Direct SQL execution for real-time features with proper ordering
 */

require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeRealtimeSchema() {
    let client;
    
    try {
        console.log('🚀 MIVTON PHASE 3.2 - REAL-TIME SCHEMA INITIALIZATION (FIXED)');
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
        const schemaPath = path.join(__dirname, 'database', 'realtime-schema-fixed.sql');
        console.log('📄 Reading fixed schema file:', schemaPath);
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Fixed schema file not found: ${schemaPath}`);
        }
        
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('📄 Schema file loaded, size:', schemaSql.length, 'characters');
        
        console.log('🔄 Executing real-time schema SQL...');
        
        // Execute the entire schema as one statement (it's properly ordered)
        await client.query(schemaSql);
        
        console.log('✅ Real-time database schema executed successfully');
        
        // Verify schema creation
        console.log('🔍 Verifying schema creation...');
        
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'socket_sessions', 'notification_delivery', 'user_presence', 
                'realtime_events_log', 'notification_preferences', 'friend_activity_feed'
            )
            ORDER BY table_name
        `);
        
        console.log('📋 Real-time tables created:');
        tablesResult.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        if (tablesResult.rows.length === 6) {
            console.log('🎉 All 6 real-time tables created successfully!');
        } else {
            console.warn(`⚠️ Expected 6 tables, found ${tablesResult.rows.length}`);
        }
        
        // Check functions
        const functionsResult = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN (
                'get_online_friends_count', 'update_user_presence', 
                'cleanup_inactive_sockets', 'realtime_maintenance_cleanup'
            )
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
            AND table_name IN ('v_friend_presence', 'v_unread_notifications')
        `);
        
        console.log('👁️ Views created:', viewsResult.rows.length);
        viewsResult.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        // Check indexes
        const indexesResult = await client.query(`
            SELECT COUNT(*) as count
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (indexname LIKE '%socket%' OR indexname LIKE '%presence%' 
                 OR indexname LIKE '%notification%' OR indexname LIKE '%realtime%' 
                 OR indexname LIKE '%activity%')
        `);
        
        console.log('📊 Real-time indexes created:', indexesResult.rows[0].count);
        
        console.log('');
        console.log('🎉 Real-time schema initialization completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - Tables: ${tablesResult.rows.length}/6`);
        console.log(`   - Functions: ${functionsResult.rows.length}/4`);
        console.log(`   - Views: ${viewsResult.rows.length}/2`);
        console.log(`   - Indexes: ${indexesResult.rows[0].count}`);
        console.log('');
        console.log('✅ Your database now supports:');
        console.log('   - Real-time socket connection tracking');
        console.log('   - User presence management (online/offline)');
        console.log('   - Live notification delivery');
        console.log('   - Friend activity feeds');
        console.log('   - Event logging and debugging');
        console.log('   - Notification preferences');
        console.log('   - Automated cleanup procedures');
        
        return true;
        
    } catch (error) {
        console.error('❌ Real-time schema initialization failed:', error.message);
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
    initializeRealtimeSchema()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeRealtimeSchema };
