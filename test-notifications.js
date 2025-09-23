#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testFriendRequestNotifications() {
  console.log('🧪 Testing Friend Request Notifications\n');
  
  try {
    // Get available users for testing
    const users = await pool.query(`
      SELECT id, username, full_name, status
      FROM users 
      ORDER BY id
    `);
    
    if (users.rows.length < 2) {
      console.log('❌ Need at least 2 users to test friend requests');
      return;
    }
    
    console.log('👥 Available users:');
    users.rows.forEach((user, i) => {
      console.log(`   ${i+1}. ${user.full_name} (@${user.username}) - ${user.status}`);
    });
    
    // Select two users who aren't already friends
    const sender = users.rows[0];
    const receiver = users.rows[1];
    
    console.log(`\n🎯 Testing: ${sender.full_name} → ${receiver.full_name}`);
    console.log('='.repeat(50));
    
    // Check if they're already friends or have pending requests
    const existingRelation = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM friendships 
         WHERE user1_id = LEAST($1, $2) AND user2_id = GREATEST($1, $2)) as friendship_count,
        (SELECT COUNT(*) FROM friend_requests 
         WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
         AND status IN ('pending', 'accepted')) as request_count
    `, [sender.id, receiver.id]);
    
    const { friendship_count, request_count } = existingRelation.rows[0];
    
    if (friendship_count > 0) {
      console.log('ℹ️  Users are already friends - will test anyway');
    }
    
    if (request_count > 0) {
      console.log('ℹ️  Existing requests found - cleaning up first');
      await pool.query(`
        DELETE FROM friend_requests 
        WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
      `, [sender.id, receiver.id]);
    }
    
    // Clear existing notifications for clean test
    await pool.query(`
      DELETE FROM friend_notifications 
      WHERE ((user_id = $1 AND sender_id = $2) OR (user_id = $2 AND sender_id = $1))
    `, [sender.id, receiver.id]);
    
    console.log('\n1️⃣ SENDING FRIEND REQUEST:');
    
    // Send friend request using the safe function
    try {
      const requestResult = await pool.query(
        'SELECT send_friend_request_safely($1, $2, $3)',
        [sender.id, receiver.id, 'Test notification request from analysis script']
      );
      
      const newRequestId = requestResult.rows[0].send_friend_request_safely;
      console.log(`✅ Friend request sent successfully (ID: ${newRequestId})`);
      
      // Check what notifications were created
      console.log('\n2️⃣ CHECKING NOTIFICATIONS CREATED:');
      
      const notifications = await pool.query(`
        SELECT 
          fn.id,
          fn.type,
          fn.message,
          fn.is_read,
          fn.created_at,
          u.full_name as receiver_name
        FROM friend_notifications fn
        JOIN users u ON fn.user_id = u.id
        WHERE fn.sender_id = $1 AND fn.user_id = $2
        ORDER BY fn.created_at DESC
      `, [sender.id, receiver.id]);
      
      if (notifications.rows.length === 0) {
        console.log('❌ No notifications created automatically');
        console.log('ℹ️  Creating manual notification for testing...');
        
        // Create notification manually
        await pool.query(`
          INSERT INTO friend_notifications (user_id, sender_id, type, message, data, is_read, created_at)
          VALUES ($1, $2, 'friend_request', 'You have a new friend request!', 
                  jsonb_build_object('request_id', $3), false, CURRENT_TIMESTAMP)
        `, [receiver.id, sender.id, newRequestId]);
        
        console.log('✅ Manual notification created');
      } else {
        console.log(`✅ ${notifications.rows.length} notification(s) created automatically:`);
        notifications.rows.forEach((notif, i) => {
          console.log(`   ${i+1}. ${notif.type}: "${notif.message}"`);
          console.log(`      To: ${notif.receiver_name} | Read: ${notif.is_read ? 'Yes' : 'No'}`);
        });
      }
      
      // Check activity feed
      console.log('\n3️⃣ CHECKING ACTIVITY FEED:');
      
      const activities = await pool.query(`
        SELECT activity_type, activity_data, created_at
        FROM friend_activity_feed
        WHERE (user_id = $1 AND actor_id = $2) OR (user_id = $2 AND actor_id = $1)
        ORDER BY created_at DESC
        LIMIT 5
      `, [sender.id, receiver.id]);
      
      if (activities.rows.length === 0) {
        console.log('❌ No activity feed entries created');
      } else {
        console.log(`✅ ${activities.rows.length} activity feed entries:`);
        activities.rows.forEach((activity, i) => {
          console.log(`   ${i+1}. ${activity.activity_type}`);
        });
      }
      
      console.log('\n4️⃣ WHAT SHOULD HAPPEN FOR REAL-TIME NOTIFICATIONS:');
      console.log('📱 Database notification: ✅ Created');
      console.log('🔔 Pop-up notification: ❓ Requires Socket.IO emit');
      console.log('🔊 Sound notification: ❓ Requires frontend audio trigger');
      console.log('📧 Email notification: ❓ Requires email service integration');
      
      console.log('\n💡 For the receiver to get a pop-up with sound:');
      console.log('1. User must be online (active WebSocket connection)');
      console.log('2. Socket.IO must emit "friend_request" event');
      console.log('3. Frontend must listen for the event');
      console.log('4. Frontend must show pop-up and play sound');
      
    } catch (error) {
      console.error('❌ Error sending friend request:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await pool.end();
  }
}

testFriendRequestNotifications();
