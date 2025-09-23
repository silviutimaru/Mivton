#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testNotificationsSimple() {
  console.log('🧪 Simple Friend Request Notification Test\n');
  
  try {
    // Get specific users by ID to avoid comparison issues
    const testUser = await pool.query('SELECT * FROM users WHERE username = $1', ['testuser123']);
    const silviuUser = await pool.query('SELECT * FROM users WHERE username = $1', ['SilviuT']);
    
    if (testUser.rows.length === 0 || silviuUser.rows.length === 0) {
      console.log('❌ Required test users not found');
      return;
    }
    
    const sender = testUser.rows[0];
    const receiver = silviuUser.rows[0];
    
    console.log(`🎯 Testing: ${sender.full_name} → ${receiver.full_name}`);
    console.log(`   Sender ID: ${sender.id} | Receiver ID: ${receiver.id}`);
    console.log('='.repeat(60));
    
    // Clean up any existing data for clean test
    console.log('\n1️⃣ CLEANING UP EXISTING DATA:');
    
    await pool.query(`
      DELETE FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [sender.id, receiver.id]);
    
    await pool.query(`
      DELETE FROM friend_notifications 
      WHERE (user_id = $1 AND sender_id = $2) OR (user_id = $2 AND sender_id = $1)
    `, [sender.id, receiver.id]);
    
    await pool.query(`
      DELETE FROM friendships 
      WHERE user1_id = $1 AND user2_id = $2
    `, [Math.min(sender.id, receiver.id), Math.max(sender.id, receiver.id)]);
    
    console.log('✅ Cleaned up existing relationships');
    
    // Send friend request
    console.log('\n2️⃣ SENDING FRIEND REQUEST:');
    
    const requestResult = await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id, status, message, created_at, updated_at)
      VALUES ($1, $2, 'pending', 'Test friend request for notification system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [sender.id, receiver.id]);
    
    const requestId = requestResult.rows[0].id;
    console.log(`✅ Friend request created (ID: ${requestId})`);
    
    // Create notification
    console.log('\n3️⃣ CREATING NOTIFICATION:');
    
    const notifResult = await pool.query(`
      INSERT INTO friend_notifications (user_id, sender_id, type, message, data, is_read, created_at)
      VALUES ($1, $2, 'friend_request', $3, $4, false, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      receiver.id,
      sender.id,
      `${sender.full_name} sent you a friend request!`,
      JSON.stringify({ 
        request_id: requestId, 
        sender_username: sender.username,
        sender_full_name: sender.full_name 
      })
    ]);
    
    const notificationId = notifResult.rows[0].id;
    console.log(`✅ Notification created (ID: ${notificationId})`);
    
    // Check real-time system status
    console.log('\n4️⃣ REAL-TIME SYSTEM STATUS:');
    
    // Check socket sessions
    const senderSockets = await pool.query(`
      SELECT COUNT(*) as count FROM socket_sessions 
      WHERE user_id = $1 AND is_active = true
    `, [sender.id]);
    
    const receiverSockets = await pool.query(`
      SELECT COUNT(*) as count FROM socket_sessions 
      WHERE user_id = $1 AND is_active = true
    `, [receiver.id]);
    
    console.log(`🔌 ${sender.full_name} active sockets: ${senderSockets.rows[0].count}`);
    console.log(`🔌 ${receiver.full_name} active sockets: ${receiverSockets.rows[0].count}`);
    
    // Check user presence
    const senderPresence = await pool.query(`
      SELECT status, socket_count FROM user_presence WHERE user_id = $1
    `, [sender.id]);
    
    const receiverPresence = await pool.query(`
      SELECT status, socket_count FROM user_presence WHERE user_id = $1
    `, [receiver.id]);
    
    if (senderPresence.rows.length > 0) {
      const p = senderPresence.rows[0];
      console.log(`👤 ${sender.full_name} status: ${p.status} (${p.socket_count} sockets)`);
    }
    
    if (receiverPresence.rows.length > 0) {
      const p = receiverPresence.rows[0];
      console.log(`👤 ${receiver.full_name} status: ${p.status} (${p.socket_count} sockets)`);
    }
    
    // Check recent realtime events
    const realtimeEvents = await pool.query(`
      SELECT COUNT(*) as count FROM realtime_events_log 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    
    console.log(`📊 Recent realtime events: ${realtimeEvents.rows[0].count}`);
    
    // Final status
    console.log('\n5️⃣ NOTIFICATION DELIVERY ANALYSIS:');
    console.log('='.repeat(50));
    
    const receiverSocketCount = receiverSockets.rows[0].count;
    const receiverStatus = receiverPresence.rows.length > 0 ? receiverPresence.rows[0].status : 'unknown';
    
    console.log('✅ Database notification: CREATED');
    console.log(`📱 Receiver (${receiver.full_name}):`);
    console.log(`   • Status: ${receiverStatus.toUpperCase()}`);
    console.log(`   • Active sockets: ${receiverSocketCount}`);
    console.log(`   • Should receive pop-up: ${receiverSocketCount > 0 && receiverStatus === 'online' ? '✅ YES' : '❌ NO'}`);
    
    if (receiverSocketCount > 0 && receiverStatus === 'online') {
      console.log('\n🎯 REAL-TIME NOTIFICATION SHOULD WORK!');
      console.log('The user has active socket connections and is online.');
      console.log('');
      console.log('💡 To test in your browser:');
      console.log(`1. Open your Mivton app: ${process.env.APP_URL || 'http://localhost:3000'}`);
      console.log(`2. Login as "${receiver.full_name}" (@${receiver.username})`);
      console.log(`3. In another tab, login as "${sender.full_name}" (@${sender.username})`);
      console.log(`4. Send a friend request from ${sender.full_name} to ${receiver.full_name}`);
      console.log(`5. ${receiver.full_name} should get a pop-up notification with sound!`);
    } else {
      console.log('\n⚠️  REAL-TIME NOTIFICATION BLOCKED:');
      if (receiverSocketCount === 0) {
        console.log('❌ No active socket connections - user needs to be actively using the app');
      }
      if (receiverStatus !== 'online') {
        console.log('❌ User status is not online - presence system issue');
      }
      console.log('');
      console.log('🔧 To fix:');
      console.log('1. Make sure user is actively browsing your Mivton app');
      console.log('2. Check browser console for WebSocket connection errors');
      console.log('3. Ensure Socket.IO is properly initialized in frontend');
    }
    
    // Show notification details
    console.log('\n📋 CREATED NOTIFICATION DETAILS:');
    const createdNotif = await pool.query(`
      SELECT 
        fn.*,
        u.full_name as receiver_name
      FROM friend_notifications fn
      JOIN users u ON fn.user_id = u.id
      WHERE fn.id = $1
    `, [notificationId]);
    
    if (createdNotif.rows.length > 0) {
      const notif = createdNotif.rows[0];
      console.log(`📝 Message: "${notif.message}"`);
      console.log(`👤 For: ${notif.receiver_name}`);
      console.log(`📊 Type: ${notif.type}`);
      console.log(`📖 Read: ${notif.is_read ? 'Yes' : 'No'}`);
      console.log(`📅 Created: ${notif.created_at}`);
      console.log(`💾 Data: ${JSON.stringify(notif.data, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testNotificationsSimple();
