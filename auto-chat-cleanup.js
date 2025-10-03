#!/usr/bin/env node

/**
 * AUTO-CLEANUP: This script runs on Railway deployment to remove chat tables
 * It will execute once and then disable itself
 */

const path = require('path');
const fs = require('fs');

async function autoRemoveChatTables() {
  // Check if cleanup already completed
  const lockFile = path.join(__dirname, '.chat-cleanup-completed');
  if (fs.existsSync(lockFile)) {
    console.log('✅ Chat cleanup already completed, skipping...');
    return;
  }
  
  try {
    console.log('🧹 AUTO-CLEANUP: Starting chat table removal...');
    
    // Import database connection
    const dbConnection = require('./database/connection');
    const db = dbConnection.getDb ? dbConnection.getDb() : dbConnection.pool || dbConnection;
    
    // List of ALL chat tables to remove
    const chatTables = [
      'messages',
      'chat_conversations', 
      'message_status',
      'typing_status',
      'conversations',
      'conversation_participants',
      'conversation_previews',
      'message_reactions',
      'message_attachments',
      'chat_rooms',
      'room_participants',
      'chat_messages',
      'direct_messages'
    ];
    
    console.log('🗑️ Removing chat tables...');
    
    for (const table of chatTables) {
      try {
        await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Dropped: ${table}`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`⚪ Not found: ${table}`);
        } else {
          console.log(`⚠️ Error dropping ${table}: ${error.message}`);
        }
      }
    }
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (
        table_name LIKE '%chat%' OR 
        table_name LIKE '%message%' OR 
        table_name LIKE '%conversation%' OR
        table_name LIKE '%typing%'
      )
    `;
    
    const remainingTables = await db.query(verifyQuery);
    
    if (remainingTables.rows.length === 0) {
      console.log('✅ SUCCESS: All chat tables removed from production!');
      
      // Create lock file to prevent re-execution
      fs.writeFileSync(lockFile, `Chat cleanup completed at: ${new Date().toISOString()}`);
      console.log('🔒 Cleanup lock file created');
      
    } else {
      console.log(`⚠️ ${remainingTables.rows.length} chat tables still exist:`);
      remainingTables.rows.forEach(row => {
        console.log(`  ❌ ${row.table_name}`);
      });
    }
    
    console.log('🎉 Auto-cleanup completed!');
    
  } catch (error) {
    console.error('❌ Auto-cleanup failed:', error.message);
    // Don't throw - let the app continue starting
  }
}

module.exports = { autoRemoveChatTables };