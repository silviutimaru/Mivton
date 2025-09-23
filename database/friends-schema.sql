-- 🚀 MIVTON PHASE 3.1 - FRIENDS SYSTEM DATABASE SCHEMA
-- Friends System & Social Features - Enterprise Grade Implementation
-- Created: July 31, 2025

-- ============================================================================
-- 1. FRIENDSHIPS TABLE (Primary friendship relationships)
-- ============================================================================
-- Bidirectional friendship storage with constraint enforcement
CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints for data integrity
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id), -- Enforce order to prevent duplicates
    CHECK (user1_id != user2_id) -- Cannot be friends with self
);

-- ============================================================================
-- 2. FRIEND REQUESTS TABLE (Pending friend requests)
-- ============================================================================
-- Manages friend request workflow with status tracking
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    message TEXT, -- Optional message with friend request
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'), -- Auto-expire requests
    
    -- Constraints for data integrity
    UNIQUE(sender_id, receiver_id),
    CHECK (sender_id != receiver_id) -- Cannot send request to self
);

-- ============================================================================
-- 3. BLOCKED USERS TABLE (User blocking system)
-- ============================================================================
-- Manages blocked user relationships with privacy controls
CREATE TABLE IF NOT EXISTS blocked_users (
    id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100), -- Optional reason for blocking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints for data integrity
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id) -- Cannot block self
);

-- ============================================================================
-- 4. FRIEND NOTIFICATIONS TABLE (Social notifications)
-- ============================================================================
-- Real-time notification system for friend activities
CREATE TABLE IF NOT EXISTS friend_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'friend_online', 'friend_offline')),
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Index for performance
    INDEX idx_friend_notifications_user_unread (user_id, is_read, created_at)
);

-- ============================================================================
-- 5. SOCIAL ACTIVITY LOG (Friend interaction tracking)
-- ============================================================================
-- Tracks social interactions for analytics and security
CREATE TABLE IF NOT EXISTS social_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('friend_request_sent', 'friend_request_accepted', 'friend_request_declined', 'friend_removed', 'user_blocked', 'user_unblocked')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for performance and analytics
    INDEX idx_social_activity_user (user_id, created_at),
    INDEX idx_social_activity_type (activity_type, created_at)
);

-- ============================================================================
-- 6. PERFORMANCE INDEXES (Optimized query performance)
-- ============================================================================

-- Friendships table indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(user1_id, user2_id);

-- Friend requests table indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_expires ON friend_requests(expires_at);

-- Blocked users table indexes
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Friend notifications table indexes
CREATE INDEX IF NOT EXISTS idx_friend_notifications_user ON friend_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_sender ON friend_notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_type ON friend_notifications(type);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_unread ON friend_notifications(user_id, is_read);

-- ============================================================================
-- 7. UTILITY FUNCTIONS (Database helper functions)
-- ============================================================================

-- Function to get ordered user pair for friendship table
CREATE OR REPLACE FUNCTION get_ordered_user_pair(user1 INTEGER, user2 INTEGER)
RETURNS TABLE(smaller_id INTEGER, larger_id INTEGER) AS $$
BEGIN
    IF user1 < user2 THEN
        RETURN QUERY SELECT user1, user2;
    ELSE
        RETURN QUERY SELECT user2, user1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_users_friends(user1 INTEGER, user2 INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    friendship_exists BOOLEAN := FALSE;
    ordered_pair RECORD;
BEGIN
    SELECT * INTO ordered_pair FROM get_ordered_user_pair(user1, user2);
    
    SELECT EXISTS(
        SELECT 1 FROM friendships 
        WHERE user1_id = ordered_pair.smaller_id 
        AND user2_id = ordered_pair.larger_id 
        AND status = 'active'
    ) INTO friendship_exists;
    
    RETURN friendship_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(blocker INTEGER, blocked INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    block_exists BOOLEAN := FALSE;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM blocked_users 
        WHERE blocker_id = blocker 
        AND blocked_id = blocked
    ) INTO block_exists;
    
    RETURN block_exists;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGERS (Automated database operations)
-- ============================================================================

-- Trigger to update updated_at timestamp for friendships
CREATE OR REPLACE FUNCTION update_friendship_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_friendship_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_friendship_timestamp();

-- Trigger to update updated_at timestamp for friend_requests
CREATE OR REPLACE FUNCTION update_friend_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_friend_request_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_friend_request_timestamp();

-- Trigger to clean up expired friend requests
CREATE OR REPLACE FUNCTION cleanup_expired_requests()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE friend_requests 
    SET status = 'expired' 
    WHERE expires_at < CURRENT_TIMESTAMP 
    AND status = 'pending';
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup daily (this would typically be handled by a cron job)
-- CREATE TRIGGER trigger_cleanup_expired_requests
--     AFTER INSERT ON friend_requests
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION cleanup_expired_requests();

-- ============================================================================
-- 9. VIEWS (Convenient data access)
-- ============================================================================

-- View for getting friends with their details
CREATE OR REPLACE VIEW v_user_friends AS
SELECT 
    CASE 
        WHEN f.user1_id = u1.id THEN u2.id 
        ELSE u1.id 
    END as user_id,
    CASE 
        WHEN f.user1_id = u1.id THEN u1.id 
        ELSE u2.id 
    END as friend_id,
    CASE 
        WHEN f.user1_id = u1.id THEN u2.username 
        ELSE u1.username 
    END as friend_username,
    CASE 
        WHEN f.user1_id = u1.id THEN u2.full_name 
        ELSE u1.full_name 
    END as friend_full_name,
    CASE 
        WHEN f.user1_id = u1.id THEN u2.status 
        ELSE u1.status 
    END as friend_status,
    CASE 
        WHEN f.user1_id = u1.id THEN u2.native_language 
        ELSE u1.native_language 
    END as friend_language,
    CASE 
        WHEN f.user1_id = u1.id THEN u2.is_verified 
        ELSE u1.is_verified 
    END as friend_verified,
    f.created_at as friendship_created,
    ua.last_activity as friend_last_activity
FROM friendships f
JOIN users u1 ON f.user1_id = u1.id
JOIN users u2 ON f.user2_id = u2.id
LEFT JOIN user_activity ua ON ua.user_id = CASE 
    WHEN f.user1_id = u1.id THEN u2.id 
    ELSE u1.id 
END
WHERE f.status = 'active'
AND u1.is_blocked = FALSE 
AND u2.is_blocked = FALSE;

-- View for pending friend requests with sender details
CREATE OR REPLACE VIEW v_pending_friend_requests AS
SELECT 
    fr.id,
    fr.sender_id,
    fr.receiver_id,
    u.username as sender_username,
    u.full_name as sender_full_name,
    u.is_verified as sender_verified,
    u.native_language as sender_language,
    fr.message,
    fr.created_at,
    fr.expires_at
FROM friend_requests fr
JOIN users u ON fr.sender_id = u.id
WHERE fr.status = 'pending'
AND fr.expires_at > CURRENT_TIMESTAMP
AND u.is_blocked = FALSE;

-- ============================================================================
-- 10. INITIAL DATA CLEANUP (Remove any inconsistent data)
-- ============================================================================

-- Clean up any existing inconsistent friendship data
DELETE FROM friendships WHERE user1_id >= user2_id;

-- Mark expired friend requests
UPDATE friend_requests 
SET status = 'expired' 
WHERE expires_at < CURRENT_TIMESTAMP 
AND status = 'pending';

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================

-- Log successful schema creation
INSERT INTO user_activity (user_id, activity_type, last_activity) 
VALUES (1, 'system_friends_schema_created', CURRENT_TIMESTAMP)
ON CONFLICT (user_id, activity_type) DO UPDATE SET last_activity = CURRENT_TIMESTAMP;

-- Grant necessary permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON friendships TO mivton_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON friend_requests TO mivton_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON blocked_users TO mivton_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON friend_notifications TO mivton_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON social_activity_log TO mivton_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mivton_app;
