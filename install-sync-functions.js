#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function installSyncFunctions() {
  console.log('🔧 Installing Friendship Synchronization Functions...\n');
  
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'database', 'friendship-sync-functions.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL file not found:', sqlFile);
      console.log('Expected location: database/friendship-sync-functions.sql');
      return;
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📖 Reading SQL file...');
    console.log('💾 Installing functions in database...');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Functions installed successfully!');
    
    // Test the functions
    console.log('\n🧪 Testing installed functions...');
    
    const functions = await pool.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name LIKE '%friendship%'
      ORDER BY routine_name
    `);
    
    console.log('📋 Installed functions:');
    functions.rows.forEach((func, i) => {
      console.log(`   ${i+1}. ${func.routine_name} (${func.routine_type})`);
    });
    
    // Run consistency check
    console.log('\n🔍 Running consistency check...');
    const consistencyCheck = await pool.query('SELECT * FROM check_friendship_consistency()');
    
    if (consistencyCheck.rows.length === 0) {
      console.log('✅ No consistency issues found!');
    } else {
      console.log('⚠️  Consistency issues detected:');
      consistencyCheck.rows.forEach((issue, i) => {
        console.log(`   ${i+1}. ${issue.issue_type}: ${issue.description} (${issue.count} issues)`);
      });
    }
    
    console.log('\n🎉 Installation complete!');
    console.log('💡 You can now use these functions in your application:');
    console.log('   • accept_friend_request_properly(request_id)');
    console.log('   • remove_friendship_completely(user1_id, user2_id)');
    console.log('   • create_friendship_completely(user1_id, user2_id)');
    console.log('   • check_friendship_consistency()');
    
  } catch (error) {
    console.error('❌ Error installing functions:', error.message);
    console.error('Details:', error.detail || error.hint || '');
  } finally {
    await pool.end();
  }
}

installSyncFunctions();
