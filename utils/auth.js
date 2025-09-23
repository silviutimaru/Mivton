/**
 * 🔐 Mivton Authentication Utilities
 * Provides helper functions for authentication operations
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * Password hashing utilities
 */
const password = {
    /**
     * Hash a password using bcrypt
     * @param {string} plainPassword - The plain text password
     * @returns {Promise<string>} - The hashed password
     */
    async hash(plainPassword) {
        try {
            const saltRounds = 10;
            return await bcrypt.hash(plainPassword, saltRounds);
        } catch (error) {
            throw new Error('Password hashing failed');
        }
    },

    /**
     * Compare a plain password with a hash
     * @param {string} plainPassword - The plain text password
     * @param {string} hashedPassword - The hashed password
     * @returns {Promise<boolean>} - True if passwords match
     */
    async compare(plainPassword, hashedPassword) {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            throw new Error('Password comparison failed');
        }
    }
};

/**
 * Token generation utilities
 */
const token = {
    /**
     * Generate a secure random token
     * @param {number} length - Token length in bytes (default: 32)
     * @returns {string} - Random hex token
     */
    generate(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    },

    /**
     * Generate a JWT-style token (simple implementation)
     * @param {object} payload - Data to encode
     * @param {string} secret - Secret key
     * @returns {string} - Base64 encoded token
     */
    createSimple(payload, secret) {
        const header = { typ: 'JWT', alg: 'HS256' };
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        
        const signature = crypto
            .createHmac('sha256', secret)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64url');
        
        return `${encodedHeader}.${encodedPayload}.${signature}`;
    },

    /**
     * Verify a simple JWT token
     * @param {string} token - Token to verify
     * @param {string} secret - Secret key
     * @returns {object|null} - Decoded payload or null if invalid
     */
    verifySimple(token, secret) {
        try {
            const [headerBase64, payloadBase64, signature] = token.split('.');
            
            if (!headerBase64 || !payloadBase64 || !signature) {
                return null;
            }
            
            // Verify signature
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(`${headerBase64}.${payloadBase64}`)
                .digest('base64url');
            
            if (signature !== expectedSignature) {
                return null;
            }
            
            // Decode payload
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
            
            // Check expiration if present
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                return null;
            }
            
            return payload;
        } catch (error) {
            return null;
        }
    }
};

/**
 * Session utilities
 */
const session = {
    /**
     * Create session data for a user
     * @param {object} user - User object
     * @returns {object} - Session data
     */
    create(user) {
        return {
            userId: user.id,
            username: user.username,
            email: user.email,
            isAuthenticated: true,
            loginTime: new Date(),
            lastActivity: new Date()
        };
    },

    /**
     * Update session activity
     * @param {object} sessionData - Current session data
     * @returns {object} - Updated session data
     */
    updateActivity(sessionData) {
        return {
            ...sessionData,
            lastActivity: new Date()
        };
    },

    /**
     * Check if session is expired
     * @param {object} sessionData - Session data
     * @param {number} maxAge - Max age in milliseconds (default: 24 hours)
     * @returns {boolean} - True if expired
     */
    isExpired(sessionData, maxAge = 24 * 60 * 60 * 1000) {
        if (!sessionData || !sessionData.lastActivity) {
            return true;
        }
        
        const now = new Date();
        const lastActivity = new Date(sessionData.lastActivity);
        return (now - lastActivity) > maxAge;
    }
};

/**
 * User utilities
 */
const user = {
    /**
     * Sanitize user data for client response
     * @param {object} userData - Raw user data from database
     * @returns {object} - Sanitized user data
     */
    sanitize(userData) {
        if (!userData) return null;
        
        const {
            password_hash,
            created_at,
            updated_at,
            ...safeUserData
        } = userData;
        
        return {
            ...safeUserData,
            createdAt: created_at,
            updatedAt: updated_at
        };
    },

    /**
     * Generate user avatar initials
     * @param {string} fullName - User's full name
     * @returns {string} - Avatar initials (max 2 characters)
     */
    generateAvatarInitials(fullName) {
        if (!fullName) return 'U';
        
        const names = fullName.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    },

    /**
     * Generate user display name
     * @param {object} userData - User data
     * @returns {string} - Display name
     */
    getDisplayName(userData) {
        if (userData.full_name) {
            return userData.full_name;
        }
        return userData.username;
    }
};

/**
 * Security utilities
 */
const security = {
    /**
     * Rate limiting data structure
     */
    rateLimits: new Map(),

    /**
     * Check if action is rate limited
     * @param {string} key - Unique key (e.g., IP address)
     * @param {number} maxAttempts - Maximum attempts (default: 5)
     * @param {number} windowMs - Time window in milliseconds (default: 15 minutes)
     * @returns {object} - Rate limit info
     */
    checkRateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        const limit = this.rateLimits.get(key) || { attempts: 0, resetTime: now + windowMs };
        
        // Reset if window has passed
        if (now > limit.resetTime) {
            limit.attempts = 0;
            limit.resetTime = now + windowMs;
        }
        
        const isLimited = limit.attempts >= maxAttempts;
        const timeLeft = Math.max(0, limit.resetTime - now);
        
        return {
            isLimited,
            attempts: limit.attempts,
            maxAttempts,
            timeLeft,
            resetTime: limit.resetTime
        };
    },

    /**
     * Record a rate limited action
     * @param {string} key - Unique key
     * @param {number} windowMs - Time window in milliseconds
     */
    recordAttempt(key, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        const limit = this.rateLimits.get(key) || { attempts: 0, resetTime: now + windowMs };
        
        // Reset if window has passed
        if (now > limit.resetTime) {
            limit.attempts = 1;
            limit.resetTime = now + windowMs;
        } else {
            limit.attempts++;
        }
        
        this.rateLimits.set(key, limit);
    },

    /**
     * Clean up expired rate limit entries
     */
    cleanupRateLimits() {
        const now = Date.now();
        for (const [key, limit] of this.rateLimits.entries()) {
            if (now > limit.resetTime) {
                this.rateLimits.delete(key);
            }
        }
    },

    /**
     * Generate secure random string for CSRF tokens
     * @param {number} length - String length (default: 32)
     * @returns {string} - Random string
     */
    generateSecureRandom(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const bytes = crypto.randomBytes(length);
        
        for (let i = 0; i < length; i++) {
            result += chars[bytes[i] % chars.length];
        }
        
        return result;
    }
};

/**
 * Cleanup interval for rate limits (runs every 5 minutes)
 */
setInterval(() => {
    security.cleanupRateLimits();
}, 5 * 60 * 1000);

module.exports = {
    password,
    token,
    session,
    user,
    security
};
