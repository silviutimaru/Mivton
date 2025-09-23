const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { getDb, query } = require('../database/connection');
const { sendWelcomeEmail } = require('../utils/email');
const router = express.Router();

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true, // Trust the first proxy
  keyGenerator: (req) => {
    return req.ip; // Use the IP from the trusted proxy
  }
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration attempts per hour
  message: { error: 'Too many registration attempts, please try again later.' },
  trustProxy: true, // Trust the first proxy
  keyGenerator: (req) => {
    return req.ip; // Use the IP from the trusted proxy
  }
});

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .isAlphanumeric()
    .withMessage('Username can only contain letters and numbers'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('fullName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces'),
  body('gender')
    .isIn(['male', 'female', 'non-binary', 'other', 'prefer-not-to-say'])
    .withMessage('Please select a valid gender option'),
  body('nativeLanguage')
    .isLength({ min: 2, max: 10 })
    .withMessage('Please select a valid language'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Check username availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.length < 3 || username.length > 20) {
      return res.json({ available: false, message: 'Username must be between 3 and 20 characters' });
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return res.json({ available: false, message: 'Username can only contain letters and numbers' });
    }

    const db = getDb();
    const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    
    res.json({ 
      available: result.rows.length === 0,
      message: result.rows.length === 0 ? 'Username is available' : 'Username is already taken'
    });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check email availability
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json({ available: false, message: 'Please provide a valid email address' });
    }

    const db = getDb();
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    
    res.json({ 
      available: result.rows.length === 0,
      message: result.rows.length === 0 ? 'Email is available' : 'Email is already registered'
    });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User registration
router.post('/register', registrationLimiter, registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { username, email, password, fullName, gender, nativeLanguage } = req.body;
    const db = getDb();

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const newUser = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, gender, native_language, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, username, email, full_name, gender, native_language, is_admin, admin_level, created_at`,
      [username, email.toLowerCase(), passwordHash, fullName, gender, nativeLanguage]
    );

    const user = newUser.rows[0];

    // Create session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      gender: user.gender,
      nativeLanguage: user.native_language,
      is_admin: user.is_admin,
      admin_level: user.admin_level
    };

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, status = $1 WHERE id = $2',
      ['online', user.id]
    );

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(user.email, user.full_name).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Mivton!',
      user: req.session.user
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// User login
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password, rememberMe } = req.body;
    const db = getDb();

    // Find user by email
    const userResult = await query(
      'SELECT id, username, email, password_hash, full_name, gender, native_language, is_blocked, is_admin, admin_level FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account has been blocked. Please contact support.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set session expiry based on "remember me"
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    // Create session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      gender: user.gender,
      nativeLanguage: user.native_language,
      is_admin: user.is_admin,
      admin_level: user.admin_level
    };

    // Update last login and status
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, status = $1 WHERE id = $2',
      ['online', user.id]
    );

    res.json({
      success: true,
      message: 'Login successful! Welcome back!',
      user: req.session.user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// User logout
router.post('/logout', (req, res) => {
  if (req.session.userId) {
    const userId = req.session.userId;
    
    // Update user status to offline
    const db = getDb();
    db.query('UPDATE users SET status = $1 WHERE id = $2', ['offline', userId])
      .catch(err => console.error('Error updating user status:', err));
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Could not log out' });
    }
    
    res.clearCookie('mivton.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Fetch fresh user data from database to ensure admin status is current
    const db = getDb();
    const userResult = await db.query(
      'SELECT id, username, email, full_name, gender, native_language, is_verified, is_admin, admin_level, status, last_login, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (userResult.rows.length === 0) {
      // User doesn't exist anymore, destroy session
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }

    const freshUser = userResult.rows[0];

    // Update session with fresh data
    req.session.user = {
      id: freshUser.id,
      username: freshUser.username,
      email: freshUser.email,
      fullName: freshUser.full_name,
      gender: freshUser.gender,
      nativeLanguage: freshUser.native_language,
      is_admin: freshUser.is_admin,
      admin_level: freshUser.admin_level
    };

    // Enhanced debug logging
    console.log('🔍 Fresh user data from database:', {
      id: freshUser.id,
      username: freshUser.username,
      is_admin: freshUser.is_admin,
      admin_level: freshUser.admin_level
    });

    res.json({
      success: true,
      user: req.session.user
    });

  } catch (error) {
    console.error('❌ Error fetching fresh user data:', error);
    // Fallback to session data if database query fails
    res.json({
      success: true,
      user: req.session.user
    });
  }
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.session.userId,
    user: req.session.user || null
  });
});

module.exports = router;