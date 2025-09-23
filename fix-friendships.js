#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixFriendships() {
  console.log('🔧 Fixing Accepted Friend Requests → Friendships\n');
  
  try {
    // Get all accepted friend requests that don't have corresponding friendships
    const acceptedRequests = await pool.query(`
      SELECT DISTINCT
        fr.sender_id,
        fr.receiver_id,
        fr.created_at,
        us.username as sender_username,
        us.full_name as sender_name,
        ur.username as receiver_username,
        ur.full_name as receiver_name
      FROM friend_requests fr
      JOIN users us ON fr.sender_id = us.id
      JOIN users ur ON fr.receiver_id = ur.id
      WHERE fr.status = 'accepted'
      ORDER BY fr.sender_id, fr.receiver_id
    `);
    
    console.log(`📨 Found ${acceptedRequests.rows.length} accepted friend requests`);
    
    if (acceptedRequests.rows.length === 0) {
      console.log('✅ No accepted requests to process');
      return;
    }
    
    // Process each unique friendship pair
    const friendshipPairs = new Set();
    const friendshipsToCreate = [];
    
    acceptedRequests.rows.forEach(request => {
      const user1 = Math.min(request.sender_id, request.receiver_id);
      const user2 = Math.max(request.sender_id, request.receiver_id);
      const pairKey = `${user1}-${user2}`;
      
      if (!friendshipPairs.has(pairKey)) {
        friendshipPairs.add(pairKey);
        friendshipsToCreate.push({
          user1_id: user1,
          user2_id: user2,
          created_at: request.created_at,
          sender_name: request.sender_name,
          receiver_name: request.receiver_name
        });
      }
    });
    
    console.log(`🤝 Creating ${friendshipsToCreate.length} unique friendships:\n`);
    
    // Create friendships
    let createdCount = 0;
    for (const friendship of friendshipsToCreate) {
      try {
        // Check if friendship already exists
        const existingFriendship = await pool.query(`
          SELECT id FROM friendships 
          WHERE user1_id = $1 AND user2_id = $2
        `, [friendship.user1_id, friendship.user2_id]);
        
        if (existingFriendship.rows.length === 0) {
          // Create the friendship
          await pool.query(`
            INSERT INTO friendships (user1_id, user2_id, status, created_at)
            VALUES ($1, $2, 'active', $3)
          `, [friendship.user1_id, friendship.user2_id, friendship.created_at]);
          
          // Get user names for display
          const users = await pool.query(`
            SELECT u1.full_name as name1, u2.full_name as name2
            FROM users u1, users u2
            WHERE u1.id = $1 AND u2.id = $2
          `, [friendship.user1_id, friendship.user2_id]);
          
          console.log(`✅ Created friendship: ${users.rows[0].name1} ↔ ${users.rows[0].name2}`);
          createdCount++;
        } else {
          console.log(`⚠️  Friendship already exists for users ${friendship.user1_id} ↔ ${friendship.user2_id}`);
        }
      } catch (error) {
        console.error(`❌ Error creating friendship for users ${friendship.user1_id} ↔ ${friendship.user2_id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully created ${createdCount} friendships!`);
    
    // Verify the fix
    console.log('\n🔍 Verification:');
    const totalFriendships = await pool.query('SELECT COUNT(*) FROM friendships WHERE status = \'active\'');
    console.log(`✅ Total active friendships now: ${totalFriendships.rows[0].count}`);
    
    // Show the friendships
    const friendships = await pool.query(`
      SELECT 
        u1.full_name as user1_name,
        u2.full_name as user2_name,
        f.created_at
      FROM friendships f
      JOIN users u1 ON f.user1_id = u1.id
      JOIN users u2 ON f.user2_id = u2.id
      WHERE f.status = 'active'
      ORDER BY f.created_at
    `);
    
    console.log('\n🤝 Current Friendships:');
    friendships.rows.forEach((friendship, index) => {
      console.log(`${index + 1}. ${friendship.user1_name} ↔ ${friendship.user2_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Add a function to show current status
async function showFriendshipStatus() {
  console.log('📊 Current Friendship Status:\n');
  
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM friend_requests WHERE status = 'accepted') as accepted_requests,
        (SELECT COUNT(*) FROM friendships WHERE status = 'active') as active_friendships
    `);
    
    const result = stats.rows[0];
    console.log(`👥 Total Users: ${result.total_users}`);
    console.log(`📨 Accepted Friend Requests: ${result.accepted_requests}`);
    console.log(`🤝 Active Friendships: ${result.active_friendships}`);
    
    if (result.accepted_requests > 0 && result.active_friendships === '0') {
      console.log('\n⚠️  Issue detected: You have accepted friend requests but no friendships!');
      console.log('🔧 Run this script to fix the issue.');
    } else if (result.active_friendships > '0') {
      console.log('\n✅ Friendships are working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run based on command line argument
const command = process.argv[2];

if (command === 'status') {
  showFriendshipStatus().then(() => pool.end());
} else if (command === 'fix') {
  fixFriendships();
} else {
  console.log('🔧 Mivton Friendship Fixer\n');
  console.log('Usage:');
  console.log('  node fix-friendships.js status  - Check current status');
  console.log('  node fix-friendships.js fix     - Fix accepted requests → friendships');
  pool.end();
}
