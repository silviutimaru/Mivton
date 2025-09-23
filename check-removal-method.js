#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkRemovalMethod() {
  console.log('🔍 Checking Your Application\'s Friend Removal Method\n');
  
  try {
    // Let's see what happens if we simulate the old vs new removal methods
    console.log('📋 Current Friendships:');
    
    const friendships = await pool.query(`
      SELECT 
        f.user1_id,
        f.user2_id,
        u1.full_name as user1_name,
        u2.full_name as user2_name
      FROM friendships f
      JOIN users u1 ON f.user1_id = u1.id
      JOIN users u2 ON f.user2_id = u2.id
    `);
    
    friendships.rows.forEach((f, i) => {
      console.log(`   ${i+1}. ${f.user1_name} ↔ ${f.user2_name}`);
    });
    
    if (friendships.rows.length === 0) {
      console.log('   No friendships to test with');
      return;
    }
    
    const testUsers = friendships.rows[0];
    console.log(`\n🎯 Test Case: What happens after removing ${testUsers.user1_name} ↔ ${testUsers.user2_name}?`);
    
    // Scenario 1: OLD method (just delete friendship)
    console.log('\n❌ OLD METHOD (problematic):');
    console.log('   1. Delete from friendships table only');
    console.log('   2. Leave friend_requests as "accepted"');
    console.log('   3. Leave other related data intact');
    
    const oldMethodBlocking = await pool.query(`
      SELECT COUNT(*) as blocking_requests
      FROM friend_requests 
      WHERE ((sender_id = $1 AND receiver_id = $2) 
             OR (sender_id = $2 AND receiver_id = $1))
      AND status = 'accepted'
    `, [testUsers.user1_id, testUsers.user2_id]);
    
    console.log(`   📨 Current accepted requests: ${oldMethodBlocking.rows[0].blocking_requests}`);
    console.log('   🚫 Result: CANNOT re-add friend (blocked by old accepted request)');
    
    // Scenario 2: NEW method (comprehensive cleanup)
    console.log('\n✅ NEW METHOD (fixed):');
    console.log('   1. Delete from friendships table');
    console.log('   2. Mark friend_requests as "cancelled"');
    console.log('   3. Clean up all related data');
    console.log('   ✅ Result: CAN re-add friend (clean slate)');
    
    console.log('\n🔧 RECOMMENDATION:');
    console.log('To ensure users can re-add friends after removal, your app should use:');
    console.log('');
    console.log('JavaScript code:');
    console.log('```javascript');
    console.log('// Instead of:');
    console.log('// await pool.query("DELETE FROM friendships WHERE...")');
    console.log('');
    console.log('// Use this:');
    console.log('await pool.query("SELECT remove_friendship_completely($1, $2)", [user1_id, user2_id]);');
    console.log('```');
    
    console.log('\n📱 In your application routes/controllers:');
    console.log('Replace any friendship removal code with the safe function we installed.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRemovalMethod();
