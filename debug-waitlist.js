// Load environment variables FIRST
require('dotenv').config();

const { query, testConnection, closePool } = require('./database/connection');

// Check what tables exist and test waitlist functionality
const debugWaitlist = async () => {
  console.log('🔍 Debugging waitlist issue...');
  
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database.');
      return;
    }

    // Check if waitlist table exists
    console.log('📋 Checking existing tables...');
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📊 Tables in database:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Check if waitlist table exists specifically
    const waitlistExists = tables.rows.some(row => row.table_name === 'waitlist');
    console.log(`📧 Waitlist table exists: ${waitlistExists}`);

    if (waitlistExists) {
      // Check waitlist contents
      const waitlistData = await query('SELECT * FROM waitlist ORDER BY created_at DESC');
      console.log(`📊 Waitlist entries: ${waitlistData.rows.length}`);
      
      if (waitlistData.rows.length > 0) {
        console.log('📧 Recent entries:');
        waitlistData.rows.forEach(row => {
          console.log(`   - ${row.email} (${row.created_at})`);
        });
      }
    } else {
      console.log('❌ Waitlist table does NOT exist - this is the problem!');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await closePool();
  }
};

debugWaitlist();