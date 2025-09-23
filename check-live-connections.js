#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkLiveConnections() {
  console.log('🔍 Checking Live User Connections\n');
  
  try {
    // Check all active socket sessions
    const activeSessions = await pool.query(`
      SELECT 
        ss.user_id,
        ss.socket_id,
        ss.connected_at,
        ss.last_activity,
        u.full_name,
        u.username
      FROM socket_sessions ss
      JOIN users u ON ss.user_id = u.id
      WHERE ss.is_active = true
      ORDER BY ss.last_activity DESC
    `);
    
    console.log('🔌 ACTIVE SOCKET CONNECTIONS:');
    console.log('='.repeat(50));
    
    if (activeSessions.rows.length === 0) {
      console.log('❌ No active socket connections');
      console.log('💡 Users need to be actively browsing your Mivton app');
    } else {
      activeSessions.rows.forEach((session, i) => {
        console.log(`${i+1}. ${session.full_name} (@${session.username})`);
        console.log(`   🔌 Socket: ${session.socket_id}`);
        console.log(`   📅 Connected: ${session.connected_at}`);
        console.log(`   ⏰ Last active: ${session.last_activity}`);
        console.log('');
      });
    }
    
    // Check user presence status
    const userPresence = await pool.query(`
      SELECT 
        up.user_id,
        up.status,
        up.socket_count,
        up.last_seen,
        u.full_name,
        u.username
      FROM user_presence up
      JOIN users u ON up.user_id = u.id
      WHERE up.status = 'online' OR up.socket_count > 0
      ORDER BY up.last_seen DESC
    `);
    
    console.log('👤 ONLINE USER PRESENCE:');
    console.log('='.repeat(50));
    
    if (userPresence.rows.length === 0) {
      console.log('❌ No users currently online');
    } else {
      userPresence.rows.forEach((presence, i) => {
        console.log(`${i+1}. ${presence.full_name} (@${presence.username})`);
        console.log(`   📊 Status: ${presence.status.toUpperCase()}`);
        console.log(`   🔌 Socket count: ${presence.socket_count}`);
        console.log(`   👀 Last seen: ${presence.last_seen}`);
        console.log('');
      });
    }
    
    // Show unread notifications waiting for delivery
    const unreadNotifications = await pool.query(`
      SELECT 
        fn.id,
        fn.type,
        fn.message,
        fn.created_at,
        ur.full_name as receiver_name,
        us.full_name as sender_name
      FROM friend_notifications fn
      JOIN users ur ON fn.user_id = ur.id
      JOIN users us ON fn.sender_id = us.id
      WHERE fn.is_read = false
      ORDER BY fn.created_at DESC
      LIMIT 10
    `);
    
    console.log('🔔 UNREAD NOTIFICATIONS WAITING:');
    console.log('='.repeat(50));
    
    if (unreadNotifications.rows.length === 0) {
      console.log('✅ No unread notifications');
    } else {
      unreadNotifications.rows.forEach((notif, i) => {
        console.log(`${i+1}. ${notif.sender_name} → ${notif.receiver_name}`);
        console.log(`   📝 ${notif.message}`);
        console.log(`   📊 ${notif.type.toUpperCase()}`);
        console.log(`   📅 ${notif.created_at}`);
        console.log('');
      });
    }
    
    console.log('🎯 NOTIFICATION DELIVERY STATUS:');
    console.log('='.repeat(50));
    console.log(`✅ Database system: READY`);
    console.log(`✅ Real-time infrastructure: READY`);
    console.log(`🔌 Active connections: ${activeSessions.rows.length}`);
    console.log(`👤 Online users: ${userPresence.rows.length}`);
    console.log(`🔔 Pending notifications: ${unreadNotifications.rows.length}`);
    
    if (activeSessions.rows.length > 0) {
      console.log('\n🎉 REAL-TIME NOTIFICATIONS SHOULD WORK!');
      console.log('Users with active connections will receive pop-up notifications.');
    } else {
      console.log('\n⚠️  REAL-TIME NOTIFICATIONS INACTIVE');
      console.log('Users need to actively browse your Mivton app to receive notifications.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLiveConnections();
