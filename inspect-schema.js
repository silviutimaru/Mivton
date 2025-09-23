#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspectDatabaseSchema() {
  console.log('🔍 Inspecting Your Database Schema\n');
  
  try {
    // Check conversation_previews table structure
    const conversationColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'conversation_previews'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 conversation_previews table columns:');
    if (conversationColumns.rows.length === 0) {
      console.log('   Table does not exist');
    } else {
      conversationColumns.rows.forEach((col, i) => {
        console.log(`   ${i+1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    }
    
    // Check all friendship-related tables and their columns
    const friendshipTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%friend%' OR table_name LIKE '%conversation%')
      ORDER BY table_name
    `);
    
    console.log('\n📋 All friendship-related tables:');
    for (const table of friendshipTables.rows) {
      console.log(`\n🔹 ${table.table_name}:`);
      
      const columns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      columns.rows.forEach((col, i) => {
        console.log(`      ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Check what functions are causing issues
    console.log('\n🔍 Testing function compatibility...');
    
    // Test the conversation_previews insert
    try {
      const testResult = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'conversation_previews' 
        AND column_name IN ('last_activity_at', 'last_updated')
      `);
      
      console.log('Available time columns in conversation_previews:');
      testResult.rows.forEach(col => {
        console.log(`   ✅ ${col.column_name}`);
      });
      
    } catch (error) {
      console.error('❌ Error checking columns:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error inspecting schema:', error.message);
  } finally {
    await pool.end();
  }
}

inspectDatabaseSchema();
