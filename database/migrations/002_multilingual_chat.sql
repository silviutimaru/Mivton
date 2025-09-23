-- ==============================================
-- MIVTON - MULTILINGUAL CHAT MIGRATION
-- Phase 3.3 - Full-Stack Multilingual Chat Implementation
-- ==============================================

-- Update the existing messages table to support multilingual features
-- Add new columns for original and translated text, and language information

-- Add new columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS original_text TEXT,
ADD COLUMN IF NOT EXISTS translated_text TEXT,
ADD COLUMN IF NOT EXISTS original_lang VARCHAR(10),
ADD COLUMN IF NOT EXISTS translated_lang VARCHAR(10);

-- Update existing records to have original_text same as body (for backward compatibility)
UPDATE messages 
SET original_text = body, 
    original_lang = 'en', 
    translated_text = body, 
    translated_lang = 'en'
WHERE original_text IS NULL;

-- Make original_text NOT NULL after updating existing records
ALTER TABLE messages ALTER COLUMN original_text SET NOT NULL;
ALTER TABLE messages ALTER COLUMN translated_text SET NOT NULL;
ALTER TABLE messages ALTER COLUMN original_lang SET NOT NULL;
ALTER TABLE messages ALTER COLUMN translated_lang SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_original_lang ON messages(original_lang);
CREATE INDEX IF NOT EXISTS idx_messages_translated_lang ON messages(translated_lang);
CREATE INDEX IF NOT EXISTS idx_messages_sender_time ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_time ON messages(recipient_id, created_at DESC);

-- Create a function to save multilingual messages
CREATE OR REPLACE FUNCTION save_multilingual_message(
    p_sender_id TEXT,
    p_recipient_id TEXT,
    p_original_text TEXT,
    p_translated_text TEXT,
    p_original_lang VARCHAR(10),
    p_translated_lang VARCHAR(10)
)
RETURNS TABLE(
    id BIGINT,
    sender_id TEXT,
    recipient_id TEXT,
    body TEXT,
    original_text TEXT,
    translated_text TEXT,
    original_lang VARCHAR(10),
    translated_lang VARCHAR(10),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO messages (
        sender_id, 
        recipient_id, 
        body, 
        original_text, 
        translated_text, 
        original_lang, 
        translated_lang, 
        created_at
    )
    VALUES (
        p_sender_id, 
        p_recipient_id, 
        p_translated_text, -- body stores the translated version for display
        p_original_text, 
        p_translated_text, 
        p_original_lang, 
        p_translated_lang, 
        NOW()
    )
    RETURNING 
        messages.id,
        messages.sender_id,
        messages.recipient_id,
        messages.body,
        messages.original_text,
        messages.translated_text,
        messages.original_lang,
        messages.translated_lang,
        messages.created_at;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get conversation with language context
CREATE OR REPLACE FUNCTION get_multilingual_conversation(
    p_user_a TEXT,
    p_user_b TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    id BIGINT,
    sender_id TEXT,
    recipient_id TEXT,
    body TEXT,
    original_text TEXT,
    translated_text TEXT,
    original_lang VARCHAR(10),
    translated_lang VARCHAR(10),
    created_at TIMESTAMPTZ,
    sender_name VARCHAR(100),
    recipient_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.sender_id,
        m.recipient_id,
        m.body,
        m.original_text,
        m.translated_text,
        m.original_lang,
        m.translated_lang,
        m.created_at,
        s.full_name as sender_name,
        r.full_name as recipient_name
    FROM messages m
    LEFT JOIN users s ON s.id::TEXT = m.sender_id
    LEFT JOIN users r ON r.id::TEXT = m.recipient_id
    WHERE (m.sender_id = p_user_a AND m.recipient_id = p_user_b)
       OR (m.sender_id = p_user_b AND m.recipient_id = p_user_a)
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_multilingual_message TO current_user;
GRANT EXECUTE ON FUNCTION get_multilingual_conversation TO current_user;

-- Add comments for documentation
COMMENT ON COLUMN messages.original_text IS 'Original message text in sender language';
COMMENT ON COLUMN messages.translated_text IS 'Translated message text in recipient language';
COMMENT ON COLUMN messages.original_lang IS 'Language code of original message (ISO 639-1)';
COMMENT ON COLUMN messages.translated_lang IS 'Language code of translated message (ISO 639-1)';
COMMENT ON FUNCTION save_multilingual_message IS 'Save a message with original and translated text';
COMMENT ON FUNCTION get_multilingual_conversation IS 'Retrieve conversation between two users with language context';
