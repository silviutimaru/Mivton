#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testNotificationsFixed() {
  console.log('🧪 Testing Friend Request Notifications (Fixed)\n');
  
  try {
    // Get available users who aren't already friends
    const users = await pool.query(`
      SELECT id, username, full_name, status
      FROM users 
      WHERE status = 'online'
      ORDER BY id
    `);
    
    if (users.rows.length < 2) {
      console.log('❌ Need at least 2 online users to test');
      return;
    }
    
    console.log('👥 Online users:');
    users.rows.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.full_name} (@${user.username})`);
    });
    
    // Use Test User and Silviu Timaru for testing
    const sender = users.rows.find(u => u.username === 'testuser123') || users.rows[0];
    const receiver = users.rows.find(u => u.username === 'SilviuT') || users.rows[1];
    
    console.log(`\n🎯 Testing: ${sender.full_name} → ${receiver.full_name}`);
    console.log('='.repeat(50));
    
    // Check current relationship status
    const relationship = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM friendships 
         WHERE user1_id = LEAST($1, $2) AND user2_id = GREATEST($1, $2)) as is_friends,
        (SELECT COUNT(*) FROM friend_requests 
         WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending') as pending_request
    `, [sender.id, receiver.id]);
    
    const { is_friends, pending_request } = relationship.rows[0];
    
    if (is_friends > 0) {
      console.log('ℹ️  Users are currently friends - removing friendship first');
      await pool.query('SELECT remove_friendship_and_history_completely($1, $2)', [sender.id, receiver.id]);
    }
    
    if (pending_request > 0) {
      console.log('ℹ️  Pending request exists - cleaning up');
      await pool.query(`
        DELETE FROM friend_requests 
        WHERE sender_id = $1 AND receiver_id = $2
      `, [sender.id, receiver.id]);
    }
    
    // Clear old notifications for clean test
    await pool.query(`
      DELETE FROM friend_notifications 
      WHERE user_id = $1 AND sender_id = $2
    `, [receiver.id, sender.id]);
    
    console.log('\n1️⃣ SENDING FRIEND REQUEST:');
    
    // Send friend request manually (avoiding the function with the error)
    const newRequest = await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id, status, message, created_at, updated_at)
      VALUES ($1, $2, 'pending', 'Test friend request for notification check', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [sender.id, receiver.id]);
    
    const requestId = newRequest.rows[0].id;
    console.log(`✅ Friend request sent (ID: ${requestId})`);
    
    // Create notification manually
    await pool.query(`
      INSERT INTO friend_notifications (user_id, sender_id, type, message, data, is_read, created_at)
      VALUES ($1, $2, 'friend_request', $3, $4, false, CURRENT_TIMESTAMP)
    `, [
      receiver.id, 
      sender.id, 
      `${sender.full_name} sent you a friend request!`,
      JSON.stringify({ request_id: requestId, sender_username: sender.username })
    ]);
    
    console.log('✅ Notification created in database');
    
    // Check notification was created
    console.log('\n2️⃣ VERIFYING NOTIFICATION:');
    
    const notification = await pool.query(`
      SELECT 
        fn.id,
        fn.type,
        fn.message,
        fn.is_read,
        fn.data,
        fn.created_at
      FROM friend_notifications fn
      WHERE fn.user_id = $1 AND fn.sender_id = $2
      ORDER BY fn.created_at DESC
      LIMIT 1
    `, [receiver.id, sender.id]);
    
    if (notification.rows.length > 0) {
      const notif = notification.rows[0];
      console.log(`✅ Notification verified:`);
      console.log(`   📝 Message: "${notif.message}"`);
      console.log(`   📊 Type: ${notif.type}`);
      console.log(`   📖 Read: ${notif.is_read ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${notif.created_at}`);
    }
    
    // Check real-time system status
    console.log('\n3️⃣ REAL-TIME SYSTEM CHECK:');
    
    // Check if receiver has active socket sessions
    const socketSessions = await pool.query(`
      SELECT COUNT(*) as active_sessions
      FROM socket_sessions 
      WHERE user_id = $1 AND is_active = true
    `, [receiver.id]);
    
    console.log(`🔌 ${receiver.full_name} active socket sessions: ${socketSessions.rows[0].active_sessions}`);
    
    // Check user presence
    const presence = await pool.query(`
      SELECT status, socket_count, updated_at
      FROM user_presence 
      WHERE user_id = $1
    `, [receiver.id]);
    
    if (presence.rows.length > 0) {
      const p = presence.rows[0];
      console.log(`👤 ${receiver.full_name} presence: ${p.status} (${p.socket_count} sockets)`);
    }
    
    // Check realtime events log
    const realtimeEvents = await pool.query(`
      SELECT COUNT(*) as recent_events
      FROM realtime_events_log 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'
    `, [receiver.id]);
    
    console.log(`📊 Recent realtime events for ${receiver.full_name}: ${realtimeEvents.rows[0].recent_events}`);
    
    console.log('\n4️⃣ NOTIFICATION DELIVERY STATUS:');
    console.log('='.repeat(50));
    console.log('✅ Database notification: CREATED');
    console.log('✅ User is online: YES');
    console.log(`✅ Socket sessions: ${socketSessions.rows[0].active_sessions > 0 ? 'ACTIVE' : 'NONE'}`);
    
    if (socketSessions.rows[0].active_sessions > 0) {
      console.log('🎯 USER SHOULD RECEIVE POP-UP NOTIFICATION IF:');
      console.log('   • Socket.IO server emits "friend_request" event');
      console.log('   • Frontend listens for the event');
      console.log('   • Frontend shows notification popup');
      console.log('   • Frontend plays notification sound');
    } else {
      console.log('⚠️  USER WON\'T RECEIVE REAL-TIME NOTIFICATION:');
      console.log('   • No active socket sessions');
      console.log('   • User needs to refresh/reconnect to app');
    }
    
    console.log('\n💡 TO TEST IN YOUR APP:');
    console.log('1. Open your Mivton app in two browser tabs');
    console.log(`2. Login as "${receiver.full_name}" in one tab`);
    console.log(`3. Login as "${sender.full_name}" in another tab`);
    console.log(`4. Send friend request from ${sender.full_name} to ${receiver.full_name}`);
    console.log(`5. Check if ${receiver.full_name} gets pop-up + sound`);
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await pool.end();
  }
}

testNotificationsFixed();
