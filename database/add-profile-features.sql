-- Add profile picture and bio columns to users table
-- Migration for profile enhancements

-- Add profile_picture_url column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);

-- Add bio column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add notification preferences (for future use)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "friend_requests": true, "messages": true}'::jsonb;

-- Add privacy settings (for future use)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_visibility": "friends", "online_status": "everyone"}'::jsonb;

-- Create index on profile_picture_url for faster queries
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users(profile_picture_url) WHERE profile_picture_url IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN users.profile_picture_url IS 'URL or path to user profile picture';
COMMENT ON COLUMN users.bio IS 'User biography/about me text';
COMMENT ON COLUMN users.notification_preferences IS 'JSON object containing user notification preferences';
COMMENT ON COLUMN users.privacy_settings IS 'JSON object containing user privacy settings';
