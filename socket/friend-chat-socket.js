/**
 * 💬 SIMPLE FRIEND CHAT - Socket.IO Handler
 * Dead simple real-time messaging
 */

const OpenAI = require('openai');
const { pool } = require('../database/connection');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Get recipient's preferred language from database
 * @param {number} userId - User ID to look up
 * @returns {Promise<string>} - Language code (defaults to 'en')
 */
async function getRecipientLanguage(userId) {
    try {
        const result = await pool.query(
            'SELECT native_language FROM users WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length > 0 && result.rows[0].native_language) {
            return result.rows[0].native_language;
        }
        
        return 'en'; // Default to English
    } catch (error) {
        console.error('❌ Error fetching recipient language:', error);
        return 'en'; // Default to English on error
    }
}

/**
 * Translate message content using OpenAI
 * @param {string} content - Message content to translate
 * @param {string} sourceLanguage - Source language code
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} - Translated content (or original on error)
 */
async function translateMessage(content, sourceLanguage, targetLanguage) {
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a chat translator. Translate the following user message from ' + sourceLanguage + ' to ' + targetLanguage + '. Return ONLY the translated text.'
                },
                {
                    role: 'user',
                    content: content
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });
        
        const translatedText = completion.choices[0]?.message?.content?.trim();
        return translatedText || content;
    } catch (error) {
        console.error('❌ Error translating message:', error);
        return content; // Return original content on error
    }
}

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
        socket.on('chat:message', async (data) => {
            const { recipientId, messageData } = data;

            console.log(`📨 Message from ${socket.userId} to ${recipientId}`);
            console.log(`🔍 Recipient socket:`, userSockets.get(recipientId));

            // Extract sender's preferred language from payload
            const senderLang = messageData.sender_pref_lang || 'en';
            console.log(`📤 Sender language: ${senderLang}`);

            // Get recipient's preferred language
            const targetLang = await getRecipientLanguage(recipientId);
            console.log(`📥 Recipient language: ${targetLang}`);

            // Translate message if recipient's language differs from sender's
            if (targetLang !== senderLang) {
                console.log(`🔄 Translating message from ${senderLang} to ${targetLang}...`);
                
                // Store original content
                messageData.original_content = messageData.content;
                
                // Translate and replace content
                const translatedContent = await translateMessage(messageData.content, senderLang, targetLang);
                messageData.content = translatedContent;
                
                console.log(`✅ Message translated from "${messageData.original_content}" to "${translatedContent}"`);
            } else {
                console.log(`⏭️ Skipping translation - both users use ${senderLang}`);
            }

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
