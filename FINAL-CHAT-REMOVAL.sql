-- =============================================
-- COMPLETE CHAT REMOVAL FROM PRODUCTION DATABASE
-- Run this in Railway Database Console
-- =============================================

-- Step 1: Show current chat tables
SELECT 
    'BEFORE CLEANUP:' as status,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%chat%' OR 
    table_name LIKE '%message%' OR 
    table_name LIKE '%conversation%' OR
    table_name LIKE '%typing%'
)
ORDER BY table_name;

-- Step 2: Drop ALL chat-related tables
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE; 
DROP TABLE IF EXISTS message_status CASCADE;
DROP TABLE IF EXISTS typing_status CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversation_previews CASCADE;
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS message_attachments CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;

-- Step 3: Verify cleanup (should return NO rows)
SELECT 
    'AFTER CLEANUP:' as status,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%chat%' OR 
    table_name LIKE '%message%' OR 
    table_name LIKE '%conversation%' OR
    table_name LIKE '%typing%'
)
ORDER BY table_name;

-- Step 4: Show remaining tables (should only be non-chat)
SELECT 
    'REMAINING TABLES:' as status,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;