/**
 * Multilingual Chat API Routes
 * Handles chat messages with automatic translation using OpenAI
 */

const express = require('express');
const router = express.Router();
const multilingualMessagesService = require('../services/multilingual-messages');
const translationService = require('../services/openai-translation');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    next();
};

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/chat/send
 * Send a multilingual message
 */
router.post('/send', async (req, res) => {
    try {
        const { recipientId, message, language } = req.body;
        const senderId = req.session.userId;

        // Validate input
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

        console.log(`💬 Sending message: ${senderId} -> ${recipientId}`);

        // Save multilingual message (translation happens automatically)
        const result = await multilingualMessagesService.saveMultilingualMessage(
            senderId,
            recipientId,
            message.trim(),
            language // Optional: sender's language if provided
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to send message'
            });
        }

        // Return success with message details
        res.json({
            success: true,
            message: result.message,
            translation: result.translation
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/conversation/:userId
 * Get conversation with a specific user
 */
router.get('/conversation/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.session.userId;
        const { limit = 50 } = req.query;

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

        // Get multilingual conversation
        const result = await multilingualMessagesService.getMultilingualConversation(
            currentUserId,
            userId,
            parseInt(limit),
            currentUserId // Requesting user for language context
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to retrieve conversation'
            });
        }

        res.json({
            success: true,
            conversation: result.messages,
            count: result.count,
            userA: result.userA,
            userB: result.userB,
            requestingUserLang: result.requestingUserLang
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
 * GET /api/chat/recent
 * Get recent messages (inbox view)
 */
router.get('/recent', async (req, res) => {
    try {
        const currentUserId = req.session.userId;
        const { limit = 20 } = req.query;

        console.log(`📬 Getting recent messages for user: ${currentUserId}`);

        // Get recent messages
        const result = await multilingualMessagesService.getRecentMessages(
            currentUserId,
            parseInt(limit)
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to retrieve recent messages'
            });
        }

        res.json({
            success: true,
            messages: result.messages,
            count: result.count,
            userLang: result.userLang
        });

    } catch (error) {
        console.error('❌ Error getting recent messages:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/conversations
 * Get all conversations for current user
 */
router.get('/conversations', async (req, res) => {
    try {
        const currentUserId = req.session.userId;

        console.log(`📬 Getting conversations for user: ${currentUserId}`);

        // Get recent messages which represent conversations
        const result = await multilingualMessagesService.getRecentMessages(
            currentUserId,
            50 // Get more conversations
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to retrieve conversations'
            });
        }

        // Transform messages into conversations format
        const conversations = result.messages.map(msg => ({
            id: msg.conversation_partner,
            userId: msg.conversation_partner,
            fullName: msg.conversation_partner_name,
            lastMessage: msg.display_text,
            lastMessageTime: msg.created_at,
            unreadCount: 0 // TODO: Implement unread count
        }));

        res.json({
            success: true,
            conversations: conversations,
            count: conversations.length
        });

    } catch (error) {
        console.error('❌ Error getting conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/chat/translate
 * Translate a message (utility endpoint)
 */
router.post('/translate', async (req, res) => {
    try {
        const { text, fromLang, toLang } = req.body;

        // Validate input
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }

        if (!fromLang || !toLang) {
            return res.status(400).json({
                success: false,
                error: 'Source and target languages are required'
            });
        }

        if (text.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Text too long (max 2000 characters)'
            });
        }

        console.log(`🌐 Translating: ${fromLang} -> ${toLang}`);

        // Translate the text
        const result = await translationService.translateText(text.trim(), fromLang, toLang);

        res.json({
            success: result.success,
            originalText: result.originalText,
            translatedText: result.translatedText,
            fromLang: result.fromLang,
            toLang: result.toLang,
            fromLanguageName: result.fromLanguageName,
            toLanguageName: result.toLanguageName,
            error: result.error
        });

    } catch (error) {
        console.error('❌ Error translating text:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/chat/detect-language
 * Detect language of a message (utility endpoint)
 */
router.post('/detect-language', async (req, res) => {
    try {
        const { text } = req.body;

        // Validate input
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Text is required'
            });
        }

        if (text.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Text too long (max 2000 characters)'
            });
        }

        console.log(`🔍 Detecting language for: "${text.substring(0, 50)}..."`);

        // Detect language
        const result = await translationService.detectLanguage(text.trim());

        res.json({
            success: result.success,
            detectedLang: result.detectedLang,
            languageName: result.languageName,
            confidence: result.confidence,
            error: result.error
        });

    } catch (error) {
        console.error('❌ Error detecting language:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/status
 * Get chat service status
 */
router.get('/status', async (req, res) => {
    try {
        const status = await multilingualMessagesService.getStatus();

        res.json({
            success: true,
            status: status
        });

    } catch (error) {
        console.error('❌ Error getting chat status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/chat/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
    try {
        // Return supported languages with their codes and names
        const languages = [
            { code: 'en', name: 'English' },
            { code: 'ro', name: 'Romanian' },
            { code: 'hu', name: 'Hungarian' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'it', name: 'Italian' },
            { code: 'pt', name: 'Portuguese' },
            { code: 'ru', name: 'Russian' },
            { code: 'zh', name: 'Chinese' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' },
            { code: 'ar', name: 'Arabic' },
            { code: 'hi', name: 'Hindi' },
            { code: 'th', name: 'Thai' },
            { code: 'vi', name: 'Vietnamese' },
            { code: 'pl', name: 'Polish' },
            { code: 'nl', name: 'Dutch' },
            { code: 'sv', name: 'Swedish' },
            { code: 'da', name: 'Danish' },
            { code: 'no', name: 'Norwegian' },
            { code: 'fi', name: 'Finnish' },
            { code: 'cs', name: 'Czech' },
            { code: 'sk', name: 'Slovak' },
            { code: 'bg', name: 'Bulgarian' },
            { code: 'hr', name: 'Croatian' },
            { code: 'sr', name: 'Serbian' },
            { code: 'sl', name: 'Slovenian' },
            { code: 'et', name: 'Estonian' },
            { code: 'lv', name: 'Latvian' },
            { code: 'lt', name: 'Lithuanian' },
            { code: 'uk', name: 'Ukrainian' },
            { code: 'el', name: 'Greek' },
            { code: 'tr', name: 'Turkish' },
            { code: 'he', name: 'Hebrew' },
            { code: 'fa', name: 'Persian' },
            { code: 'ur', name: 'Urdu' },
            { code: 'bn', name: 'Bengali' },
            { code: 'ta', name: 'Tamil' },
            { code: 'te', name: 'Telugu' },
            { code: 'ml', name: 'Malayalam' },
            { code: 'kn', name: 'Kannada' },
            { code: 'gu', name: 'Gujarati' },
            { code: 'pa', name: 'Punjabi' },
            { code: 'or', name: 'Odia' },
            { code: 'as', name: 'Assamese' },
            { code: 'ne', name: 'Nepali' },
            { code: 'si', name: 'Sinhala' },
            { code: 'my', name: 'Burmese' },
            { code: 'km', name: 'Khmer' },
            { code: 'lo', name: 'Lao' },
            { code: 'ka', name: 'Georgian' },
            { code: 'am', name: 'Amharic' },
            { code: 'sw', name: 'Swahili' },
            { code: 'zu', name: 'Zulu' },
            { code: 'af', name: 'Afrikaans' },
            { code: 'sq', name: 'Albanian' },
            { code: 'eu', name: 'Basque' },
            { code: 'be', name: 'Belarusian' },
            { code: 'bs', name: 'Bosnian' },
            { code: 'ca', name: 'Catalan' },
            { code: 'cy', name: 'Welsh' },
            { code: 'is', name: 'Icelandic' },
            { code: 'ga', name: 'Irish' },
            { code: 'mk', name: 'Macedonian' },
            { code: 'mt', name: 'Maltese' },
            { code: 'gl', name: 'Galician' }
        ];

        res.json({
            success: true,
            languages: languages,
            count: languages.length
        });

    } catch (error) {
        console.error('❌ Error getting supported languages:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

module.exports = router;
