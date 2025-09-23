// Authentication middleware functions

// Check if user is authenticated
const requireAuth = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      redirectTo: '/login.html'
    });
  }
  
  try {
    // Get database connection
    const { getDb } = require('../database/connection');
    const db = getDb();
    
    // Fetch user data from database
    const userResult = await db.query(
      'SELECT id, username, email, full_name, native_language, gender, is_verified, is_admin, status FROM users WHERE id = $1',
      [req.session.userId]
    );
    
    if (userResult.rows.length === 0) {
      // User doesn't exist anymore, destroy session
      req.session.destroy();
      return res.status(401).json({ 
        error: 'User not found',
        redirectTo: '/login.html'
      });
    }
    
    // Set req.user for API routes to use
    req.user = userResult.rows[0];
    
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error'
    });
  }
};

// Check if user is NOT authenticated (for login/register pages)
const requireGuest = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.status(403).json({ 
      error: 'Already authenticated',
      redirectTo: '/dashboard.html'
    });
  }
  next();
};

// Check if user is admin
const requireAdmin = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      redirectTo: '/login.html'
    });
  }

  try {
    // Get database connection
    const { getDb } = require('../database/connection');
    const db = getDb();
    
    // Fetch user data from database
    const userResult = await db.query(
      'SELECT id, username, email, full_name, native_language, gender, is_verified, is_admin, status FROM users WHERE id = $1',
      [req.session.userId]
    );
    
    if (userResult.rows.length === 0) {
      // User doesn't exist anymore, destroy session
      req.session.destroy();
      return res.status(401).json({ 
        error: 'User not found',
        redirectTo: '/login.html'
      });
    }
    
    const user = userResult.rows[0];
    
    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({ 
        error: 'Admin access required'
      });
    }
    
    // Set req.user for API routes to use
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Admin authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error'
    });
  }
};

// Optional authentication - doesn't block if not authenticated
const optionalAuth = (req, res, next) => {
  // Just continue regardless of authentication status
  next();
};

// Add user info to response locals for templates
const addUserToLocals = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    res.locals.isAuthenticated = true;
  } else {
    res.locals.user = null;
    res.locals.isAuthenticated = false;
  }
  next();
};

module.exports = {
  requireAuth,
  requireGuest,
  requireAdmin,
  optionalAuth,
  addUserToLocals
};