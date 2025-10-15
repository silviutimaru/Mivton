/**
 * Database-backed Chat Storage System
 * Replaces memory-based chat with persistent database storage
 */

const { getDb } = require('../database/connection');

class ChatStorage {
    constructor() {
        this.userSockets = new Map();   // userId -> Set of socketIds
        this.onlineUsers = new Set();   // Set of online userIds
        this.typingUsers = new Map();   // conversationId -> Set of typing userIds
    }

    /**
     * Get or create a conversation between two users
     */
    async getOrCreateConversation(user1Id, user2Id) {
        try {
            const db = getDb();
            
            // Ensure consistent ordering (smaller ID first)
            const participant1 = Math.min(user1Id, user2Id);
            const participant2 = Math.max(user1Id, user2Id);
            
            // Try to find existing conversation
            let result = await db.query(`
                SELECT id FROM chat_conversations 
                WHERE participant_1 = $1 AND participant_2 = $2
            `, [participant1, participant2]);
            
            if (result.rows.length > 0) {
                return result.rows[0].id;
            }
            
            // Create new conversation
            result = await db.query(`
                INSERT INTO chat_conversations (participant_1, participant_2)
                VALUES ($1, $2)
                RETURNING id
            `, [participant1, participant2]);
            
            console.log(`💬 Created new conversation ${result.rows[0].id} between users ${user1Id} and ${user2Id}`);
            return result.rows[0].id;
            
        } catch (error) {
            console.error('❌ Error creating conversation:', error);
            throw error;
        }
    }

    /**
     * Add a message to the database
     */
    async addMessage(senderId, recipientId, messageText, senderName) {
        try {
            const db = getDb();
            
            // Get or create conversation
            const conversationId = await this.getOrCreateConversation(senderId, recipientId);
            
            // Insert message
            const messageResult = await db.query(`
                INSERT INTO chat_messages (conversation_id, sender_id, message_content, message_type)
                VALUES ($1, $2, $3, 'text')
                RETURNING id, created_at
            `, [conversationId, senderId, messageText.trim()]);
            
            const messageId = messageResult.rows[0].id;
            const createdAt = messageResult.rows[0].created_at;
            
            // Update conversation last_message_id
            await db.query(`
                UPDATE chat_conversations 
                SET last_message_id = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [messageId, conversationId]);
            
            // Create message status for recipient
            await db.query(`
                INSERT INTO message_status (message_id, user_id, status)
                VALUES ($1, $2, 'sent')
            `, [messageId, recipientId]);
            
            const message = {
                id: messageId,
                senderId: senderId,
                senderName: senderName,
                messageText: messageText.trim(),
                timestamp: createdAt.toISOString(),
                conversationId: conversationId
            };
            
            console.log(`💬 Message ${messageId} saved to database for conversation ${conversationId}`);
            return message;
            
        } catch (error) {
            console.error('❌ Error adding message:', error);
            throw error;
        }
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(user1Id, user2Id, limit = 50, offset = 0) {
        try {
            const db = getDb();
            
            // Ensure consistent ordering
            const participant1 = Math.min(user1Id, user2Id);
            const participant2 = Math.max(user1Id, user2Id);
            
            // Get conversation ID first
            const convResult = await db.query(`
                SELECT id FROM chat_conversations 
                WHERE participant_1 = $1 AND participant_2 = $2
            `, [participant1, participant2]);
            
            if (convResult.rows.length === 0) {
                return []; // No conversation exists yet
            }
            
            const conversationId = convResult.rows[0].id;
            
            // Get messages
            const result = await db.query(`
                SELECT 
                    cm.id,
                    cm.sender_id as "senderId",
                    u.username as "senderName",
                    cm.message_content as "messageText",
                    cm.created_at,
                    cm.conversation_id as "conversationId"
                FROM chat_messages cm
                JOIN users u ON cm.sender_id = u.id
                WHERE cm.conversation_id = $1 
                AND cm.deleted_at IS NULL
                ORDER BY cm.created_at DESC
                LIMIT $2 OFFSET $3
            `, [conversationId, limit, offset]);
            
            // Convert to expected format and reverse order (oldest first)
            const messages = result.rows.map(row => ({
                id: row.id,
                senderId: row.senderId,
                senderName: row.senderName,
                messageText: row.messageText,
                timestamp: row.created_at.toISOString(),
                conversationId: row.conversationId
            })).reverse();
            
            console.log(`💬 Retrieved ${messages.length} messages for conversation ${conversationId}`);
            return messages;
            
        } catch (error) {
            console.error('❌ Error getting messages:', error);
            return [];
        }
    }

    /**
     * Get conversation ID between two users
     */
    getConversationId(user1Id, user2Id) {
        const sortedIds = [user1Id, user2Id].sort((a, b) => a - b);
        return `${sortedIds[0]}-${sortedIds[1]}`;
    }

    /**
     * Socket management methods (keeping in memory for real-time functionality)
     */
    addUserSocket(userId, socketId) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socketId);
        this.onlineUsers.add(userId);
    }

    removeUserSocket(userId, socketId) {
        if (this.userSockets.has(userId)) {
            this.userSockets.get(userId).delete(socketId);
            if (this.userSockets.get(userId).size === 0) {
                this.userSockets.delete(userId);
                this.onlineUsers.delete(userId);
            }
        }
    }

    getUserSockets(userId) {
        return this.userSockets.get(userId) || new Set();
    }

    isUserOnline(userId) {
        return this.onlineUsers.has(userId);
    }

    /**
     * Typing indicator methods
     */
    setUserTyping(conversationId, userId) {
        if (!this.typingUsers.has(conversationId)) {
            this.typingUsers.set(conversationId, new Set());
        }
        this.typingUsers.get(conversationId).add(userId);
    }

    setUserNotTyping(conversationId, userId) {
        if (this.typingUsers.has(conversationId)) {
            this.typingUsers.get(conversationId).delete(userId);
            if (this.typingUsers.get(conversationId).size === 0) {
                this.typingUsers.delete(conversationId);
            }
        }
    }

    getTypingUsers(conversationId) {
        return Array.from(this.typingUsers.get(conversationId) || new Set());
    }

    /**
     * Get user's conversations with last message preview
     */
    async getUserConversations(userId, limit = 20) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT 
                    cc.id as conversation_id,
                    CASE 
                        WHEN cc.participant_1 = $1 THEN cc.participant_2
                        ELSE cc.participant_1
                    END as other_user_id,
                    u.username as other_username,
                    u.full_name as other_full_name,
                    cm.message_content as last_message,
                    cm.created_at as last_message_time,
                    cm.sender_id as last_message_sender,
                    cc.updated_at
                FROM chat_conversations cc
                JOIN users u ON (
                    CASE 
                        WHEN cc.participant_1 = $1 THEN u.id = cc.participant_2
                        ELSE u.id = cc.participant_1
                    END
                )
                LEFT JOIN chat_messages cm ON cc.last_message_id = cm.id
                WHERE cc.participant_1 = $1 OR cc.participant_2 = $1
                ORDER BY cc.updated_at DESC
                LIMIT $2
            `, [userId, limit]);
            
            return result.rows.map(row => ({
                conversationId: row.conversation_id,
                otherUser: {
                    id: row.other_user_id,
                    username: row.other_username,
                    fullName: row.other_full_name
                },
                lastMessage: {
                    content: row.last_message,
                    timestamp: row.last_message_time ? row.last_message_time.toISOString() : null,
                    senderId: row.last_message_sender
                },
                updatedAt: row.updated_at.toISOString()
            }));
            
        } catch (error) {
            console.error('❌ Error getting user conversations:', error);
            return [];
        }
    }

    /**
     * Mark messages as read
     */
    async markMessagesAsRead(conversationId, userId) {
        try {
            const db = getDb();
            
            await db.query(`
                UPDATE message_status 
                SET status = 'read', status_timestamp = CURRENT_TIMESTAMP
                WHERE message_id IN (
                    SELECT id FROM chat_messages 
                    WHERE conversation_id = $1 
                    AND sender_id != $2
                )
                AND user_id = $2
                AND status != 'read'
            `, [conversationId, userId]);
            
            console.log(`👁️ Marked messages as read for user ${userId} in conversation ${conversationId}`);
            
        } catch (error) {
            console.error('❌ Error marking messages as read:', error);
        }
    }

    /**
     * Get unread message count
     */
    async getUnreadMessageCount(userId) {
        try {
            const db = getDb();
            
            const result = await db.query(`
                SELECT COUNT(*) as unread_count
                FROM message_status ms
                JOIN chat_messages cm ON ms.message_id = cm.id
                JOIN chat_conversations cc ON cm.conversation_id = cc.id
                WHERE ms.user_id = $1 
                AND ms.status = 'sent'
                AND (cc.participant_1 = $1 OR cc.participant_2 = $1)
            `, [userId]);
            
            return parseInt(result.rows[0].unread_count) || 0;
            
        } catch (error) {
            console.error('❌ Error getting unread message count:', error);
            return 0;
        }
    }

    /**
     * Clean up old data (periodic cleanup)
     */
    async cleanup() {
        try {
            const db = getDb();
            
            // Clean up old typing indicators
            this.typingUsers.clear();
            
            // Optional: Clean up very old messages (older than 1 year)
            await db.query(`
                UPDATE chat_messages 
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '1 year')
                AND deleted_at IS NULL
            `);
            
            console.log('🧹 Chat storage cleanup completed');
            
        } catch (error) {
            console.error('❌ Error during chat cleanup:', error);
        }
    }
}

// Create singleton instance
const chatStorage = new ChatStorage();

module.exports = { chatStorage, ChatStorage };