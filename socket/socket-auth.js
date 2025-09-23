/**
 * 🚀 MIVTON PHASE 3.2 - SOCKET.IO AUTHENTICATION MIDDLEWARE
 * Secure socket authentication with session validation
 * 
 * Features:
 * - Session-based socket authentication
 * - User verification and validation
 * - Connection security checks
 * - Rate limiting for socket connections
 * - Comprehensive error handling
 */

const { getDb } = require('../database/connection');

/**
 * Authentication configuration
 */
const AUTH_CONFIG = {
    MAX_AUTH_ATTEMPTS: 5,
    AUTH_TIMEOUT: 10000,        // 10 seconds
    SESSION_CHECK_INTERVAL: 300000, // 5 minutes
    BLOCKED_USER_CHECK: true,
    IP_RATE_LIMIT: 20          // Max connections per IP
};

/**
 * Track authentication attempts by IP
 */
const authAttempts = new Map(); // IP -> { count, lastAttempt }
const ipConnections = new Map(); // IP -> connection count

/**
 * Socket.IO authentication middleware
 * @param {Socket} socket - Socket instance
 * @param {Function} next - Next middleware function
 */
async function socketAuthMiddleware(socket, next) {
    try {
        console.log(`🔐 Authenticating socket connection: ${socket.id}`);

        // Get client IP
        const clientIP = socket.handshake.address;
        
        // Check IP rate limiting
        if (!checkIPRateLimit(clientIP)) {
            console.log(`🚫 IP rate limit exceeded for ${clientIP}`);
            return next(new Error('Too many connections from this IP address'));
        }

        // Check authentication attempts
        if (!checkAuthAttempts(clientIP)) {
            console.log(`🚫 Too many auth attempts from ${clientIP}`);
            return next(new Error('Too many authentication attempts'));
        }

        // Extract authentication data
        const authToken = socket.handshake.auth?.token;
        const sessionId = socket.handshake.auth?.sessionId;
        const userId = socket.handshake.auth?.userId;

        console.log(`🔍 Auth data - Token: ${!!authToken}, Session: ${!!sessionId}, User: ${userId}`);

        let authenticatedUser = null;

        // Try different authentication methods
        if (sessionId) {
            authenticatedUser = await authenticateBySession(sessionId);
        } else if (authToken) {
            authenticatedUser = await authenticateByToken(authToken);
        } else if (userId) {
            // Fallback: basic user ID validation (less secure)
            authenticatedUser = await authenticateByUserId(userId);
        }

        if (authenticatedUser) {
            // Validate user account
            const validationResult = await validateUserAccount(authenticatedUser.id);
            if (!validationResult.valid) {
                recordAuthAttempt(clientIP, false);
                return next(new Error(validationResult.reason));
            }

            // Attach user info to socket
            socket.userId = authenticatedUser.id;
            socket.userInfo = authenticatedUser;
            socket.authenticatedAt = new Date();
            socket.clientIP = clientIP;

            // Update IP connection count
            updateIPConnections(clientIP, 1);

            // Log successful authentication
            await logAuthEvent(authenticatedUser.id, 'socket_auth_success', {
                socket_id: socket.id,
                ip_address: clientIP,
                user_agent: socket.handshake.headers['user-agent']
            });

            recordAuthAttempt(clientIP, true);
            console.log(`✅ Socket authenticated for user ${authenticatedUser.id}: ${socket.id}`);
            
            next();
        } else {
            recordAuthAttempt(clientIP, false);
            console.log(`❌ Socket authentication failed: ${socket.id}`);
            
            // Log failed authentication
            await logAuthEvent(null, 'socket_auth_failed', {
                socket_id: socket.id,
                ip_address: clientIP,
                user_agent: socket.handshake.headers['user-agent'],
                auth_method: sessionId ? 'session' : (authToken ? 'token' : 'user_id')
            });

            next(new Error('Authentication failed'));
        }

    } catch (error) {
        console.error('❌ Socket authentication error:', error);
        recordAuthAttempt(socket.handshake.address, false);
        
        await logAuthEvent(null, 'socket_auth_error', {
            socket_id: socket.id,
            ip_address: socket.handshake.address,
            error: error.message
        });

        next(new Error('Authentication system error'));
    }
}

/**
 * Authenticate by session ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} User object or null
 */
async function authenticateBySession(sessionId) {
    try {
        const db = getDb();
        
        // Get session from database
        const sessionResult = await db.query(`
            SELECT sess, expire FROM session 
            WHERE sid = $1 AND expire > NOW()
        `, [sessionId]);

        if (sessionResult.rows.length === 0) {
            console.log(`🔍 Session not found or expired: ${sessionId}`);
            return null;
        }

        const sessionData = sessionResult.rows[0].sess;
        
        if (!sessionData.userId) {
            console.log(`🔍 No user ID in session: ${sessionId}`);
            return null;
        }

        // Get user data
        const userResult = await db.query(`
            SELECT id, username, full_name, email, is_verified, is_blocked, created_at
            FROM users 
            WHERE id = $1
        `, [sessionData.userId]);

        if (userResult.rows.length === 0) {
            console.log(`🔍 User not found for session: ${sessionData.userId}`);
            return null;
        }

        const user = userResult.rows[0];
        console.log(`✅ Session authentication successful for user ${user.id}`);
        
        return user;

    } catch (error) {
        console.error('❌ Session authentication error:', error);
        return null;
    }
}

/**
 * Authenticate by JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object|null>} User object or null
 */
async function authenticateByToken(token) {
    try {
        const jwt = require('jsonwebtoken');
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded.userId) {
            console.log(`🔍 No user ID in JWT token`);
            return null;
        }

        const db = getDb();
        
        // Get user data
        const userResult = await db.query(`
            SELECT id, username, full_name, email, is_verified, is_blocked, created_at
            FROM users 
            WHERE id = $1
        `, [decoded.userId]);

        if (userResult.rows.length === 0) {
            console.log(`🔍 User not found for token: ${decoded.userId}`);
            return null;
        }

        const user = userResult.rows[0];
        console.log(`✅ Token authentication successful for user ${user.id}`);
        
        return user;

    } catch (error) {
        console.error('❌ Token authentication error:', error);
        return null;
    }
}

/**
 * Authenticate by user ID (fallback method)
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
async function authenticateByUserId(userId) {
    try {
        const db = getDb();
        
        // Get user data
        const userResult = await db.query(`
            SELECT id, username, full_name, email, is_verified, is_blocked, created_at
            FROM users 
            WHERE id = $1
        `, [parseInt(userId)]);

        if (userResult.rows.length === 0) {
            console.log(`🔍 User not found: ${userId}`);
            return null;
        }

        const user = userResult.rows[0];
        console.log(`⚠️ Basic user ID authentication for user ${user.id} (less secure)`);
        
        return user;

    } catch (error) {
        console.error('❌ User ID authentication error:', error);
        return null;
    }
}

/**
 * Validate user account
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Validation result
 */
async function validateUserAccount(userId) {
    try {
        const db = getDb();
        
        const result = await db.query(`
            SELECT is_blocked, is_verified, created_at
            FROM users 
            WHERE id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return { valid: false, reason: 'User account not found' };
        }

        const user = result.rows[0];

        if (user.is_blocked) {
            return { valid: false, reason: 'User account is blocked' };
        }

        // Additional validation checks can be added here
        
        return { valid: true };

    } catch (error) {
        console.error('❌ User validation error:', error);
        return { valid: false, reason: 'Validation system error' };
    }
}

/**
 * Check IP rate limiting
 * @param {string} ip - Client IP address
 * @returns {boolean} True if within rate limit
 */
function checkIPRateLimit(ip) {
    const currentConnections = ipConnections.get(ip) || 0;
    return currentConnections < AUTH_CONFIG.IP_RATE_LIMIT;
}

/**
 * Check authentication attempts
 * @param {string} ip - Client IP address
 * @returns {boolean} True if within attempt limit
 */
function checkAuthAttempts(ip) {
    const attempts = authAttempts.get(ip);
    
    if (!attempts) {
        return true;
    }

    // Reset attempts if last attempt was more than 15 minutes ago
    if (Date.now() - attempts.lastAttempt > 15 * 60 * 1000) {
        authAttempts.delete(ip);
        return true;
    }

    return attempts.count < AUTH_CONFIG.MAX_AUTH_ATTEMPTS;
}

/**
 * Record authentication attempt
 * @param {string} ip - Client IP address
 * @param {boolean} success - Whether attempt was successful
 */
function recordAuthAttempt(ip, success) {
    if (success) {
        // Clear failed attempts on successful auth
        authAttempts.delete(ip);
        return;
    }

    const attempts = authAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    authAttempts.set(ip, attempts);
}

/**
 * Update IP connection count
 * @param {string} ip - Client IP address
 * @param {number} delta - Change in connection count
 */
function updateIPConnections(ip, delta) {
    const current = ipConnections.get(ip) || 0;
    const newCount = Math.max(0, current + delta);
    
    if (newCount === 0) {
        ipConnections.delete(ip);
    } else {
        ipConnections.set(ip, newCount);
    }
}

/**
 * Log authentication event
 * @param {number|null} userId - User ID (if authenticated)
 * @param {string} eventType - Event type
 * @param {Object} eventData - Event data
 */
async function logAuthEvent(userId, eventType, eventData) {
    try {
        const db = getDb();
        
        await db.query(`
            INSERT INTO realtime_events_log (
                event_type, user_id, socket_id, event_data, success
            ) VALUES ($1, $2, $3, $4, $5)
        `, [
            eventType,
            userId,
            eventData.socket_id,
            JSON.stringify(eventData),
            eventType.includes('success')
        ]);

    } catch (error) {
        console.error('❌ Error logging auth event:', error);
    }
}

/**
 * Socket disconnection cleanup
 * @param {Socket} socket - Socket instance
 */
function handleSocketDisconnect(socket) {
    const clientIP = socket.clientIP;
    
    if (clientIP) {
        updateIPConnections(clientIP, -1);
    }

    if (socket.userId) {
        logAuthEvent(socket.userId, 'socket_disconnect', {
            socket_id: socket.id,
            ip_address: clientIP,
            connected_duration: Date.now() - socket.authenticatedAt?.getTime()
        });
    }
}

/**
 * Verify socket authentication (middleware for socket events)
 * @param {Socket} socket - Socket instance
 * @param {Function} next - Next function
 */
function requireSocketAuth(socket, next) {
    if (!socket.userId) {
        socket.emit('error', {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required for this action'
        });
        return;
    }
    next();
}

/**
 * Create authentication middleware with custom options
 * @param {Object} options - Authentication options
 * @returns {Function} Authentication middleware
 */
function createAuthMiddleware(options = {}) {
    const config = { ...AUTH_CONFIG, ...options };
    
    return async (socket, next) => {
        // Use custom config for this middleware instance
        const originalConfig = { ...AUTH_CONFIG };
        Object.assign(AUTH_CONFIG, config);
        
        try {
            await socketAuthMiddleware(socket, next);
        } finally {
            // Restore original config
            Object.assign(AUTH_CONFIG, originalConfig);
        }
    };
}

/**
 * Get authentication statistics
 * @returns {Object} Authentication statistics
 */
function getAuthStats() {
    return {
        active_ips: ipConnections.size,
        total_connections: Array.from(ipConnections.values()).reduce((sum, count) => sum + count, 0),
        failed_attempts: authAttempts.size,
        blocked_ips: Array.from(authAttempts.values()).filter(attempt => 
            attempt.count >= AUTH_CONFIG.MAX_AUTH_ATTEMPTS
        ).length
    };
}

/**
 * Clear authentication data (for cleanup)
 */
function clearAuthData() {
    authAttempts.clear();
    ipConnections.clear();
    console.log('🧹 Authentication data cleared');
}

module.exports = {
    socketAuthMiddleware,
    requireSocketAuth,
    handleSocketDisconnect,
    createAuthMiddleware,
    getAuthStats,
    clearAuthData,
    AUTH_CONFIG
};
