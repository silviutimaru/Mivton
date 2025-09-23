-- Test seed data for Mivton testing
-- This creates test users with known passwords for testing purposes

-- Clear existing test data (in test environment only)
DELETE FROM user_stats WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com');
DELETE FROM users WHERE email LIKE '%@example.com';

-- Create test users with bcrypt hashed passwords
-- Password for both users: 'TestPass123!'
-- Hash: $2b$04$rQvBXNk.VNpMGV5fJOy8QOEv.3vr4QvJGKuVXy8m9Yz8jNpFjK7gK (bcrypt rounds=4 for testing speed)

INSERT INTO users (
    username, 
    email, 
    password_hash, 
    full_name, 
    gender, 
    native_language, 
    is_verified, 
    status,
    created_at, 
    updated_at
) VALUES 
-- Test User A
(
    'userA', 
    'userA@example.com', 
    '$2b$04$rQvBXNk.VNpMGV5fJOy8QOEv.3vr4QvJGKuVXy8m9Yz8jNpFjK7gK',
    'Test User A',
    'male',
    'en',
    true,
    'offline',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP
),
-- Test User B  
(
    'userB',
    'userB@example.com',
    '$2b$04$rQvBXNk.VNpMGV5fJOy8QOEv.3vr4QvJGKuVXy8m9Yz8jNpFjK7gK',
    'Test User B',
    'female', 
    'es',
    true,
    'offline',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP
);

-- Create user stats for test users
INSERT INTO user_stats (user_id, logins_count, last_login_ip, last_user_agent, created_at, updated_at)
SELECT 
    u.id,
    FLOOR(RANDOM() * 10) + 1,
    '127.0.0.1'::inet,
    'Test User Agent',
    u.created_at,
    CURRENT_TIMESTAMP
FROM users u 
WHERE u.email IN ('userA@example.com', 'userB@example.com');

-- Verify seed data
SELECT 
    id,
    username,
    email,
    full_name,
    gender,
    native_language,
    is_verified,
    status,
    created_at
FROM users 
WHERE email LIKE '%@example.com'
ORDER BY username;
