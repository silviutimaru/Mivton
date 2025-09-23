#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function diagnoseFriendshipSync() {
  console.log('🔍 Mivton Friendship Synchronization Diagnostic\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Check all friendship-related tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%friend%' OR 
             table_name LIKE '%social%' OR 
             table_name LIKE '%conversation%')
      ORDER BY table_name
    `);
    
    console.log('📋 Friendship-related tables found:');
    tables.rows.forEach(table => console.log(`   • ${table.table_name}`));
    
    // 2. Get all users for reference
    const users = await pool.query(`
      SELECT id, username, full_name 
      FROM users 
      ORDER BY id
    `);
    
    console.log(`\n👥 Users: ${users.rows.length} total`);
    users.rows.forEach(user => {
      console.log(`   ${user.id}. ${user.full_name} (@${user.username})`);
    });
    
    // 3. Check main friendships table
    console.log('\n🤝 FRIENDSHIPS TABLE:');
    console.log('-'.repeat(40));
    
    const friendships = await pool.query(`
      SELECT 
        f.*,
        u1.full_name as user1_name,
        u2.full_name as user2_name
      FROM friendships f
      LEFT JOIN users u1 ON f.user1_id = u1.id
      LEFT JOIN users u2 ON f.user2_id = u2.id
      ORDER BY f.created_at
    `);
    
    if (friendships.rows.length === 0) {
      console.log('❌ No friendships found');
    } else {
      friendships.rows.forEach((f, i) => {
        console.log(`${i+1}. ${f.user1_name} ↔ ${f.user2_name} (${f.status})`);
      });
    }
    
    // 4. Check friend requests
    console.log('\n📨 FRIEND REQUESTS TABLE:');
    console.log('-'.repeat(40));
    
    const requests = await pool.query(`
      SELECT 
        fr.*,
        us.full_name as sender_name,
        ur.full_name as receiver_name
      FROM friend_requests fr
      LEFT JOIN users us ON fr.sender_id = us.id
      LEFT JOIN users ur ON fr.receiver_id = ur.id
      ORDER BY fr.created_at DESC
    `);
    
    if (requests.rows.length === 0) {
      console.log('❌ No friend requests found');
    } else {
      console.log(`Total requests: ${requests.rows.length}`);
      
      // Group by status
      const byStatus = {};
      requests.rows.forEach(req => {
        byStatus[req.status] = (byStatus[req.status] || 0) + 1;
      });
      
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status.toUpperCase()}: ${count}`);
      });
      
      console.log('\nRecent requests:');
      requests.rows.slice(0, 5).forEach((req, i) => {
        console.log(`${i+1}. ${req.sender_name} → ${req.receiver_name} (${req.status.toUpperCase()})`);
      });
    }
    
    // 5. Check for orphaned data in other tables
    console.log('\n🔍 CHECKING FOR ORPHANED DATA:');
    console.log('-'.repeat(40));
    
    // Check friend_activity_feed
    const orphanedActivity = await pool.query(`
      SELECT COUNT(*) as count
      FROM friend_activity_feed faf
      WHERE NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = faf.user_id AND f.user2_id = faf.actor_id)
           OR (f.user2_id = faf.user_id AND f.user1_id = faf.actor_id)
      )
      AND faf.activity_type IN ('friend_added', 'friend_accepted')
    `);
    
    if (orphanedActivity.rows[0].count > 0) {
      console.log(`⚠️  ${orphanedActivity.rows[0].count} orphaned friend activity entries`);
    }
    
    // Check friend_notifications
    const orphanedNotifications = await pool.query(`
      SELECT COUNT(*) as count
      FROM friend_notifications fn
      WHERE fn.type IN ('friend_request', 'friend_accepted')
      AND NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = fn.user_id AND f.user2_id = fn.sender_id)
           OR (f.user2_id = fn.user_id AND f.user1_id = fn.sender_id)
      )
      AND fn.type = 'friend_accepted'
    `);
    
    if (orphanedNotifications.rows[0].count > 0) {
      console.log(`⚠️  ${orphanedNotifications.rows[0].count} orphaned friend notifications`);
    }
    
    // Check conversation_previews
    const conversationPreviews = await pool.query(`
      SELECT COUNT(*) as count
      FROM conversation_previews cp
      WHERE NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = cp.user_id AND f.user2_id = cp.friend_id)
           OR (f.user2_id = cp.user_id AND f.user1_id = cp.friend_id)
      )
    `);
    
    if (conversationPreviews.rows[0].count > 0) {
      console.log(`⚠️  ${conversationPreviews.rows[0].count} orphaned conversation previews`);
    }
    
    // 6. Identify the specific sync issue
    console.log('\n🚨 SYNCHRONIZATION ISSUES DETECTED:');
    console.log('-'.repeat(40));
    
    // Find accepted requests without corresponding friendships
    const acceptedWithoutFriendship = await pool.query(`
      SELECT DISTINCT
        fr.sender_id,
        fr.receiver_id,
        us.full_name as sender_name,
        ur.full_name as receiver_name,
        fr.created_at
      FROM friend_requests fr
      JOIN users us ON fr.sender_id = us.id
      JOIN users ur ON fr.receiver_id = ur.id
      WHERE fr.status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = LEAST(fr.sender_id, fr.receiver_id) 
               AND f.user2_id = GREATEST(fr.sender_id, fr.receiver_id))
      )
    `);
    
    if (acceptedWithoutFriendship.rows.length > 0) {
      console.log(`❌ ${acceptedWithoutFriendship.rows.length} accepted requests without friendships:`);
      acceptedWithoutFriendship.rows.forEach((req, i) => {
        console.log(`   ${i+1}. ${req.sender_name} ↔ ${req.receiver_name}`);
      });
    }
    
    // Find friendships without accepted requests (less common but possible)
    const friendshipsWithoutRequests = await pool.query(`
      SELECT 
        f.*,
        u1.full_name as user1_name,
        u2.full_name as user2_name
      FROM friendships f
      JOIN users u1 ON f.user1_id = u1.id
      JOIN users u2 ON f.user2_id = u2.id
      WHERE NOT EXISTS (
        SELECT 1 FROM friend_requests fr 
        WHERE ((fr.sender_id = f.user1_id AND fr.receiver_id = f.user2_id) 
               OR (fr.sender_id = f.user2_id AND fr.receiver_id = f.user1_id))
        AND fr.status = 'accepted'
      )
    `);
    
    if (friendshipsWithoutRequests.rows.length > 0) {
      console.log(`❌ ${friendshipsWithoutRequests.rows.length} friendships without accepted requests:`);
      friendshipsWithoutRequests.rows.forEach((f, i) => {
        console.log(`   ${i+1}. ${f.user1_name} ↔ ${f.user2_name}`);
      });
    }
    
    // 7. Check for duplicate requests
    const duplicateRequests = await pool.query(`
      SELECT 
        sender_id,
        receiver_id,
        COUNT(*) as count,
        us.full_name as sender_name,
        ur.full_name as receiver_name
      FROM friend_requests fr
      JOIN users us ON fr.sender_id = us.id
      JOIN users ur ON fr.receiver_id = ur.id
      GROUP BY sender_id, receiver_id, us.full_name, ur.full_name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (duplicateRequests.rows.length > 0) {
      console.log(`\n⚠️  DUPLICATE REQUESTS FOUND:`);
      duplicateRequests.rows.forEach((dup, i) => {
        console.log(`   ${i+1}. ${dup.sender_name} → ${dup.receiver_name} (${dup.count} requests)`);
      });
    }
    
    console.log('\n✅ Diagnostic complete!');
    return {
      acceptedWithoutFriendship: acceptedWithoutFriendship.rows,
      friendshipsWithoutRequests: friendshipsWithoutRequests.rows,
      duplicateRequests: duplicateRequests.rows
    };
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    throw error;
  }
}

async function fixSynchronizationIssues() {
  console.log('🔧 Fixing Friendship Synchronization Issues\n');
  console.log('=' .repeat(50));
  
  try {
    let fixedCount = 0;
    
    // 1. Create missing friendships from accepted requests
    console.log('1️⃣ Creating missing friendships from accepted requests...');
    
    const acceptedRequests = await pool.query(`
      SELECT DISTINCT
        LEAST(fr.sender_id, fr.receiver_id) as user1_id,
        GREATEST(fr.sender_id, fr.receiver_id) as user2_id,
        MIN(fr.created_at) as created_at
      FROM friend_requests fr
      WHERE fr.status = 'accepted'
      AND NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE f.user1_id = LEAST(fr.sender_id, fr.receiver_id) 
        AND f.user2_id = GREATEST(fr.sender_id, fr.receiver_id)
      )
      GROUP BY LEAST(fr.sender_id, fr.receiver_id), GREATEST(fr.sender_id, fr.receiver_id)
    `);
    
    for (const req of acceptedRequests.rows) {
      await pool.query(`
        INSERT INTO friendships (user1_id, user2_id, status, created_at, updated_at)
        VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP)
      `, [req.user1_id, req.user2_id, req.created_at]);
      
      const users = await pool.query(`
        SELECT u1.full_name as name1, u2.full_name as name2
        FROM users u1, users u2
        WHERE u1.id = $1 AND u2.id = $2
      `, [req.user1_id, req.user2_id]);
      
      console.log(`   ✅ Created: ${users.rows[0].name1} ↔ ${users.rows[0].name2}`);
      fixedCount++;
    }
    
    // 2. Clean up duplicate friend requests (keep the most recent)
    console.log('\n2️⃣ Cleaning up duplicate friend requests...');
    
    const duplicates = await pool.query(`
      SELECT sender_id, receiver_id, COUNT(*) as count
      FROM friend_requests
      GROUP BY sender_id, receiver_id
      HAVING COUNT(*) > 1
    `);
    
    for (const dup of duplicates.rows) {
      // Keep the most recent request, delete others
      await pool.query(`
        DELETE FROM friend_requests 
        WHERE sender_id = $1 AND receiver_id = $2
        AND id NOT IN (
          SELECT id FROM friend_requests 
          WHERE sender_id = $1 AND receiver_id = $2
          ORDER BY created_at DESC 
          LIMIT 1
        )
      `, [dup.sender_id, dup.receiver_id]);
      
      console.log(`   ✅ Cleaned duplicates for users ${dup.sender_id} → ${dup.receiver_id}`);
    }
    
    // 3. Clean up orphaned activity feed entries
    console.log('\n3️⃣ Cleaning up orphaned activity feed entries...');
    
    const orphanedActivities = await pool.query(`
      DELETE FROM friend_activity_feed 
      WHERE activity_type IN ('friend_added', 'friend_accepted')
      AND NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = friend_activity_feed.user_id AND f.user2_id = friend_activity_feed.actor_id)
           OR (f.user2_id = friend_activity_feed.user_id AND f.user1_id = friend_activity_feed.actor_id)
      )
      RETURNING id
    `);
    
    console.log(`   ✅ Removed ${orphanedActivities.rows.length} orphaned activity entries`);
    
    // 4. Clean up orphaned notifications
    console.log('\n4️⃣ Cleaning up orphaned friend notifications...');
    
    const orphanedNotifs = await pool.query(`
      DELETE FROM friend_notifications 
      WHERE type = 'friend_accepted'
      AND NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = friend_notifications.user_id AND f.user2_id = friend_notifications.sender_id)
           OR (f.user2_id = friend_notifications.user_id AND f.user1_id = friend_notifications.sender_id)
      )
      RETURNING id
    `);
    
    console.log(`   ✅ Removed ${orphanedNotifs.rows.length} orphaned notifications`);
    
    // 5. Update conversation previews to match actual friendships
    console.log('\n5️⃣ Cleaning up conversation previews...');
    
    const orphanedConversations = await pool.query(`
      DELETE FROM conversation_previews 
      WHERE NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = conversation_previews.user_id AND f.user2_id = conversation_previews.friend_id)
           OR (f.user2_id = conversation_previews.user_id AND f.user1_id = conversation_previews.friend_id)
      )
      RETURNING id
    `);
    
    console.log(`   ✅ Removed ${orphanedConversations.rows.length} orphaned conversation previews`);
    
    console.log(`\n🎉 Synchronization fix complete!`);
    console.log(`   📊 Created ${fixedCount} missing friendships`);
    console.log(`   🧹 Cleaned up ${duplicates.rows.length} duplicate request sets`);
    console.log(`   🗑️  Removed ${orphanedActivities.rows.length + orphanedNotifs.rows.length + orphanedConversations.rows.length} orphaned records`);
    
    // 6. Final verification
    console.log('\n✅ VERIFICATION:');
    const finalStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM friendships WHERE status = 'active') as active_friendships,
        (SELECT COUNT(*) FROM friend_requests WHERE status = 'accepted') as accepted_requests,
        (SELECT COUNT(*) FROM friend_requests WHERE status = 'pending') as pending_requests
    `);
    
    const stats = finalStats.rows[0];
    console.log(`   🤝 Active Friendships: ${stats.active_friendships}`);
    console.log(`   ✅ Accepted Requests: ${stats.accepted_requests}`);
    console.log(`   ⏳ Pending Requests: ${stats.pending_requests}`);
    
  } catch (error) {
    console.error('❌ Error during fix:', error.message);
    throw error;
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'diagnose') {
  diagnoseFriendshipSync().then(() => pool.end());
} else if (command === 'fix') {
  fixSynchronizationIssues().then(() => pool.end());
} else {
  console.log('🔧 Mivton Friendship Synchronization Tool\n');
  console.log('This tool fixes the issue where friendships got out of sync');
  console.log('when friends were removed but not properly cleaned up.\n');
  console.log('Usage:');
  console.log('  node sync-friendships.js diagnose  - Analyze sync issues');
  console.log('  node sync-friendships.js fix       - Fix all sync issues');
  pool.end();
}
