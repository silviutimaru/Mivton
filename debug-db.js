require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

// Test with explicit SSL configuration
const testConfigs = [
  {
    name: 'Config 1 - SSL false',
    config: {
      connectionString: process.env.DATABASE_URL,
      ssl: false
    }
  },
  {
    name: 'Config 2 - SSL rejectUnauthorized false',
    config: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Config 3 - SSL require',
    config: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false, require: true }
    }
  }
];

async function testConnection(config) {
  console.log(`\n🧪 Testing ${config.name}...`);
  const pool = new Pool(config.config);
  
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ ${config.name} SUCCESS:`, result.rows[0].current_time);
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ ${config.name} FAILED:`, error.message);
    await pool.end();
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running database connection tests...\n');
  
  for (const config of testConfigs) {
    await testConnection(config);
  }
  
  console.log('\n🏁 Test completed');
}

runTests();