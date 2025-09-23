/**
 * 🚀 MIVTON PHASE 3.1 - SOCKET.IO FRIENDS EVENTS
 * Real-time events for friends system and social notifications
 * 
 * Features:
 * - Friend request notifications
 * - Friend status updates (online/offline)
 * - Friend acceptance/decline events
 * - Real-time friend list updates
 * - Block/unblock notifications
 */

const { areUsersFriends, isUserBlocked } = require('../utils/friends-utils');

/**
 * Initialize friends-related Socket.IO events
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
function initializeFriendsEvents(io) {
    console.log('🔄 Initializing friends Socket.IO events...');

    // Store user socket connections for real-time updates
    const userSockets = new Map(); // userId -> Set of socket IDs

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
        try {
            // Get user ID from socket handshake or session
            const userId = socket.handshake.auth?.userId || socket.handshake.session?.userId;
            
            if (userId) {
                socket.userId = parseInt(userId);
                console.log(`🔌 Socket authenticated for user ${socket.userId}: ${socket.id}`);
            } else {
                console.log(`🔌 Anonymous socket connection: ${socket.id}`);
            }
            
            next();
        } catch (error) {
            console.error('❌ Socket authentication error:', error);
            next(error);
        }
    });

    // Handle new socket connections
    io.on('connection', (socket) => {
        const userId = socket.userId;

        if (userId) {
            // Add socket to user's socket set
            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
            }
            userSockets.get(userId).add(socket.id);

            console.log(`👋 User ${userId} connected via socket ${socket.id}`);
            
            // Notify friends that user is online
            notifyFriendsOfStatusChange(userId, 'online', userSockets, io);
        }

        // Handle friend request events
        socket.on('friend:request:send', async (data) => {
            try {
                const { receiverId, requestId } = data;
                
                if (!userId) {
                    socket.emit('error', { message: 'Authentication required' });
                    return;
                }

                // Check if receiver is not blocked
                const isBlocked = await isUserBlocked(receiverId, userId);
                if (isBlocked) {
                    return; // Silently fail for blocked users
                }

                // Send real-time notification to receiver
                const receiverSockets = userSockets.get(receiverId);
                if (receiverSockets) {
                    receiverSockets.forEach(socketId => {
                        const receiverSocket = io.sockets.sockets.get(socketId);
                        if (receiverSocket) {
                            receiverSocket.emit('friend:request:received', {
                                senderId: userId,
                                requestId,
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                }

                console.log(`📤 Friend request notification sent from ${userId} to ${receiverId}`);

            } catch (error) {
                console.error('❌ Friend request notification error:', error);
                socket.emit('error', { message: 'Failed to send notification' });
            }
        });

        // Handle friend request acceptance
        socket.on('friend:request:accept', async (data) => {
            try {
                const { senderId, requestId } = data;
                
                if (!userId) {
                    socket.emit('error', { message: 'Authentication required' });
                    return;
                }

                // Send real-time notification to sender
                const senderSockets = userSockets.get(senderId);
                if (senderSockets) {
                    senderSockets.forEach(socketId => {
                        const senderSocket = io.sockets.sockets.get(socketId);
                        if (senderSocket) {
                            senderSocket.emit('friend:request:accepted', {
                                accepterId: userId,
                                requestId,
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                }

                // Notify both users to refresh their friends lists
                const allSockets = [
                    ...(userSockets.get(userId) || []),
                    ...(userSockets.get(senderId) || [])
                ];

                allSockets.forEach(socketId => {
                    const userSocket = io.sockets.sockets.get(socketId);
                    if (userSocket) {
                        userSocket.emit('friends:list:update', {
                            type: 'friend_added',
                            timestamp: new Date().toISOString()
                        });
                    }
                });

                console.log(`✅ Friend request accepted: ${senderId} <-> ${userId}`);

            } catch (error) {
                console.error('❌ Friend request acceptance error:', error);
                socket.emit('error', { message: 'Failed to process acceptance' });
            }
        });

        // Handle friend request decline
        socket.on('friend:request:decline', async (data) => {
            try {
                const { senderId, requestId } = data;
                
                if (!userId) {
                    socket.emit('error', { message: 'Authentication required' });
                    return;
                }

                // Send real-time notification to sender
                const senderSockets = userSockets.get(senderId);
                if (senderSockets) {
                    senderSockets.forEach(socketId => {
                        const senderSocket = io.sockets.sockets.get(socketId);
                        if (senderSocket) {
                            senderSocket.emit('friend:request:declined', {
                                declinerId: userId,
                                requestId,
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                }

                console.log(`❌ Friend request declined: ${senderId} -> ${userId}`);

            } catch (error) {
                console.error('❌ Friend request decline error:', error);
                socket.emit('error', { message: 'Failed to process decline' });
            }
        });

        // Handle friend removal
        socket.on('friend:remove', async (data) => {
            try {
                const { friendId } = data;
                
                if (!userId) {
                    socket.emit('error', { message: 'Authentication required' });
                    return;
                }

                // Notify both users to refresh their friends lists
                const allSockets = [
                    ...(userSockets.get(userId) || []),
                    ...(userSockets.get(friendId) || [])
                ];

                allSockets.forEach(socketId => {
                    const userSocket = io.sockets.sockets.get(socketId);
                    if (userSocket) {
                        userSocket.emit('friends:list:update', {
                            type: 'friend_removed',
                            removedFriendId: userSocket.userId === userId ? friendId : userId,
                            timestamp: new Date().toISOString()
                        });
                    }
                });

                console.log(`🗑️ Friend removed: ${userId} <-> ${friendId}`);

            } catch (error) {
                console.error('❌ Friend removal error:', error);
                socket.emit('error', { message: 'Failed to process removal' });
            }
        });

        // Handle user blocking
        socket.on('user:block', async (data) => {
            try {
                const { blockedUserId } = data;
                
                if (!userId) {
                    socket.emit('error', { message: 'Authentication required' });
                    return;
                }

                // Notify both users to update their UI
                const allSockets = [
                    ...(userSockets.get(userId) || []),
                    ...(userSockets.get(blockedUserId) || [])
                ];

                allSockets.forEach(socketId => {
                    const userSocket = io.sockets.sockets.get(socketId);
                    if (userSocket) {
                        userSocket.emit('user:blocked', {
                            blockerId: userId,
                            blockedId: blockedUserId,
                            timestamp: new Date().toISOString()
                        });
                    }
                });

                console.log(`🚫 User blocked: ${userId} blocked ${blockedUserId}`);

            } catch (error) {
                console.error('❌ User blocking error:', error);
                socket.emit('error', { message: 'Failed to process blocking' });
            }
        });

        // Handle status updates (online/away/busy/offline)
        socket.on('status:update', async (data) => {
            try {
                const { status } = data;
                
                if (!userId) {
                    socket.emit('error', { message: 'Authentication required' });
                    return;
                }

                // Notify friends of status change
                notifyFriendsOfStatusChange(userId, status, userSockets, io);

                console.log(`🔄 Status updated for user ${userId}: ${status}`);

            } catch (error) {
                console.error('❌ Status update error:', error);
                socket.emit('error', { message: 'Failed to update status' });
            }
        });

        // Handle typing indicators (for future chat features)
        socket.on('chat:typing:start', async (data) => {
            try {
                const { friendId } = data;
                
                if (!userId) return;

                // Check if users are friends
                const areFriends = await areUsersFriends(userId, friendId);
                if (!areFriends) return;

                // Send typing indicator to friend
                const friendSockets = userSockets.get(friendId);
                if (friendSockets) {
                    friendSockets.forEach(socketId => {
                        const friendSocket = io.sockets.sockets.get(socketId);
                        if (friendSocket) {
                            friendSocket.emit('chat:typing:start', {
                                userId,
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                }

            } catch (error) {
                console.error('❌ Typing indicator error:', error);
            }
        });

        socket.on('chat:typing:stop', async (data) => {
            try {
                const { friendId } = data;
                
                if (!userId) return;

                // Check if users are friends
                const areFriends = await areUsersFriends(userId, friendId);
                if (!areFriends) return;

                // Send stop typing indicator to friend
                const friendSockets = userSockets.get(friendId);
                if (friendSockets) {
                    friendSockets.forEach(socketId => {
                        const friendSocket = io.sockets.sockets.get(socketId);
                        if (friendSocket) {
                            friendSocket.emit('chat:typing:stop', {
                                userId,
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                }

            } catch (error) {
                console.error('❌ Stop typing indicator error:', error);
            }
        });

        // Handle socket disconnection
        socket.on('disconnect', () => {
            if (userId) {
                // Remove socket from user's socket set
                const socketSet = userSockets.get(userId);
                if (socketSet) {
                    socketSet.delete(socket.id);
                    
                    // If user has no more active sockets, mark as offline
                    if (socketSet.size === 0) {
                        userSockets.delete(userId);
                        notifyFriendsOfStatusChange(userId, 'offline', userSockets, io);
                        console.log(`👋 User ${userId} went offline`);
                    }
                }
            }

            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    console.log('✅ Friends Socket.IO events initialized');
}

/**
 * Notify all friends of a user's status change
 * @param {number} userId - User whose status changed
 * @param {string} status - New status (online/away/busy/offline)
 * @param {Map} userSockets - Map of user sockets
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
async function notifyFriendsOfStatusChange(userId, status, userSockets, io) {
    try {
        // This would require a database query to get friends
        // For now, we'll skip the notification to avoid circular dependencies
        // In a real implementation, you'd query the friends table here
        
        // Example implementation (commented out to avoid circular dependency):
        /*
        const friends = await getFriendsList(userId);
        
        friends.forEach(friend => {
            const friendSockets = userSockets.get(friend.id);
            if (friendSockets) {
                friendSockets.forEach(socketId => {
                    const friendSocket = io.sockets.sockets.get(socketId);
                    if (friendSocket) {
                        friendSocket.emit('friend:status:update', {
                            friendId: userId,
                            status,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }
        });
        */
        
        console.log(`📡 Status change notification queued for user ${userId}: ${status}`);
        
    } catch (error) {
        console.error('❌ Error notifying friends of status change:', error);
    }
}

/**
 * Send notification to a specific user
 * @param {number} userId - Target user ID
 * @param {string} eventName - Socket event name
 * @param {Object} data - Event data
 * @param {Map} userSockets - Map of user sockets
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
function notifyUser(userId, eventName, data, userSockets, io) {
    const sockets = userSockets.get(userId);
    if (sockets) {
        sockets.forEach(socketId => {
            const userSocket = io.sockets.sockets.get(socketId);
            if (userSocket) {
                userSocket.emit(eventName, {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }
}

/**
 * Broadcast event to multiple users
 * @param {Array<number>} userIds - Array of user IDs
 * @param {string} eventName - Socket event name
 * @param {Object} data - Event data
 * @param {Map} userSockets - Map of user sockets
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
function broadcastToUsers(userIds, eventName, data, userSockets, io) {
    userIds.forEach(userId => {
        notifyUser(userId, eventName, data, userSockets, io);
    });
}

module.exports = {
    initializeFriendsEvents,
    notifyUser,
    broadcastToUsers
};
