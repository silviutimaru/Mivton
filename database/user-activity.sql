-- ==============================================
-- MIVTON - USER ACTIVITY TRACKING SCHEMA
-- Phase 2.3 - User Interface Polish
-- For automatic status detection and activity monitoring
-- ==============================================

-- User Activity Tracking Table
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_activity_user_id (user_id),
    INDEX idx_user_activity_type (activity_type),
    INDEX idx_user_activity_last_activity (last_activity),
    INDEX idx_user_activity_session (session_id)
);

-- Activity types enum for validation
CREATE TYPE activity_type_enum AS ENUM (
    'login',
    'logout',
    'page_view',
    'search',
    'profile_update',
    'friend_request_sent',
    'friend_request_accepted',
    'friend_request_declined',
    'user_blocked',
    'user_unblocked',
    'status_change',
    'language_change',
    'settings_update',
    'chat_started',
    'message_sent',
    'file_upload',
    'online_activity'
);

-- Add activity type constraint
ALTER TABLE user_activity 
ADD CONSTRAINT check_activity_type 
CHECK (activity_type IN (
    'login', 'logout', 'page_view', 'search', 'profile_update',
    'friend_request_sent', 'friend_request_accepted', 'friend_request_declined',
    'user_blocked', 'user_unblocked', 'status_change', 'language_change',
    'settings_update', 'chat_started', 'message_sent', 'file_upload', 'online_activity'
));

-- User Status Tracking Table
CREATE TABLE IF NOT EXISTS user_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'offline',
    custom_message VARCHAR(255),
    auto_status BOOLEAN DEFAULT true,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one status per user
    UNIQUE(user_id),
    
    -- Status validation
    CHECK (status IN ('online', 'away', 'busy', 'offline')),
    
    -- Indexes
    INDEX idx_user_status_user_id (user_id),
    INDEX idx_user_status_status (status),
    INDEX idx_user_status_last_seen (last_seen)
);

-- Function to automatically update last_seen
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_seen when any activity is recorded
    INSERT INTO user_status (user_id, last_seen)
    VALUES (NEW.user_id, NEW.last_activity)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        last_seen = NEW.last_activity,
        status = CASE 
            WHEN user_status.auto_status = true THEN 'online'
            ELSE user_status.status
        END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user status based on activity
CREATE TRIGGER trigger_update_user_last_seen
    AFTER INSERT ON user_activity
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

-- Function to set users offline after inactivity
CREATE OR REPLACE FUNCTION set_inactive_users_offline()
RETURNS void AS $$
BEGIN
    UPDATE user_status 
    SET status = 'offline'
    WHERE auto_status = true 
    AND status != 'offline'
    AND last_seen < NOW() - INTERVAL '15 minutes';
END;
$$ LANGUAGE plpgsql;

-- Activity summary view for performance
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    user_id,
    COUNT(*) as total_activities,
    MAX(last_activity) as last_activity,
    COUNT(CASE WHEN activity_type = 'login' THEN 1 END) as login_count,
    COUNT(CASE WHEN activity_type = 'search' THEN 1 END) as search_count,
    COUNT(CASE WHEN activity_type = 'message_sent' THEN 1 END) as message_count,
    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today_activities
FROM user_activity 
GROUP BY user_id;

-- Online users view for quick access
CREATE OR REPLACE VIEW online_users AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.native_language,
    u.is_verified,
    us.status,
    us.custom_message,
    us.last_seen
FROM users u
JOIN user_status us ON u.id = us.user_id
WHERE us.status IN ('online', 'away', 'busy')
AND u.is_blocked = false
ORDER BY us.last_seen DESC;

-- Recent activity view
CREATE OR REPLACE VIEW recent_user_activity AS
SELECT 
    ua.id,
    ua.user_id,
    u.username,
    u.full_name,
    ua.activity_type,
    ua.activity_data,
    ua.last_activity,
    ua.created_at
FROM user_activity ua
JOIN users u ON ua.user_id = u.id
WHERE ua.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY ua.created_at DESC;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id INTEGER,
    p_activity_type VARCHAR(50),
    p_activity_data JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    activity_id INTEGER;
BEGIN
    INSERT INTO user_activity (
        user_id,
        activity_type,
        activity_data,
        ip_address,
        user_agent,
        session_id,
        last_activity
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_activity_data,
        p_ip_address,
        p_user_agent,
        p_session_id,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user online status
CREATE OR REPLACE FUNCTION get_user_status(p_user_id INTEGER)
RETURNS TABLE(
    user_id INTEGER,
    status VARCHAR(20),
    custom_message VARCHAR(255),
    last_seen TIMESTAMP,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        us.status,
        us.custom_message,
        us.last_seen,
        (us.status != 'offline' AND us.last_seen > NOW() - INTERVAL '15 minutes') as is_online
    FROM user_status us
    WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default status for existing users
INSERT INTO user_status (user_id, status)
SELECT id, 'offline' 
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_status);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_composite ON user_activity(user_id, activity_type, last_activity);
CREATE INDEX IF NOT EXISTS idx_user_status_composite ON user_status(user_id, status, last_seen);

-- Comments for documentation
COMMENT ON TABLE user_activity IS 'Tracks all user activities for status detection and analytics';
COMMENT ON TABLE user_status IS 'Current status of users (online, away, busy, offline)';
COMMENT ON FUNCTION log_user_activity IS 'Helper function to log user activities with proper data validation';
COMMENT ON FUNCTION set_inactive_users_offline IS 'Sets users offline after 15 minutes of inactivity';
COMMENT ON VIEW online_users IS 'Quick access to currently online users';
COMMENT ON VIEW user_activity_summary IS 'Aggregated activity statistics per user';
