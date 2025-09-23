require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugUsers() {
  try {
    console.log('🔍 Debugging user search issue...\n');
    
    // Check all users in database
    console.log('📊 All users in database:');
    const allUsers = await pool.query(`
      SELECT id, username, full_name, email, created_at, is_blocked
      FROM users 
      ORDER BY id
    `);
    
    console.log(`Found ${allUsers.rows.length} users:`);
    allUsers.rows.forEach(user => {
      console.log(`  ID: ${user.id}, Username: "${user.username}", Full Name: "${user.full_name}", Email: "${user.email}", Blocked: ${user.is_blocked}`);
    });
    
    // Test specific search for IrinelT
    console.log('\n🔍 Testing search for "IrinelT":');
    const searchQuery = '%IrinelT%';
    const searchResult = await pool.query(`
      SELECT id, username, full_name, email
      FROM users 
      WHERE (full_name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1)
      AND is_blocked = FALSE
    `, [searchQuery]);
    
    console.log(`Search results: ${searchResult.rows.length} found`);
    searchResult.rows.forEach(user => {
      console.log(`  Found: ID ${user.id}, Username: "${user.username}", Full Name: "${user.full_name}"`);
    });
    
    // Test case variations
    console.log('\n🔍 Testing case variations:');
    const variations = ['IrinelT', 'irinelt', 'Irinel', 'irinel'];
    
    for (const variation of variations) {
      const result = await pool.query(`
        SELECT id, username, full_name
        FROM users 
        WHERE (full_name ILIKE $1 OR username ILIKE $1)
        AND is_blocked = FALSE
      `, [`%${variation}%`]);
      
      console.log(`  "${variation}": ${result.rows.length} results`);
      result.rows.forEach(user => {
        console.log(`    - ${user.username} (${user.full_name})`);
      });
    }
    
    // Check if users are blocked
    console.log('\n🚫 Checking blocked status:');
    const blockedCheck = await pool.query(`
      SELECT username, full_name, is_blocked
      FROM users 
      WHERE username ILIKE '%irinel%' OR full_name ILIKE '%irinel%'
    `);
    
    console.log(`Blocked check results: ${blockedCheck.rows.length} found`);
    blockedCheck.rows.forEach(user => {
      console.log(`  ${user.username} (${user.full_name}) - Blocked: ${user.is_blocked}`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await pool.end();
  }
}

debugUsers();