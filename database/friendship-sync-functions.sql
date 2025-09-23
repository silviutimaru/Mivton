-- MIVTON FRIENDSHIP SYNCHRONIZATION FUNCTIONS
-- These functions ensure data consistency across all friendship-related tables

-- Function to safely remove a friendship and all related data
CREATE OR REPLACE FUNCTION remove_friendship_completely(
    p_user1_id INTEGER,
    p_user2_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    ordered_user1 INTEGER;
    ordered_user2 INTEGER;
    affected_rows INTEGER := 0;
BEGIN
    -- Ensure proper ordering
    ordered_user1 := LEAST(p_user1_id, p_user2_id);
    ordered_user2 := GREATEST(p_user1_id, p_user2_id);
    
    -- 1. Remove from friendships table
    DELETE FROM friendships 
    WHERE user1_id = ordered_user1 AND user2_id = ordered_user2;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    IF affected_rows = 0 THEN
        RAISE NOTICE 'No friendship found between users % and %', p_user1_id, p_user2_id;
        RETURN FALSE;
    END IF;
    
    -- 2. Update friend requests to 'cancelled' or 'declined' 
    UPDATE friend_requests 
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE ((sender_id = p_user1_id AND receiver_id = p_user2_id) 
           OR (sender_id = p_user2_id AND receiver_id = p_user1_id))
    AND status = 'accepted';
    
    -- 3. Remove friend activity feed entries
    DELETE FROM friend_activity_feed 
    WHERE ((user_id = p_user1_id AND actor_id = p_user2_id) 
           OR (user_id = p_user2_id AND actor_id = p_user1_id))
    AND activity_type IN ('friend_added', 'friend_accepted');
    
    -- 4. Remove friend notifications
    DELETE FROM friend_notifications 
    WHERE ((user_id = p_user1_id AND sender_id = p_user2_id) 
           OR (user_id = p_user2_id AND sender_id = p_user1_id))
    AND type IN ('friend_request', 'friend_accepted');
    
    -- 5. Remove conversation previews (or mark as archived)
    DELETE FROM conversation_previews 
    WHERE (user_id = p_user1_id AND friend_id = p_user2_id) 
       OR (user_id = p_user2_id AND friend_id = p_user1_id);
    
    -- 6. Archive social interactions (don't delete - keep for analytics)
    UPDATE social_interactions 
    SET metadata = COALESCE(metadata, '{}') || '{"friendship_removed": true}'::jsonb
    WHERE (user_id = p_user1_id AND friend_id = p_user2_id) 
       OR (user_id = p_user2_id AND friend_id = p_user1_id);
    
    -- 7. Update friend interaction summary
    UPDATE friend_interaction_summary 
    SET friendship_strength = 0.0, 
        interaction_frequency = 'very_low',
        updated_at = CURRENT_TIMESTAMP
    WHERE (user_id = p_user1_id AND friend_id = p_user2_id) 
       OR (user_id = p_user2_id AND friend_id = p_user1_id);
    
    -- 8. Remove from friend groups
    DELETE FROM friend_group_members 
    WHERE (user_id = p_user1_id AND friend_id = p_user2_id) 
       OR (user_id = p_user2_id AND friend_id = p_user1_id);
    
    RAISE NOTICE 'Friendship between users % and % completely removed with all related data', p_user1_id, p_user2_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to safely create a friendship with all related data
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
    
    -- Check if there's a valid accepted friend request
    IF p_request_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM friend_requests 
            WHERE id = p_request_id 
            AND ((sender_id = p_user1_id AND receiver_id = p_user2_id) 
                 OR (sender_id = p_user2_id AND receiver_id = p_user1_id))
            AND status = 'accepted'
        ) INTO request_exists;
        
        IF NOT request_exists THEN
            RAISE EXCEPTION 'Valid accepted friend request not found';
        END IF;
    END IF;
    
    -- 1. Create the friendship
    INSERT INTO friendships (user1_id, user2_id, status, created_at, updated_at)
    VALUES (ordered_user1, ordered_user2, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    -- 2. Create activity feed entries for both users
    PERFORM create_activity_feed_entry(p_user1_id, p_user2_id, 'friend_added', 
            jsonb_build_object('friend_id', p_user2_id));
    PERFORM create_activity_feed_entry(p_user2_id, p_user1_id, 'friend_added', 
            jsonb_build_object('friend_id', p_user1_id));
    
    -- 3. Create initial conversation previews
    INSERT INTO conversation_previews (user_id, friend_id, last_activity_at, last_updated)
    VALUES 
        (p_user1_id, p_user2_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (p_user2_id, p_user1_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- 4. Add to default friend groups
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
    
    -- 5. Initialize friend interaction summary
    INSERT INTO friend_interaction_summary (user_id, friend_id, friendship_strength, updated_at)
    VALUES 
        (p_user1_id, p_user2_id, 0.50, CURRENT_TIMESTAMP),
        (p_user2_id, p_user1_id, 0.50, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, friend_id) DO UPDATE SET
        friendship_strength = 0.50,
        updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'Friendship between users % and % created with all related data', p_user1_id, p_user2_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to accept a friend request properly
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
    
    -- Create notifications for both users
    INSERT INTO friend_notifications (user_id, sender_id, type, message, created_at)
    VALUES 
        (request_record.sender_id, request_record.receiver_id, 'friend_accepted', 
         'Your friend request was accepted!', CURRENT_TIMESTAMP),
        (request_record.receiver_id, request_record.sender_id, 'friend_accepted', 
         'You are now friends!', CURRENT_TIMESTAMP);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to decline a friend request properly
CREATE OR REPLACE FUNCTION decline_friend_request_properly(p_request_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update the request status
    UPDATE friend_requests 
    SET status = 'declined', updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request % not found or not pending', p_request_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check friendship consistency
CREATE OR REPLACE FUNCTION check_friendship_consistency()
RETURNS TABLE(
    issue_type TEXT,
    description TEXT,
    count INTEGER,
    details JSONB
) AS $$
BEGIN
    -- Issue 1: Accepted requests without friendships
    RETURN QUERY
    SELECT 
        'accepted_without_friendship'::TEXT,
        'Friend requests accepted but no friendship created'::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(jsonb_build_object(
            'sender_id', fr.sender_id,
            'receiver_id', fr.receiver_id,
            'created_at', fr.created_at
        ))
    FROM friend_requests fr
    WHERE fr.status = 'accepted'
    AND NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE f.user1_id = LEAST(fr.sender_id, fr.receiver_id) 
        AND f.user2_id = GREATEST(fr.sender_id, fr.receiver_id)
    )
    HAVING COUNT(*) > 0;
    
    -- Issue 2: Friendships without accepted requests
    RETURN QUERY
    SELECT 
        'friendship_without_request'::TEXT,
        'Friendships exist but no accepted request found'::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(jsonb_build_object(
            'user1_id', f.user1_id,
            'user2_id', f.user2_id,
            'created_at', f.created_at
        ))
    FROM friendships f
    WHERE NOT EXISTS (
        SELECT 1 FROM friend_requests fr 
        WHERE ((fr.sender_id = f.user1_id AND fr.receiver_id = f.user2_id) 
               OR (fr.sender_id = f.user2_id AND fr.receiver_id = f.user1_id))
        AND fr.status = 'accepted'
    )
    HAVING COUNT(*) > 0;
    
    -- Issue 3: Duplicate friend requests
    RETURN QUERY
    SELECT 
        'duplicate_requests'::TEXT,
        'Multiple friend requests between same users'::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(jsonb_build_object(
            'sender_id', sender_id,
            'receiver_id', receiver_id,
            'count', request_count
        ))
    FROM (
        SELECT sender_id, receiver_id, COUNT(*) as request_count
        FROM friend_requests
        GROUP BY sender_id, receiver_id
        HAVING COUNT(*) > 1
    ) duplicates
    HAVING COUNT(*) > 0;
    
    -- Issue 4: Orphaned activity feed entries
    RETURN QUERY
    SELECT 
        'orphaned_activities'::TEXT,
        'Friend activities without corresponding friendships'::TEXT,
        COUNT(*)::INTEGER,
        jsonb_agg(jsonb_build_object(
            'user_id', faf.user_id,
            'actor_id', faf.actor_id,
            'activity_type', faf.activity_type
        ))
    FROM friend_activity_feed faf
    WHERE faf.activity_type IN ('friend_added', 'friend_accepted')
    AND NOT EXISTS (
        SELECT 1 FROM friendships f 
        WHERE (f.user1_id = faf.user_id AND f.user2_id = faf.actor_id)
           OR (f.user2_id = faf.user_id AND f.user1_id = faf.actor_id)
    )
    HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON FUNCTION remove_friendship_completely(INTEGER, INTEGER) IS 'Safely removes friendship and ALL related data from all tables';
COMMENT ON FUNCTION create_friendship_completely(INTEGER, INTEGER, INTEGER) IS 'Creates friendship with all related data in all tables';
COMMENT ON FUNCTION accept_friend_request_properly(INTEGER) IS 'Properly accepts friend request and creates friendship';
COMMENT ON FUNCTION decline_friend_request_properly(INTEGER) IS 'Properly declines friend request';
COMMENT ON FUNCTION check_friendship_consistency() IS 'Checks for data consistency issues across friendship tables';
