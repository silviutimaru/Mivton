#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function quickFriendsCheck() {
  console.log('🚀 Mivton Quick Friends Check\n');
  
  try {
    // Get basic user count
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`👥 Total Users: ${userCount.rows[0].count}`);
    
    // Check if friendship tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('friendships', 'friend_requests', 'blocked_users')
    `);
    
    const existingTables = tables.rows.map(row => row.table_name);
    console.log(`📋 Friend Tables: ${existingTables.join(', ') || 'None found'}`);
    
    if (existingTables.includes('friendships')) {
      const friendships = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active
        FROM friendships
      `);
      console.log(`🤝 Friendships: ${friendships.rows[0].active} active / ${friendships.rows[0].total} total`);
      
      // Show who is friends with whom
      const friendPairs = await pool.query(`
        SELECT 
          u1.full_name as user1,
          u2.full_name as user2,
          f.status,
          f.created_at
        FROM friendships f
        JOIN users u1 ON f.user1_id = u1.id
        JOIN users u2 ON f.user2_id = u2.id
        ORDER BY f.created_at
      `);
      
      console.log('\n🔗 Friend Connections:');
      if (friendPairs.rows.length === 0) {
        console.log('   No friendships found');
      } else {
        friendPairs.rows.forEach((pair, i) => {
          console.log(`   ${i+1}. ${pair.user1} ↔️ ${pair.user2} (${pair.status})`);
        });
      }
    }
    
    if (existingTables.includes('friend_requests')) {
      const requests = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted
        FROM friend_requests
      `);
      console.log(`📨 Friend Requests: ${requests.rows[0].pending} pending / ${requests.rows[0].total} total`);
    }
    
    if (existingTables.includes('blocked_users')) {
      const blocked = await pool.query('SELECT COUNT(*) FROM blocked_users');
      console.log(`🚫 Blocked Users: ${blocked.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

quickFriendsCheck();
