/**
 * 🚀 MIVTON PHASE 3.2 - SOCKET.IO CONNECTION MANAGER
 * Enhanced socket connection management with authentication and presence
 * 
 * Features:
 * - Authenticated socket connections
 * - User presence tracking
 * - Connection limiting and cleanup
 * - Real-time event logging
 * - Memory management
 */

const { getDb } = require('../database/connection');

/**
 * Connection limits and configuration
 */
const CONNECTION_CONFIG = {
    MAX_CONNECTIONS_PER_USER: 5,
    MAX_TOTAL_CONNECTIONS: 1000,
    CONNECTION_TIMEOUT: 300000, // 5 minutes
    HEARTBEAT_INTERVAL: 30000,  // 30 seconds
    CLEANUP_INTERVAL: 60000,    // 1 minute
    PRESENCE_UPDATE_THROTTLE: 5000 // 5 seconds
};

/**
 * In-memory connection tracking
 */
class ConnectionManager {
    constructor() {
        this.activeConnections = new Map(); // socketId -> connection info
        this.userConnections = new Map();   // userId -> Set of socket IDs
        this.lastPresenceUpdate = new Map(); // userId -> timestamp
        this.connectionCount = 0;
        this.cleanupInterval = null;
        this.heartbeatInterval = null;
    }

    /**
     * Initialize the connection manager
     * @param {SocketIO.Server} io - Socket.IO server instance
     */
    initialize(io) {
        console.log('🔄 Initializing Socket.IO connection manager...');
        
        this.io = io;
        this.startCleanupInterval();
        this.startHeartbeatInterval();
        
        console.log('✅ Connection manager initialized');
    }

    /**
     * Add a new socket connection
     * @param {Socket} socket - Socket instance
     * @param {number} userId - User ID (optional)
     */
    async addConnection(socket, userId = null) {
        try {
            // Check connection limits
            if (this.connectionCount >= CONNECTION_CONFIG.MAX_TOTAL_CONNECTIONS) {
                socket.emit('error', {
                    code: 'CONNECTION_LIMIT_EXCEEDED',
                    message: 'Server connection limit reached. Please try again later.'
                });
                socket.disconnect(true);
                return false;
            }

            if (userId) {
                const userSocketCount = this.userConnections.get(userId)?.size || 0;
                if (userSocketCount >= CONNECTION_CONFIG.MAX_CONNECTIONS_PER_USER) {
                    socket.emit('error', {
                        code: 'USER_CONNECTION_LIMIT_EXCEEDED',
                        message: 'Too many connections from this account. Please close other tabs.'
                    });
                    socket.disconnect(true);
                    return false;
                }
            }

            // Store connection info
            const connectionInfo = {
                socketId: socket.id,
                userId: userId,
                connectedAt: new Date(),
                lastActivity: new Date(),
                ipAddress: socket.handshake.address,
                userAgent: socket.handshake.headers['user-agent']
            };

            this.activeConnections.set(socket.id, connectionInfo);
            this.connectionCount++;

            if (userId) {
                if (!this.userConnections.has(userId)) {
                    this.userConnections.set(userId, new Set());
                }
                this.userConnections.get(userId).add(socket.id);

                // Store in database
                await this.storeSocketSession(connectionInfo);
                
                // Update user presence
                await this.updateUserPresence(userId, 'online', 1);
                
                console.log(`🔌 User ${userId} connected via socket ${socket.id}`);
            } else {
                console.log(`🔌 Anonymous connection: ${socket.id}`);
            }

            return true;

        } catch (error) {
            console.error('❌ Error adding connection:', error);
            return false;
        }
    }

    /**
     * Remove a socket connection
     * @param {string} socketId - Socket ID
     */
    async removeConnection(socketId) {
        try {
            const connectionInfo = this.activeConnections.get(socketId);
            if (!connectionInfo) {
                return;
            }

            const { userId } = connectionInfo;

            // Remove from active connections
            this.activeConnections.delete(socketId);
            this.connectionCount--;

            if (userId) {
                // Remove from user connections
                const userSockets = this.userConnections.get(userId);
                if (userSockets) {
                    userSockets.delete(socketId);
                    
                    // If user has no more active connections, mark as offline
                    if (userSockets.size === 0) {
                        this.userConnections.delete(userId);
                        await this.updateUserPresence(userId, 'offline', -1);
                        console.log(`👋 User ${userId} went offline`);
                    } else {
                        await this.updateUserPresence(userId, null, -1);
                    }
                }

                // Update database
                await this.removeSocketSession(socketId);
            }

            console.log(`🔌 Connection removed: ${socketId}`);

        } catch (error) {
            console.error('❌ Error removing connection:', error);
        }
    }

    /**
     * Update connection activity
     * @param {string} socketId - Socket ID
     */
    updateActivity(socketId) {
        const connectionInfo = this.activeConnections.get(socketId);
        if (connectionInfo) {
            connectionInfo.lastActivity = new Date();
            
            // Throttled database update for presence
            const userId = connectionInfo.userId;
            if (userId) {
                const now = Date.now();
                const lastUpdate = this.lastPresenceUpdate.get(userId) || 0;
                
                if (now - lastUpdate > CONNECTION_CONFIG.PRESENCE_UPDATE_THROTTLE) {
                    this.lastPresenceUpdate.set(userId, now);
                    this.updateSocketActivity(socketId).catch(error => {
                        console.error('❌ Error updating socket activity:', error);
                    });
                }
            }
        }
    }

    /**
     * Get user's socket connections
     * @param {number} userId - User ID
     * @returns {Set<string>} Set of socket IDs
     */
    getUserSockets(userId) {
        return this.userConnections.get(userId) || new Set();
    }

    /**
     * Get connection info
     * @param {string} socketId - Socket ID
     * @returns {Object|null} Connection info
     */
    getConnection(socketId) {
        return this.activeConnections.get(socketId) || null;
    }

    /**
     * Check if user is online
     * @param {number} userId - User ID
     * @returns {boolean} True if user has active connections
     */
    isUserOnline(userId) {
        const userSockets = this.userConnections.get(userId);
        return userSockets && userSockets.size > 0;
    }

    /**
     * Get online users count
     * @returns {number} Number of online users
     */
    getOnlineUsersCount() {
        return this.userConnections.size;
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics
     */
    getStats() {
        return {
            total_connections: this.connectionCount,
            authenticated_connections: Array.from(this.activeConnections.values())
                .filter(c => c.userId).length,
            anonymous_connections: Array.from(this.activeConnections.values())
                .filter(c => !c.userId).length,
            online_users: this.userConnections.size,
            avg_connections_per_user: this.userConnections.size > 0 
                ? this.connectionCount / this.userConnections.size 
                : 0
        };
    }

    /**
     * Store socket session in database
     * @param {Object} connectionInfo - Connection information
     */
    async storeSocketSession(connectionInfo) {
        try {
            const db = getDb();
            
            await db.query(`
                INSERT INTO socket_sessions (
                    user_id, socket_id, connected_at, last_activity, 
                    ip_address, user_agent, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (socket_id) DO UPDATE SET
                    last_activity = EXCLUDED.last_activity,
                    is_active = EXCLUDED.is_active
            `, [
                connectionInfo.userId,
                connectionInfo.socketId,
                connectionInfo.connectedAt,
                connectionInfo.lastActivity,
                connectionInfo.ipAddress,
                connectionInfo.userAgent,
                true
            ]);

        } catch (error) {
            console.error('❌ Error storing socket session:', error);
        }
    }

    /**
     * Remove socket session from database
     * @param {string} socketId - Socket ID
     */
    async removeSocketSession(socketId) {
        try {
            const db = getDb();
            
            await db.query(`
                UPDATE socket_sessions 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE socket_id = $1
            `, [socketId]);

        } catch (error) {
            console.error('❌ Error removing socket session:', error);
        }
    }

    /**
     * Update socket activity in database
     * @param {string} socketId - Socket ID
     */
    async updateSocketActivity(socketId) {
        try {
            const db = getDb();
            
            await db.query(`
                UPDATE socket_sessions 
                SET last_activity = CURRENT_TIMESTAMP
                WHERE socket_id = $1 AND is_active = TRUE
            `, [socketId]);

        } catch (error) {
            console.error('❌ Error updating socket activity:', error);
        }
    }

    /**
     * Update user presence
     * @param {number} userId - User ID
     * @param {string} status - Presence status
     * @param {number} socketDelta - Socket count change
     */
    async updateUserPresence(userId, status = null, socketDelta = 0) {
        try {
            const db = getDb();
            
            if (status) {
                await db.query(`
                    INSERT INTO user_presence (user_id, status, socket_count, last_seen, updated_at)
                    VALUES ($1, $2, GREATEST(0, $3), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id) DO UPDATE SET
                        status = $2,
                        socket_count = GREATEST(0, user_presence.socket_count + $3),
                        last_seen = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                `, [userId, status, socketDelta]);
            } else {
                await db.query(`
                    UPDATE user_presence 
                    SET 
                        socket_count = GREATEST(0, socket_count + $2),
                        last_seen = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $1
                `, [userId, socketDelta]);
            }

        } catch (error) {
            console.error('❌ Error updating user presence:', error);
        }
    }

    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, CONNECTION_CONFIG.CLEANUP_INTERVAL);
    }

    /**
     * Start heartbeat interval
     */
    startHeartbeatInterval() {
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, CONNECTION_CONFIG.HEARTBEAT_INTERVAL);
    }

    /**
     * Perform connection cleanup
     */
    async performCleanup() {
        try {
            const now = Date.now();
            const expiredConnections = [];

            // Find expired connections
            for (const [socketId, connectionInfo] of this.activeConnections) {
                const timeSinceActivity = now - connectionInfo.lastActivity.getTime();
                if (timeSinceActivity > CONNECTION_CONFIG.CONNECTION_TIMEOUT) {
                    expiredConnections.push(socketId);
                }
            }

            // Remove expired connections
            for (const socketId of expiredConnections) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.disconnect(true);
                } else {
                    await this.removeConnection(socketId);
                }
            }

            if (expiredConnections.length > 0) {
                console.log(`🧹 Cleaned up ${expiredConnections.length} expired connections`);
            }

        } catch (error) {
            console.error('❌ Error in connection cleanup:', error);
        }
    }

    /**
     * Send heartbeat to all connections
     */
    sendHeartbeat() {
        const stats = this.getStats();
        
        this.io.emit('heartbeat', {
            timestamp: new Date().toISOString(),
            server_stats: stats
        });
    }

    /**
     * Shutdown the connection manager
     */
    shutdown() {
        console.log('🛑 Shutting down connection manager...');
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        // Disconnect all connections
        for (const socketId of this.activeConnections.keys()) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
                socket.disconnect(true);
            }
        }
        
        console.log('✅ Connection manager shutdown complete');
    }
}

// Export singleton instance
const connectionManager = new ConnectionManager();

module.exports = {
    connectionManager,
    CONNECTION_CONFIG
};
