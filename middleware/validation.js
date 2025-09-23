const { body, validationResult, param } = require('express-validator');

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address')
  .isLength({ max: 255 })
  .withMessage('Email address is too long');

const passwordValidation = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number');

const usernameValidation = body('username')
  .isLength({ min: 3, max: 20 })
  .withMessage('Username must be between 3 and 20 characters')
  .isAlphanumeric()
  .withMessage('Username can only contain letters and numbers')
  .custom((value) => {
    // Check for reserved usernames
    const reserved = ['admin', 'root', 'user', 'test', 'mivton', 'support', 'help', 'api', 'www', 'mail', 'info'];
    if (reserved.includes(value.toLowerCase())) {
      throw new Error('This username is reserved');
    }
    return true;
  });

const fullNameValidation = body('fullName')
  .isLength({ min: 2, max: 100 })
  .withMessage('Full name must be between 2 and 100 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes')
  .custom((value) => {
    // Check for reasonable name patterns
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      throw new Error('Full name is too short');
    }
    if (trimmed.split(/\s+/).length > 5) {
      throw new Error('Full name has too many parts');
    }
    return true;
  });

const genderValidation = body('gender')
  .isIn(['male', 'female', 'non-binary', 'other', 'prefer-not-to-say'])
  .withMessage('Please select a valid gender option');

const languageValidation = body('nativeLanguage')
  .isLength({ min: 2, max: 10 })
  .withMessage('Please select a valid language')
  .matches(/^[a-z]{2}(-[a-z]{2})?$/)
  .withMessage('Invalid language code format');

const termsValidation = body('agreeTerms')
  .isBoolean()
  .withMessage('Terms agreement must be a boolean')
  .custom((value) => {
    if (!value) {
      throw new Error('You must agree to the Terms of Service and Privacy Policy');
    }
    return true;
  });

// Registration validation rules
const registrationValidation = [
  usernameValidation,
  emailValidation,
  passwordValidation,
  fullNameValidation,
  genderValidation,
  languageValidation,
  termsValidation
];

// Login validation rules
const loginValidation = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean')
];

// Username check validation
const usernameCheckValidation = [
  param('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .isAlphanumeric()
    .withMessage('Username can only contain letters and numbers')
];

// Email check validation
const emailCheckValidation = [
  param('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

// Waitlist validation
const waitlistValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email address is too long')
    .custom((value) => {
      // Check for disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
        'mailinator.com', 'throwaway.email', 'temp-mail.org'
      ];
      const domain = value.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        throw new Error('Please use a permanent email address');
      }
      return true;
    })
];

// Password reset validation
const passwordResetValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const passwordResetConfirmValidation = [
  body('token')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid reset token'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages
    });
  }
  
  next();
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Trim whitespace from string fields
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });
  
  // Convert checkbox values
  if (req.body.rememberMe === 'on') req.body.rememberMe = true;
  if (req.body.agreeTerms === 'on') req.body.agreeTerms = true;
  
  next();
};

// Rate limiting validation for sensitive operations
const validateRateLimit = (maxAttempts, windowMs, identifier = 'ip') => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = identifier === 'ip' ? req.ip : req.body[identifier];
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }
    
    const userAttempts = attempts.get(key);
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(time => now - time < windowMs);
    attempts.set(key, validAttempts);
    
    if (validAttempts.length >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: `Please wait ${Math.ceil(windowMs / 60000)} minutes before trying again`,
        retryAfter: Math.ceil((validAttempts[0] + windowMs - now) / 1000)
      });
    }
    
    // Add current attempt
    validAttempts.push(now);
    attempts.set(key, validAttempts);
    
    next();
  };
};

// Input length validation middleware
const validateContentLength = (maxSizeKB = 10) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = maxSizeKB * 1024;
    
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request body must be smaller than ${maxSizeKB}KB`
      });
    }
    
    next();
  };
};

// Security headers validation
const validateSecurityHeaders = (req, res, next) => {
  // Check for suspicious user agents
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i
  ];
  
  // Allow legitimate bots but log suspicious activity
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn(`Suspicious user agent detected: ${userAgent} from ${req.ip}`);
  }
  
  // Validate content type for POST requests
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'Content-Type must be application/json'
    });
  }
  
  next();
};

module.exports = {
  // Validation rule sets
  registrationValidation,
  loginValidation,
  usernameCheckValidation,
  emailCheckValidation,
  waitlistValidation,
  passwordResetValidation,
  passwordResetConfirmValidation,
  
  // Individual validation rules
  emailValidation,
  passwordValidation,
  usernameValidation,
  fullNameValidation,
  genderValidation,
  languageValidation,
  termsValidation,
  
  // Middleware functions
  handleValidationErrors,
  sanitizeInput,
  validateRateLimit,
  validateContentLength,
  validateSecurityHeaders
};