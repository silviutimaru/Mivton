/**
 * 🎥 VIDEO CALL HANDLERS - COMPREHENSIVE FIX
 * Handles all video call related socket events with proper error handling
 */

const { areUsersFriends } = require('../utils/friends-utils');
const { getUserFromSessionImproved } = require('./improved-socket-auth');

/**
 * Setup video call handlers for a socket connection
 * @param {SocketIO.Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket instance
 * @param {number} userId - User ID (from auth)
 */
function setupVideoCallHandlers(io, socket, userId) {
    console.log(`🎥 Setting up video call handlers for user ${userId} on socket ${socket.id}`);
    
    // CRITICAL: Ensure socket has userId for all video call operations
    if (!socket.userId) {
        socket.userId = userId;
        console.log(`✅ Set socket.userId to ${userId} for video calls`);
    }
    
    // CRITICAL: Ensure user is in their room for receiving calls
    const userRoom1 = `user:${userId}`;
    const userRoom2 = `user_${userId}`;
    socket.join(userRoom1);
    socket.join(userRoom2);
    console.log(`✅ Socket ${socket.id} joined rooms ${userRoom1} and ${userRoom2} for video calls`);

    /**
     * Helper function to find all sockets for a user
     */
    const findUserSockets = (targetUserId, roomName = null) => {
        if (!roomName) {
            roomName = `user_${targetUserId}`;
        }
        const room = io.sockets.adapter.rooms.get(roomName);
        
        if (!room || room.size === 0) {
            console.log(`❌ No sockets found in room ${roomName}`);
            return [];
        }
        
        const sockets = Array.from(room);
        console.log(`✅ Found ${sockets.length} socket(s) in room ${roomName}: ${sockets.join(', ')}`);
        return sockets;
    };

    /**
     * Helper function to emit to a user with detailed logging
     */
    const emitToUser = (targetUserId, eventName, data) => {
        // Try both room formats to be safe
        const roomName1 = `user:${targetUserId}`;
        const roomName2 = `user_${targetUserId}`;
        
        console.log(`📤 Emitting ${eventName} to rooms ${roomName1} and ${roomName2} with data:`, data);
        
        // Check if room exists and has sockets
        const sockets1 = findUserSockets(targetUserId, roomName1);
        const sockets2 = findUserSockets(targetUserId, roomName2);
        
        let success = false;
        
        // Emit to both room formats
        if (sockets1.length > 0) {
            io.to(roomName1).emit(eventName, data);
            console.log(`✅ Successfully emitted ${eventName} to ${sockets1.length} socket(s) in room ${roomName1}`);
            success = true;
        }
        
        if (sockets2.length > 0) {
            io.to(roomName2).emit(eventName, data);
            console.log(`✅ Successfully emitted ${eventName} to ${sockets2.length} socket(s) in room ${roomName2}`);
            success = true;
        }
        
        if (!success) {
            console.log(`⚠️ User ${targetUserId} is not online (no sockets in either room)`);
        }
        
        return success;
    };

    // ================================
    // INITIATE VIDEO CALL
    // ================================
    socket.on('video-call:initiate', async (data) => {
        console.log(`\n🎥 VIDEO CALL INITIATE - Full Debug Info:`);
        console.log(`📋 Socket Info:`, {
            socketId: socket.id,
            socketUserId: socket.userId,
            authUserId: userId,
            rooms: Array.from(socket.rooms)
        });
        console.log(`📋 Call Data:`, data);

        let callerId = socket.userId || userId;
        
        // If no caller ID from socket auth, try to get it from session
        if (!callerId) {
            try {
                const cookies = socket.handshake.headers.cookie;
                if (cookies) {
                    const sessionMatch = cookies.match(/mivton\.sid=([^;]+)/);
                    if (sessionMatch) {
                        const sessionId = decodeURIComponent(sessionMatch[1]);
                        const user = await getUserFromSessionImproved(sessionId);
                        if (user) {
                            callerId = user.id;
                            socket.userId = user.id;
                            socket.userInfo = user;
                            console.log(`🔧 Retrieved user ID ${callerId} from session for video call`);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Error getting user from session:', error);
            }
        }

        const { targetUserId, callerInfo, callerId: dataCallerId } = data;

        // Use callerId from data if not available from socket auth
        if (!callerId && dataCallerId) {
            callerId = dataCallerId;
            console.log(`🔧 Using callerId from data: ${callerId}`);
        }

        if (!callerId) {
            console.error('❌ No caller ID available');
            socket.emit('video-call:error', { 
                error: 'Authentication required',
                code: 'NO_CALLER_ID'
            });
            return;
        }

        if (!targetUserId) {
            console.error('❌ No target user specified');
            socket.emit('video-call:error', { 
                error: 'Target user required',
                code: 'NO_TARGET_USER'
            });
            return;
        }

        try {
            // Check if users are friends
            console.log(`🤝 Checking friendship between ${callerId} and ${targetUserId}...`);
            const areFriends = await areUsersFriends(callerId, targetUserId);
            console.log(`🔍 Friendship check result: ${areFriends} (type: ${typeof areFriends})`);
            
            if (!areFriends) {
                console.log(`⚠️ Users ${callerId} and ${targetUserId} are not friends`);
                socket.emit('video-call:error', { 
                    error: 'You can only call friends',
                    code: 'NOT_FRIENDS'
                });
                return;
            }
            
            console.log(`✅ Users ${callerId} and ${targetUserId} are friends!`);

            // Generate call ID
            const callId = `call_${callerId}_${targetUserId}_${Date.now()}`;
            
            // Store call info on socket
            socket.currentCall = {
                callId,
                targetUserId,
                startTime: Date.now()
            };

            // Prepare caller information
            const callData = {
                callId,
                caller: {
                    id: callerId,
                    socketId: socket.id,
                    ...callerInfo
                },
                timestamp: new Date().toISOString()
            };

            console.log(`📞 Initiating call from ${callerId} to ${targetUserId}`);
            console.log(`📋 Call data:`, callData);

            // Check if target user is online
            const targetOnline = emitToUser(targetUserId, 'video-call:incoming', callData);
            
            if (targetOnline) {
                // Notify caller that call is ringing
                socket.emit('video-call:ringing', {
                    callId,
                    targetUserId,
                    status: 'ringing'
                });
                
                console.log(`✅ Call initiated successfully - ID: ${callId}`);
                
                // Set timeout for unanswered calls
                setTimeout(() => {
                    if (socket.currentCall && socket.currentCall.callId === callId) {
                        console.log(`⏱️ Call ${callId} timed out`);
                        socket.emit('video-call:timeout', { callId });
                        emitToUser(targetUserId, 'video-call:missed', { callId, callerId });
                        delete socket.currentCall;
                    }
                }, 30000); // 30 second timeout
            } else {
                socket.emit('video-call:error', { 
                    error: 'User is offline',
                    code: 'USER_OFFLINE',
                    targetUserId
                });
                console.log(`❌ Call failed - user ${targetUserId} is offline`);
            }

        } catch (error) {
            console.error('❌ Error initiating video call:', error);
            socket.emit('video-call:error', { 
                error: 'Failed to initiate call',
                code: 'CALL_INIT_ERROR',
                details: error.message
            });
        }
    });

    // ================================
    // ACCEPT VIDEO CALL
    // ================================
    socket.on('video-call:accept', async (data) => {
        console.log(`✅ User ${userId} accepting call:`, data);
        const { callId, callerId } = data;

        try {
            // Notify caller that call was accepted
            const success = emitToUser(callerId, 'video-call:accepted', {
                callId,
                acceptedBy: userId,
                timestamp: new Date().toISOString()
            });

            if (success) {
                socket.emit('video-call:connected', { callId, status: 'connected' });
                console.log(`✅ Call ${callId} accepted and connected`);
            } else {
                socket.emit('video-call:error', { 
                    error: 'Caller disconnected',
                    code: 'CALLER_OFFLINE'
                });
            }

        } catch (error) {
            console.error('❌ Error accepting call:', error);
            socket.emit('video-call:error', { 
                error: 'Failed to accept call',
                code: 'ACCEPT_ERROR'
            });
        }
    });

    // ================================
    // DECLINE VIDEO CALL
    // ================================
    socket.on('video-call:decline', async (data) => {
        console.log(`❌ User ${userId} declining call:`, data);
        const { callId, callerId } = data;

        try {
            emitToUser(callerId, 'video-call:declined', {
                callId,
                declinedBy: userId,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Call ${callId} declined`);

        } catch (error) {
            console.error('❌ Error declining call:', error);
        }
    });

    // ================================
    // END VIDEO CALL
    // ================================
    socket.on('video-call:end', async (data) => {
        console.log(`📴 User ${userId} ending call:`, data);
        const { callId, otherUserId } = data;

        try {
            // Clear call from socket
            if (socket.currentCall && socket.currentCall.callId === callId) {
                delete socket.currentCall;
            }

            emitToUser(otherUserId, 'video-call:ended', {
                callId,
                endedBy: userId,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Call ${callId} ended`);

        } catch (error) {
            console.error('❌ Error ending call:', error);
        }
    });

    // ================================
    // WEBRTC SIGNALING
    // ================================
    socket.on('video-call:offer', (data) => {
        console.log(`🔄 WebRTC offer from ${userId} to ${data.targetUserId}`);
        const { targetUserId, offer, callId } = data;
        
        emitToUser(targetUserId, 'video-call:offer', {
            offer,
            callId,
            from: userId
        });
    });

    socket.on('video-call:answer', (data) => {
        console.log(`🔄 WebRTC answer from ${userId} to ${data.targetUserId}`);
        const { targetUserId, answer, callId } = data;
        
        emitToUser(targetUserId, 'video-call:answer', {
            answer,
            callId,
            from: userId
        });
    });

    socket.on('video-call:ice-candidate', (data) => {
        console.log(`🔄 ICE candidate from ${userId} to ${data.targetUserId}`);
        const { targetUserId, candidate, callId } = data;
        
        emitToUser(targetUserId, 'video-call:ice-candidate', {
            candidate,
            callId,
            from: userId
        });
    });

    // ================================
    // CALL STATE MANAGEMENT
    // ================================
    socket.on('video-call:toggle-audio', (data) => {
        const { targetUserId, muted } = data;
        emitToUser(targetUserId, 'video-call:audio-toggled', { 
            userId, 
            muted 
        });
    });

    socket.on('video-call:toggle-video', (data) => {
        const { targetUserId, videoOff } = data;
        emitToUser(targetUserId, 'video-call:video-toggled', { 
            userId, 
            videoOff 
        });
    });

    // ================================
    // CLEANUP ON DISCONNECT
    // ================================
    socket.on('disconnect', () => {
        if (socket.currentCall) {
            const { callId, targetUserId } = socket.currentCall;
            console.log(`🔌 User ${userId} disconnected during call ${callId}`);
            
            emitToUser(targetUserId, 'video-call:disconnected', {
                callId,
                userId,
                reason: 'user_disconnected'
            });
        }
    });

    console.log(`✅ Video call handlers setup complete for user ${userId}`);
}

module.exports = {
    setupVideoCallHandlers
};
