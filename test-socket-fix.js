#!/usr/bin/env node

/**
 * SOCKET CONNECTION FIX TESTING SCRIPT
 * 
 * This script helps diagnose and test the Socket.IO connection fixes
 * Run this after deploying the fixes to verify everything works
 */

const { getDb } = require('./database/connection');

async function testSocketConnectionFix() {
    console.log('🔧 TESTING SOCKET CONNECTION FIXES');
    console.log('=' .repeat(50));
    
    try {
        const db = getDb();
        
        // 1. Clear old socket logs for cleaner testing
        console.log('🧹 Clearing old socket authentication logs...');
        await db.query(`
            DELETE FROM realtime_events_log 
            WHERE event_type IN ('socket_auth_success', 'socket_auth_failed')
            AND created_at < NOW() - INTERVAL '1 hour'
        `);
        
        // 2. Check current session format
        console.log('🔍 Checking session cookie format...');
        const sessionSample = await db.query(`
            SELECT sid, expire, sess
            FROM session 
            WHERE expire > NOW()
            ORDER BY expire DESC
            LIMIT 3
        `);
        
        if (sessionSample.rows.length > 0) {
            console.log('✅ Found active sessions:');
            sessionSample.rows.forEach((session, i) => {
                console.log(`   ${i + 1}. SID: ${session.sid.substring(0, 20)}...`);
                console.log(`      Expires: ${session.expire}`);
                console.log(`      User ID: ${session.sess?.userId || 'N/A'}`);
            });
        } else {
            console.log('⚠️ No active sessions found');
        }
        
        // 3. Check if realtime_events_log table exists
        console.log('🗄️ Checking realtime events log table...');
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'realtime_events_log'
            )
        `);
        
        if (tableCheck.rows[0].exists) {
            console.log('✅ realtime_events_log table exists');
        } else {
            console.log('❌ realtime_events_log table missing - creating...');
            await db.query(`
                CREATE TABLE IF NOT EXISTS realtime_events_log (
                    id SERIAL PRIMARY KEY,
                    event_type VARCHAR(100) NOT NULL,
                    user_id INTEGER,
                    target_user_id INTEGER,
                    socket_id VARCHAR(255),
                    event_data JSONB,
                    success BOOLEAN DEFAULT FALSE,
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ realtime_events_log table created');
        }
        
        // 4. Test socket auth patterns
        console.log('🔍 Testing session cookie patterns...');
        const testCookies = [
            'mivton.sid=s%3Atest123.signature',
            'mivton.sid=plaintext123',
            'connect.sid=s%3Atest456.signature',
            'session_id=fallback789'
        ];
        
        const { improvedSocketAuth } = require('./socket/improved-socket-auth');
        
        testCookies.forEach((cookie, i) => {
            console.log(`   Testing pattern ${i + 1}: ${cookie}`);
            
            // Test session ID extraction
            const sessionPatterns = [
                /mivton\.sid=s%3A([^;]+)/,
                /mivton\.sid=([^;]+)/,
                /connect\.sid=s%3A([^;]+)/,
                /connect\.sid=([^;]+)/,
                /session_id=([^;]+)/
            ];
            
            let found = false;
            for (const pattern of sessionPatterns) {
                const match = cookie.match(pattern);
                if (match) {
                    const sessionId = decodeURIComponent(match[1]);
                    console.log(`     ✅ Matched with pattern: ${pattern}, extracted: ${sessionId.split('.')[0]}`);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                console.log(`     ❌ No pattern matched`);
            }
        });
        
        // 5. Show next steps
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Deploy these fixes to Railway');
        console.log('2. Open the dashboard in a browser while logged in');
        console.log('3. Open browser developer tools (F12) and check console');
        console.log('4. Look for socket connection messages:');
        console.log('   - "🔐 Dashboard detected, attempting socket connection..."');
        console.log('   - "🍪 Session ID found: ..."');
        console.log('   - "✅ Socket connected: ..."');
        console.log('5. Run the diagnostic script again to check logs:');
        console.log('   node diagnose-socket-connection.js');
        console.log('');
        console.log('🔧 EXPECTED BEHAVIOR AFTER FIX:');
        console.log('- Dashboard should automatically connect to Socket.IO');
        console.log('- Authentication should succeed');
        console.log('- Real-time notifications should work');
        console.log('- Friend request notifications should be delivered');
        
        console.log('\n✅ Socket connection fix testing completed!');
        
    } catch (error) {
        console.error('❌ Error testing socket connection fix:', error);
        process.exit(1);
    }
}

// Enhanced diagnostic function
async function runEnhancedDiagnostic() {
    console.log('\n🔍 ENHANCED SOCKET DIAGNOSTIC');
    console.log('=' .repeat(50));
    
    try {
        const db = getDb();
        
        // Check recent socket auth attempts
        const recentAuth = await db.query(`
            SELECT 
                event_type,
                user_id,
                socket_id,
                success,
                error_message,
                created_at
            FROM realtime_events_log
            WHERE event_type IN ('socket_auth_success', 'socket_auth_failed')
            AND created_at > NOW() - INTERVAL '10 minutes'
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        console.log('\n📊 RECENT SOCKET AUTH ATTEMPTS (last 10 minutes):');
        if (recentAuth.rows.length === 0) {
            console.log('❌ No recent socket auth attempts found');
            console.log('💡 This means users are not connecting to Socket.IO at all');
        } else {
            recentAuth.rows.forEach((attempt, i) => {
                const status = attempt.success ? '✅' : '❌';
                console.log(`${i + 1}. ${status} ${attempt.event_type}`);
                console.log(`   User: ${attempt.user_id || 'anonymous'}`);
                console.log(`   Socket: ${attempt.socket_id}`);
                console.log(`   Time: ${attempt.created_at}`);
                if (attempt.error_message) {
                    console.log(`   Error: ${attempt.error_message}`);
                }
                console.log('');
            });
        }
        
        // Check current user sessions vs socket connections
        const sessionStats = await db.query(`
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN expire > NOW() THEN 1 END) as active_sessions
            FROM session
        `);
        
        console.log('📈 SESSION STATISTICS:');
        console.log(`   Total sessions: ${sessionStats.rows[0].total_sessions}`);
        console.log(`   Active sessions: ${sessionStats.rows[0].active_sessions}`);
        
        // Check user presence vs socket connections
        const presenceStats = await db.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM users
            WHERE status IS NOT NULL
            GROUP BY status
        `);
        
        console.log('\n👥 USER STATUS DISTRIBUTION:');
        presenceStats.rows.forEach(stat => {
            console.log(`   ${stat.status}: ${stat.count} users`);
        });
        
    } catch (error) {
        console.error('❌ Error in enhanced diagnostic:', error);
    }
}

// Main execution
if (require.main === module) {
    const { initializeDatabase } = require('./database/connection');
    
    initializeDatabase().then(() => {
        return testSocketConnectionFix();
    }).then(() => {
        return runEnhancedDiagnostic();
    }).then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testSocketConnectionFix,
    runEnhancedDiagnostic
};
