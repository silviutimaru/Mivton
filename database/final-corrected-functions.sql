-- FINAL CORRECTED FRIENDSHIP FUNCTIONS
-- Compatible with actual database schema

-- Function to create friendship completely (FINAL CORRECTED VERSION)
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
    request_exists BOOLEAN := FALSE;
    conv_columns TEXT[];
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
    
    -- 2. Create activity feed entries for both users (if function exists)
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_activity_feed_entry') THEN
        PERFORM create_activity_feed_entry(p_user1_id, p_user2_id, 'friend_added', 
                jsonb_build_object('friend_id', p_user2_id));
        PERFORM create_activity_feed_entry(p_user2_id, p_user1_id, 'friend_added', 
                jsonb_build_object('friend_id', p_user1_id));
    END IF;
    
    -- 3. Create initial conversation previews (if table exists) - CHECK ACTUAL COLUMNS
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_previews') THEN
        -- Get actual column names
        SELECT ARRAY_AGG(column_name) INTO conv_columns
        FROM information_schema.columns 
        WHERE table_name = 'conversation_previews' 
        AND column_name IN ('last_activity_at', 'last_updated', 'updated_at', 'created_at');
        
        -- Use dynamic SQL based on available columns
        IF 'last_updated' = ANY(conv_columns) THEN
            INSERT INTO conversation_previews (user_id, friend_id, last_updated)
            VALUES 
                (p_user1_id, p_user2_id, CURRENT_TIMESTAMP),
                (p_user2_id, p_user1_id, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, friend_id) DO NOTHING;
        ELSIF 'updated_at' = ANY(conv_columns) THEN
            INSERT INTO conversation_previews (user_id, friend_id, updated_at)
            VALUES 
                (p_user1_id, p_user2_id, CURRENT_TIMESTAMP),
                (p_user2_id, p_user1_id, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, friend_id) DO NOTHING;
        ELSE
            -- Fallback - just create basic entries
            INSERT INTO conversation_previews (user_id, friend_id)
            VALUES 
                (p_user1_id, p_user2_id),
                (p_user2_id, p_user1_id)
            ON CONFLICT (user_id, friend_id) DO NOTHING;
        END IF;
    END IF;
    
    -- 4. Add to default friend groups (if tables exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_group_members') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_groups') THEN
        
        INSERT INTO friend_group_members (group_id, user_id, friend_id, added_at)
        SELECT fg.id, p_user1_id, p_user2_id, CURRENT_TIMESTAMP
        FROM friend_groups fg 
        WHERE fg.user_id = p_user1_id AND fg.is_default = TRUE
        ON CONFLICT DO NOTHING;
        
        INSERT INTO friend_group_members (group_id, user_id, friend_id, added_at)
        SELECT fg.id, p_user2_id, p_user1_id, CURRENT_TIMESTAMP
        FROM friend_groups fg 
        WHERE fg.user_id = p_user2_id AND fg.is_default = TRUE
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- 5. Initialize friend interaction summary (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_interaction_summary') THEN
        INSERT INTO friend_interaction_summary (user_id, friend_id, friendship_strength, updated_at)
        VALUES 
            (p_user1_id, p_user2_id, 0.50, CURRENT_TIMESTAMP),
            (p_user2_id, p_user1_id, 0.50, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, friend_id) DO UPDATE SET
            friendship_strength = 0.50,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RAISE NOTICE 'Friendship between users % and % created with all related data', p_user1_id, p_user2_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to accept friend request (FINAL CORRECTED VERSION)
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
    
    -- Create notifications for both users (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_notifications') THEN
        INSERT INTO friend_notifications (user_id, sender_id, type, message, created_at)
        VALUES 
            (request_record.sender_id, request_record.receiver_id, 'friend_accepted', 
             'Your friend request was accepted!', CURRENT_TIMESTAMP),
            (request_record.receiver_id, request_record.sender_id, 'friend_accepted', 
             'You are now friends!', CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_friendship_completely(INTEGER, INTEGER, INTEGER) IS 'Creates friendship with schema-aware column handling (FINAL VERSION)';
COMMENT ON FUNCTION accept_friend_request_properly(INTEGER) IS 'Accepts friend request with schema-aware handling (FINAL VERSION)';
