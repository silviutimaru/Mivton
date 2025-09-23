/**
 * IMPROVED SOCKET.IO AUTHENTICATION
 * Fixes the authentication failures we saw in the logs
 */

const { getDb } = require('../database/connection');

/**
 * Improved socket authentication middleware
 * @param {Socket} socket - Socket instance
 * @param {Function} next - Next middleware function
 */
async function improvedSocketAuth(socket, next) {
    try {
        console.log(`🔐 Socket auth attempt for: ${socket.id}`);
        
        // Get cookies from headers
        const cookies = socket.handshake.headers.cookie;
        
        if (!cookies) {
            console.log(`⚠️ No cookies found for socket: ${socket.id}`);
            await logSocketAuth(socket.id, null, false, 'No cookies in handshake');
            return allowUnauthenticated(socket, next);
        }
        
        console.log(`🍪 Cookies received: ${cookies.substring(0, 100)}...`);
        
        // Extract session ID from cookies (more robust parsing)
        let sessionId = null;
        
        // Try different session cookie formats
        const sessionPatterns = [
            /mivton\.sid=s%3A([^;]+)/,  // Signed session format
            /mivton\.sid=([^;]+)/,      // Regular session format
            /connect\.sid=s%3A([^;]+)/, // Alternative signed format
            /connect\.sid=([^;]+)/,     // Alternative regular format
            /session_id=([^;]+)/        // Fallback format
        ];
        
        for (const pattern of sessionPatterns) {
            const match = cookies.match(pattern);
            if (match) {
                sessionId = decodeURIComponent(match[1]);
                console.log(`🔍 Extracted session ID using pattern: ${pattern}`);
                break;
            }
        }
        
        if (!sessionId) {
            console.log(`⚠️ No session cookie found for socket: ${socket.id}`);
            console.log(`🔍 Cookie string: ${cookies}`);
            await logSocketAuth(socket.id, null, false, 'No session cookie found');
            return allowUnauthenticated(socket, next);
        }
        
        console.log(`🍪 Found session: ${sessionId.substring(0, 20)}...`);
        
        // Get user from session
        const user = await getUserFromSessionImproved(sessionId);
        
        if (user) {
            socket.userId = user.id;
            socket.userInfo = user;
            
            // Log successful authentication
            await logSocketAuth(socket.id, user.id, true);
            
            console.log(`✅ Socket authenticated for user ${user.id} (${user.username})`);
            return next();
        } else {
            console.log(`❌ No user found for session`);
            await logSocketAuth(socket.id, null, false, 'No user found for session');
            return allowUnauthenticated(socket, next);
        }
        
    } catch (error) {
        console.error('❌ Socket auth error:', error);
        await logSocketAuth(socket.id, null, false, error.message);
        return allowUnauthenticated(socket, next);
    }
}

/**
 * Allow unauthenticated connection
 * @param {Socket} socket - Socket instance
 * @param {Function} next - Next function
 */
function allowUnauthenticated(socket, next) {
    socket.userId = null;
    socket.userInfo = null;
    console.log(`🔓 Socket connected without authentication: ${socket.id}`);
    next();
}

/**
 * Improved session lookup
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserFromSessionImproved(sessionId) {
    try {
        const db = getDb();
        
        // Clean session ID (remove signature if present)
        const cleanSessionId = sessionId.includes('.') ? sessionId.split('.')[0] : sessionId;
        
        // Try exact match first
        let sessionResult = await db.query(`
            SELECT sess FROM session 
            WHERE sid = $1 AND expire > NOW()
            LIMIT 1
        `, [sessionId]);
        
        // If no exact match, try without signature
        if (sessionResult.rows.length === 0 && sessionId.includes('.')) {
            sessionResult = await db.query(`
                SELECT sess FROM session 
                WHERE sid = $1 AND expire > NOW()
                LIMIT 1
            `, [cleanSessionId]);
        }
        
        // If still no match, try pattern matching
        if (sessionResult.rows.length === 0) {
            sessionResult = await db.query(`
                SELECT sess FROM session 
                WHERE sid LIKE $1 AND expire > NOW()
                ORDER BY expire DESC
                LIMIT 1
            `, [`%${cleanSessionId}%`]);
        }

        if (sessionResult.rows.length === 0) {
            console.log(`🔍 No valid session found for: ${cleanSessionId.substring(0, 10)}...`);
            return null;
        }

        const sessionData = sessionResult.rows[0].sess;
        
        if (!sessionData || !sessionData.userId) {
            console.log(`🔍 No user ID in session data`);
            return null;
        }

        // Get user data
        const userResult = await db.query(`
            SELECT 
                id, 
                username, 
                full_name, 
                email, 
                is_verified,
                status
            FROM users 
            WHERE id = $1 AND is_blocked = FALSE
        `, [sessionData.userId]);

        if (userResult.rows.length === 0) {
            console.log(`🔍 User not found or blocked: ${sessionData.userId}`);
            return null;
        }

        const user = userResult.rows[0];
        console.log(`👤 Found user: ${user.username} (${user.full_name})`);
        
        return user;

    } catch (error) {
        console.error('❌ Error getting user from session:', error);
        return null;
    }
}

/**
 * Log socket authentication attempt
 * @param {string} socketId - Socket ID
 * @param {number} userId - User ID (if successful)
 * @param {boolean} success - Whether auth was successful
 * @param {string} errorMessage - Error message (if failed)
 */
async function logSocketAuth(socketId, userId, success, errorMessage = null) {
    try {
        const db = getDb();
        
        await db.query(`
            INSERT INTO realtime_events_log (
                event_type, 
                user_id, 
                socket_id, 
                success, 
                error_message,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `, [
            success ? 'socket_auth_success' : 'socket_auth_failed',
            userId,
            socketId,
            success,
            errorMessage
        ]);

    } catch (error) {
        console.error('❌ Error logging socket auth:', error);
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
        socket.emit('auth_error', {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Please login to use this feature'
        });
        return false;
    }
    return true;
}

module.exports = {
    improvedSocketAuth,
    requireSocketAuth,
    getUserFromSessionImproved,
    logSocketAuth
};
