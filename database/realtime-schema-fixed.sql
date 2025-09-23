-- 🚀 MIVTON PHASE 3.2 - REAL-TIME SOCIAL UPDATES DATABASE SCHEMA
-- Real-time features database extensions for Phase 3.2
-- Created: July 31, 2025 - FIXED VERSION

-- ============================================================================
-- 1. SOCKET SESSIONS TABLE (Active socket connection tracking)
-- ============================================================================
-- Tracks active socket connections for real-time user presence
CREATE TABLE IF NOT EXISTS socket_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255) UNIQUE NOT NULL,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 2. USER PRESENCE TABLE (Real-time presence management)
-- ============================================================================
-- Tracks user online/offline status and activity
CREATE TABLE IF NOT EXISTS user_presence (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline', 'invisible')),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_count INTEGER DEFAULT 0, -- Number of active socket connections
    activity_message VARCHAR(100), -- Custom status message
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. NOTIFICATION DELIVERY TABLE (Real-time notification tracking)
-- ============================================================================
-- Tracks how notifications are delivered (socket, email, push)
CREATE TABLE IF NOT EXISTS notification_delivery (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivery_method VARCHAR(50) NOT NULL CHECK (delivery_method IN ('socket', 'email', 'push', 'database')),
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(20) DEFAULT 'delivered' CHECK (delivery_status IN ('delivered', 'failed', 'pending', 'retry')),
    socket_id VARCHAR(255), -- Socket ID used for delivery
    error_message TEXT, -- Error details if delivery failed
    retry_count INTEGER DEFAULT 0
);

-- ============================================================================
-- 4. REAL-TIME EVENTS LOG (Event tracking for debugging)
-- ============================================================================
-- Logs all real-time events for monitoring and debugging
CREATE TABLE IF NOT EXISTS realtime_events_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255),
    event_data JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. NOTIFICATION PREFERENCES TABLE (User notification settings)
-- ============================================================================
-- Stores user preferences for different types of notifications
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    delivery_methods JSONB DEFAULT '["socket", "database"]'::jsonb, -- Array of delivery methods
    sound_enabled BOOLEAN DEFAULT TRUE,
    desktop_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one preference per user per type
    UNIQUE(user_id, notification_type)
);

-- ============================================================================
-- 6. FRIEND ACTIVITY FEED (Real-time activity tracking)
-- ============================================================================
-- Tracks friend activities for the activity feed
CREATE TABLE IF NOT EXISTS friend_activity_feed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'friend_added', 'status_changed', 'profile_updated', 
        'came_online', 'went_offline', 'language_changed'
    )),
    activity_data JSONB,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. PERFORMANCE INDEXES (Created after tables)
-- ============================================================================

-- Socket Sessions indexes
CREATE INDEX IF NOT EXISTS idx_socket_sessions_user_id ON socket_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_socket_sessions_active ON socket_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_socket_sessions_socket_id ON socket_sessions(socket_id);

-- User Presence indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_socket_count ON user_presence(socket_count);

-- Notification Delivery indexes
CREATE INDEX IF NOT EXISTS idx_notification_delivery_user ON notification_delivery(user_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_notification ON notification_delivery(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_status ON notification_delivery(delivery_status, delivered_at);

-- Real-time Events Log indexes
CREATE INDEX IF NOT EXISTS idx_realtime_events_type ON realtime_events_log(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_realtime_events_user ON realtime_events_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_realtime_events_success ON realtime_events_log(success, created_at);

-- Notification Preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);

-- Friend Activity Feed indexes
CREATE INDEX IF NOT EXISTS idx_friend_activity_user ON friend_activity_feed(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_friend_activity_actor ON friend_activity_feed(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_friend_activity_type ON friend_activity_feed(activity_type, created_at);
CREATE INDEX IF NOT EXISTS idx_friend_activity_visible ON friend_activity_feed(user_id, is_visible, created_at);

-- ============================================================================
-- 8. HELPER FUNCTIONS (Real-time utility functions)
-- ============================================================================

-- Function to get user's online friends count
CREATE OR REPLACE FUNCTION get_online_friends_count(target_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    online_count INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO online_count
    FROM friendships f
    JOIN user_presence up ON (
        (f.user1_id = target_user_id AND up.user_id = f.user2_id) OR
        (f.user2_id = target_user_id AND up.user_id = f.user1_id)
    )
    WHERE f.status = 'active'
    AND up.status = 'online'
    AND up.socket_count > 0;
    
    RETURN online_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update user presence with socket tracking
CREATE OR REPLACE FUNCTION update_user_presence(
    target_user_id INTEGER,
    new_status VARCHAR(20),
    socket_increment INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_presence (user_id, status, socket_count, updated_at)
    VALUES (target_user_id, new_status, GREATEST(0, socket_increment), CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO UPDATE SET
        status = CASE 
            WHEN update_user_presence.socket_increment = 0 THEN new_status
            ELSE CASE 
                WHEN user_presence.socket_count + socket_increment > 0 THEN 'online'
                ELSE 'offline'
            END
        END,
        socket_count = GREATEST(0, user_presence.socket_count + socket_increment),
        last_seen = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup inactive socket sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sockets()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Mark inactive sessions
    UPDATE socket_sessions 
    SET is_active = FALSE
    WHERE last_activity < NOW() - INTERVAL '10 minutes'
    AND is_active = TRUE;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Update user presence for users with no active sockets
    UPDATE user_presence 
    SET status = 'offline', socket_count = 0, updated_at = CURRENT_TIMESTAMP
    WHERE user_id IN (
        SELECT DISTINCT user_id 
        FROM socket_sessions ss
        WHERE NOT EXISTS (
            SELECT 1 FROM socket_sessions ss2 
            WHERE ss2.user_id = ss.user_id 
            AND ss2.is_active = TRUE
        )
    )
    AND status != 'offline';
    
    -- Delete old inactive sessions (older than 1 day)
    DELETE FROM socket_sessions 
    WHERE is_active = FALSE 
    AND connected_at < NOW() - INTERVAL '1 day';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. VIEWS (Convenient data access)
-- ============================================================================

-- View for friend presence information
CREATE OR REPLACE VIEW v_friend_presence AS
SELECT 
    f.user_id,
    f.friend_id,
    f.friend_username,
    f.friend_full_name,
    COALESCE(up.status, 'offline') as presence_status,
    up.last_seen as friend_last_seen,
    up.activity_message as friend_status_message,
    up.socket_count as friend_socket_count
FROM v_user_friends f
LEFT JOIN user_presence up ON up.user_id = f.friend_id;

-- View for unread notifications
CREATE OR REPLACE VIEW v_unread_notifications AS
SELECT 
    fn.id,
    fn.user_id,
    fn.sender_id,
    fn.type,
    fn.message,
    fn.data,
    fn.created_at,
    u.username as sender_username,
    u.full_name as sender_full_name
FROM friend_notifications fn
LEFT JOIN users u ON u.id = fn.sender_id
WHERE fn.is_read = FALSE
ORDER BY fn.created_at DESC;

-- ============================================================================
-- 10. CLEANUP PROCEDURE
-- ============================================================================

-- Create a cleanup procedure that can be called periodically
CREATE OR REPLACE FUNCTION realtime_maintenance_cleanup()
RETURNS TABLE(
    cleaned_sockets INTEGER,
    cleaned_notifications INTEGER,
    cleaned_events INTEGER,
    cleaned_activities INTEGER
) AS $$
DECLARE
    socket_count INTEGER := 0;
    notification_count INTEGER := 0;
    event_count INTEGER := 0;
    activity_count INTEGER := 0;
BEGIN
    -- Clean up inactive sockets
    SELECT cleanup_inactive_sockets() INTO socket_count;
    
    -- Clean up old notification deliveries (older than 30 days)
    DELETE FROM notification_delivery 
    WHERE delivered_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS notification_count = ROW_COUNT;
    
    -- Clean up old realtime events (older than 7 days)
    DELETE FROM realtime_events_log 
    WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS event_count = ROW_COUNT;
    
    -- Clean up old activity feed entries (older than 90 days)
    DELETE FROM friend_activity_feed 
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS activity_count = ROW_COUNT;
    
    RETURN QUERY SELECT socket_count, notification_count, event_count, activity_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
