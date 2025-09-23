#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnoseSocketConnection() {
  console.log('🔍 Diagnosing Socket.IO Connection Issues\n');
  
  try {
    // Check if socket_sessions table has any historical data
    const allSocketSessions = await pool.query(`
      SELECT 
        ss.id,
        ss.user_id,
        ss.socket_id,
        ss.is_active,
        ss.connected_at,
        ss.last_activity,
        u.full_name,
        u.username
      FROM socket_sessions ss
      JOIN users u ON ss.user_id = u.id
      ORDER BY ss.connected_at DESC
      LIMIT 10
    `);
    
    console.log('📊 SOCKET SESSION HISTORY:');
    console.log('='.repeat(50));
    
    if (allSocketSessions.rows.length === 0) {
      console.log('❌ NO SOCKET SESSIONS EVER RECORDED');
      console.log('🚨 This indicates Socket.IO connections are never being established!');
      console.log('');
      console.log('🔧 POSSIBLE CAUSES:');
      console.log('1. Frontend is not connecting to Socket.IO');
      console.log('2. Socket.IO server configuration issue');
      console.log('3. CORS or connection problems');
      console.log('4. Frontend JavaScript errors preventing connection');
    } else {
      console.log(`✅ Found ${allSocketSessions.rows.length} historical socket sessions:`);
      allSocketSessions.rows.forEach((session, i) => {
        const status = session.is_active ? '🟢 ACTIVE' : '🔴 INACTIVE';
        console.log(`${i+1}. ${session.full_name} (@${session.username})`);
        console.log(`   ${status} | Socket: ${session.socket_id.substring(0, 8)}...`);
        console.log(`   📅 Connected: ${session.connected_at}`);
        console.log(`   ⏰ Last activity: ${session.last_activity}`);
        console.log('');
      });
    }
    
    // Check realtime_events_log for Socket.IO activity
    const realtimeEvents = await pool.query(`
      SELECT 
        event_type,
        user_id,
        socket_id,
        success,
        error_message,
        created_at
      FROM realtime_events_log
      WHERE event_type LIKE '%socket%'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📡 SOCKET.IO EVENTS LOG:');
    console.log('='.repeat(50));
    
    if (realtimeEvents.rows.length === 0) {
      console.log('❌ NO SOCKET.IO EVENTS LOGGED');
      console.log('This confirms Socket.IO connections are not working');
    } else {
      realtimeEvents.rows.forEach((event, i) => {
        const status = event.success ? '✅' : '❌';
        console.log(`${i+1}. ${status} ${event.event_type}`);
        console.log(`   👤 User: ${event.user_id}`);
        console.log(`   🔌 Socket: ${event.socket_id ? event.socket_id.substring(0, 8) + '...' : 'None'}`);
        if (event.error_message) {
          console.log(`   ❌ Error: ${event.error_message}`);
        }
        console.log(`   📅 ${event.created_at}`);
        console.log('');
      });
    }
    
    // Check user presence vs socket disconnect
    const presenceAnalysis = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.username,
        u.status as db_status,
        up.status as presence_status,
        up.socket_count,
        up.last_seen,
        up.updated_at
      FROM users u
      LEFT JOIN user_presence up ON u.id = up.user_id
      WHERE u.status = 'online' OR up.status = 'online'
      ORDER BY up.updated_at DESC NULLS LAST
    `);
    
    console.log('🔄 PRESENCE vs SOCKET ANALYSIS:');
    console.log('='.repeat(50));
    
    presenceAnalysis.rows.forEach((user, i) => {
      console.log(`${i+1}. ${user.full_name} (@${user.username})`);
      console.log(`   📊 DB Status: ${user.db_status || 'NULL'}`);
      console.log(`   👤 Presence: ${user.presence_status || 'NULL'}`);
      console.log(`   🔌 Socket count: ${user.socket_count || 0}`);
      console.log(`   👀 Last seen: ${user.last_seen || 'Never'}`);
      console.log(`   🔄 Updated: ${user.updated_at || 'Never'}`);
      
      // Analysis
      if (user.db_status === 'online' && (user.socket_count === 0 || !user.socket_count)) {
        console.log('   🚨 ISSUE: User marked online but no active sockets!');
      }
      console.log('');
    });
    
    console.log('🎯 DIAGNOSIS SUMMARY:');
    console.log('='.repeat(50));
    
    const hasSocketHistory = allSocketSessions.rows.length > 0;
    const hasRealtimeEvents = realtimeEvents.rows.length > 0;
    const hasPresenceIssues = presenceAnalysis.rows.some(u => 
      u.db_status === 'online' && (u.socket_count === 0 || !u.socket_count)
    );
    
    if (!hasSocketHistory && !hasRealtimeEvents) {
      console.log('🚨 CRITICAL: Socket.IO is NOT working at all');
      console.log('');
      console.log('🔧 TO FIX:');
      console.log('1. Check if frontend connects to Socket.IO');
      console.log('2. Check browser console for connection errors');
      console.log('3. Verify Socket.IO server is running');
      console.log('4. Check CORS settings');
      console.log('');
      console.log('🧪 QUICK TEST:');
      console.log('Open browser console and check for:');
      console.log('- "Socket.IO connected" messages');
      console.log('- WebSocket connection errors');
      console.log('- Network tab for Socket.IO requests');
    } else if (hasSocketHistory && hasPresenceIssues) {
      console.log('⚠️  Socket.IO worked before but users are disconnected now');
      console.log('Users need to actively browse the app for real-time notifications');
    } else {
      console.log('✅ Socket.IO system appears functional');
      console.log('Issue may be that users aren\'t currently browsing the app');
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Have SilviuT and IrinelT actually open the Mivton app in browser');
    console.log('2. Check browser console for Socket.IO connection messages');
    console.log('3. Run this diagnostic again while they\'re browsing');
    console.log('4. Test sending friend request while both are active');
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  } finally {
    await pool.end();
  }
}

diagnoseSocketConnection();
