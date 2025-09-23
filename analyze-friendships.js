const { Pool } = require('pg');
require('dotenv').config();

// Database configuration from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function analyzeFriendRelationships() {
  console.log('🔍 Analyzing Mivton Database Friend Relationships...\n');
  
  try {
    // Get all users first
    console.log('👥 USERS IN DATABASE:');
    console.log('='.repeat(50));
    
    const usersQuery = `
      SELECT id, username, full_name, email, status, is_verified, created_at
      FROM users 
      ORDER BY id;
    `;
    
    const users = await pool.query(usersQuery);
    
    if (users.rows.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    users.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (@${user.username})`);
      console.log(`   📧 ${user.email}`);
      console.log(`   🟢 Status: ${user.status}${user.is_verified ? ' ✅ Verified' : ''}`);
      console.log(`   📅 Joined: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log('');
    });
    
    // Check if friendships table exists and analyze relationships
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'friendships'
      );
    `;
    
    const tableExists = await pool.query(tableCheckQuery);
    
    if (tableExists.rows[0].exists) {
      console.log('\n🤝 FRIENDSHIP RELATIONSHIPS:');
      console.log('='.repeat(50));
      
      const friendshipsQuery = `
        SELECT 
          f.id,
          f.user1_id,
          f.user2_id,
          f.status,
          f.created_at,
          u1.username as user1_username,
          u1.full_name as user1_name,
          u2.username as user2_username,
          u2.full_name as user2_name
        FROM friendships f
        JOIN users u1 ON f.user1_id = u1.id
        JOIN users u2 ON f.user2_id = u2.id
        ORDER BY f.created_at;
      `;
      
      const friendships = await pool.query(friendshipsQuery);
      
      if (friendships.rows.length === 0) {
        console.log('❌ No friendships found in database');
      } else {
        friendships.rows.forEach((friendship, index) => {
          console.log(`${index + 1}. ${friendship.user1_name} (@${friendship.user1_username})`);
          console.log(`   🤝 is friends with`);
          console.log(`   ${friendship.user2_name} (@${friendship.user2_username})`);
          console.log(`   📊 Status: ${friendship.status}`);
          console.log(`   📅 Friends since: ${new Date(friendship.created_at).toLocaleDateString()}`);
          console.log('');
        });
      }
      
      // Get friendship summary by user
      const summaryQuery = `
        SELECT 
          u.id,
          u.username,
          u.full_name,
          COUNT(f.id) as friend_count
        FROM users u
        LEFT JOIN friendships f ON (u.id = f.user1_id OR u.id = f.user2_id)
        WHERE f.status = 'active' OR f.status IS NULL
        GROUP BY u.id, u.username, u.full_name
        ORDER BY friend_count DESC, u.full_name;
      `;
      
      const summary = await pool.query(summaryQuery);
      
      console.log('\n📊 FRIENDSHIP SUMMARY:');
      console.log('='.repeat(50));
      summary.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name} (@${user.username}) - ${user.friend_count} friend(s)`);
      });
      
      // Get detailed friendship network
      console.log('\n🕸️  FRIENDSHIP NETWORK:');
      console.log('='.repeat(50));
      
      const networkQuery = `
        SELECT 
          u.id as user_id,
          u.full_name as user_name,
          u.username,
          ARRAY_AGG(
            CASE 
              WHEN f.user1_id = u.id THEN u2.full_name 
              ELSE u1.full_name 
            END
          ) as friend_names
        FROM users u
        LEFT JOIN friendships f ON (u.id = f.user1_id OR u.id = f.user2_id)
        LEFT JOIN users u1 ON f.user1_id = u1.id AND u1.id != u.id
        LEFT JOIN users u2 ON f.user2_id = u2.id AND u2.id != u.id
        WHERE f.status = 'active' OR f.status IS NULL
        GROUP BY u.id, u.full_name, u.username
        ORDER BY u.full_name;
      `;
      
      const network = await pool.query(networkQuery);
      
      network.rows.forEach((user, index) => {
        const friends = user.friend_names.filter(name => name !== null);
        if (friends.length > 0) {
          console.log(`${user.user_name} (@${user.username}) is friends with:`);
          friends.forEach(friend => {
            console.log(`  • ${friend}`);
          });
          console.log('');
        } else {
          console.log(`${user.user_name} (@${user.username}) has no friends yet`);
          console.log('');
        }
      });
      
    } else {
      console.log('\n❌ Friendships table not found');
    }
    
    // Check for friend requests
    const friendRequestsCheck = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'friend_requests'
      );
    `;
    
    const friendRequestsExists = await pool.query(friendRequestsCheck);
    
    if (friendRequestsExists.rows[0].exists) {
      console.log('\n📨 FRIEND REQUESTS:');
      console.log('='.repeat(50));
      
      const requestsQuery = `
        SELECT 
          fr.id,
          fr.sender_id,
          fr.receiver_id,
          fr.status,
          fr.created_at,
          fr.message,
          us.username as sender_username,
          us.full_name as sender_name,
          ur.username as receiver_username,
          ur.full_name as receiver_name
        FROM friend_requests fr
        JOIN users us ON fr.sender_id = us.id
        JOIN users ur ON fr.receiver_id = ur.id
        ORDER BY fr.created_at DESC;
      `;
      
      const requests = await pool.query(requestsQuery);
      
      if (requests.rows.length === 0) {
        console.log('❌ No friend requests found');
      } else {
        requests.rows.forEach((request, index) => {
          console.log(`${index + 1}. ${request.sender_name} (@${request.sender_username})`);
          console.log(`   ➡️  sent request to`);
          console.log(`   ${request.receiver_name} (@${request.receiver_username})`);
          console.log(`   📊 Status: ${request.status.toUpperCase()}`);
          if (request.message) {
            console.log(`   💬 Message: "${request.message}"`);
          }
          console.log(`   📅 Sent: ${new Date(request.created_at).toLocaleDateString()}`);
          console.log('');
        });
        
        // Summary of requests by status
        const requestSummaryQuery = `
          SELECT status, COUNT(*) as count
          FROM friend_requests
          GROUP BY status
          ORDER BY count DESC;
        `;
        
        const requestSummary = await pool.query(requestSummaryQuery);
        
        console.log('\n📊 FRIEND REQUESTS BY STATUS:');
        console.log('-'.repeat(30));
        requestSummary.rows.forEach(status => {
          console.log(`${status.status.toUpperCase()}: ${status.count}`);
        });
        console.log('');
      }
    }
    
    // Check for blocked users
    const blockedUsersCheck = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blocked_users'
      );
    `;
    
    const blockedExists = await pool.query(blockedUsersCheck);
    
    if (blockedExists.rows[0].exists) {
      const blockedQuery = `
        SELECT 
          bu.id,
          bu.blocker_id,
          bu.blocked_id,
          bu.reason,
          bu.created_at,
          ub.username as blocker_username,
          ub.full_name as blocker_name,
          ubl.username as blocked_username,
          ubl.full_name as blocked_name
        FROM blocked_users bu
        JOIN users ub ON bu.blocker_id = ub.id
        JOIN users ubl ON bu.blocked_id = ubl.id
        ORDER BY bu.created_at DESC;
      `;
      
      const blocked = await pool.query(blockedQuery);
      
      if (blocked.rows.length > 0) {
        console.log('\n🚫 BLOCKED RELATIONSHIPS:');
        console.log('='.repeat(50));
        
        blocked.rows.forEach((block, index) => {
          console.log(`${index + 1}. ${block.blocker_name} (@${block.blocker_username})`);
          console.log(`   🚫 blocked`);
          console.log(`   ${block.blocked_name} (@${block.blocked_username})`);
          if (block.reason) {
            console.log(`   📝 Reason: ${block.reason}`);
          }
          console.log(`   📅 Blocked: ${new Date(block.created_at).toLocaleDateString()}`);
          console.log('');
        });
      }
    }
    
    // Check all available social tables
    const socialTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%friend%' OR table_name LIKE '%social%' OR table_name = 'users')
      ORDER BY table_name;
    `;
    
    const socialTables = await pool.query(socialTablesQuery);
    
    console.log('\n📋 AVAILABLE SOCIAL TABLES:');
    console.log('='.repeat(50));
    socialTables.rows.forEach(table => {
      console.log(`• ${table.table_name}`);
    });
    
    console.log('\n✅ Analysis Complete!');
    console.log('='.repeat(50));
    console.log('💡 Summary:');
    console.log(`   👥 Total Users: ${users.rows.length}`);
    
    if (tableExists.rows[0].exists) {
      const friendshipCount = await pool.query('SELECT COUNT(*) FROM friendships WHERE status = \'active\'');
      console.log(`   🤝 Active Friendships: ${friendshipCount.rows[0].count}`);
    }
    
    if (friendRequestsExists.rows[0].exists) {
      const pendingRequests = await pool.query('SELECT COUNT(*) FROM friend_requests WHERE status = \'pending\'');
      console.log(`   📨 Pending Friend Requests: ${pendingRequests.rows[0].count}`);
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the analysis
if (require.main === module) {
  analyzeFriendRelationships().catch(console.error);
}

module.exports = { analyzeFriendRelationships };
