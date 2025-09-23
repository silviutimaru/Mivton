#!/usr/bin/env node

/**
 * 🚀 MIVTON PHASE 3.2 - REAL-TIME SCHEMA DIRECT INITIALIZER
 * Direct SQL execution for real-time features
 */

require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeRealtimeSchema() {
    let client;
    
    try {
        console.log('🚀 MIVTON PHASE 3.2 - REAL-TIME SCHEMA INITIALIZATION');
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
        const schemaPath = path.join(__dirname, 'database', 'realtime-schema.sql');
        console.log('📄 Reading schema file:', schemaPath);
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found: ${schemaPath}`);
        }
        
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('📄 Schema file loaded, size:', schemaSql.length, 'characters');
        
        console.log('🔄 Executing real-time schema SQL...');
        
        // Split and execute statements individually
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📄 Executing ${statements.length} SQL statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                try {
                    await client.query(statement + ';');
                } catch (stmtError) {
                    // Log but don't fail for duplicate creations
                    if (!stmtError.message.includes('already exists')) {
                        console.error(`❌ Error in statement ${i + 1}:`, stmtError.message);
                        throw stmtError;
                    }
                }
            }
        }
        
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
        
        console.log('🎉 Real-time schema initialization completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - Real-time tables: ${tablesResult.rows.length}/6`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Real-time schema initialization failed:', error.message);
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
