// Load environment variables FIRST
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { query, testConnection, closePool } = require('./connection');

// Initialize database with schema
const initializeDatabase = async () => {
  console.log('🚀 Starting Mivton database initialization...');
  console.log('🔍 Environment check:');
  console.log('   DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  
  try {
    // Test connection first
    console.log('🔍 Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your DATABASE_URL.');
      process.exit(1);
    }

    // Read and execute schema
    console.log('📄 Reading database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🏗️  Creating database tables...');
    await query(schema);
    
    // Verify tables were created
    console.log('✅ Verifying table creation...');
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Test user table
    console.log('🧪 Testing users table...');
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    console.log(`   Users in database: ${userCount.rows[0].count}`);

    // Test session table
    console.log('🧪 Testing session table...');
    const sessionCount = await query('SELECT COUNT(*) as count FROM session');
    console.log(`   Sessions in database: ${sessionCount.rows[0].count}`);

    console.log('🎉 Database initialization completed successfully!');
    console.log('');
    console.log('✅ Phase 1.2 Status: COMPLETE');
    console.log('📋 Next: Phase 1.3 - Authentication System');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
};

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = {
  initializeDatabase
};