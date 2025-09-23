// Load environment variables FIRST
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { query, testConnection, closePool } = require('./connection');

// Initialize waitlist table
const initializeWaitlist = async () => {
  console.log('📧 Adding waitlist table...');
  
  try {
    // Test connection first
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Cannot connect to database.');
      process.exit(1);
    }

    // Read and execute waitlist schema
    console.log('📄 Reading waitlist schema...');
    const schemaPath = path.join(__dirname, 'waitlist.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🏗️  Creating waitlist table...');
    await query(schema);
    
    // Verify table was created
    console.log('✅ Verifying waitlist table...');
    const tableCheck = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'waitlist'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Waitlist table created successfully');
    } else {
      console.log('❌ Waitlist table not found');
    }

    // Test the table
    const waitlistCount = await query('SELECT COUNT(*) as count FROM waitlist');
    console.log(`📊 Waitlist entries: ${waitlistCount.rows[0].count}`);

    console.log('🎉 Waitlist setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Waitlist setup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
};

// Run if called directly
if (require.main === module) {
  initializeWaitlist();
}

module.exports = {
  initializeWaitlist
};