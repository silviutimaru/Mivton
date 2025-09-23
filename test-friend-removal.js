#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testFriendRemovalAndReAdd() {
  console.log('🧪 Testing Friend Removal and Re-adding Process\n');
  
  try {
    // Get current friendships
    const currentFriendships = await pool.query(`
      SELECT 
        f.id,
        f.user1_id,
        f.user2_id,
        u1.full_name as user1_name,
        u2.full_name as user2_name
      FROM friendships f
      JOIN users u1 ON f.user1_id = u1.id
      JOIN users u2 ON f.user2_id = u2.id
      ORDER BY f.created_at
    `);
    
    console.log('👥 Current Friendships:');
    if (currentFriendships.rows.length === 0) {
      console.log('   No friendships found');
      return;
    }
    
    currentFriendships.rows.forEach((f, i) => {
      console.log(`   ${i+1}. ${f.user1_name} ↔ ${f.user2_name} (IDs: ${f.user1_id}, ${f.user2_id})`);
    });
    
    // Let's test with the first friendship
    const testFriendship = currentFriendships.rows[0];
    const user1_id = testFriendship.user1_id;
    const user2_id = testFriendship.user2_id;
    const user1_name = testFriendship.user1_name;
    const user2_name = testFriendship.user2_name;
    
    console.log(`\n🎯 Testing with: ${user1_name} ↔ ${user2_name}`);
    console.log('=' .repeat(50));
    
    // Show current state
    console.log('\n1️⃣ BEFORE REMOVAL:');
    await showRelationshipState(user1_id, user2_id, user1_name, user2_name);
    
    // Test removal using the NEW safe method
    console.log('\n2️⃣ REMOVING FRIENDSHIP (using safe method):');
    const removalResult = await pool.query(
      'SELECT remove_friendship_completely($1, $2)',
      [user1_id, user2_id]
    );
    
    if (removalResult.rows[0].remove_friendship_completely) {
      console.log('✅ Friendship removed successfully using safe method');
    } else {
      console.log('❌ Friendship removal failed');
    }
    
    // Show state after removal
    console.log('\n3️⃣ AFTER REMOVAL:');
    await showRelationshipState(user1_id, user2_id, user1_name, user2_name);
    
    // Test if we can send a new friend request
    console.log('\n4️⃣ TESTING RE-ADD (simulating new friend request):');
    
    try {
      // Check if we can create a new friend request
      const canSendRequest = await pool.query(`
        SELECT 
          NOT EXISTS (
            SELECT 1 FROM friend_requests 
            WHERE ((sender_id = $1 AND receiver_id = $2) 
                   OR (sender_id = $2 AND receiver_id = $1))
            AND status IN ('pending', 'accepted')
          ) as can_send_request
      `, [user1_id, user2_id]);
      
      if (canSendRequest.rows[0].can_send_request) {
        console.log('✅ Can send new friend request - no blocking records found');
        
        // Simulate sending a new request
        await pool.query(`
          INSERT INTO friend_requests (sender_id, receiver_id, status, message, created_at)
          VALUES ($1, $2, 'pending', 'Testing re-add after removal', CURRENT_TIMESTAMP)
        `, [user1_id, user2_id]);
        
        console.log('✅ New friend request sent successfully');
        
        // Show the new request
        const newRequest = await pool.query(`
          SELECT id, status, created_at
          FROM friend_requests 
          WHERE sender_id = $1 AND receiver_id = $2
          ORDER BY created_at DESC LIMIT 1
        `, [user1_id, user2_id]);
        
        console.log(`📨 New request ID: ${newRequest.rows[0].id} (${newRequest.rows[0].status})`);
        
        // Now test accepting it using the proper function
        console.log('\n5️⃣ TESTING ACCEPTANCE (using safe method):');
        
        const acceptResult = await pool.query(
          'SELECT accept_friend_request_properly($1)',
          [newRequest.rows[0].id]
        );
        
        if (acceptResult.rows[0].accept_friend_request_properly) {
          console.log('✅ Friend request accepted successfully using safe method');
        }
        
        // Show final state
        console.log('\n6️⃣ FINAL STATE:');
        await showRelationshipState(user1_id, user2_id, user1_name, user2_name);
        
      } else {
        console.log('❌ Cannot send new friend request - blocking records still exist');
        
        // Show what's blocking
        const blockingRecords = await pool.query(`
          SELECT 'friend_request' as type, status, created_at
          FROM friend_requests 
          WHERE ((sender_id = $1 AND receiver_id = $2) 
                 OR (sender_id = $2 AND receiver_id = $1))
          UNION
          SELECT 'friendship' as type, status::text, created_at
          FROM friendships 
          WHERE (user1_id = $1 AND user2_id = $2)
        `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
        
        console.log('🚫 Blocking records:');
        blockingRecords.rows.forEach(record => {
          console.log(`   • ${record.type}: ${record.status}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error testing re-add:', error.message);
    }
    
    console.log('\n🏁 Test Complete!');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await pool.end();
  }
}

async function showRelationshipState(user1_id, user2_id, user1_name, user2_name) {
  // Check friendship
  const friendship = await pool.query(`
    SELECT status, created_at
    FROM friendships 
    WHERE user1_id = $1 AND user2_id = $2
  `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
  
  // Check friend requests
  const requests = await pool.query(`
    SELECT sender_id, receiver_id, status, created_at
    FROM friend_requests 
    WHERE ((sender_id = $1 AND receiver_id = $2) 
           OR (sender_id = $2 AND receiver_id = $1))
    ORDER BY created_at DESC
  `, [user1_id, user2_id]);
  
  console.log(`   🤝 Friendship: ${friendship.rows.length > 0 ? friendship.rows[0].status : 'None'}`);
  console.log(`   📨 Friend Requests: ${requests.rows.length}`);
  
  if (requests.rows.length > 0) {
    requests.rows.forEach((req, i) => {
      const direction = req.sender_id === user1_id ? `${user1_name} → ${user2_name}` : `${user2_name} → ${user1_name}`;
      console.log(`      ${i+1}. ${direction}: ${req.status.toUpperCase()}`);
    });
  }
}

// Run the test
testFriendRemovalAndReAdd();
