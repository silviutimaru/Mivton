-- Phase 2.3 Database Migrations for Railway Deployment
-- User Preferences and Enhanced Features

-- Create user_preferences table for settings interface
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    preference_type VARCHAR(20) DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

-- Create user_status table for status manager
CREATE TABLE IF NOT EXISTS user_status (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    custom_message VARCHAR(100),
    auto_status BOOLEAN DEFAULT true,
    status_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create language_preferences table for enhanced language support
CREATE TABLE IF NOT EXISTS language_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    language_name VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    proficiency_level VARCHAR(20) DEFAULT 'native',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language_code)
);

-- Create user_activity table for enhanced tracking
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create search_history table for user search functionality
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query VARCHAR(255) NOT NULL,
    search_filters JSONB,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);
CREATE INDEX IF NOT EXISTS idx_user_status_status ON user_status(status);
CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON user_status(last_seen);
CREATE INDEX IF NOT EXISTS idx_language_preferences_user_id ON language_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_language_preferences_primary ON language_preferences(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);

-- Add full-text search indexes for better user search
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING GIN (
    to_tsvector('english', COALESCE(full_name, '') || ' ' || COALESCE(username, '') || ' ' || COALESCE(email, ''))
);

-- Create stored functions for common operations

-- Function to get user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id INTEGER)
RETURNS TABLE (
    preference_key VARCHAR(100),
    preference_value TEXT,
    preference_type VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT up.preference_key, up.preference_value, up.preference_type
    FROM user_preferences up
    WHERE up.user_id = p_user_id
    ORDER BY up.preference_key;
END;
$$ LANGUAGE plpgsql;

-- Function to set user preference
CREATE OR REPLACE FUNCTION set_user_preference(
    p_user_id INTEGER,
    p_key VARCHAR(100),
    p_value TEXT,
    p_type VARCHAR(20) DEFAULT 'string'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type, updated_at)
    VALUES (p_user_id, p_key, p_value, p_type, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, preference_key)
    DO UPDATE SET 
        preference_value = EXCLUDED.preference_value,
        preference_type = EXCLUDED.preference_type,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to set user language preference
CREATE OR REPLACE FUNCTION set_user_language(
    p_user_id INTEGER,
    p_language_code VARCHAR(10),
    p_language_name VARCHAR(100),
    p_proficiency VARCHAR(20) DEFAULT 'native',
    p_is_primary BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
    -- If setting as primary, remove primary flag from other languages
    IF p_is_primary THEN
        UPDATE language_preferences 
        SET is_primary = false 
        WHERE user_id = p_user_id AND language_code != p_language_code;
    END IF;
    
    INSERT INTO language_preferences (user_id, language_code, language_name, proficiency_level, is_primary)
    VALUES (p_user_id, p_language_code, p_language_name, p_proficiency, p_is_primary)
    ON CONFLICT (user_id, language_code)
    DO UPDATE SET 
        language_name = EXCLUDED.language_name,
        proficiency_level = EXCLUDED.proficiency_level,
        is_primary = EXCLUDED.is_primary;
END;
$$ LANGUAGE plpgsql;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id INTEGER,
    p_activity_type VARCHAR(50),
    p_activity_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity (user_id, activity_type, activity_data, ip_address, user_agent, session_id)
    VALUES (p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent, p_session_id);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update user_status.updated_at
CREATE OR REPLACE FUNCTION update_user_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_status_updated_at
    BEFORE UPDATE ON user_status
    FOR EACH ROW
    EXECUTE FUNCTION update_user_status_timestamp();

-- Create trigger to update user_preferences.updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_timestamp();

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
SELECT 
    u.id,
    'theme',
    'dark',
    'string'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up 
    WHERE up.user_id = u.id AND up.preference_key = 'theme'
);

-- Insert default status for existing users
INSERT INTO user_status (user_id, status, last_seen)
SELECT 
    u.id,
    'offline',
    CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_status us WHERE us.user_id = u.id
);

-- Insert primary language preferences for existing users
INSERT INTO language_preferences (user_id, language_code, language_name, is_primary, proficiency_level)
SELECT 
    u.id,
    COALESCE(u.native_language, 'en'),
    CASE COALESCE(u.native_language, 'en')
        WHEN 'en' THEN 'English'
        WHEN 'es' THEN 'Spanish'
        WHEN 'fr' THEN 'French'
        WHEN 'de' THEN 'German'
        WHEN 'it' THEN 'Italian'
        WHEN 'pt' THEN 'Portuguese'
        WHEN 'ru' THEN 'Russian'
        WHEN 'ja' THEN 'Japanese'
        WHEN 'ko' THEN 'Korean'
        WHEN 'zh' THEN 'Chinese'
        ELSE 'English'
    END,
    true,
    'native'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM language_preferences lp 
    WHERE lp.user_id = u.id AND lp.is_primary = true
);

-- Create view for user search with enhanced data
CREATE OR REPLACE VIEW user_search_view AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.email,
    u.native_language,
    u.is_verified,
    u.is_admin,
    u.is_blocked,
    u.created_at,
    us.status,
    us.last_seen,
    us.custom_message as status_message,
    (SELECT COUNT(*) FROM friendships f WHERE f.user_id = u.id OR f.friend_id = u.id) as friend_count,
    to_tsvector('english', COALESCE(u.full_name, '') || ' ' || COALESCE(u.username, '') || ' ' || COALESCE(u.email, '')) as search_vector
FROM users u
LEFT JOIN user_status us ON u.id = us.user_id
WHERE u.is_blocked = false;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mivton;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mivton;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mivton;

-- Commit the transaction
COMMIT;
