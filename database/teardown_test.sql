-- Test database teardown script
-- Safely removes test data without affecting production

-- Remove test user stats
DELETE FROM user_stats 
WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE '%@example.com'
);

-- Remove test sessions (if any)
DELETE FROM session 
WHERE sess::text LIKE '%example.com%';

-- Remove test users
DELETE FROM users WHERE email LIKE '%@example.com';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_users 
FROM users 
WHERE email LIKE '%@example.com';

-- Reset sequences if needed (optional)
-- SELECT setval('users_id_seq', COALESCE(MAX(id), 1)) FROM users;
-- SELECT setval('user_stats_id_seq', COALESCE(MAX(id), 1)) FROM user_stats;

-- Show remaining users count
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE email LIKE '%@example.com') as test_users
FROM users;
