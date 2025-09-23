-- ENHANCED REMOVAL FUNCTION - Completely cleans up ALL friend request history
CREATE OR REPLACE FUNCTION remove_friendship_and_history_completely(
    p_user1_id INTEGER,
    p_user2_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    ordered_user1 INTEGER;
    ordered_user2 INTEGER;
    affected_rows INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting complete removal of friendship and ALL history between users % and %', p_user1_id, p_user2_id;
    
    -- Ensure proper ordering
    ordered_user1 := LEAST(p_user1_id, p_user2_id);
    ordered_user2 := GREATEST(p_user1_id, p_user2_id);
    
    -- 1. Remove from friendships table
    DELETE FROM friendships 
    WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % friendships', affected_rows;
    
    -- 2. COMPLETELY DELETE all friend requests (not just update status)
    DELETE FROM friend_requests 
    WHERE ((sender_id = p_user1_id AND receiver_id = p_user2_id) 
           OR (sender_id = p_user2_id AND receiver_id = p_user1_id));
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % friend requests', affected_rows;
    
    -- 3. Remove friend activity feed entries
    DELETE FROM friend_activity_feed 
    WHERE ((user_id = p_user1_id AND actor_id = p_user2_id) 
           OR (user_id = p_user2_id AND actor_id = p_user1_id))
    AND activity_type IN ('friend_added', 'friend_accepted');
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % activity feed entries', affected_rows;
    
    -- 4. Remove friend notifications
    DELETE FROM friend_notifications 
    WHERE ((user_id = p_user1_id AND sender_id = p_user2_id) 
           OR (user_id = p_user2_id AND sender_id = p_user1_id))
    AND type IN ('friend_request', 'friend_accepted');
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % friend notifications', affected_rows;
    
    -- 5. Remove conversation previews (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_previews') THEN
        DELETE FROM conversation_previews 
        WHERE (user_id = p_user1_id AND friend_id = p_user2_id) 
           OR (user_id = p_user2_id AND friend_id = p_user1_id);
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        RAISE NOTICE 'Deleted % conversation previews', affected_rows;
    END IF;
    
    -- 6. Remove from friend groups (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_group_members') THEN
        DELETE FROM friend_group_members 
        WHERE (user_id = p_user1_id AND friend_id = p_user2_id) 
           OR (user_id = p_user2_id AND friend_id = p_user1_id);
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        RAISE NOTICE 'Deleted % friend group memberships', affected_rows;
    END IF;
    
    -- 7. Clean up friend interaction summary (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_interaction_summary') THEN
        DELETE FROM friend_interaction_summary 
        WHERE (user_id = p_user1_id AND friend_id = p_user2_id) 
           OR (user_id = p_user2_id AND friend_id = p_user1_id);
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
        RAISE NOTICE 'Deleted % interaction summaries', affected_rows;
    END IF;
    
    RAISE NOTICE '✅ Complete removal finished - users % and % have NO history together', p_user1_id, p_user2_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to safely send a friend request (checks for existing relationships)
CREATE OR REPLACE FUNCTION send_friend_request_safely(
    p_sender_id INTEGER,
    p_receiver_id INTEGER,
    p_message TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_request_id INTEGER;
    existing_friendship BOOLEAN;
    existing_request BOOLEAN;
BEGIN
    -- Validate users exist and are different
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_sender_id) THEN
        RAISE EXCEPTION 'Sender user % does not exist', p_sender_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_receiver_id) THEN
        RAISE EXCEPTION 'Receiver user % does not exist', p_receiver_id;
    END IF;
    
    IF p_sender_id = p_receiver_id THEN
        RAISE EXCEPTION 'Cannot send friend request to yourself';
    END IF;
    
    -- Check if they're already friends
    SELECT EXISTS(
        SELECT 1 FROM friendships 
        WHERE user1_id = LEAST(p_sender_id, p_receiver_id) 
        AND user2_id = GREATEST(p_sender_id, p_receiver_id)
        AND status = 'active'
    ) INTO existing_friendship;
    
    IF existing_friendship THEN
        RAISE EXCEPTION 'Users are already friends';
    END IF;
    
    -- Check for existing pending/accepted requests
    SELECT EXISTS(
        SELECT 1 FROM friend_requests 
        WHERE ((sender_id = p_sender_id AND receiver_id = p_receiver_id) 
               OR (sender_id = p_receiver_id AND receiver_id = p_sender_id))
        AND status IN ('pending', 'accepted')
    ) INTO existing_request;
    
    IF existing_request THEN
        RAISE EXCEPTION 'Friend request already exists between these users';
    END IF;
    
    -- Create the friend request
    INSERT INTO friend_requests (sender_id, receiver_id, status, message, created_at, updated_at)
    VALUES (p_sender_id, p_receiver_id, 'pending', p_message, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO new_request_id;
    
    RAISE NOTICE 'Friend request sent successfully: ID %', new_request_id;
    RETURN new_request_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_friendship_and_history_completely(INTEGER, INTEGER) IS 'Completely removes friendship and ALL history between users - enables fresh start';
COMMENT ON FUNCTION send_friend_request_safely(INTEGER, INTEGER, TEXT) IS 'Safely sends friend request with validation checks';
