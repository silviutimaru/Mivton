-- Migration: Add privacy settings to users table
-- This adds profile visibility controls

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) DEFAULT 'public' 
CHECK (profile_visibility IN ('public', 'friends', 'private'));

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS show_language BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON users(profile_visibility);

-- Add comments for documentation
COMMENT ON COLUMN users.profile_visibility IS 'Controls who can find this user in search: public, friends, private';
COMMENT ON COLUMN users.show_language IS 'Whether to show native language to other users';
COMMENT ON COLUMN users.show_online_status IS 'Whether to show online status to other users';
