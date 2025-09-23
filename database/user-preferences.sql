-- ==============================================
-- MIVTON - USER PREFERENCES SCHEMA
-- Phase 2.3 - User Interface Polish
-- For storing user settings and customizations
-- ==============================================

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    preference_type VARCHAR(20) DEFAULT 'string',
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one preference per key per user
    UNIQUE(user_id, preference_key),
    
    -- Validate preference types
    CHECK (preference_type IN ('string', 'number', 'boolean', 'json', 'encrypted')),
    
    -- Indexes for performance
    INDEX idx_user_preferences_user_id (user_id),
    INDEX idx_user_preferences_key (preference_key),
    INDEX idx_user_preferences_composite (user_id, preference_key)
);

-- Language Preferences Table
CREATE TABLE IF NOT EXISTS language_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    language_name VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    proficiency_level VARCHAR(20) DEFAULT 'native',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validate language codes (ISO 639-1 and some common extensions)
    CHECK (language_code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    
    -- Validate proficiency levels
    CHECK (proficiency_level IN ('native', 'fluent', 'intermediate', 'beginner')),
    
    -- Indexes
    INDEX idx_language_preferences_user_id (user_id),
    INDEX idx_language_preferences_code (language_code),
    INDEX idx_language_preferences_primary (user_id, is_primary)
);

-- User Search History Table
CREATE TABLE IF NOT EXISTS user_search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query VARCHAR(255) NOT NULL,
    search_type VARCHAR(50) DEFAULT 'user_search',
    filters_applied JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    search_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_search_history_user_id (user_id),
    INDEX idx_user_search_history_timestamp (search_timestamp),
    INDEX idx_user_search_history_type (search_type)
);

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_preferences
CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to set user preference
CREATE OR REPLACE FUNCTION set_user_preference(
    p_user_id INTEGER,
    p_key VARCHAR(100),
    p_value TEXT,
    p_type VARCHAR(20) DEFAULT 'string'
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
    VALUES (p_user_id, p_key, p_value, p_type)
    ON CONFLICT (user_id, preference_key)
    DO UPDATE SET 
        preference_value = p_value,
        preference_type = p_type,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to get user preference
CREATE OR REPLACE FUNCTION get_user_preference(
    p_user_id INTEGER,
    p_key VARCHAR(100),
    p_default TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT preference_value INTO result
    FROM user_preferences
    WHERE user_id = p_user_id AND preference_key = p_key;
    
    RETURN COALESCE(result, p_default);
END;
$$ LANGUAGE plpgsql;

-- Function to get all user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id INTEGER)
RETURNS TABLE(
    preference_key VARCHAR(100),
    preference_value TEXT,
    preference_type VARCHAR(20),
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.preference_key,
        up.preference_value,
        up.preference_type,
        up.updated_at
    FROM user_preferences up
    WHERE up.user_id = p_user_id
    ORDER BY up.preference_key;
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
RETURNS BOOLEAN AS $$
BEGIN
    -- If setting as primary, remove primary flag from other languages
    IF p_is_primary THEN
        UPDATE language_preferences 
        SET is_primary = false 
        WHERE user_id = p_user_id;
    END IF;
    
    INSERT INTO language_preferences (
        user_id, 
        language_code, 
        language_name, 
        proficiency_level, 
        is_primary
    )
    VALUES (p_user_id, p_language_code, p_language_name, p_proficiency, p_is_primary)
    ON CONFLICT (user_id, language_code)
    DO UPDATE SET 
        language_name = p_language_name,
        proficiency_level = p_proficiency,
        is_primary = p_is_primary;
    
    -- Also update the main users table if primary
    IF p_is_primary THEN
        UPDATE users 
        SET native_language = p_language_code 
        WHERE id = p_user_id;
    END IF;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to log search query
CREATE OR REPLACE FUNCTION log_search_query(
    p_user_id INTEGER,
    p_query VARCHAR(255),
    p_type VARCHAR(50) DEFAULT 'user_search',
    p_filters JSONB DEFAULT '{}',
    p_results_count INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
    search_id INTEGER;
BEGIN
    INSERT INTO user_search_history (
        user_id,
        search_query,
        search_type,
        filters_applied,
        results_count
    ) VALUES (
        p_user_id,
        p_query,
        p_type,
        p_filters,
        p_results_count
    )
    RETURNING id INTO search_id;
    
    -- Keep only last 100 searches per user
    DELETE FROM user_search_history 
    WHERE user_id = p_user_id 
    AND id NOT IN (
        SELECT id FROM user_search_history 
        WHERE user_id = p_user_id 
        ORDER BY search_timestamp DESC 
        LIMIT 100
    );
    
    RETURN search_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
SELECT id, 'profile_visibility', 'public', 'string'
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM user_preferences WHERE preference_key = 'profile_visibility'
);

INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
SELECT id, 'show_language', 'true', 'boolean'
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM user_preferences WHERE preference_key = 'show_language'
);

INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
SELECT id, 'show_online_status', 'true', 'boolean'
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM user_preferences WHERE preference_key = 'show_online_status'
);

INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
SELECT id, 'theme', 'dark', 'string'
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM user_preferences WHERE preference_key = 'theme'
);

INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
SELECT id, 'auto_translate', 'true', 'boolean'
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM user_preferences WHERE preference_key = 'auto_translate'
);

-- Set primary language for existing users
INSERT INTO language_preferences (user_id, language_code, language_name, is_primary, proficiency_level)
SELECT 
    id, 
    COALESCE(native_language, 'en'),
    CASE COALESCE(native_language, 'en')
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
FROM users 
WHERE id NOT IN (
    SELECT user_id FROM language_preferences WHERE is_primary = true
);

-- Views for common queries
CREATE OR REPLACE VIEW user_preferences_json AS
SELECT 
    user_id,
    jsonb_object_agg(preference_key, preference_value) as preferences
FROM user_preferences
GROUP BY user_id;

CREATE OR REPLACE VIEW user_languages AS
SELECT 
    lp.user_id,
    lp.language_code,
    lp.language_name,
    lp.is_primary,
    lp.proficiency_level,
    u.username,
    u.full_name
FROM language_preferences lp
JOIN users u ON lp.user_id = u.id
ORDER BY lp.user_id, lp.is_primary DESC, lp.language_name;

-- Recent searches view
CREATE OR REPLACE VIEW recent_user_searches AS
SELECT 
    ush.id,
    ush.user_id,
    u.username,
    ush.search_query,
    ush.search_type,
    ush.filters_applied,
    ush.results_count,
    ush.search_timestamp
FROM user_search_history ush
JOIN users u ON ush.user_id = u.id
WHERE ush.search_timestamp >= NOW() - INTERVAL '7 days'
ORDER BY ush.search_timestamp DESC;

-- Clean up old search history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_search_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_search_history 
    WHERE search_timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_preferences IS 'Stores user customization preferences and settings';
COMMENT ON TABLE language_preferences IS 'Tracks user language preferences and proficiency levels';
COMMENT ON TABLE user_search_history IS 'Logs user search queries for analytics and suggestions';
COMMENT ON FUNCTION set_user_preference IS 'Sets or updates a user preference with type validation';
COMMENT ON FUNCTION get_user_preference IS 'Retrieves a user preference with optional default value';
COMMENT ON FUNCTION set_user_language IS 'Sets user language preference with primary language handling';
COMMENT ON FUNCTION log_search_query IS 'Logs a search query with automatic cleanup of old entries';
