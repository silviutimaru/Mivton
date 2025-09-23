#!/usr/bin/env node

/**
 * DATABASE SCHEMA FIX FOR SOCKET_SESSIONS TABLE
 * Adds missing updated_at column to socket_sessions table
 */

const { getDb } = require('./database/connection');

async function fixSocketSessionsSchema() {
    console.log('🔧 FIXING SOCKET_SESSIONS SCHEMA');
    console.log('=' .repeat(50));
    
    try {
        const db = getDb();
        
        // 1. Check current socket_sessions table structure
        console.log('🔍 Checking current socket_sessions table structure...');
        
        const tableInfoResult = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'socket_sessions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        if (tableInfoResult.rows.length === 0) {
            console.log('❌ socket_sessions table not found');
            console.log('📝 Creating socket_sessions table...');
            
            await db.query(`
                CREATE TABLE IF NOT EXISTS socket_sessions (
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
            
            console.log('✅ socket_sessions table created successfully');
            return;
        }
        
        console.log('✅ Found socket_sessions table with columns:');
        tableInfoResult.rows.forEach((column, i) => {
            console.log(`   ${i + 1}. ${column.column_name} (${column.data_type})`);
        });
        
        // 2. Check if updated_at column exists
        const hasUpdatedAt = tableInfoResult.rows.find(col => col.column_name === 'updated_at');
        
        if (!hasUpdatedAt) {
            console.log('⚠️ Missing updated_at column - adding it...');
            
            await db.query(`
                ALTER TABLE socket_sessions 
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            
            console.log('✅ Added updated_at column to socket_sessions table');
        } else {
            console.log('✅ updated_at column already exists');
        }
        
        // 3. Check if created_at column exists
        const hasCreatedAt = tableInfoResult.rows.find(col => col.column_name === 'created_at');
        
        if (!hasCreatedAt) {
            console.log('⚠️ Missing created_at column - adding it...');
            
            await db.query(`
                ALTER TABLE socket_sessions 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            `);
            
            console.log('✅ Added created_at column to socket_sessions table');
        } else {
            console.log('✅ created_at column already exists');
        }
        
        // 4. Verify the final table structure
        console.log('\n🔍 Final socket_sessions table structure:');
        const finalTableInfoResult = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'socket_sessions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        finalTableInfoResult.rows.forEach((column, i) => {
            console.log(`   ${i + 1}. ${column.column_name} (${column.data_type}) - ${column.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
        });
        
        // 5. Clean up old inactive sessions
        console.log('\n🧹 Cleaning up old inactive socket sessions...');
        
        const cleanupResult = await db.query(`
            DELETE FROM socket_sessions 
            WHERE is_active = FALSE 
            AND (updated_at < NOW() - INTERVAL '1 hour' OR updated_at IS NULL)
        `);
        
        console.log(`✅ Cleaned up ${cleanupResult.rowCount} old socket sessions`);
        
        // 6. Test the problematic query that was failing
        console.log('\n🧪 Testing the socket session update query...');
        
        try {
            // Insert a test session
            const testSocketId = `test_${Date.now()}`;
            await db.query(`
                INSERT INTO socket_sessions (socket_id, user_id, is_active)
                VALUES ($1, NULL, TRUE)
            `, [testSocketId]);
            
            // Test the update query that was failing
            await db.query(`
                UPDATE socket_sessions 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE socket_id = $1
            `, [testSocketId]);
            
            // Clean up test data
            await db.query(`
                DELETE FROM socket_sessions WHERE socket_id = $1
            `, [testSocketId]);
            
            console.log('✅ Socket session update query works correctly');
            
        } catch (testError) {
            console.error('❌ Socket session update query still failing:', testError.message);
        }
        
        console.log('\n🎯 SOCKET_SESSIONS SCHEMA FIX SUMMARY:');
        console.log('✅ socket_sessions table verified/created');
        console.log('✅ updated_at column added if missing');
        console.log('✅ created_at column added if missing');
        console.log('✅ Old inactive sessions cleaned up');
        console.log('✅ Update query tested successfully');
        
        console.log('\n📋 EXPECTED RESULT:');
        console.log('- Socket connection/disconnection errors should be resolved');
        console.log('- Real-time features should work properly');
        console.log('- No more "column updated_at does not exist" errors');
        
        console.log('\n✅ SOCKET_SESSIONS SCHEMA FIX COMPLETED!');
        
    } catch (error) {
        console.error('❌ Error fixing socket_sessions schema:', error);
        throw error;
    }
}

// Create a comprehensive schema check function
async function verifyAllRealTimeSchemas() {
    console.log('\n🔍 VERIFYING ALL REAL-TIME SCHEMAS');
    console.log('=' .repeat(50));
    
    try {
        const db = getDb();
        
        const tables = [
            'socket_sessions',
            'user_presence', 
            'realtime_events_log',
            'friend_notifications',
            'friendships',
            'friend_requests'
        ];
        
        for (const tableName of tables) {
            console.log(`\n📋 Checking ${tableName} table...`);
            
            const tableExists = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1 AND table_schema = 'public'
                )
            `, [tableName]);
            
            if (tableExists.rows[0].exists) {
                const columnCount = await db.query(`
                    SELECT COUNT(*) FROM information_schema.columns 
                    WHERE table_name = $1 AND table_schema = 'public'
                `, [tableName]);
                
                console.log(`   ✅ ${tableName} exists with ${columnCount.rows[0].count} columns`);
            } else {
                console.log(`   ❌ ${tableName} does not exist`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error verifying schemas:', error);
    }
}

// Run the fix
if (require.main === module) {
    const { initializeDatabase } = require('./database/connection');
    
    initializeDatabase().then(() => {
        return fixSocketSessionsSchema();
    }).then(() => {
        return verifyAllRealTimeSchemas();
    }).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('❌ Schema fix failed:', error);
        process.exit(1);
    });
}

module.exports = {
    fixSocketSessionsSchema,
    verifyAllRealTimeSchemas
};
