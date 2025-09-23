-- PERFECT SCHEMA-MATCHED FUNCTIONS
-- Based on your actual database schema

-- Function to create friendship completely (SCHEMA-MATCHED VERSION)
CREATE OR REPLACE FUNCTION create_friendship_completely(
    p_user1_id INTEGER,
    p_user2_id INTEGER,
    p_request_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    ordered_user1 INTEGER;
    ordered_user2 INTEGER;
    existing_friendship INTEGER;
BEGIN
    -- Validate users exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user1_id) THEN
        RAISE EXCEPTION 'User % does not exist', p_user1_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user2_id) THEN
        RAISE EXCEPTION 'User % does not exist', p_user2_id;
    END IF;
    
    -- Can't be friends with yourself
    IF p_user1_id = p_user2_id THEN
        RAISE EXCEPTION 'User cannot be friends with themselves';
    END IF;
    
    -- Ensure proper ordering
    ordered_user1 := LEAST(p_user1_id, p_user2_id);
    ordered_user2 := GREATEST(p_user1_id, p_user2_id);
    
    -- Check if friendship already exists
    SELECT id INTO existing_friendship 
    FROM friendships 
    WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;
    
    IF existing_friendship IS NOT NULL THEN
        RAISE NOTICE 'Friendship already exists between users % and %', p_user1_id, p_user2_id;
        RETURN FALSE;
    END IF;
    
    -- 1. Create the friendship
    INSERT INTO friendships (user1_id, user2_id, status, created_at, updated_at)
    VALUES (ordered_user1, ordered_user2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    -- 2. Create activity feed entries for both users
    INSERT INTO friend_activity_feed (user_id, actor_id, activity_type, activity_data, is_visible, created_at)
    VALUES 
        (p_user1_id, p_user2_id, 'friend_added', jsonb_build_object('friend_id', p_user2_id), true, CURRENT_TIMESTAMP),
        (p_user2_id, p_user1_id, 'friend_added', jsonb_build_object('friend_id', p_user1_id), true, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;
    
    -- 3. Create initial conversation previews using YOUR actual schema
    INSERT INTO conversation_previews (user_id, friend_id, last_message_preview, last_message_at, unread_count, updated_at)
    VALUES 
        (p_user1_id, p_user2_id, 'You are now friends!', CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP),
        (p_user2_id, p_user1_id, 'You are now friends!', CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, friend_id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP;
    
    -- 4. Create notifications for both users
    INSERT INTO friend_notifications (user_id, sender_id, type, message, data, is_read, created_at)
    VALUES 
        (p_user1_id, p_user2_id, 'friend_accepted', 'You are now friends!', 
         jsonb_build_object('friend_id', p_user2_id), false, CURRENT_TIMESTAMP),
        (p_user2_id, p_user1_id, 'friend_accepted', 'You are now friends!', 
         jsonb_build_object('friend_id', p_user1_id), false, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Friendship between users % and % created with all related data', p_user1_id, p_user2_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to accept friend request (SCHEMA-MATCHED VERSION)
CREATE OR REPLACE FUNCTION accept_friend_request_properly(p_request_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the friend request
    SELECT * INTO request_record 
    FROM friend_requests 
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request % not found or not pending', p_request_id;
    END IF;
    
    -- Update the request status
    UPDATE friend_requests 
    SET status = 'accepted', updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_request_id;
    
    -- Create the friendship with all related data
    PERFORM create_friendship_completely(
        request_record.sender_id, 
        request_record.receiver_id, 
        p_request_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_friendship_completely(INTEGER, INTEGER, INTEGER) IS 'Creates friendship with perfect schema matching';
COMMENT ON FUNCTION accept_friend_request_properly(INTEGER) IS 'Accepts friend request with perfect schema matching';
