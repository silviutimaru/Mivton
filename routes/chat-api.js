const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');

// Middleware to ensure user is authenticated
function requireAuth(req, res, next) {
    if (!req.session.user && !req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// GET /api/chat/conversations - Get user's conversations
router.get('/conversations', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        console.log(`🔍 Loading conversations for user ${userId}`);
        
        // First, check if chat tables exist
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'chat_conversations'
            ) as table_exists
        `);
        
        if (!tableCheck.rows[0].table_exists) {
            console.log('⚠️ Chat tables do not exist yet');
            return res.json({
                success: true,
                conversations: [],
                message: 'Chat tables not initialized yet'
            });
        }

        // Debug: Check what conversations exist
        const debugResult = await pool.query(`
            SELECT id, participant_1, participant_2 FROM chat_conversations
        `);
        console.log(`🔍 All conversations in DB:`, debugResult.rows);
        console.log(`🔍 Looking for userId: ${userId} (type: ${typeof userId})`);

        const result = await pool.query(`
            SELECT
                c.id,
                c.participant_1,
                c.participant_2,
                c.created_at,
                c.updated_at,
                c.last_message_id,
                CASE
                    WHEN c.participant_1 = $1 THEN (SELECT username FROM users WHERE id = c.participant_2)
                    ELSE (SELECT username FROM users WHERE id = c.participant_1)
                END as other_username,
                CASE
                    WHEN c.participant_1 = $1 THEN c.participant_2
                    ELSE c.participant_1
                END as other_user_id,
                (SELECT message_content FROM chat_messages WHERE id = c.last_message_id) as last_message_content,
                (SELECT created_at FROM chat_messages WHERE id = c.last_message_id) as last_message_time,
                (SELECT sender_id FROM chat_messages WHERE id = c.last_message_id) as last_message_sender,
                (
                    SELECT COUNT(*)::integer
                    FROM chat_messages cm
                    WHERE cm.conversation_id = c.id
                    AND cm.sender_id != $1
                    AND NOT EXISTS (
                        SELECT 1 FROM message_status ms
                        WHERE ms.message_id = cm.id
                        AND ms.user_id = $1
                        AND ms.status = 'read'
                    )
                ) as unread_count
            FROM chat_conversations c
            WHERE c.participant_1 = $1 OR c.participant_2 = $1
            ORDER BY COALESCE(c.updated_at, c.created_at) DESC
        `, [userId]);

        console.log(`✅ Found ${result.rows.length} conversations for user ${userId}`);
        console.log(`📋 Conversations data:`, JSON.stringify(result.rows, null, 2));
        
        res.json({
            success: true,
            conversations: result.rows
        });

    } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        console.error('❌ Full error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch conversations',
            details: error.message 
        });
    }
});

// POST /api/chat/messages - Send a new message
router.post('/messages', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const { recipientId, content } = req.body;

        console.log(`💬 POST /messages - User ${userId} sending to ${recipientId}`);
        console.log(`📝 Message content length: ${content?.length}`);

        if (!recipientId || !content || content.trim().length === 0) {
            console.log('❌ Missing recipient or content');
            return res.status(400).json({
                success: false,
                error: 'Recipient and message content are required'
            });
        }

        if (recipientId === userId) {
            console.log('❌ User trying to message themselves');
            return res.status(400).json({
                success: false,
                error: 'Cannot send message to yourself'
            });
        }

        // Check if chat tables exist
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'chat_conversations'
            ) as table_exists
        `);

        if (!tableCheck.rows[0].table_exists) {
            console.log('❌ Chat tables do not exist!');
            return res.status(500).json({
                success: false,
                error: 'Chat system not initialized'
            });
        }

        console.log('✅ Chat tables exist');

        // Check if recipient exists and is friends with sender
        const friendCheck = await pool.query(`
            SELECT 1 FROM friendships 
            WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
            AND status = 'active'
        `, [userId, recipientId]);

        if (friendCheck.rows.length === 0) {
            console.log(`❌ Users ${userId} and ${recipientId} are not friends`);
            return res.status(403).json({
                success: false,
                error: 'Can only send messages to friends'
            });
        }

        console.log(`✅ Friendship verified`);

        // Find or create conversation
        let conversationResult = await pool.query(`
            SELECT id FROM chat_conversations
            WHERE (participant_1 = $1 AND participant_2 = $2)
               OR (participant_1 = $2 AND participant_2 = $1)
        `, [userId, recipientId]);

        let conversationId;
        if (conversationResult.rows.length === 0) {
            console.log(`📝 Creating new conversation between ${userId} and ${recipientId}`);
            // Create new conversation
            const newConv = await pool.query(`
                INSERT INTO chat_conversations (participant_1, participant_2)
                VALUES ($1, $2)
                RETURNING id
            `, [Math.min(userId, recipientId), Math.max(userId, recipientId)]);
            conversationId = newConv.rows[0].id;
            console.log(`✅ Created conversation ${conversationId}`);
        } else {
            conversationId = conversationResult.rows[0].id;
            console.log(`✅ Using existing conversation ${conversationId}`);
        }

        // Insert message
        console.log(`💾 Saving message to conversation ${conversationId}`);
        const messageResult = await pool.query(`
            INSERT INTO chat_messages (conversation_id, sender_id, message_content)
            VALUES ($1, $2, $3)
            RETURNING id, created_at
        `, [conversationId, userId, content.trim()]);

        console.log(`✅ Message saved with ID ${messageResult.rows[0].id}`);

        const messageId = messageResult.rows[0].id;

        // Update conversation's last message
        await pool.query(`
            UPDATE chat_conversations 
            SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [messageId, conversationId]);

        // Create message status for recipient
        await pool.query(`
            INSERT INTO message_status (message_id, user_id, status)
            VALUES ($1, $2, 'delivered')
        `, [messageId, recipientId]);

        res.json({
            success: true,
            message: {
                id: messageId,
                conversation_id: conversationId,
                sender_id: userId,
                message_content: content.trim(),
                created_at: messageResult.rows[0].created_at
            }
        });

    } catch (error) {
        console.error('❌ Error sending message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to send message' 
        });
    }
});

// GET /api/chat/messages/:conversationId - Get messages in a conversation (with translation support)
router.get('/messages/:conversationId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const conversationId = parseInt(req.params.conversationId);
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = (page - 1) * limit;
        
        // Language parameter - if provided, translate messages to this language
        const requestedLanguage = req.query.language || null;

        console.log(`📖 GET /messages/${conversationId} - User: ${userId}, Language: ${requestedLanguage || 'none'}`);

        // Verify user is participant in conversation
        const convCheck = await pool.query(`
            SELECT 1 FROM chat_conversations 
            WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)
        `, [conversationId, userId]);

        if (convCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied to this conversation' 
            });
        }

        // Get user's preferred language if no language specified
        let targetLanguage = requestedLanguage;
        if (!targetLanguage) {
            try {
                const userPref = await pool.query(`
                    SELECT preferred_chat_language FROM users WHERE id = $1
                `, [userId]);
                targetLanguage = userPref.rows[0]?.preferred_chat_language || 'en';
                console.log(`📖 Using user's preferred language: ${targetLanguage}`);
            } catch (error) {
                targetLanguage = 'en';
                console.log(`⚠️ Could not fetch user preference, defaulting to: en`);
            }
        }

        // Get messages with sender info and translation fields
        const messages = await pool.query(`
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.message_content as content,
                m.original_language,
                m.translated_content,
                m.translation_language,
                m.is_translated,
                m.created_at,
                u.username as sender_username,
                ms.status as read_status
            FROM chat_messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = $2
            WHERE m.conversation_id = $1
            ORDER BY m.created_at DESC
            LIMIT $3 OFFSET $4
        `, [conversationId, userId, limit, offset]);

        // Process messages for translation
        const translationService = require('../services/openai-translation');
        const processedMessages = [];
        
        for (const msg of messages.rows) {
            const processedMsg = {
                id: msg.id,
                conversation_id: msg.conversation_id,
                sender_id: msg.sender_id,
                sender_username: msg.sender_username,
                content: msg.content,
                original_language: msg.original_language,
                created_at: msg.created_at,
                read_status: msg.read_status,
                translation: null
            };
            
            // Check if translation is needed
            if (targetLanguage && targetLanguage !== 'en') {
                // Check if we have cached translation
                if (msg.translation_language === targetLanguage && msg.translated_content) {
                    console.log(`📖 Cache hit: Message ${msg.id} already translated to ${targetLanguage}`);
                    processedMsg.translation = {
                        content: msg.translated_content,
                        language: targetLanguage,
                        isTranslated: true,
                        cached: true
                    };
                } else if (translationService.isAvailable()) {
                    // Need to translate - but do it in background to avoid slowing down response
                    // For now, just mark that translation is needed
                    processedMsg.translation = {
                        content: msg.content,
                        language: targetLanguage,
                        isTranslated: false,
                        needsTranslation: true
                    };
                }
            }
            
            processedMessages.push(processedMsg);
        }

        res.json({
            success: true,
            messages: processedMessages.reverse(), // Show oldest first
            displayLanguage: targetLanguage,
            pagination: {
                page,
                limit,
                hasMore: messages.rows.length === limit
            }
        });

    } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch messages' 
        });
    }
});

// PUT /api/chat/conversations/:conversationId/read - Mark all messages in conversation as read
router.put('/conversations/:conversationId/read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const conversationId = parseInt(req.params.conversationId);

        console.log(`📖 Marking conversation ${conversationId} as read for user ${userId}`);

        // Verify user is participant
        const convCheck = await pool.query(`
            SELECT 1 FROM chat_conversations
            WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)
        `, [conversationId, userId]);

        if (convCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Mark all messages from other user as read
        const result = await pool.query(`
            INSERT INTO message_status (message_id, user_id, status)
            SELECT cm.id, $2, 'read'
            FROM chat_messages cm
            WHERE cm.conversation_id = $1
            AND cm.sender_id != $2
            ON CONFLICT (message_id, user_id)
            DO UPDATE SET status = 'read', updated_at = CURRENT_TIMESTAMP
        `, [conversationId, userId]);

        console.log(`✅ Marked ${result.rowCount} messages as read`);

        res.json({ success: true, markedCount: result.rowCount });

    } catch (error) {
        console.error('❌ Error marking conversation as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
});

// PUT /api/chat/messages/:messageId/read - Mark message as read
router.put('/messages/:messageId/read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const messageId = parseInt(req.params.messageId);

        // Verify message exists and user is recipient
        const messageCheck = await pool.query(`
            SELECT m.id, m.sender_id, c.participant_1, c.participant_2
            FROM chat_messages m
            JOIN chat_conversations c ON m.conversation_id = c.id
            WHERE m.id = $1 
            AND (c.participant_1 = $2 OR c.participant_2 = $2)
            AND m.sender_id != $2
        `, [messageId, userId]);

        if (messageCheck.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Cannot mark this message as read' 
            });
        }

        // Check if message_status table exists and update or insert message status
        try {
            await pool.query(`
                INSERT INTO message_status (message_id, user_id, status, updated_at)
                VALUES ($1, $2, 'read', CURRENT_TIMESTAMP)
                ON CONFLICT (message_id, user_id) 
                DO UPDATE SET status = 'read', updated_at = CURRENT_TIMESTAMP
            `, [messageId, userId]);
        } catch (statusError) {
            console.error('⚠️ Error updating message status (table might not exist):', statusError.message);
            // Continue anyway - message read status is not critical
        }

        res.json({
            success: true,
            message: 'Message marked as read'
        });

    } catch (error) {
        console.error('❌ Error marking message as read:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to mark message as read' 
        });
    }
});

// ================================
// TRANSLATION ENDPOINTS
// ================================

// GET /api/chat/languages - Get supported languages
router.get('/languages', async (req, res) => {
    try {
        console.log('📋 GET /api/chat/languages');
        
        const translationService = require('../services/openai-translation');
        
        // Extract all languages from the translation service
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
        
        console.log(`✅ Returning ${languages.length} supported languages`);
        
        res.json({
            success: true,
            languages,
            total: languages.length,
            serviceAvailable: translationService.isAvailable()
        });
        
    } catch (error) {
        console.error('❌ Error fetching languages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch languages'
        });
    }
});

// PUT /api/chat/messages/:messageId/translate - Translate a specific message
router.put('/messages/:messageId/translate', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.userId;
        const messageId = parseInt(req.params.messageId);
        const { targetLanguage } = req.body;
        
        console.log(`🌐 Translate message ${messageId} to ${targetLanguage} for user ${userId}`);
        
        if (!targetLanguage) {
            return res.status(400).json({
                success: false,
                error: 'Target language is required'
            });
        }
        
        // Verify user has access to this message
        const messageCheck = await pool.query(`
            SELECT m.id, m.message_content, m.sender_id, m.original_language,
                   m.translated_content, m.translation_language, m.is_translated,
                   c.participant_1, c.participant_2
            FROM chat_messages m
            JOIN chat_conversations c ON m.conversation_id = c.id
            WHERE m.id = $1 
            AND (c.participant_1 = $2 OR c.participant_2 = $2)
        `, [messageId, userId]);
        
        if (messageCheck.rows.length === 0) {
            console.log(`❌ User ${userId} does not have access to message ${messageId}`);
            return res.status(403).json({
                success: false,
                error: 'Access denied to this message'
            });
        }
        
        const message = messageCheck.rows[0];
        console.log(`✅ Message found: "${message.message_content.substring(0, 50)}..."`);
        
        // Check if we already have this translation cached
        if (message.translation_language === targetLanguage && message.translated_content) {
            console.log(`📖 Cache hit: translation already exists for ${targetLanguage}`);
            return res.json({
                success: true,
                message: {
                    id: messageId,
                    original: message.message_content,
                    originalLanguage: message.original_language,
                    translated: message.translated_content,
                    targetLanguage: targetLanguage,
                    isTranslated: true,
                    cached: true
                }
            });
        }
        
        // Need to translate
        const translationService = require('../services/openai-translation');
        
        if (!translationService.isAvailable()) {
            console.log('⚠️ Translation service not available');
            return res.json({
                success: true,
                message: {
                    id: messageId,
                    original: message.message_content,
                    originalLanguage: message.original_language || 'unknown',
                    translated: message.message_content,
                    targetLanguage: targetLanguage,
                    isTranslated: false,
                    error: 'Translation service not available'
                }
            });
        }
        
        // Detect source language if not set
        let sourceLanguage = message.original_language;
        if (!sourceLanguage) {
            console.log(`🔍 Detecting language for message ${messageId}...`);
            const detectionResult = await translationService.detectLanguage(message.message_content);
            sourceLanguage = detectionResult.detectedLang || 'en';
            console.log(`✅ Detected language: ${sourceLanguage}`);
        }
        
        // Translate the message
        console.log(`🌐 Translating from ${sourceLanguage} to ${targetLanguage}...`);
        const startTime = Date.now();
        const translationResult = await translationService.translateText(
            message.message_content,
            sourceLanguage,
            targetLanguage
        );
        const duration = Date.now() - startTime;
        console.log(`🕐 Translation completed in ${duration}ms`);
        
        if (!translationResult.success) {
            console.log(`⚠️ Translation failed: ${translationResult.error}`);
            return res.json({
                success: true,
                message: {
                    id: messageId,
                    original: message.message_content,
                    originalLanguage: sourceLanguage,
                    translated: message.message_content,
                    targetLanguage: targetLanguage,
                    isTranslated: false,
                    error: translationResult.error
                }
            });
        }
        
        // Save translation to database
        await pool.query(`
            UPDATE chat_messages
            SET original_language = $1,
                translated_content = $2,
                translation_language = $3,
                is_translated = true
            WHERE id = $4
        `, [sourceLanguage, translationResult.translatedText, targetLanguage, messageId]);
        
        console.log(`✅ Translation saved to database`);
        
        res.json({
            success: true,
            message: {
                id: messageId,
                original: message.message_content,
                originalLanguage: sourceLanguage,
                translated: translationResult.translatedText,
                targetLanguage: targetLanguage,
                isTranslated: true,
                cached: false
            }
        });
        
    } catch (error) {
        console.error('❌ Error translating message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to translate message'
        });
    }
});

module.exports = router;