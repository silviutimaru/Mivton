#!/usr/bin/env node

/**
 * RAILWAY DATABASE MIGRATION - SOCKET SESSIONS FIX
 * Simple script to add missing updated_at column to socket_sessions table
 */

const { Client } = require('pg');

async function runMigration() {
    console.log('🔧 RAILWAY SOCKET_SESSIONS MIGRATION');
    console.log('=' .repeat(40));
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        await client.connect();
        console.log('✅ Connected to Railway database');
        
        // Check if socket_sessions table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'socket_sessions' AND table_schema = 'public'
            )
        `);
        
        if (!tableExists.rows[0].exists) {
            console.log('📝 Creating socket_sessions table...');
            await client.query(`
                CREATE TABLE socket_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    socket_id VARCHAR(255) UNIQUE NOT NULL,
                    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address INET,
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ socket_sessions table created');
        } else {
            console.log('✅ socket_sessions table exists');
            
            // Check if updated_at column exists
            const hasUpdatedAt = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'socket_sessions' 
                    AND column_name = 'updated_at'
                    AND table_schema = 'public'
                )
            `);
            
            if (!hasUpdatedAt.rows[0].exists) {
                console.log('➕ Adding updated_at column...');
                await client.query(`
                    ALTER TABLE socket_sessions 
                    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                `);
                console.log('✅ updated_at column added');
            } else {
                console.log('✅ updated_at column already exists');
            }
        }
        
        // Test the update query
        console.log('🧪 Testing socket session update...');
        const testResult = await client.query(`
            SELECT 1 FROM socket_sessions LIMIT 1
        `);
        
        if (testResult.rows.length > 0) {
            console.log('✅ Socket sessions table is working properly');
        } else {
            console.log('ℹ️ Socket sessions table is empty (expected)');
        }
        
        console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.end();
    }
}

if (require.main === module) {
    runMigration().then(() => {
        console.log('✅ Database migration completed');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
}

module.exports = { runMigration };
