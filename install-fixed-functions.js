#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function installFixedSyncFunctions() {
  console.log('🔧 Installing FIXED Friendship Synchronization Functions...\n');
  
  try {
    // Read the fixed SQL file
    const sqlFile = path.join(__dirname, 'database', 'friendship-sync-functions-fixed.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ Fixed SQL file not found:', sqlFile);
      return;
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📖 Reading fixed SQL file...');
    console.log('💾 Installing fixed functions in database...');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Fixed functions installed successfully!');
    
    // Test the functions
    console.log('\n🧪 Testing fixed functions...');
    
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
    
    console.log('\n🎉 Fixed installation complete!');
    console.log('✅ Functions now work with your actual database schema');
    
  } catch (error) {
    console.error('❌ Error installing fixed functions:', error.message);
    console.error('Details:', error.detail || error.hint || '');
  } finally {
    await pool.end();
  }
}

installFixedSyncFunctions();
