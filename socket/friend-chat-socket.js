/**
 * 💬 SIMPLE FRIEND CHAT - Socket.IO Handler
 * Dead simple real-time messaging
 */

function initializeFriendChatSocket(io) {
    // Track which socket belongs to which user
    const userSockets = new Map(); // userId -> socketId

    io.on('connection', (socket) => {
        console.log('💬 Socket connected:', socket.id);

        // User registers with their ID
        socket.on('chat:register', (userId) => {
            if (!userId) return;

            userSockets.set(userId, socket.id);
            socket.userId = userId;
            socket.join(`user_${userId}`);

            console.log(`✅ User ${userId} registered for chat`);
        });

        // When someone sends a message, forward it to the recipient
        socket.on('chat:message', (data) => {
            const { recipientId, messageData } = data;

            console.log(`📨 Message from ${socket.userId} to ${recipientId}`);
            console.log(`🔍 Recipient socket:`, userSockets.get(recipientId));

            // Send to recipient's room
            io.to(`user_${recipientId}`).emit('chat:receive', messageData);

            console.log(`✅ Sent to user_${recipientId}`);
        });

        // Typing indicators
        socket.on('chat:typing', (recipientId) => {
            io.to(`user_${recipientId}`).emit('chat:typing_start', socket.userId);
        });

        socket.on('chat:stop_typing', (recipientId) => {
            io.to(`user_${recipientId}`).emit('chat:typing_stop', socket.userId);
        });

        // Cleanup on disconnect
        socket.on('disconnect', () => {
            if (socket.userId) {
                userSockets.delete(socket.userId);
                console.log(`🔌 User ${socket.userId} disconnected`);
            }
        });
    });

    console.log('✅ Friend chat Socket.IO initialized');
}

module.exports = { initializeFriendChatSocket };
