-- ==============================================
-- MIVTON - COMPLETE CHAT SYSTEM MIGRATION
-- Phase 4.0 - Complete Working Chat System
-- ==============================================

-- 1. FIX MESSAGES TABLE - Unified schema for all chat functionality
-- Drop existing conflicting columns and recreate properly
ALTER TABLE messages DROP COLUMN IF EXISTS original_text;
ALTER TABLE messages DROP COLUMN IF EXISTS translated_text;
ALTER TABLE messages DROP COLUMN IF EXISTS original_lang;
ALTER TABLE messages DROP COLUMN IF EXISTS translated_lang;

-- Add complete chat schema
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS original_text TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS translated_text TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS original_lang VARCHAR(10) NOT NULL DEFAULT 'en',
ADD COLUMN IF NOT EXISTS translated_lang VARCHAR(10) NOT NULL DEFAULT 'en',
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice', 'video', 'system')),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reply_to_id BIGINT REFERENCES messages(id),
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update existing records
UPDATE messages 
SET original_text = body, 
    translated_text = body, 
    original_lang = 'en', 
    translated_lang = 'en'
WHERE original_text = '' OR original_text IS NULL;

-- 2. CREATE MESSAGE STATUS TRACKING TABLE
CREATE TABLE IF NOT EXISTS message_status (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, status)
);

-- 3. CREATE CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_id BIGINT REFERENCES messages(id),
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count_a INTEGER DEFAULT 0,
    unread_count_b INTEGER DEFAULT 0,
    is_muted_a BOOLEAN DEFAULT FALSE,
    is_muted_b BOOLEAN DEFAULT FALSE,
    is_archived_a BOOLEAN DEFAULT FALSE,
    is_archived_b BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_a, user_b)
);

-- 4. CREATE TYPING INDICATORS TABLE
CREATE TABLE IF NOT EXISTS typing_indicators (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_user_id)
);

-- 5. CREATE MESSAGE REACTIONS TABLE
CREATE TABLE IF NOT EXISTS message_reactions (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(10) NOT NULL, -- emoji or reaction type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, reaction)
);

-- 6. CREATE CHAT NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS chat_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
    notification_type VARCHAR(20) NOT NULL DEFAULT 'message' CHECK (notification_type IN ('message', 'typing', 'read', 'reaction')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_message_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON conversations(user_a);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON conversations(user_b);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_target ON typing_indicators(target_user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_user ON chat_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_notifications_unread ON chat_notifications(user_id, is_read) WHERE is_read = FALSE;

-- 8. CREATE FUNCTIONS FOR CHAT OPERATIONS

-- Function to save a complete message with status tracking
CREATE OR REPLACE FUNCTION save_complete_message(
    p_sender_id INTEGER,
    p_recipient_id INTEGER,
    p_body TEXT,
    p_original_text TEXT DEFAULT NULL,
    p_translated_text TEXT DEFAULT NULL,
    p_original_lang VARCHAR(10) DEFAULT 'en',
    p_translated_lang VARCHAR(10) DEFAULT 'en',
    p_message_type VARCHAR(20) DEFAULT 'text',
    p_reply_to_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    id BIGINT,
    sender_id INTEGER,
    recipient_id INTEGER,
    body TEXT,
    original_text TEXT,
    translated_text TEXT,
    original_lang VARCHAR(10),
    translated_lang VARCHAR(10),
    message_type VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP
) AS $$
DECLARE
    new_message_id BIGINT;
    conversation_id BIGINT;
BEGIN
    -- Insert the message
    INSERT INTO messages (
        sender_id, recipient_id, body, original_text, translated_text,
        original_lang, translated_lang, message_type, reply_to_id
    )
    VALUES (
        p_sender_id, p_recipient_id, p_body, 
        COALESCE(p_original_text, p_body), 
        COALESCE(p_translated_text, p_body),
        p_original_lang, p_translated_lang, p_message_type, p_reply_to_id
    )
    RETURNING messages.id INTO new_message_id;
    
    -- Update or create conversation
    INSERT INTO conversations (user_a, user_b, last_message_id, last_message_at, unread_count_b)
    VALUES (
        LEAST(p_sender_id, p_recipient_id),
        GREATEST(p_sender_id, p_recipient_id),
        new_message_id,
        CURRENT_TIMESTAMP,
        CASE WHEN p_recipient_id = GREATEST(p_sender_id, p_recipient_id) THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_a, user_b) 
    DO UPDATE SET
        last_message_id = new_message_id,
        last_message_at = CURRENT_TIMESTAMP,
        unread_count_b = CASE 
            WHEN conversations.user_b = p_recipient_id THEN conversations.unread_count_b + 1 
            ELSE conversations.unread_count_b 
        END,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Create message status for recipient
    INSERT INTO message_status (message_id, user_id, status)
    VALUES (new_message_id, p_recipient_id, 'sent');
    
    -- Create chat notification for recipient
    INSERT INTO chat_notifications (user_id, sender_id, message_id, notification_type)
    VALUES (p_recipient_id, p_sender_id, new_message_id, 'message');
    
    -- Return the created message
    RETURN QUERY
    SELECT m.id, m.sender_id, m.recipient_id, m.body, m.original_text, 
           m.translated_text, m.original_lang, m.translated_lang, 
           m.message_type, m.status, m.created_at
    FROM messages m
    WHERE m.id = new_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation between two users
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_user_a INTEGER,
    p_user_b INTEGER,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id BIGINT,
    sender_id INTEGER,
    recipient_id INTEGER,
    body TEXT,
    original_text TEXT,
    translated_text TEXT,
    original_lang VARCHAR(10),
    translated_lang VARCHAR(10),
    message_type VARCHAR(20),
    status VARCHAR(20),
    reply_to_id BIGINT,
    created_at TIMESTAMP,
    sender_name VARCHAR(100),
    sender_username VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id, m.sender_id, m.recipient_id, m.body, m.original_text,
        m.translated_text, m.original_lang, m.translated_lang,
        m.message_type, m.status, m.reply_to_id, m.created_at,
        u.full_name as sender_name, u.username as sender_username
    FROM messages m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE ((m.sender_id = p_user_a AND m.recipient_id = p_user_b)
        OR (m.sender_id = p_user_b AND m.recipient_id = p_user_a))
        AND m.is_deleted = FALSE
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_user_id INTEGER,
    p_sender_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Update message status to read
    UPDATE message_status 
    SET status = 'read', timestamp = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id 
        AND message_id IN (
            SELECT id FROM messages 
            WHERE sender_id = p_sender_id AND recipient_id = p_user_id
        )
        AND status != 'read';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Update conversation unread count
    UPDATE conversations 
    SET unread_count_a = 0
    WHERE user_a = p_user_id AND user_b = p_sender_id;
    
    UPDATE conversations 
    SET unread_count_b = 0
    WHERE user_b = p_user_id AND user_a = p_sender_id;
    
    -- Mark chat notifications as read
    UPDATE chat_notifications 
    SET is_read = TRUE
    WHERE user_id = p_user_id AND sender_id = p_sender_id;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user conversations with unread counts
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id INTEGER)
RETURNS TABLE(
    conversation_id BIGINT,
    friend_id INTEGER,
    friend_name VARCHAR(100),
    friend_username VARCHAR(20),
    friend_status VARCHAR(20),
    last_message_id BIGINT,
    last_message_text TEXT,
    last_message_at TIMESTAMP,
    unread_count INTEGER,
    is_muted BOOLEAN,
    is_archived BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        CASE 
            WHEN c.user_a = p_user_id THEN c.user_b 
            ELSE c.user_a 
        END as friend_id,
        u.full_name as friend_name,
        u.username as friend_username,
        u.status as friend_status,
        c.last_message_id,
        m.body as last_message_text,
        c.last_message_at,
        CASE 
            WHEN c.user_a = p_user_id THEN c.unread_count_a 
            ELSE c.unread_count_b 
        END as unread_count,
        CASE 
            WHEN c.user_a = p_user_id THEN c.is_muted_a 
            ELSE c.is_muted_b 
        END as is_muted,
        CASE 
            WHEN c.user_a = p_user_id THEN c.is_archived_a 
            ELSE c.is_archived_b 
        END as is_archived
    FROM conversations c
    LEFT JOIN users u ON u.id = CASE 
        WHEN c.user_a = p_user_id THEN c.user_b 
        ELSE c.user_a 
    END
    LEFT JOIN messages m ON m.id = c.last_message_id
    WHERE c.user_a = p_user_id OR c.user_b = p_user_id
    ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION save_complete_message TO current_user;
GRANT EXECUTE ON FUNCTION get_conversation_messages TO current_user;
GRANT EXECUTE ON FUNCTION mark_messages_as_read TO current_user;
GRANT EXECUTE ON FUNCTION get_user_conversations TO current_user;

-- 10. CREATE TRIGGERS FOR AUTOMATIC UPDATES
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
        SELECT id FROM conversations 
        WHERE (user_a = NEW.sender_id AND user_b = NEW.recipient_id)
           OR (user_a = NEW.recipient_id AND user_b = NEW.sender_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- 11. COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE messages IS 'Complete chat messages with multilingual support and status tracking';
COMMENT ON TABLE message_status IS 'Tracks delivery and read status for each message per user';
COMMENT ON TABLE conversations IS 'Manages conversation metadata and unread counts';
COMMENT ON TABLE typing_indicators IS 'Real-time typing indicators between users';
COMMENT ON TABLE message_reactions IS 'Message reactions (emojis, likes, etc.)';
COMMENT ON TABLE chat_notifications IS 'Chat-specific notifications for real-time delivery';

COMMENT ON FUNCTION save_complete_message IS 'Save a message with complete status tracking and conversation management';
COMMENT ON FUNCTION get_conversation_messages IS 'Retrieve conversation messages with user information';
COMMENT ON FUNCTION mark_messages_as_read IS 'Mark messages as read and update unread counts';
COMMENT ON FUNCTION get_user_conversations IS 'Get all conversations for a user with metadata';
