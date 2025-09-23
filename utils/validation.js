// Validation utility functions

// Supported languages for Mivton
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese (Simplified)',
  'zh-tw': 'Chinese (Traditional)',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'tr': 'Turkish',
  'pl': 'Polish',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'da': 'Danish',
  'no': 'Norwegian',
  'fi': 'Finnish',
  'el': 'Greek',
  'he': 'Hebrew',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Filipino',
  'uk': 'Ukrainian',
  'cs': 'Czech',
  'sk': 'Slovak',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'sr': 'Serbian',
  'sl': 'Slovenian',
  'et': 'Estonian',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'mt': 'Maltese',
  'ga': 'Irish',
  'cy': 'Welsh',
  'is': 'Icelandic',
  'mk': 'Macedonian',
  'sq': 'Albanian',
  'eu': 'Basque',
  'ca': 'Catalan',
  'gl': 'Galician',
  'sw': 'Swahili',
  'zu': 'Zulu',
  'af': 'Afrikaans',
  'bn': 'Bengali',
  'ur': 'Urdu',
  'fa': 'Persian',
  'ta': 'Tamil',
  'te': 'Telugu',
  'ml': 'Malayalam',
  'kn': 'Kannada',
  'gu': 'Gujarati',
  'pa': 'Punjabi',
  'ne': 'Nepali',
  'si': 'Sinhala',
  'my': 'Myanmar',
  'km': 'Khmer',
  'lo': 'Lao',
  'ka': 'Georgian',
  'am': 'Amharic',
  'ig': 'Igbo',
  'yo': 'Yoruba',
  'ha': 'Hausa',
  'mg': 'Malagasy',
  'ny': 'Chichewa',
  'sn': 'Shona',
  'so': 'Somali',
  'rw': 'Kinyarwanda',
  'xh': 'Xhosa',
  'st': 'Sesotho',
  'tn': 'Setswana',
  'ts': 'Xitsonga',
  've': 'Tshivenda',
  'nr': 'Ndebele',
  'ss': 'Swazi'
};

// Gender options
const GENDER_OPTIONS = [
  'male',
  'female', 
  'non-binary',
  'other',
  'prefer-not-to-say'
];

// Username validation
const validateUsername = (username) => {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
    return { isValid: false, errors };
  }
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (username.length > 20) {
    errors.push('Username must be no more than 20 characters long');
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    errors.push('Username can only contain letters and numbers');
  }
  
  // Reserved usernames
  const reserved = ['admin', 'root', 'user', 'test', 'mivton', 'support', 'help', 'api', 'www', 'mail', 'info'];
  if (reserved.includes(username.toLowerCase())) {
    errors.push('This username is reserved');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
const validateEmail = (email) => {
  const errors = [];
  
  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (email.length > 255) {
    errors.push('Email address is too long');
  }
  
  // Check for disposable email domains (basic list)
  const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    errors.push('Please use a permanent email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Password validation
const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for common passwords
  const commonPasswords = ['password', '12345678', 'qwerty123', 'password123', 'admin123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Please choose a more secure password');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Full name validation
const validateFullName = (fullName) => {
  const errors = [];
  
  if (!fullName) {
    errors.push('Full name is required');
    return { isValid: false, errors };
  }
  
  if (fullName.length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }
  
  if (fullName.length > 100) {
    errors.push('Full name is too long');
  }
  
  if (!/^[a-zA-Z\s]+$/.test(fullName)) {
    errors.push('Full name can only contain letters and spaces');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Gender validation
const validateGender = (gender) => {
  const errors = [];
  
  if (!gender) {
    errors.push('Gender selection is required');
    return { isValid: false, errors };
  }
  
  if (!GENDER_OPTIONS.includes(gender)) {
    errors.push('Please select a valid gender option');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Language validation
const validateLanguage = (languageCode) => {
  const errors = [];
  
  if (!languageCode) {
    errors.push('Language selection is required');
    return { isValid: false, errors };
  }
  
  if (!SUPPORTED_LANGUAGES[languageCode]) {
    errors.push('Please select a supported language');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Comprehensive registration validation
const validateRegistration = (userData) => {
  const { username, email, password, fullName, gender, nativeLanguage } = userData;
  
  const usernameValidation = validateUsername(username);
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const fullNameValidation = validateFullName(fullName);
  const genderValidation = validateGender(gender);
  const languageValidation = validateLanguage(nativeLanguage);
  
  const allErrors = [
    ...usernameValidation.errors,
    ...emailValidation.errors,
    ...passwordValidation.errors,
    ...fullNameValidation.errors,
    ...genderValidation.errors,
    ...languageValidation.errors
  ];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    fieldErrors: {
      username: usernameValidation.errors,
      email: emailValidation.errors,
      password: passwordValidation.errors,
      fullName: fullNameValidation.errors,
      gender: genderValidation.errors,
      nativeLanguage: languageValidation.errors
    }
  };
};

// Login validation
const validateLogin = (email, password) => {
  const emailValidation = validateEmail(email);
  const errors = [...emailValidation.errors];
  
  if (!password) {
    errors.push('Password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get password strength score
const getPasswordStrength = (password) => {
  let score = 0;
  let feedback = [];
  
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  if (password.length >= 12) score += 1;
  
  const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][score];
  
  return {
    score,
    strength,
    feedback
  };
};

module.exports = {
  SUPPORTED_LANGUAGES,
  GENDER_OPTIONS,
  validateUsername,
  validateEmail,
  validatePassword,
  validateFullName,
  validateGender,
  validateLanguage,
  validateRegistration,
  validateLogin,
  getPasswordStrength
};