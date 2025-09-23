/**
 * ==============================================
 * SIMPLIFIED SOCKET.IO AUTHENTICATION
 * For Mivton Friend Request System
 * ==============================================
 */

const { getDb } = require('../database/connection');

/**
 * Simple socket authentication middleware that works with Express sessions
 * @param {Socket} socket - Socket instance
 * @param {Function} next - Next middleware function
 */
async function simpleSocketAuth(socket, next) {
    try {
        console.log(`🔐 Simple socket auth for: ${socket.id}`);
        
        // For now, allow all connections and authenticate later
        // We'll use the session cookie from the browser
        const cookies = socket.handshake.headers.cookie;
        
        if (cookies) {
            // Extract session ID from cookies (basic implementation)
            const sessionMatch = cookies.match(/mivton\.sid=([^;]+)/);
            if (sessionMatch) {
                const sessionId = decodeURIComponent(sessionMatch[1]);
                console.log(`🍪 Found session cookie: ${sessionId.substring(0, 20)}...`);
                
                // Try to get user from session
                const user = await getUserFromSession(sessionId);
                if (user) {
                    socket.userId = user.id;
                    socket.userInfo = user;
                    console.log(`✅ Socket authenticated for user ${user.id}`);
                    return next();
                }
            }
        }
        
        // If no session found, allow connection but mark as unauthenticated
        console.log(`⚠️ Socket connected without authentication: ${socket.id}`);
        socket.userId = null;
        socket.userInfo = null;
        next();
        
    } catch (error) {
        console.error('❌ Socket auth error:', error);
        // Allow connection even if auth fails
        socket.userId = null;
        socket.userInfo = null;
        next();
    }
}

/**
 * Get user from session ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserFromSession(sessionId) {
    try {
        const db = getDb();
        
        // Remove potential signature from session ID
        const cleanSessionId = sessionId.split('.')[0];
        
        // Get session from database
        const sessionResult = await db.query(`
            SELECT sess FROM session 
            WHERE sid LIKE $1 AND expire > NOW()
            LIMIT 1
        `, [`%${cleanSessionId}%`]);

        if (sessionResult.rows.length === 0) {
            console.log(`🔍 No valid session found`);
            return null;
        }

        const sessionData = sessionResult.rows[0].sess;
        
        if (!sessionData.userId) {
            console.log(`🔍 No user ID in session`);
            return null;
        }

        // Get user data
        const userResult = await db.query(`
            SELECT id, username, full_name, email, is_verified
            FROM users 
            WHERE id = $1 AND is_blocked = FALSE
        `, [sessionData.userId]);

        if (userResult.rows.length === 0) {
            console.log(`🔍 User not found: ${sessionData.userId}`);
            return null;
        }

        return userResult.rows[0];

    } catch (error) {
        console.error('❌ Error getting user from session:', error);
        return null;
    }
}

/**
 * Require authentication for socket events
 * @param {Socket} socket - Socket instance
 * @param {Function} callback - Callback function
 * @returns {boolean} True if authenticated
 */
function requireSocketAuth(socket, callback) {
    if (!socket.userId) {
        if (callback) {
            callback({ success: false, error: 'Authentication required' });
        }
        socket.emit('error', {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required for this action'
        });
        return false;
    }
    return true;
}

/**
 * Handle socket disconnection
 * @param {Socket} socket - Socket instance
 */
function handleSocketDisconnect(socket) {
    if (socket.userId) {
        console.log(`🔌 Authenticated socket disconnected: ${socket.id} (User: ${socket.userId})`);
    } else {
        console.log(`🔌 Unauthenticated socket disconnected: ${socket.id}`);
    }
}

module.exports = {
    simpleSocketAuth,
    requireSocketAuth,
    handleSocketDisconnect
};
