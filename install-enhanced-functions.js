#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function installEnhancedFunctions() {
  console.log('🚀 Installing Enhanced Friend Removal Functions...\n');
  
  try {
    const sqlFile = path.join(__dirname, 'database', 'enhanced-removal-functions.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📖 Installing enhanced functions...');
    await pool.query(sql);
    console.log('✅ Enhanced functions installed!');
    
    // Test the new functions
    const functions = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND (routine_name LIKE '%friendship%' OR routine_name LIKE '%friend_request%')
      ORDER BY routine_name
    `);
    
    console.log('\n📋 Available friend functions:');
    functions.rows.forEach((func, i) => {
      console.log(`   ${i+1}. ${func.routine_name}`);
    });
    
    console.log('\n💡 New functions available:');
    console.log('   • remove_friendship_and_history_completely() - Total cleanup');
    console.log('   • send_friend_request_safely() - Safe request sending');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

installEnhancedFunctions();
