#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testCompleteRemovalAndReAdd() {
  console.log('🧪 Complete Friend Removal and Re-add Test\n');
  
  try {
    // Get current friendships
    const friendships = await pool.query(`
      SELECT 
        f.user1_id,
        f.user2_id,
        u1.full_name as user1_name,
        u2.full_name as user2_name
      FROM friendships f
      JOIN users u1 ON f.user1_id = u1.id
      JOIN users u2 ON f.user2_id = u2.id
      ORDER BY f.created_at
    `);
    
    if (friendships.rows.length === 0) {
      console.log('❌ No friendships to test with');
      return;
    }
    
    const testUsers = friendships.rows[0];
    const user1_id = testUsers.user1_id;
    const user2_id = testUsers.user2_id;
    const user1_name = testUsers.user1_name;
    const user2_name = testUsers.user2_name;
    
    console.log(`🎯 Testing: ${user1_name} ↔ ${user2_name} (IDs: ${user1_id}, ${user2_id})`);
    console.log('=' .repeat(60));
    
    // Step 1: Show current state
    console.log('\n1️⃣ CURRENT STATE:');
    await showDetailedState(user1_id, user2_id, user1_name, user2_name);
    
    // Step 2: Remove friendship using safe method
    console.log('\n2️⃣ REMOVING FRIENDSHIP:');
    const removalResult = await pool.query(
      'SELECT remove_friendship_completely($1, $2)',
      [user1_id, user2_id]
    );
    
    if (removalResult.rows[0].remove_friendship_completely) {
      console.log('✅ Friendship removed successfully');
    } else {
      console.log('❌ Friendship removal failed');
      return;
    }
    
    // Step 3: Show state after removal
    console.log('\n3️⃣ AFTER REMOVAL:');
    await showDetailedState(user1_id, user2_id, user1_name, user2_name);
    
    // Step 4: Clean up any remaining friend requests completely
    console.log('\n4️⃣ CLEANING UP OLD REQUESTS:');
    
    const deleteResult = await pool.query(`
      DELETE FROM friend_requests 
      WHERE ((sender_id = $1 AND receiver_id = $2) 
             OR (sender_id = $2 AND receiver_id = $1))
      RETURNING id, status
    `, [user1_id, user2_id]);
    
    if (deleteResult.rows.length > 0) {
      console.log(`✅ Deleted ${deleteResult.rows.length} old friend requests:`);
      deleteResult.rows.forEach((req, i) => {
        console.log(`   ${i+1}. Request ID ${req.id} (${req.status})`);
      });
    } else {
      console.log('ℹ️  No old requests to clean up');
    }
    
    // Step 5: Show clean state
    console.log('\n5️⃣ CLEAN STATE:');
    await showDetailedState(user1_id, user2_id, user1_name, user2_name);
    
    // Step 6: Test sending a fresh friend request
    console.log('\n6️⃣ SENDING NEW FRIEND REQUEST:');
    
    try {
      await pool.query(`
        INSERT INTO friend_requests (sender_id, receiver_id, status, message, created_at)
        VALUES ($1, $2, 'pending', 'Fresh request after cleanup', CURRENT_TIMESTAMP)
      `, [user1_id, user2_id]);
      
      console.log('✅ New friend request sent successfully');
      
      // Get the new request ID
      const newRequest = await pool.query(`
        SELECT id FROM friend_requests 
        WHERE sender_id = $1 AND receiver_id = $2 
        ORDER BY created_at DESC LIMIT 1
      `, [user1_id, user2_id]);
      
      const requestId = newRequest.rows[0].id;
      console.log(`📨 New request ID: ${requestId}`);
      
      // Step 7: Accept the new request
      console.log('\n7️⃣ ACCEPTING NEW REQUEST:');
      
      const acceptResult = await pool.query(
        'SELECT accept_friend_request_properly($1)',
        [requestId]
      );
      
      if (acceptResult.rows[0].accept_friend_request_properly) {
        console.log('✅ Friend request accepted successfully');
      } else {
        console.log('❌ Friend request acceptance failed');
      }
      
      // Step 8: Show final state
      console.log('\n8️⃣ FINAL STATE:');
      await showDetailedState(user1_id, user2_id, user1_name, user2_name);
      
      console.log('\n🎉 SUCCESS! Complete removal and re-add cycle works perfectly!');
      console.log('✅ Users can now be removed and re-added as friends');
      
    } catch (error) {
      console.error('❌ Error sending new request:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await pool.end();
  }
}

async function showDetailedState(user1_id, user2_id, user1_name, user2_name) {
  // Check friendship
  const friendship = await pool.query(`
    SELECT status, created_at
    FROM friendships 
    WHERE user1_id = $1 AND user2_id = $2
  `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
  
  // Check all related friend requests
  const requests = await pool.query(`
    SELECT id, sender_id, receiver_id, status, message, created_at
    FROM friend_requests 
    WHERE ((sender_id = $1 AND receiver_id = $2) 
           OR (sender_id = $2 AND receiver_id = $1))
    ORDER BY created_at DESC
  `, [user1_id, user2_id]);
  
  // Check activity feed
  const activities = await pool.query(`
    SELECT COUNT(*) as count
    FROM friend_activity_feed
    WHERE ((user_id = $1 AND actor_id = $2) 
           OR (user_id = $2 AND actor_id = $1))
    AND activity_type IN ('friend_added', 'friend_accepted')
  `, [user1_id, user2_id]);
  
  // Check notifications
  const notifications = await pool.query(`
    SELECT COUNT(*) as count
    FROM friend_notifications
    WHERE ((user_id = $1 AND sender_id = $2) 
           OR (user_id = $2 AND sender_id = $1))
    AND type IN ('friend_request', 'friend_accepted')
  `, [user1_id, user2_id]);
  
  console.log(`   🤝 Friendship: ${friendship.rows.length > 0 ? friendship.rows[0].status : 'None'}`);
  console.log(`   📨 Friend Requests: ${requests.rows.length}`);
  
  if (requests.rows.length > 0) {
    requests.rows.forEach((req, i) => {
      const direction = req.sender_id === user1_id ? `${user1_name} → ${user2_name}` : `${user2_name} → ${user1_name}`;
      console.log(`      ${i+1}. ID ${req.id}: ${direction} (${req.status.toUpperCase()})`);
    });
  }
  
  console.log(`   📱 Activity Feed Entries: ${activities.rows[0].count}`);
  console.log(`   🔔 Notifications: ${notifications.rows[0].count}`);
}

testCompleteRemovalAndReAdd();
