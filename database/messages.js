const { getDb } = require('./connection');

/**
 * Save a message to the database (legacy function for backward compatibility)
 * @param {string} senderId - ID of the message sender
 * @param {string} recipientId - ID of the message recipient
 * @param {string} body - Message content
 * @returns {Object} Success status and message data
 */
async function saveMessage(senderId, recipientId, body) {
  try {
    const db = getDb();
    
    // Validate inputs
    if (!senderId || !recipientId || !body) {
      throw new Error('Missing required fields: senderId, recipientId, and body are required');
    }
    
    if (typeof body !== 'string' || body.trim().length === 0) {
      throw new Error('Message body must be a non-empty string');
    }
    
    // For backward compatibility, save as both original and translated text
    // This maintains compatibility with existing code while supporting multilingual features
    const result = await db.query(
      `INSERT INTO messages (sender_id, recipient_id, body, original_text, translated_text, original_lang, translated_lang, created_at)
       VALUES ($1, $2, $3, $3, $3, 'en', 'en', NOW())
       RETURNING id, sender_id, recipient_id, body, created_at`,
      [senderId, recipientId, body.trim()]
    );
    
    console.log(`✅ Message saved (legacy): ${senderId} -> ${recipientId}`);
    
    return {
      success: true,
      message: result.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Error saving message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get recent conversation between two users
 * @param {string} userA - First user ID
 * @param {string} userB - Second user ID
 * @param {number} limit - Maximum number of messages to retrieve (default: 50)
 * @returns {Object} Success status and messages array
 */
async function getRecentConversation(userA, userB, limit = 50) {
  try {
    const db = getDb();
    
    // Validate inputs
    if (!userA || !userB) {
      throw new Error('Both userA and userB are required');
    }
    
    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 1000)) {
      throw new Error('Limit must be a number between 1 and 1000');
    }
    
    // Get messages between the two users, ordered by newest first
    const result = await db.query(
      `SELECT id, sender_id, recipient_id, body, created_at
       FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at DESC
       LIMIT $3`,
      [userA, userB, limit]
    );
    
    console.log(`📨 Retrieved ${result.rows.length} messages between ${userA} and ${userB}`);
    
    return {
      success: true,
      messages: result.rows,
      count: result.rows.length,
      userA,
      userB,
      limit
    };
    
  } catch (error) {
    console.error('❌ Error retrieving conversation:', error);
    return {
      success: false,
      error: error.message,
      messages: []
    };
  }
}

/**
 * Save a multilingual message with translation
 * @param {string|number} senderId - ID of the message sender
 * @param {string|number} recipientId - ID of the message recipient
 * @param {string} originalText - Original message text
 * @param {string} translatedText - Translated message text
 * @param {string} originalLang - Original language code
 * @param {string} translatedLang - Translated language code
 * @returns {Object} Success status and message data
 */
async function saveMultilingualMessage(senderId, recipientId, originalText, translatedText, originalLang, translatedLang) {
  try {
    const db = getDb();
    
    // Validate inputs
    if (!senderId || !recipientId || !originalText || !translatedText || !originalLang || !translatedLang) {
      throw new Error('Missing required fields: senderId, recipientId, originalText, translatedText, originalLang, and translatedLang are required');
    }
    
    // Use the database function for multilingual messages
    const result = await db.query(
      'SELECT * FROM save_multilingual_message($1, $2, $3, $4, $5, $6)',
      [
        senderId.toString(),
        recipientId.toString(),
        originalText.trim(),
        translatedText.trim(),
        originalLang,
        translatedLang
      ]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Failed to save multilingual message');
    }
    
    console.log(`✅ Multilingual message saved: ${senderId} (${originalLang}) -> ${recipientId} (${translatedLang})`);
    
    return {
      success: true,
      message: result.rows[0]
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
 * Get multilingual conversation between two users
 * @param {string|number} userA - First user ID
 * @param {string|number} userB - Second user ID
 * @param {number} limit - Maximum number of messages to retrieve (default: 50)
 * @returns {Object} Success status and messages array with language context
 */
async function getMultilingualConversation(userA, userB, limit = 50) {
  try {
    const db = getDb();
    
    // Validate inputs
    if (!userA || !userB) {
      throw new Error('Both userA and userB are required');
    }
    
    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 1000)) {
      throw new Error('Limit must be a number between 1 and 1000');
    }
    
    // Get multilingual conversation using the database function
    const result = await db.query(
      'SELECT * FROM get_multilingual_conversation($1, $2, $3)',
      [userA.toString(), userB.toString(), limit]
    );
    
    console.log(`📨 Retrieved ${result.rows.length} multilingual messages between ${userA} and ${userB}`);
    
    return {
      success: true,
      messages: result.rows,
      count: result.rows.length,
      userA,
      userB,
      limit
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

module.exports = {
  saveMessage,
  getRecentConversation,
  saveMultilingualMessage,
  getMultilingualConversation
};
