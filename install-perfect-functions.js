#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function installPerfectFunctions() {
  console.log('🎯 Installing Schema-Matched Functions...\n');
  
  try {
    const sql = fs.readFileSync('./database/schema-matched-functions.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Perfect schema-matched functions installed!');
    
    console.log('\n🔍 Functions now use your exact schema:');
    console.log('   • conversation_previews: updated_at, last_message_at');
    console.log('   • friend_activity_feed: activity_data, is_visible');
    console.log('   • friend_notifications: data, is_read');
    console.log('');
    console.log('🚀 Ready to test complete removal and re-add cycle!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

installPerfectFunctions();
