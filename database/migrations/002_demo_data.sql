-- Demo data for Phase 2.3 Railway deployment
-- This file populates the database with sample users and data for demonstration

-- Insert demo users
INSERT INTO users (username, full_name, email, password_hash, native_language, gender, is_verified, is_admin, created_at) VALUES
('john_doe', 'John Doe', 'john.doe@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeG4iA8iMy8XhNu/C', 'en', 'male', true, false, NOW() - INTERVAL '6 months'),
('maria_garcia', 'Maria Garcia', 'maria.garcia@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeG4iA8iMy8XhNu/C', 'es', 'female', false, false, NOW() - INTERVAL '3 months'),
('alex_dev', 'Alex Developer', 'alex.dev@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeG4iA8iMy8XhNu/C', 'en', 'non-binary', true, true, NOW() - INTERVAL '1 year'),
('lisa_chen', 'Lisa Chen', 'lisa.chen@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeG4iA8iMy8XhNu/C', 'zh', 'female', false, false, NOW() - INTERVAL '1 month'),
('pierre_martin', 'Pierre Martin', 'pierre.martin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeG4iA8iMy8XhNu/C', 'fr', 'male', true, false, NOW() - INTERVAL '4 months'),
('sarah_wilson', 'Sarah Wilson', 'sarah.wilson@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeG4iA8iMy8XhNu/C', 'en', 'female', false, false, NOW() - INTERVAL '2 months'),
('demo_user', 'Demo User', 'demo@mivton.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeG4iA8iMy8XhNu/C', 'en', 'other', true, false, NOW())
ON CONFLICT (email) DO NOTHING;

-- Set user status for demo users
INSERT INTO user_status (user_id, status, custom_message, last_seen) 
SELECT 
    u.id,
    CASE 
        WHEN u.username = 'john_doe' THEN 'online'
        WHEN u.username = 'maria_garcia' THEN 'away'
        WHEN u.username = 'alex_dev' THEN 'busy'
        WHEN u.username = 'lisa_chen' THEN 'offline'
        WHEN u.username = 'pierre_martin' THEN 'online'
        WHEN u.username = 'sarah_wilson' THEN 'away'
        ELSE 'online'
    END,
    CASE 
        WHEN u.username = 'john_doe' THEN 'Working on something amazing!'
        WHEN u.username = 'alex_dev' THEN 'In a meeting'
        WHEN u.username = 'lisa_chen' THEN 'Learning new languages!'
        WHEN u.username = 'pierre_martin' THEN 'Bonjour tout le monde!'
        WHEN u.username = 'sarah_wilson' THEN 'Taking a break'
        ELSE NULL
    END,
    CASE 
        WHEN u.username = 'lisa_chen' THEN NOW() - INTERVAL '2 hours'
        WHEN u.username = 'maria_garcia' THEN NOW() - INTERVAL '30 minutes'
        WHEN u.username = 'sarah_wilson' THEN NOW() - INTERVAL '15 minutes'
        ELSE NOW()
    END
FROM users u
WHERE u.username IN ('john_doe', 'maria_garcia', 'alex_dev', 'lisa_chen', 'pierre_martin', 'sarah_wilson', 'demo_user')
ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    custom_message = EXCLUDED.custom_message,
    last_seen = EXCLUDED.last_seen;

-- Insert demo user preferences
INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type)
SELECT u.id, 'theme', 'dark', 'string' FROM users u WHERE u.username = 'john_doe'
UNION ALL
SELECT u.id, 'notifications', 'true', 'boolean' FROM users u WHERE u.username = 'john_doe'
UNION ALL
SELECT u.id, 'autoStatus', 'true', 'boolean' FROM users u WHERE u.username = 'john_doe'
UNION ALL
SELECT u.id, 'theme', 'light', 'string' FROM users u WHERE u.username = 'maria_garcia'
UNION ALL
SELECT u.id, 'fontSize', '16', 'number' FROM users u WHERE u.username = 'alex_dev'
UNION ALL
SELECT u.id, 'compactMode', 'true', 'boolean' FROM users u WHERE u.username = 'alex_dev'
ON CONFLICT (user_id, preference_key) DO NOTHING;

-- Insert demo language preferences
INSERT INTO language_preferences (user_id, language_code, language_name, is_primary, proficiency_level)
SELECT u.id, u.native_language, 
    CASE u.native_language
        WHEN 'en' THEN 'English'
        WHEN 'es' THEN 'Spanish'
        WHEN 'fr' THEN 'French'
        WHEN 'zh' THEN 'Chinese'
        ELSE 'English'
    END,
    true, 'native'
FROM users u
WHERE u.username IN ('john_doe', 'maria_garcia', 'alex_dev', 'lisa_chen', 'pierre_martin', 'sarah_wilson', 'demo_user')
ON CONFLICT (user_id, language_code) DO NOTHING;

-- Add some secondary languages
INSERT INTO language_preferences (user_id, language_code, language_name, is_primary, proficiency_level)
SELECT u.id, 'es', 'Spanish', false, 'intermediate'
FROM users u WHERE u.username = 'john_doe'
UNION ALL
SELECT u.id, 'en', 'English', false, 'advanced'
FROM users u WHERE u.username = 'maria_garcia'
UNION ALL
SELECT u.id, 'fr', 'French', false, 'beginner'
FROM users u WHERE u.username = 'alex_dev'
UNION ALL
SELECT u.id, 'en', 'English', false, 'intermediate'
FROM users u WHERE u.username = 'lisa_chen'
ON CONFLICT (user_id, language_code) DO NOTHING;

-- Create some demo friendships
INSERT INTO friendships (user_id, friend_id, status, created_at)
SELECT 
    u1.id, u2.id, 'accepted', NOW() - INTERVAL '1 month'
FROM users u1, users u2
WHERE u1.username = 'john_doe' AND u2.username = 'maria_garcia'
UNION ALL
SELECT 
    u1.id, u2.id, 'accepted', NOW() - INTERVAL '2 weeks'
FROM users u1, users u2
WHERE u1.username = 'pierre_martin' AND u2.username = 'john_doe'
UNION ALL
SELECT 
    u1.id, u2.id, 'accepted', NOW() - INTERVAL '1 week'
FROM users u1, users u2
WHERE u1.username = 'alex_dev' AND u2.username = 'sarah_wilson'
ON CONFLICT DO NOTHING;

-- Insert some demo search history
INSERT INTO search_history (user_id, search_query, search_filters, results_count)
SELECT u.id, 'spanish teacher', '{"language": "es"}', 5
FROM users u WHERE u.username = 'john_doe'
UNION ALL
SELECT u.id, 'english practice', '{"language": "en", "status": "online"}', 8
FROM users u WHERE u.username = 'maria_garcia'
UNION ALL
SELECT u.id, 'beginner friendly', '{"userType": "new"}', 12
FROM users u WHERE u.username = 'lisa_chen'
ON CONFLICT DO NOTHING;

-- Insert some demo activity logs
INSERT INTO user_activity (user_id, activity_type, activity_data, ip_address, created_at)
SELECT u.id, 'login', '{"success": true}', '127.0.0.1', NOW() - INTERVAL '1 hour'
FROM users u WHERE u.username = 'john_doe'
UNION ALL
SELECT u.id, 'search', '{"query": "spanish", "results": 5}', '127.0.0.1', NOW() - INTERVAL '2 hours'
FROM users u WHERE u.username = 'john_doe'
UNION ALL
SELECT u.id, 'status_change', '{"from": "away", "to": "online"}', '127.0.0.1', NOW() - INTERVAL '30 minutes'
FROM users u WHERE u.username = 'maria_garcia'
UNION ALL
SELECT u.id, 'settings_update', '{"section": "preferences", "changes": ["theme", "notifications"]}', '127.0.0.1', NOW() - INTERVAL '1 day'
FROM users u WHERE u.username = 'alex_dev'
ON CONFLICT DO NOTHING;

COMMIT;
