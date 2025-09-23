/**
 * SIMPLE CHAT - No authentication, no database, just works
 */

const express = require('express');
const router = express.Router();

// In-memory storage
const messages = [];
let messageId = 1;

/**
 * GET /api/simple-chat/conversation/:userId
 * Get conversation - NO AUTH REQUIRED
 */
router.get('/conversation/:userId', (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.query.userId || 'user-123';
    
    console.log(`📨 Simple chat conversation: ${currentUserId} <-> ${userId}`);
    
    // Get messages for this conversation
    const conversationMessages = messages.filter(msg => 
        (msg.senderId === currentUserId && msg.recipientId === userId) ||
        (msg.senderId === userId && msg.recipientId === currentUserId)
    );
    
    res.json({
        success: true,
        conversation: conversationMessages.map(msg => ({
            id: msg.id,
            sender_id: msg.senderId,
            recipient_id: msg.recipientId,
            body: msg.body,
            created_at: msg.timestamp,
            is_sender: msg.senderId === currentUserId,
            sender_name: msg.senderId === currentUserId ? 'You' : 'Friend'
        })),
        friend: {
            id: userId,
            fullName: 'Silviu Timaru',
            username: 'silviu',
            status: 'online'
        },
        count: conversationMessages.length
    });
});

/**
 * POST /api/simple-chat/send
 * Send message - NO AUTH REQUIRED
 */
router.post('/send', (req, res) => {
    const { recipientId, message, userId } = req.body;
    const senderId = userId || 'user-123';
    
    if (!recipientId || !message) {
        return res.status(400).json({
            success: false,
            error: 'Recipient ID and message are required'
        });
    }
    
    console.log(`💬 Simple chat send: ${senderId} -> ${recipientId}: ${message}`);
    
    // Create message
    const newMessage = {
        id: messageId++,
        senderId: senderId,
        recipientId: recipientId,
        body: message.trim(),
        timestamp: new Date().toISOString()
    };
    
    // Store message
    messages.push(newMessage);
    
    res.json({
        success: true,
        message: {
            id: newMessage.id,
            senderId: newMessage.senderId,
            recipientId: newMessage.recipientId,
            body: newMessage.body,
            createdAt: newMessage.timestamp,
            sender: {
                id: senderId,
                fullName: 'You',
                username: 'user',
                status: 'online'
            }
        }
    });
});

module.exports = router;
