/**
 * Multilingual Messages Service
 * Handles saving and retrieving chat messages with automatic translation
 */

const { getDb } = require('../database/connection');
const translationService = require('./openai-translation');

class MultilingualMessagesService {
    constructor() {
        this.db = null;
        this.initializeDatabase();
    }

    /**
     * Initialize database connection
     */
    initializeDatabase() {
        try {
            this.db = getDb();
            console.log('✅ Multilingual Messages Service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize database connection:', error);
            this.db = null;
        }
    }

    /**
     * Get user's preferred language
     * @param {string|number} userId - User ID
     * @returns {Promise<string>} User's preferred language code
     */
    async getUserLanguage(userId) {
        if (!this.db) {
            return 'en'; // Default fallback
        }

        try {
            // First try to get from users table
            const userResult = await this.db.query(
                'SELECT native_language FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length > 0 && userResult.rows[0].native_language) {
                return userResult.rows[0].native_language;
            }

            // If not found, try language_preferences table
            const prefResult = await this.db.query(
                'SELECT language_code FROM language_preferences WHERE user_id = $1 AND is_primary = true',
                [userId]
            );

            if (prefResult.rows.length > 0) {
                return prefResult.rows[0].language_code;
            }

            return 'en'; // Default fallback
        } catch (error) {
            console.error('❌ Error getting user language:', error);
            return 'en'; // Default fallback
        }
    }

    /**
     * Save a multilingual message
     * @param {string|number} senderId - Sender's user ID
     * @param {string|number} recipientId - Recipient's user ID
     * @param {string} messageText - Original message text
     * @param {string} senderLang - Sender's language (optional, will be detected if not provided)
     * @returns {Promise<Object>} Save result with translation info
     */
    async saveMultilingualMessage(senderId, recipientId, messageText, senderLang = null) {
        if (!this.db) {
            return {
                success: false,
                error: 'Database not available'
            };
        }

        try {
            // Get sender's language if not provided
            if (!senderLang) {
                senderLang = await this.getUserLanguage(senderId);
            }

            // Get recipient's language
            const recipientLang = await this.getUserLanguage(recipientId);

            console.log(`💬 Saving message: ${senderId} (${senderLang}) -> ${recipientId} (${recipientLang})`);

            // Translate the message if needed
            let translationResult = null;
            let translatedText = messageText;

            if (senderLang !== recipientLang) {
                console.log('🌐 Translation needed:', senderLang, '->', recipientLang);
                translationResult = await translationService.translateText(
                    messageText, 
                    senderLang, 
                    recipientLang
                );

                if (translationResult.success) {
                    translatedText = translationResult.translatedText;
                } else {
                    console.warn('⚠️ Translation failed, using original text:', translationResult.error);
                    // Continue with original text as fallback
                }
            } else {
                console.log('✅ No translation needed - same language');
                translationResult = {
                    success: true,
                    originalText: messageText,
                    translatedText: messageText,
                    fromLang: senderLang,
                    toLang: recipientLang
                };
            }

            // Save to database using the new function
            const result = await this.db.query(
                'SELECT * FROM save_multilingual_message($1, $2, $3, $4, $5, $6)',
                [
                    senderId.toString(),
                    recipientId.toString(),
                    messageText,
                    translatedText,
                    senderLang,
                    recipientLang
                ]
            );

            if (result.rows.length === 0) {
                throw new Error('Failed to save message to database');
            }

            const savedMessage = result.rows[0];

            console.log('✅ Message saved successfully:', savedMessage.id);

            return {
                success: true,
                message: {
                    id: savedMessage.id,
                    senderId: savedMessage.sender_id,
                    recipientId: savedMessage.recipient_id,
                    originalText: savedMessage.original_text,
                    translatedText: savedMessage.translated_text,
                    originalLang: savedMessage.original_lang,
                    translatedLang: savedMessage.translated_lang,
                    createdAt: savedMessage.created_at,
                    body: savedMessage.body // This contains the translated text for display
                },
                translation: translationResult
            };

        } catch (error) {
            console.error('❌ Error saving multilingual message:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get conversation between two users with multilingual support
     * @param {string|number} userA - First user ID
     * @param {string|number} userB - Second user ID
     * @param {number} limit - Maximum number of messages to retrieve
     * @param {string} requestingUserId - ID of user requesting the conversation (for language context)
     * @returns {Promise<Object>} Conversation result
     */
    async getMultilingualConversation(userA, userB, limit = 50, requestingUserId = null) {
        if (!this.db) {
            return {
                success: false,
                error: 'Database not available',
                messages: []
            };
        }

        try {
            // Get conversation using the new function
            const result = await this.db.query(
                'SELECT * FROM get_multilingual_conversation($1, $2, $3)',
                [userA.toString(), userB.toString(), limit]
            );

            const messages = result.rows;

            // If we have a requesting user, we can provide additional context
            let requestingUserLang = null;
            if (requestingUserId) {
                requestingUserLang = await this.getUserLanguage(requestingUserId);
            }

            console.log(`📨 Retrieved ${messages.length} messages between ${userA} and ${userB}`);

            return {
                success: true,
                messages: messages.map(msg => ({
                    id: msg.id,
                    senderId: msg.sender_id,
                    recipientId: msg.recipient_id,
                    body: msg.body, // Translated text for display
                    originalText: msg.original_text,
                    translatedText: msg.translated_text,
                    originalLang: msg.original_lang,
                    translatedLang: msg.translated_lang,
                    createdAt: msg.created_at,
                    senderName: msg.sender_name,
                    recipientName: msg.recipient_name,
                    // Additional context for frontend
                    isOriginalLanguage: requestingUserLang ? msg.original_lang === requestingUserLang : false,
                    displayText: requestingUserLang && msg.original_lang === requestingUserLang 
                        ? msg.original_text 
                        : msg.translated_text
                })),
                count: messages.length,
                userA,
                userB,
                limit,
                requestingUserLang
            };

        } catch (error) {
            console.error('❌ Error retrieving multilingual conversation:', error);
            return {
                success: false,
                error: error.message,
                messages: []
            };
        }
    }

    /**
     * Get recent messages for a user (inbox view)
     * @param {string|number} userId - User ID
     * @param {number} limit - Maximum number of messages to retrieve
     * @returns {Promise<Object>} Recent messages result
     */
    async getRecentMessages(userId, limit = 20) {
        if (!this.db) {
            return {
                success: false,
                error: 'Database not available',
                messages: []
            };
        }

        try {
            const userLang = await this.getUserLanguage(userId);

            const result = await this.db.query(`
                SELECT DISTINCT ON (conversation_partner) 
                    m.*,
                    CASE 
                        WHEN m.sender_id = $1 THEN m.recipient_id
                        ELSE m.sender_id
                    END as conversation_partner,
                    CASE 
                        WHEN m.sender_id = $1 THEN r.full_name
                        ELSE s.full_name
                    END as conversation_partner_name,
                    CASE 
                        WHEN m.sender_id = $1 THEN m.translated_text
                        ELSE m.translated_text
                    END as display_text
                FROM messages m
                LEFT JOIN users s ON s.id::TEXT = m.sender_id
                LEFT JOIN users r ON r.id::TEXT = m.recipient_id
                WHERE m.sender_id = $1 OR m.recipient_id = $1
                ORDER BY conversation_partner, m.created_at DESC
                LIMIT $2
            `, [userId.toString(), limit]);

            const messages = result.rows;

            console.log(`📬 Retrieved ${messages.length} recent messages for user ${userId}`);

            return {
                success: true,
                messages: messages.map(msg => ({
                    id: msg.id,
                    senderId: msg.sender_id,
                    recipientId: msg.recipient_id,
                    body: msg.display_text,
                    originalText: msg.original_text,
                    translatedText: msg.translated_text,
                    originalLang: msg.original_lang,
                    translatedLang: msg.translated_lang,
                    createdAt: msg.created_at,
                    conversationPartner: msg.conversation_partner,
                    conversationPartnerName: msg.conversation_partner_name,
                    isFromMe: msg.sender_id === userId.toString()
                })),
                count: messages.length,
                userLang
            };

        } catch (error) {
            console.error('❌ Error retrieving recent messages:', error);
            return {
                success: false,
                error: error.message,
                messages: []
            };
        }
    }

    /**
     * Get service status
     */
    async getStatus() {
        const dbStatus = this.db ? 'connected' : 'disconnected';
        const translationStatus = await translationService.getStatus();

        return {
            database: dbStatus,
            translation: translationStatus,
            available: this.db !== null && translationStatus.available
        };
    }
}

// Create singleton instance
const multilingualMessagesService = new MultilingualMessagesService();

module.exports = multilingualMessagesService;
