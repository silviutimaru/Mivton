const { Pool } = require('pg');

// Check if we're in local development mode
const isLocalDev = !process.env.DATABASE_URL || process.env.NODE_ENV === 'development';

if (isLocalDev) {
  // Use local SQLite for development
  console.log('🔧 Using local SQLite database for development');
  module.exports = require('./local-connection');
} else {
  // Use PostgreSQL for production
  console.log('🔧 Using PostgreSQL database for production');
  
  // Database configuration - SSL should always be enabled for Railway
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Always use SSL for Railway
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // Create connection pool
  const pool = new Pool(dbConfig);

  // Handle pool errors
  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Test connection function
  const testConnection = async () => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database connected successfully:', result.rows[0].now);
      client.release();
      return true;
    } catch (err) {
      console.error('❌ Database connection error:', err.message);
      throw err;
    }
  };

  // Initialize database connection (for server.js compatibility)
  const initializeDatabase = async () => {
    try {
      await testConnection();
      console.log('✅ Database initialization completed');
      return true;
    } catch (err) {
      console.error('❌ Database initialization failed:', err.message);
      throw err;
    }
  };

  // Get database pool (for server.js compatibility)
  const getDb = () => {
    return pool;
  };

  // Query helper function
  const query = async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('📊 Query executed', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
      return res;
    } catch (err) {
      console.error('❌ Query error:', err.message);
      throw err;
    }
  };

  // Get client for transactions
  const getClient = async () => {
    try {
      const client = await pool.connect();
      return client;
    } catch (err) {
      console.error('❌ Error getting client:', err.message);
      throw err;
    }
  };

  // Graceful shutdown
  const closePool = async () => {
    try {
      await pool.end();
      console.log('✅ Database pool closed');
    } catch (err) {
      console.error('❌ Error closing pool:', err.message);
    }
  };

  module.exports = {
    pool,
    query,
    getClient,
    testConnection,
    closePool,
    initializeDatabase, // Added for server.js compatibility
    getDb // Added for server.js compatibility
  };
}
