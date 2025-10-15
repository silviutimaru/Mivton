-- Database Performance Optimization
-- Add indexes to improve query performance

-- ===== USERS TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE is_blocked = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- ===== USER_PRESENCE TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);

-- ===== FRIENDSHIPS TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_created ON friendships(created_at DESC);

-- Composite index for friends queries
CREATE INDEX IF NOT EXISTS idx_friendships_users_status
ON friendships(user1_id, user2_id, status);

-- ===== FRIEND_REQUESTS TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_created ON friend_requests(created_at DESC);

-- ===== CHAT_CONVERSATIONS TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participant1 ON chat_conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participant2 ON chat_conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);

-- Composite index for conversation queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_participants
ON chat_conversations(participant_1, participant_2);

-- ===== CHAT_MESSAGES TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Composite index for message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
ON chat_messages(conversation_id, created_at DESC);

-- ===== FRIEND_NOTIFICATIONS TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_friend_notifications_user ON friend_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_read ON friend_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_friend_notifications_type ON friend_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_created ON friend_notifications(created_at DESC);

-- Composite index for notification queries
CREATE INDEX IF NOT EXISTS idx_friend_notifications_user_unread
ON friend_notifications(user_id, is_read, created_at DESC) WHERE is_read = FALSE;

-- ===== BLOCKED_USERS TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- ===== SESSION TABLE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Remove expired sessions (cleanup)
DELETE FROM session WHERE expire < CURRENT_TIMESTAMP;

-- ===== STATISTICS =====
-- Analyze tables to update statistics for query planner
ANALYZE users;
ANALYZE user_presence;
ANALYZE friendships;
ANALYZE friend_requests;
ANALYZE chat_conversations;
ANALYZE chat_messages;
ANALYZE friend_notifications;

-- Show index usage statistics (for debugging)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

COMMENT ON INDEX idx_friendships_users_status IS 'Composite index for fast friend lookups';
COMMENT ON INDEX idx_chat_messages_conv_created IS 'Composite index for message pagination';
COMMENT ON INDEX idx_friend_notifications_user_unread IS 'Partial index for unread notifications';
