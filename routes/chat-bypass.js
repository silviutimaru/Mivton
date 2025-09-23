/**
 * Chat API Routes with Authentication Bypass
 * This is a temporary solution to get chat working while we debug the auth issues
 */

const express = require('express');
const router = express.Router();
const { query, saveMessage, getConversation } = require('../database/query-adapter');

// Simple session check middleware (bypasses database validation)
const simpleAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
            error: 'Authentication required',
            redirectTo: '/login.html'
        });
    }
    
    // Set a minimal user object
    req.user = { 
        id: req.session.userId, 
        username: req.session.username || 'test_user', 
        full_name: req.session.fullName || 'Test User',
        is_admin: false 
    };
    
    next();
};

// Apply simple auth to all routes
router.use(simpleAuth);

/**
 * GET /api/chat/conversation/:userId
 * Get conversation with a specific user
 */
router.get('/conversation/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }

        if (userId === currentUserId.toString()) {
            return res.status(400).json({
                success: false,
                error: 'Cannot get conversation with yourself'
            });
        }

        console.log(`📨 Getting conversation: ${currentUserId} <-> ${userId}`);

        // Get conversation messages using database adapter
        const messages = await getConversation(currentUserId, userId, parseInt(limit), parseInt(offset));

        // Get friend information
        const friendResult = await query(
            'SELECT id, full_name, username, status FROM users WHERE id = $1',
            [userId]
        );

        const friend = friendResult.rows[0];

        if (!friend) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            conversation: messages,
            friend: {
                id: friend.id,
                fullName: friend.full_name,
                username: friend.username,
                status: friend.status
            },
            count: messages.length
        });

    } catch (error) {
        console.error('❌ Error getting conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/chat/send
 * Send a new message
 */
router.post('/send', async (req, res) => {
    const { recipientId, message, originalText, originalLang, translatedText, translatedLang } = req.body;
    const senderId = req.user.id;

    if (!recipientId || !message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Recipient ID and message are required'
        });
    }

    if (message.length > 2000) {
        return res.status(400).json({
            success: false,
            error: 'Message too long (max 2000 characters)'
        });
    }

    if (senderId === parseInt(recipientId)) {
        return res.status(400).json({
            success: false,
            error: 'Cannot send message to yourself'
        });
    }

    console.log(`💬 Sending message: ${senderId} -> ${recipientId}`);

    try {
        // Save message using database adapter
        const savedMessage = await saveMessage(
            senderId, 
            parseInt(recipientId), 
            message.trim(),
            originalText || message.trim(),
            translatedText || message.trim(),
            originalLang,
            translatedLang
        );

        if (!savedMessage) {
            return res.status(500).json({
                success: false,
                error: 'Failed to save message'
            });
        }

        // Get sender information
        const senderResult = await query(
            'SELECT id, full_name, username, status FROM users WHERE id = $1',
            [senderId]
        );

        const sender = senderResult.rows[0];

        // Return success with complete message data
        res.json({
            success: true,
            message: {
                id: savedMessage.id,
                senderId: savedMessage.sender_id,
                recipientId: savedMessage.recipient_id,
                body: savedMessage.body,
                originalText: savedMessage.original_text,
                translatedText: savedMessage.translated_text,
                originalLang: savedMessage.original_lang,
                translatedLang: savedMessage.translated_lang,
                createdAt: savedMessage.created_at,
                sender: {
                    id: sender.id,
                    fullName: sender.full_name,
                    username: sender.username,
                    status: sender.status
                }
            }
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
