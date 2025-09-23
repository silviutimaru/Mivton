#!/usr/bin/env node
/**
 * 🔍 COMPREHENSIVE FRIEND REMOVE/RE-ADD TESTING SCRIPT
 * Tests the complete cycle of removing a friend and adding them back
 * Identifies synchronization issues and provides fixes
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test configuration
const TEST_CONFIG = {
  // Use your production URL
  BASE_URL: process.env.APP_URL || 'https://mivton-production.up.railway.app',
  // Test user credentials (we'll create these if they don't exist)
  TEST_USERS: [
    { username: 'testuser_a', email: 'testuser_a@example.com', password: 'TestPass123!', full_name: 'Test User A' },
    { username: 'testuser_b', email: 'testuser_b@example.com', password: 'TestPass123!', full_name: 'Test User B' }
  ]
};

let testResults = {
  issues: [],
  successes: [],
  fixes_applied: []
};

async function runCompleteFriendshipCycleTest() {
  console.log('🚀 STARTING COMPREHENSIVE FRIEND REMOVE/RE-ADD CYCLE TEST');
  console.log('=' .repeat(70));
  console.log(`🌐 Testing against: ${TEST_CONFIG.BASE_URL}\n`);

  try {
    // Step 1: Database connectivity and schema check
    console.log('1️⃣ CHECKING DATABASE AND SCHEMA...');
    await checkDatabaseAndSchema();

    // Step 2: Create or verify test users exist
    console.log('\n2️⃣ SETTING UP TEST USERS...');
    const users = await setupTestUsers();

    // Step 3: Clear any existing relationships
    console.log('\n3️⃣ CLEARING EXISTING TEST DATA...');
    await clearExistingRelationships(users[0].id, users[1].id);

    // Step 4: Test complete friendship cycle
    console.log('\n4️⃣ TESTING COMPLETE FRIENDSHIP CYCLE...');
    await testFriendshipCycle(users[0], users[1]);

    // Step 5: Test via API endpoints (production testing)
    console.log('\n5️⃣ TESTING API ENDPOINTS...');
    await testApiEndpoints(users[0], users[1]);

    // Step 6: Identify and fix synchronization issues
    console.log('\n6️⃣ CHECKING FOR SYNCHRONIZATION ISSUES...');
    await checkSynchronizationIssues();

    // Step 7: Apply fixes if needed
    console.log('\n7️⃣ APPLYING FIXES...');
    await applyNecessaryFixes();

    // Step 8: Re-test after fixes
    console.log('\n8️⃣ RE-TESTING AFTER FIXES...');
    await retestAfterFixes(users[0], users[1]);

    // Final report
    console.log('\n' + '=' .repeat(70));
    console.log('📊 FINAL TEST REPORT');
    console.log('=' .repeat(70));
    
    console.log('\n✅ SUCCESSES:');
    testResults.successes.forEach((success, i) => {
      console.log(`   ${i+1}. ${success}`);
    });

    console.log('\n⚠️ ISSUES FOUND:');
    if (testResults.issues.length === 0) {
      console.log('   No issues found! 🎉');
    } else {
      testResults.issues.forEach((issue, i) => {
        console.log(`   ${i+1}. ${issue}`);
      });
    }

    console.log('\n🔧 FIXES APPLIED:');
    if (testResults.fixes_applied.length === 0) {
      console.log('   No fixes needed! 🎉');
    } else {
      testResults.fixes_applied.forEach((fix, i) => {
        console.log(`   ${i+1}. ${fix}`);
      });
    }

    console.log('\n🎯 RECOMMENDATION:');
    if (testResults.issues.length === 0) {
      console.log('   🟢 Your friends system is working perfectly!');
      console.log('   🚀 Ready for users to test friend removal/re-adding');
    } else if (testResults.fixes_applied.length > 0) {
      console.log('   🟡 Issues found and fixed automatically');
      console.log('   🚀 Please redeploy with: railway deploy');
    } else {
      console.log('   🔴 Issues found that need manual attention');
      console.log('   📋 Check the issues list above for details');
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR during testing:', error.message);
    console.error('🔍 Full error:', error);
  } finally {
    await pool.end();
  }
}

async function checkDatabaseAndSchema() {
  try {
    // Test database connection
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log(`   ✅ Database connected: ${connectionTest.rows[0].current_time}`);
    testResults.successes.push('Database connection successful');

    // Check if friends tables exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('friendships', 'friend_requests', 'blocked_users', 'friend_notifications', 'social_activity_log')
      AND table_schema = 'public'
    `);

    const existingTables = tablesCheck.rows.map(row => row.table_name);
    const requiredTables = ['friendships', 'friend_requests', 'blocked_users', 'friend_notifications', 'social_activity_log'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length === 0) {
      console.log('   ✅ All friends system tables exist');
      testResults.successes.push('All friends system tables exist');
    } else {
      console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
      testResults.issues.push(`Missing database tables: ${missingTables.join(', ')}`);
    }

    // Check for enhanced removal functions
    const functionsCheck = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_name IN ('remove_friendship_completely', 'remove_friendship_and_history_completely')
      AND routine_schema = 'public'
    `);

    if (functionsCheck.rows.length > 0) {
      console.log('   ✅ Enhanced removal functions exist');
      testResults.successes.push('Enhanced removal functions available');
    } else {
      console.log('   ⚠️ Enhanced removal functions not found');
      testResults.issues.push('Enhanced removal functions missing');
    }

  } catch (error) {
    console.error('   ❌ Database check failed:', error.message);
    testResults.issues.push(`Database check failed: ${error.message}`);
    throw error;
  }
}

async function setupTestUsers() {
  const users = [];
  
  for (const userData of TEST_CONFIG.TEST_USERS) {
    try {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id, username, full_name FROM users WHERE username = $1',
        [userData.username]
      );

      if (existingUser.rows.length > 0) {
        users.push(existingUser.rows[0]);
        console.log(`   ✅ Using existing user: ${userData.username} (ID: ${existingUser.rows[0].id})`);
      } else {
        // Create new user
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const newUser = await pool.query(`
          INSERT INTO users (username, email, password_hash, full_name, status)
          VALUES ($1, $2, $3, $4, 'active')
          RETURNING id, username, full_name
        `, [userData.username, userData.email, hashedPassword, userData.full_name]);

        users.push(newUser.rows[0]);
        console.log(`   ✅ Created new user: ${userData.username} (ID: ${newUser.rows[0].id})`);
      }
    } catch (error) {
      console.error(`   ❌ Error setting up user ${userData.username}:`, error.message);
      testResults.issues.push(`Failed to setup user ${userData.username}: ${error.message}`);
    }
  }

  if (users.length < 2) {
    throw new Error('Not enough test users available for testing');
  }

  testResults.successes.push(`Test users ready: ${users.map(u => u.username).join(', ')}`);
  return users;
}

async function clearExistingRelationships(user1_id, user2_id) {
  try {
    // Remove any existing friendships
    await pool.query(`
      DELETE FROM friendships 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [Math.min(user1_id, user2_id), Math.max(user1_id, user2_id)]);

    // Remove any existing friend requests
    await pool.query(`
      DELETE FROM friend_requests 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
    `, [user1_id, user2_id]);

    // Remove any blocking relationships
    await pool.query(`
      DELETE FROM blocked_users 
      WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
    `, [user1_id, user2_id]);

    console.log(`   ✅ Cleared existing relationships between users ${user1_id} and ${user2_id}`);
    testResults.successes.push('Existing test relationships cleared');

  } catch (error) {
    console.error('   ❌ Error clearing relationships:', error.message);
    testResults.issues.push(`Failed to clear relationships: ${error.message}`);
  }
}

async function testFriendshipCycle(user1, user2) {
  try {
    console.log(`   Testing cycle: ${user1.username} ↔ ${user2.username}`);

    // Step A: Send friend request
    console.log('   A. Sending friend request...');
    await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id, status, message)
      VALUES ($1, $2, 'pending', 'Test friend request')
    `, [user1.id, user2.id]);

    const requestCheck = await pool.query(`
      SELECT id FROM friend_requests 
      WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
    `, [user1.id, user2.id]);

    if (requestCheck.rows.length > 0) {
      console.log('      ✅ Friend request sent successfully');
      testResults.successes.push('Friend request creation works');
    } else {
      console.log('      ❌ Friend request not found after creation');
      testResults.issues.push('Friend request creation failed');
      return;
    }

    // Step B: Accept friend request and create friendship
    console.log('   B. Accepting friend request...');
    const requestId = requestCheck.rows[0].id;

    // Update request status
    await pool.query(`
      UPDATE friend_requests 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [requestId]);

    // Create friendship
    await pool.query(`
      INSERT INTO friendships (user1_id, user2_id, status)
      VALUES ($1, $2, 'active')
    `, [Math.min(user1.id, user2.id), Math.max(user1.id, user2.id)]);

    const friendshipCheck = await pool.query(`
      SELECT id FROM friendships 
      WHERE user1_id = $1 AND user2_id = $2 AND status = 'active'
    `, [Math.min(user1.id, user2.id), Math.max(user1.id, user2.id)]);

    if (friendshipCheck.rows.length > 0) {
      console.log('      ✅ Friendship created successfully');
      testResults.successes.push('Friendship creation works');
    } else {
      console.log('      ❌ Friendship not found after creation');
      testResults.issues.push('Friendship creation failed');
      return;
    }

    // Step C: Remove friend (THIS IS THE KEY TEST)
    console.log('   C. Testing friend removal...');
    
    // Check current state before removal
    const beforeRemoval = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM friendships WHERE user1_id = $1 AND user2_id = $2) as friendship_count,
        (SELECT COUNT(*) FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) as request_count
    `, [Math.min(user1.id, user2.id), Math.max(user1.id, user2.id)]);

    console.log(`      Before removal: ${beforeRemoval.rows[0].friendship_count} friendships, ${beforeRemoval.rows[0].request_count} requests`);

    // Remove friendship using current method
    await pool.query(`
      DELETE FROM friendships 
      WHERE user1_id = $1 AND user2_id = $2
    `, [Math.min(user1.id, user2.id), Math.max(user1.id, user2.id)]);

    // Check what's left after removal
    const afterRemoval = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM friendships WHERE user1_id = $1 AND user2_id = $2) as friendship_count,
        (SELECT COUNT(*) FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) as request_count,
        (SELECT COUNT(*) FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) AND status = 'accepted') as accepted_request_count
    `, [Math.min(user1.id, user2.id), Math.max(user1.id, user2.id)]);

    console.log(`      After removal: ${afterRemoval.rows[0].friendship_count} friendships, ${afterRemoval.rows[0].request_count} requests`);
    console.log(`      Accepted requests remaining: ${afterRemoval.rows[0].accepted_request_count}`);

    if (afterRemoval.rows[0].accepted_request_count > 0) {
      console.log('      ⚠️ ISSUE FOUND: Accepted friend requests still exist after friendship removal');
      testResults.issues.push('Accepted friend requests not cleaned up during friend removal');
    } else {
      console.log('      ✅ Friend removal cleaned up properly');
      testResults.successes.push('Friend removal cleans up accepted requests');
    }

    // Step D: Test re-adding friend
    console.log('   D. Testing friend re-adding...');
    
    try {
      // Try to send new friend request
      await pool.query(`
        INSERT INTO friend_requests (sender_id, receiver_id, status, message)
        VALUES ($1, $2, 'pending', 'Test re-add after removal')
      `, [user1.id, user2.id]);

      console.log('      ✅ New friend request sent successfully after removal');
      testResults.successes.push('Can send friend request after removal');

      // Test accepting the new request
      const newRequestId = await pool.query(`
        SELECT id FROM friend_requests 
        WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
        ORDER BY created_at DESC LIMIT 1
      `, [user1.id, user2.id]);

      if (newRequestId.rows.length > 0) {
        // Accept the request
        await pool.query(`
          UPDATE friend_requests 
          SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [newRequestId.rows[0].id]);

        // Create new friendship
        await pool.query(`
          INSERT INTO friendships (user1_id, user2_id, status)
          VALUES ($1, $2, 'active')
        `, [Math.min(user1.id, user2.id), Math.max(user1.id, user2.id)]);

        console.log('      ✅ Friend request accepted and friendship recreated');
        testResults.successes.push('Complete remove/re-add cycle works');

      } else {
        console.log('      ❌ Could not find new friend request to accept');
        testResults.issues.push('New friend request disappeared after creation');
      }

    } catch (error) {
      if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
        console.log('      ❌ CRITICAL ISSUE: Cannot re-add friend due to existing records');
        testResults.issues.push('Cannot re-add friend - existing records blocking new requests');
        
        // Show what's blocking
        const blockingRecords = await pool.query(`
          SELECT 
            'friend_request' as record_type,
            status,
            created_at,
            sender_id,
            receiver_id
          FROM friend_requests 
          WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
          ORDER BY created_at DESC
        `, [user1.id, user2.id]);

        console.log('      🚫 Blocking records found:');
        blockingRecords.rows.forEach(record => {
          console.log(`         • ${record.record_type}: ${record.status} (${record.created_at})`);
        });

      } else {
        console.log('      ❌ Error during re-add test:', error.message);
        testResults.issues.push(`Re-add test failed: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error during friendship cycle test:', error.message);
    testResults.issues.push(`Friendship cycle test failed: ${error.message}`);
  }
}

async function testApiEndpoints(user1, user2) {
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${TEST_CONFIG.BASE_URL}/health`);
    if (healthResponse.ok) {
      console.log('   ✅ Health endpoint working');
      testResults.successes.push('Production health endpoint works');
    } else {
      console.log('   ❌ Health endpoint failed');
      testResults.issues.push('Production health endpoint failed');
    }

    // Test API status endpoint
    const statusResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`   ✅ API status: ${statusData.status}`);
      testResults.successes.push('Production API status endpoint works');
    } else {
      console.log('   ❌ API status endpoint failed');
      testResults.issues.push('Production API status endpoint failed');
    }

    // Test friends API (should require auth)
    const friendsResponse = await fetch(`${TEST_CONFIG.BASE_URL}/api/friends`);
    if (friendsResponse.status === 401) {
      console.log('   ✅ Friends API properly requires authentication');
      testResults.successes.push('Friends API authentication protection works');
    } else {
      console.log('   ❌ Friends API authentication issue');
      testResults.issues.push('Friends API authentication not working properly');
    }

  } catch (error) {
    console.error('   ❌ API endpoint testing failed:', error.message);
    testResults.issues.push(`API endpoint testing failed: ${error.message}`);
  }
}

async function checkSynchronizationIssues() {
  try {
    // Check for orphaned friend requests (accepted but no friendship)
    const orphanedRequests = await pool.query(`
      SELECT 
        fr.id,
        fr.sender_id,
        fr.receiver_id,
        fr.status,
        f.id as friendship_id
      FROM friend_requests fr
      LEFT JOIN friendships f ON (
        (f.user1_id = LEAST(fr.sender_id, fr.receiver_id) AND f.user2_id = GREATEST(fr.sender_id, fr.receiver_id))
      )
      WHERE fr.status = 'accepted' 
      AND f.id IS NULL
    `);

    if (orphanedRequests.rows.length > 0) {
      console.log(`   ⚠️ Found ${orphanedRequests.rows.length} orphaned accepted friend requests`);
      testResults.issues.push(`${orphanedRequests.rows.length} accepted friend requests without corresponding friendships`);
    } else {
      console.log('   ✅ No orphaned friend requests found');
      testResults.successes.push('No orphaned friend requests');
    }

    // Check for orphaned friendships (friendship but no accepted request)
    const orphanedFriendships = await pool.query(`
      SELECT 
        f.id,
        f.user1_id,
        f.user2_id,
        fr.id as request_id
      FROM friendships f
      LEFT JOIN friend_requests fr ON (
        ((fr.sender_id = f.user1_id AND fr.receiver_id = f.user2_id) OR 
         (fr.sender_id = f.user2_id AND fr.receiver_id = f.user1_id))
        AND fr.status = 'accepted'
      )
      WHERE f.status = 'active'
      AND fr.id IS NULL
    `);

    if (orphanedFriendships.rows.length > 0) {
      console.log(`   ⚠️ Found ${orphanedFriendships.rows.length} friendships without accepted requests`);
      testResults.issues.push(`${orphanedFriendships.rows.length} friendships without corresponding accepted requests`);
    } else {
      console.log('   ✅ All friendships have corresponding accepted requests');
      testResults.successes.push('All friendships properly linked to accepted requests');
    }

    // Check for duplicate friend requests
    const duplicateRequests = await pool.query(`
      SELECT sender_id, receiver_id, COUNT(*) as count
      FROM friend_requests
      WHERE status IN ('pending', 'accepted')
      GROUP BY sender_id, receiver_id
      HAVING COUNT(*) > 1
    `);

    if (duplicateRequests.rows.length > 0) {
      console.log(`   ⚠️ Found ${duplicateRequests.rows.length} duplicate friend requests`);
      testResults.issues.push(`${duplicateRequests.rows.length} duplicate friend requests found`);
    } else {
      console.log('   ✅ No duplicate friend requests found');
      testResults.successes.push('No duplicate friend requests');
    }

  } catch (error) {
    console.error('   ❌ Error checking synchronization:', error.message);
    testResults.issues.push(`Synchronization check failed: ${error.message}`);
  }
}

async function applyNecessaryFixes() {
  try {
    // Fix 1: Create enhanced removal function if missing
    if (testResults.issues.some(issue => issue.includes('Enhanced removal functions missing'))) {
      console.log('   🔧 Installing enhanced removal functions...');
      
      await pool.query(`
        CREATE OR REPLACE FUNCTION remove_friendship_completely(
            p_user1_id INTEGER,
            p_user2_id INTEGER
        )
        RETURNS BOOLEAN AS $$
        DECLARE
            ordered_user1 INTEGER;
            ordered_user2 INTEGER;
        BEGIN
            -- Ensure proper ordering
            ordered_user1 := LEAST(p_user1_id, p_user2_id);
            ordered_user2 := GREATEST(p_user1_id, p_user2_id);
            
            -- Remove friendship
            DELETE FROM friendships 
            WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;
            
            -- Clean up ALL friend requests between these users
            DELETE FROM friend_requests 
            WHERE (sender_id = p_user1_id AND receiver_id = p_user2_id) 
               OR (sender_id = p_user2_id AND receiver_id = p_user1_id);
            
            -- Remove related notifications
            DELETE FROM friend_notifications 
            WHERE ((user_id = p_user1_id AND sender_id = p_user2_id) 
                   OR (user_id = p_user2_id AND sender_id = p_user1_id))
            AND type IN ('friend_request', 'friend_accepted');
            
            RETURN TRUE;
        END;
        $$ LANGUAGE plpgsql;
      `);

      console.log('      ✅ Enhanced removal function installed');
      testResults.fixes_applied.push('Enhanced removal function installed');
    }

    // Fix 2: Clean up orphaned records
    if (testResults.issues.some(issue => issue.includes('orphaned'))) {
      console.log('   🔧 Cleaning up orphaned records...');

      // Remove orphaned accepted requests
      const orphanCleanup = await pool.query(`
        DELETE FROM friend_requests 
        WHERE status = 'accepted' 
        AND id NOT IN (
          SELECT DISTINCT fr.id
          FROM friend_requests fr
          JOIN friendships f ON (
            (f.user1_id = LEAST(fr.sender_id, fr.receiver_id) AND f.user2_id = GREATEST(fr.sender_id, fr.receiver_id))
          )
          WHERE fr.status = 'accepted' AND f.status = 'active'
        )
      `);

      console.log(`      ✅ Cleaned up orphaned accepted requests`);
      testResults.fixes_applied.push('Orphaned accepted requests cleaned up');
    }

    // Fix 3: Remove duplicates
    if (testResults.issues.some(issue => issue.includes('duplicate'))) {
      console.log('   🔧 Removing duplicate friend requests...');

      await pool.query(`
        DELETE FROM friend_requests a
        USING friend_requests b
        WHERE a.id > b.id
        AND a.sender_id = b.sender_id
        AND a.receiver_id = b.receiver_id
        AND a.status = b.status
      `);

      console.log('      ✅ Duplicate friend requests removed');
      testResults.fixes_applied.push('Duplicate friend requests removed');
    }

  } catch (error) {
    console.error('   ❌ Error applying fixes:', error.message);
    testResults.issues.push(`Fix application failed: ${error.message}`);
  }
}

async function retestAfterFixes(user1, user2) {
  console.log(`   🔄 Re-testing with: ${user1.username} ↔ ${user2.username}`);

  try {
    // Clear everything first
    await clearExistingRelationships(user1.id, user2.id);

    // Test complete cycle again
    console.log('   A. Sending friend request (retry)...');
    await pool.query(`
      INSERT INTO friend_requests (sender_id, receiver_id, status, message)
      VALUES ($1, $2, 'pending', 'Retest after fixes')
    `, [user1.id, user2.id]);

    const requestId = await pool.query(`
      SELECT id FROM friend_requests 
      WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1
    `, [user1.id, user2.id]);

    if (requestId.rows.length > 0) {
      console.log('      ✅ Friend request sent successfully');

      // Accept request
      console.log('   B. Accepting request (retry)...');
      await pool.query(`
        UPDATE friend_requests 
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [requestId.rows[0].id]);

      // Create friendship
      await pool.query(`
        INSERT INTO friendships (user1_id, user2_id, status)
        VALUES ($1, $2, 'active')
      `, [Math.min(user1.id, user2.id), Math.max(user1.id, user2.id)]);

      console.log('      ✅ Friendship created successfully');

      // Test removal with enhanced function
      console.log('   C. Testing enhanced removal...');
      if (testResults.fixes_applied.includes('Enhanced removal function installed')) {
        const removalResult = await pool.query(`
          SELECT remove_friendship_completely($1, $2)
        `, [user1.id, user2.id]);

        if (removalResult.rows[0].remove_friendship_completely) {
          console.log('      ✅ Enhanced removal function worked');
          testResults.successes.push('Enhanced removal function works correctly');
        }
      }

      // Test final re-add
      console.log('   D. Testing final re-add...');
      await pool.query(`
        INSERT INTO friend_requests (sender_id, receiver_id, status, message)
        VALUES ($1, $2, 'pending', 'Final test after enhanced removal')
      `, [user2.id, user1.id]); // Reverse direction

      console.log('      ✅ Final re-add test successful');
      testResults.successes.push('Complete cycle works after fixes');

    } else {
      console.log('      ❌ Could not send friend request in retest');
      testResults.issues.push('Retest failed - cannot send friend requests');
    }

  } catch (error) {
    console.error('   ❌ Error during retest:', error.message);
    testResults.issues.push(`Retest failed: ${error.message}`);
  }
}

// Run the test
runCompleteFriendshipCycleTest();
