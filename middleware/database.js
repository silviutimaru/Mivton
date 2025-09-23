const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('../database/connection');

// Database middleware for attaching to request object
const attachDatabase = (req, res, next) => {
  req.db = {
    query: pool.query.bind(pool),
    getClient: pool.connect.bind(pool)
  };
  next();
};

// Session middleware configuration
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false // We create it in schema.sql
  }),
  secret: process.env.JWT_SECRET || 'mivton-fallback-secret',
  resave: false,
  saveUninitialized: false,
  name: 'mivton_session',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  },
  rolling: true // Reset expiry on activity
});

// Database health check middleware
const healthCheck = async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    next();
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    res.status(503).json({
      error: 'Database temporarily unavailable',
      status: 'unhealthy'
    });
  }
};

// Error handling middleware for database operations
const handleDatabaseError = (error, req, res, next) => {
  console.error('❌ Database error:', error.message);
  
  // PostgreSQL specific error codes
  if (error.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Resource already exists',
      details: 'This email or username is already taken'
    });
  }
  
  if (error.code === '23503') { // Foreign key violation
    return res.status(400).json({
      error: 'Invalid reference',
      details: 'Referenced resource does not exist'
    });
  }
  
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Database connection failed',
      details: 'Please try again later'
    });
  }
  
  // Generic database error
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
  });
};

// Clean expired sessions (utility middleware)
const cleanExpiredSessions = async () => {
  try {
    const result = await pool.query('DELETE FROM session WHERE expire < NOW()');
    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned ${result.rowCount} expired sessions`);
    }
  } catch (error) {
    console.error('❌ Failed to clean expired sessions:', error.message);
  }
};

// Set up periodic session cleanup
const startSessionCleanup = () => {
  // Clean expired sessions every hour
  setInterval(cleanExpiredSessions, 60 * 60 * 1000);
  console.log('🔄 Session cleanup scheduled every hour');
};

module.exports = {
  attachDatabase,
  sessionMiddleware,
  healthCheck,
  handleDatabaseError,
  cleanExpiredSessions,
  startSessionCleanup
};