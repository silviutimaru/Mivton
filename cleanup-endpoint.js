// Database cleanup endpoint to remove chat tables
// This will be added to server.js temporarily for cleanup

// Add this route to server.js before the error handlers
app.get('/admin/cleanup-chat-tables', async (req, res) => {
  try {
    console.log('🧹 Starting chat table cleanup...');
    
    const db = require('./database/connection');
    
    // List current tables
    const tablesList = await db.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('📋 Current tables:', tablesList.rows.map(r => r.tablename));
    
    // Chat tables to remove
    const chatTables = [
      'message_reactions',
      'message_status', 
      'typing_indicators',
      'chat_notifications',
      'chat_sessions',
      'conversation_previews',
      'conversations',
      'messages',
      'contact_restrictions'
    ];
    
    const results = [];
    
    for (const table of chatTables) {
      try {
        await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        results.push(`✅ Dropped table: ${table}`);
        console.log(`✅ Dropped table: ${table}`);
      } catch (error) {
        results.push(`⚠️ Table ${table}: ${error.message}`);
        console.log(`⚠️ Table ${table}: ${error.message}`);
      }
    }
    
    // Drop chat functions
    const chatFunctions = [
      'update_conversation_timestamp()',
      'notify_new_message()',
      'get_conversation_messages()'
    ];
    
    for (const func of chatFunctions) {
      try {
        await db.query(`DROP FUNCTION IF EXISTS ${func} CASCADE`);
        results.push(`✅ Dropped function: ${func}`);
        console.log(`✅ Dropped function: ${func}`);
      } catch (error) {
        results.push(`⚠️ Function ${func}: ${error.message}`);
      }
    }
    
    // List remaining tables
    const remainingTables = await db.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('📋 Remaining tables:', remainingTables.rows.map(r => r.tablename));
    
    res.json({
      success: true,
      message: 'Chat table cleanup completed',
      results: results,
      remainingTables: remainingTables.rows.map(r => r.tablename)
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});