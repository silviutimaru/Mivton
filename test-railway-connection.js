#!/usr/bin/env node

/**
 * Railway Database Connection Test
 */

require('dotenv').config();

async function testConnection() {
    try {
        console.log('🔍 Testing Railway database connection...');
        console.log('📊 Environment:', process.env.NODE_ENV || 'development');
        console.log('🔗 DATABASE_URL exists:', !!process.env.DATABASE_URL);
        
        if (!process.env.DATABASE_URL) {
            console.error('❌ DATABASE_URL environment variable is missing!');
            console.log('💡 This usually means Railway environment is not loaded properly.');
            console.log('');
            console.log('Try these solutions:');
            console.log('1. railway shell  # then run commands inside');
            console.log('2. railway run --environment production <command>');
            console.log('3. railway login  # if not logged in');
            process.exit(1);
        }
        
        // Test connection
        const { query } = require('./database/connection');
        
        console.log('🔄 Testing database connection...');
        const result = await query('SELECT NOW() as current_time, version() as pg_version');
        
        console.log('✅ Database connection successful!');
        console.log('🕐 Server time:', result.rows[0].current_time);
        console.log('📊 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
        
        // Test table access
        console.log('🔄 Testing table access...');
        const tableResult = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📋 Current tables:');
        tableResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
        console.log('');
        console.log('🎉 All tests passed! You can now run the schema initialization.');
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('1. Check if you\'re logged into Railway: railway login');
        console.log('2. Check if you\'re in the right project: railway status');
        console.log('3. Use railway shell to enter the environment');
        process.exit(1);
    }
}

testConnection();
