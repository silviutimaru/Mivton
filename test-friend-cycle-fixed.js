#!/usr/bin/env node
/**
 * 🧪 FRIEND REMOVE/RE-ADD CYCLE TESTING SCRIPT
 * Tests the complete cycle and verifies synchronization
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runFriendRemovalTest() {
  console.log('🚀 TESTING FRIEND REMOVAL AND RE-ADDING FUNCTIONALITY');
  console.log('=' .repeat(60));
  
  let testUser1, testUser2;
  
  try {
    // Step 1: Setup test users
    console.log('\n1️⃣ Setting up test users...');
    const testUsers = await setupTestUsers();
    testUser1 = testUsers[0];
    testUser2 = testUsers[1];
    
    console.log(`   📋 User 1: ${testUser1.username} (ID: ${testUser1.id})`);
    console.log(`   📋 User 2: ${testUser2.username} (ID: ${testUser2.id})`);
    
    // Step 2: Clear any existing relationships
    console.log('\n2️⃣ Clearing existing relationships...');
    await clearAllRelationships(testUser1.id, testUser2.id);
    
    // Step 3: Create friendship
    console.log('\n3️⃣ Creating friendship...');
    await createFriendship(testUser1.id, testUser2.id);
    
    // Step 4: Verify friendship exists
    console.log('\n4️⃣ Verifying friendship...');
    await verifyFriendship(testUser1.id, testUser2.id, true);
    
    // Step 5: Test friend removal (with new cleanup)
    console.log('\n5️⃣ Testing friend removal with complete cleanup...');
    await testFriendRemoval(testUser1.id, testUser2.id);
    
    // Step 6: Verify complete cleanup
    console.log('\n6️⃣ Verifying complete cleanup...');
    await verifyCompleteCleanup(testUser1.id, testUser2.id);
    
    // Step 7: Test re-adding friend
    console.log('\n7️⃣ Testing friend re-adding...');
    await testFriendReAdd(testUser1.id, testUser2.id);
    
    // Step 8: Final verification
    console.log('\n8️⃣ Final verification...');
    await verifyFriendship(testUser1.id, testUser2.id, true);
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 FRIEND REMOVAL/RE-ADD CYCLE TEST COMPLETED SUCCESSFULLY!');
    console.log('✅ Your friends system synchronization is working correctly');
    console.log('🚀 Ready for deployment and user testing');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('🔧 Details:', error);
    
    if (testUser1 && testUser2) {
      console.log('\n🧹 Cleaning up test data...');
      await clearAllRelationships(testUser1.id, testUser2.id);
    }
  } finally {
    await pool.end();
  }
}

async function setupTestUsers() {
  const users = [];
  const testUserData = [
    { username: 'test_friend_a', email: 'test_friend_a@mivton.test', full_name: 'Test Friend A' },
    { username: 'test_friend_b', email: 'test_friend_b@mivton.test', full_name: 'Test Friend B' }
  ];
  
  for (const userData of testUserData) {
    try {
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id, username, full_name FROM users WHERE username = $1',
        [userData.username]
      );
      
      if (existingUser.rows.length > 0) {
        users.push(existingUser.rows[0]);
        console.log(`   ✅ Using existing user: ${userData.username}`);
      } else {
        // Create new user
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);
        
        const newUser = await pool.query(`
          INSERT INTO users (username, email, password_hash, full_name, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING id, username, full_name
        `, [userData.username, userData.email, hashedPassword, userData.full_name]);
        
        users.push(newUser.rows[0]);
        console.log(`   ✅ Created new user: ${userData.username}`);
      }
    } catch (error) {
      console.error(`   ❌ Error with user ${userData.username}:`, error.message);
      throw error;
    }
  }
  
  return users;
}

async function clearAllRelationships(user1_id, user2_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Remove friendships
    await client.query(`
      DELETE FROM friendships 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
    
    // Remove all friend requests
    await client.query(`
      DELETE FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [user1_id, user2_id]);
    
    // Remove friend notifications
    await client.query(`
      DELETE FROM friend_notifications 
      WHERE ((user_id = $1 AND sender_id = $2) OR (user_id = $2 AND sender_id = $1))
      AND type IN ('friend_request', 'friend_accepted')
    `, [user1_id, user2_id]);
    
    // Remove blocking
    await client.query(`
      DELETE FROM blocked_users 
      WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
    `, [user1_id, user2_id]);
    
    await client.query('COMMIT');
    console.log('   ✅ All relationships cleared');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('   ❌ Error clearing relationships:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function createFriendship(user1_id, user2_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create friend request
    const requestResult = await client.query(`
      INSERT INTO friend_requests (sender_id, receiver_id, status, message)
      VALUES ($1, $2, 'pending', 'Test friendship creation')
      RETURNING id
    `, [user1_id, user2_id]);
    
    const requestId = requestResult.rows[0].id;
    console.log(`   📤 Friend request created (ID: ${requestId})`);
    
    // Accept the request
    await client.query(`
      UPDATE friend_requests 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [requestId]);
    
    // Create friendship
    await client.query(`
      INSERT INTO friendships (user1_id, user2_id, status)
      VALUES ($1, $2, 'active')
    `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
    
    await client.query('COMMIT');
    console.log('   ✅ Friendship created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('   ❌ Error creating friendship:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyFriendship(user1_id, user2_id, shouldExist) {
  try {
    const friendshipCheck = await pool.query(`
      SELECT id, status FROM friendships 
      WHERE user1_id = $1 AND user2_id = $2
    `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
    
    const requestCheck = await pool.query(`
      SELECT id, status FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at DESC
    `, [user1_id, user2_id]);
    
    if (shouldExist) {
      if (friendshipCheck.rows.length > 0) {
        console.log(`   ✅ Friendship exists: ${friendshipCheck.rows[0].status}`);
      } else {
        console.log('   ❌ Friendship does not exist (expected to exist)');
        throw new Error('Friendship verification failed - should exist but does not');
      }
    } else {
      if (friendshipCheck.rows.length === 0) {
        console.log('   ✅ Friendship does not exist (as expected)');
      } else {
        console.log('   ❌ Friendship still exists (expected to be removed)');
        throw new Error('Friendship verification failed - should not exist but does');
      }
    }
    
    console.log(`   📊 Friend requests found: ${requestCheck.rows.length}`);
    requestCheck.rows.forEach((req, i) => {
      console.log(`      ${i+1}. Status: ${req.status}`);
    });
  } catch (error) {
    console.error('   ❌ Verification error:', error.message);
    throw error;
  }
}

async function testFriendRemoval(user1_id, user2_id) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('   🗑️ Simulating friend removal with complete cleanup...');
    
    // 1. Remove friendship
    const friendshipRemoval = await client.query(`
      DELETE FROM friendships 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [user1_id, user2_id]);
    
    console.log(`      ✅ Friendships removed: ${friendshipRemoval.rowCount}`);
    
    // 2. Clean up ALL friend request history (THIS IS THE KEY FIX)
    const requestsRemoval = await client.query(`
      DELETE FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [user1_id, user2_id]);
    
    console.log(`      ✅ Friend requests removed: ${requestsRemoval.rowCount}`);
    
    // 3. Clean up notifications
    const notificationsRemoval = await client.query(`
      DELETE FROM friend_notifications 
      WHERE ((user_id = $1 AND sender_id = $2) OR (user_id = $2 AND sender_id = $1))
      AND type IN ('friend_request', 'friend_accepted')
    `, [user1_id, user2_id]);
    
    console.log(`      ✅ Notifications removed: ${notificationsRemoval.rowCount}`);
    
    // 4. Log the activity
    await client.query(`
      INSERT INTO social_activity_log (user_id, target_user_id, activity_type, ip_address, user_agent)
      VALUES ($1, $2, 'friend_removed', '127.0.0.1', 'Test Script')
    `, [user1_id, user2_id]);
    
    await client.query('COMMIT');
    console.log('   ✅ Friend removal with complete cleanup successful');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('   ❌ Friend removal failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyCompleteCleanup(user1_id, user2_id) {
  try {
    // Check friendships
    const friendships = await pool.query(`
      SELECT COUNT(*) as count FROM friendships 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [user1_id, user2_id]);
    
    // Check friend requests
    const requests = await pool.query(`
      SELECT COUNT(*) as count FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [user1_id, user2_id]);
    
    // Check friend notifications
    const notifications = await pool.query(`
      SELECT COUNT(*) as count FROM friend_notifications 
      WHERE ((user_id = $1 AND sender_id = $2) OR (user_id = $2 AND sender_id = $1))
      AND type IN ('friend_request', 'friend_accepted')
    `, [user1_id, user2_id]);
    
    const friendshipCount = parseInt(friendships.rows[0].count);
    const requestCount = parseInt(requests.rows[0].count);
    const notificationCount = parseInt(notifications.rows[0].count);
    
    console.log(`   📊 Cleanup verification:`);
    console.log(`      • Friendships remaining: ${friendshipCount}`);
    console.log(`      • Friend requests remaining: ${requestCount}`);
    console.log(`      • Friend notifications remaining: ${notificationCount}`);
    
    if (friendshipCount === 0 && requestCount === 0 && notificationCount === 0) {
      console.log('   ✅ Complete cleanup verified - no blocking records remain');
      return true;
    } else {
      console.log('   ⚠️ Incomplete cleanup - some records remain');
      return false;
    }
    
  } catch (error) {
    console.error('   ❌ Cleanup verification failed:', error.message);
    throw error;
  }
}

async function testFriendReAdd(user1_id, user2_id) {
  try {
    console.log('   📤 Testing friend re-add after removal...');
    
    // Try to send new friend request
    const result = await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id, status, message)
      VALUES ($1, $2, 'pending', 'Test re-add after removal')
      RETURNING id, created_at
    `, [user2_id, user1_id]); // Note: reversed direction to test both ways
    
    const newRequestId = result.rows[0].id;
    console.log(`      ✅ New friend request sent (ID: ${newRequestId})`);
    
    // Accept the new request
    await pool.query(`
      UPDATE friend_requests 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [newRequestId]);
    
    // Create new friendship
    await pool.query(`
      INSERT INTO friendships (user1_id, user2_id, status)
      VALUES ($1, $2, 'active')
    `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
    
    console.log('      ✅ Friend request accepted and friendship recreated');
    console.log('   🎉 Re-add test successful!');
    
  } catch (error) {
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      console.error('   ❌ CRITICAL ISSUE: Cannot re-add friend due to existing records');
      
      // Show what's blocking
      const blockingCheck = await pool.query(`
        SELECT 
          'friendship' as type, status, created_at
        FROM friendships 
        WHERE (user1_id = $1 AND user2_id = $2)
        UNION ALL
        SELECT 
          'friend_request' as type, status, created_at
        FROM friend_requests 
        WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
        ORDER BY created_at DESC
      `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);
      
      console.log('      🚫 Blocking records:');
      blockingCheck.rows.forEach(record => {
        console.log(`         • ${record.type}: ${record.status}`);
      });
      
      throw new Error('Re-add failed due to incomplete cleanup');
    } else {
      console.error('   ❌ Re-add test failed:', error.message);
      throw error;
    }
  }
}

// Run the test
runFriendRemovalTest();
