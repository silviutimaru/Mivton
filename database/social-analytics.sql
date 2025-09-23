-- =============================================
-- Phase 3.3 - Social Analytics Views and Functions (Continued)
-- =============================================

-- Get cached or generate fresh analytics
CREATE OR REPLACE FUNCTION get_social_analytics(p_user_id INTEGER, p_analytics_type VARCHAR, p_force_refresh BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
DECLARE
    cached_data JSONB;
    cache_period DATE;
BEGIN
    -- Determine cache period
    cache_period := CASE 
        WHEN p_analytics_type = 'weekly_summary' THEN DATE_TRUNC('week', CURRENT_DATE)::DATE
        WHEN p_analytics_type = 'daily_summary' THEN CURRENT_DATE
        ELSE CURRENT_DATE
    END;
    
    -- Try to get from cache first (unless force refresh)
    IF NOT p_force_refresh THEN
        SELECT data INTO cached_data
        FROM social_analytics_cache
        WHERE user_id = p_user_id 
          AND analytics_type = p_analytics_type
          AND analytics_period = cache_period
          AND expires_at > CURRENT_TIMESTAMP;
        
        IF cached_data IS NOT NULL THEN
            RETURN cached_data;
        END IF;
    END IF;
    
    -- Generate fresh data and cache it
    PERFORM cache_social_analytics(p_user_id, p_analytics_type);
    
    -- Return the fresh data
    SELECT data INTO cached_data
    FROM social_analytics_cache
    WHERE user_id = p_user_id 
      AND analytics_type = p_analytics_type
      AND analytics_period = cache_period;
    
    RETURN COALESCE(cached_data, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Bulk update conversation previews
CREATE OR REPLACE FUNCTION update_conversation_previews_bulk(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    friend_record RECORD;
    last_interaction RECORD;
BEGIN
    -- Update previews for all friends
    FOR friend_record IN 
        SELECT friend_id FROM friendships WHERE user_id = p_user_id
    LOOP
        -- Get last interaction with this friend
        SELECT 
            interaction_type,
            CASE 
                WHEN interaction_type = 'message' THEN COALESCE(metadata->>'preview', 'Message')
                WHEN interaction_type = 'call' THEN 'Voice call'
                WHEN interaction_type = 'video_call' THEN 'Video call'
                ELSE 'Activity'
            END as preview_text,
            created_at
        INTO last_interaction
        FROM social_interactions
        WHERE (user_id = p_user_id AND friend_id = friend_record.friend_id)
           OR (user_id = friend_record.friend_id AND friend_id = p_user_id)
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Update or create conversation preview
        INSERT INTO conversation_previews (
            user_id, 
            friend_id, 
            last_message_preview, 
            last_interaction_type,
            last_activity_at
        )
        VALUES (
            p_user_id,
            friend_record.friend_id,
            COALESCE(last_interaction.preview_text, 'No recent activity'),
            COALESCE(last_interaction.interaction_type, 'none'),
            COALESCE(last_interaction.created_at, CURRENT_TIMESTAMP)
        )
        ON CONFLICT (user_id, friend_id)
        DO UPDATE SET
            last_message_preview = EXCLUDED.last_message_preview,
            last_interaction_type = EXCLUDED.last_interaction_type,
            last_activity_at = EXCLUDED.last_activity_at,
            last_updated = CURRENT_TIMESTAMP;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Generate social insights with AI-like recommendations
CREATE OR REPLACE FUNCTION generate_social_insights(p_user_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    insights JSONB := '[]'::JSONB;
    friend_count INTEGER;
    interaction_count INTEGER;
    unread_count INTEGER;
    inactive_friends INTEGER;
    recent_activity INTEGER;
    strongest_friendship DECIMAL;
    goal_count INTEGER;
BEGIN
    -- Get basic metrics
    SELECT COUNT(*) INTO friend_count FROM friendships WHERE user_id = p_user_id;
    
    SELECT COUNT(*) INTO interaction_count 
    FROM social_interactions 
    WHERE user_id = p_user_id AND created_at >= CURRENT_DATE - INTERVAL '7 days';
    
    SELECT COALESCE(SUM(unread_count), 0) INTO unread_count 
    FROM conversation_previews WHERE user_id = p_user_id;
    
    SELECT COUNT(*) INTO inactive_friends
    FROM friend_interaction_summary
    WHERE user_id = p_user_id 
      AND (last_interaction_at < CURRENT_DATE - INTERVAL '30 days' OR last_interaction_at IS NULL);
    
    SELECT COUNT(*) INTO recent_activity
    FROM social_interactions
    WHERE user_id = p_user_id AND created_at >= CURRENT_DATE - INTERVAL '1 day';
    
    SELECT COALESCE(MAX(friendship_strength), 0) INTO strongest_friendship
    FROM friend_interaction_summary WHERE user_id = p_user_id;
    
    SELECT COUNT(*) INTO goal_count
    FROM social_goals WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Generate insights based on patterns
    
    -- Network size insights
    IF friend_count = 0 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'suggestion',
            'category', 'network_growth',
            'title', 'Start Building Your Network',
            'message', 'Connect with friends to start your social journey on Mivton!',
            'action', 'explore_recommendations',
            'priority', 'high'
        ));
    ELSIF friend_count < 5 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'suggestion',
            'category', 'network_growth',
            'title', 'Expand Your Circle',
            'message', 'You have ' || friend_count || ' friends. Consider connecting with more people to enrich your experience.',
            'action', 'view_recommendations',
            'priority', 'medium'
        ));
    END IF;
    
    -- Activity insights
    IF interaction_count = 0 AND friend_count > 0 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'suggestion',
            'category', 'engagement',
            'title', 'Reach Out to Friends',
            'message', 'You haven''t interacted with friends this week. Send a message to reconnect!',
            'action', 'start_conversation',
            'priority', 'high'
        ));
    ELSIF interaction_count > 50 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'achievement',
            'category', 'engagement',
            'title', 'Social Butterfly!',
            'message', 'Wow! You''ve had ' || interaction_count || ' interactions this week. You''re very socially active!',
            'action', 'share_achievement',
            'priority', 'low'
        ));
    END IF;
    
    -- Unread messages insight
    IF unread_count > 10 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'reminder',
            'category', 'responsiveness',
            'title', 'Catch Up on Messages',
            'message', 'You have ' || unread_count || ' unread messages. Your friends are waiting to hear from you!',
            'action', 'view_conversations',
            'priority', 'medium'
        ));
    END IF;
    
    -- Inactive friends insight
    IF inactive_friends > 0 AND friend_count > 5 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'suggestion',
            'category', 'relationship_maintenance',
            'title', 'Reconnect with Old Friends',
            'message', 'You have ' || inactive_friends || ' friends you haven''t talked to recently. Why not reach out?',
            'action', 'view_inactive_friends',
            'priority', 'low'
        ));
    END IF;
    
    -- Friendship strength insight
    IF strongest_friendship > 0.8 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'achievement',
            'category', 'relationships',
            'title', 'Strong Friendship!',
            'message', 'You have a very strong friendship connection! Keep nurturing these relationships.',
            'action', 'view_top_friends',
            'priority', 'low'
        ));
    END IF;
    
    -- Goals insight
    IF goal_count = 0 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'suggestion',
            'category', 'goals',
            'title', 'Set Social Goals',
            'message', 'Setting social goals can help you stay connected and build stronger relationships.',
            'action', 'create_goal',
            'priority', 'low'
        ));
    END IF;
    
    -- Recent activity boost
    IF recent_activity > 10 THEN
        insights := insights || jsonb_build_array(jsonb_build_object(
            'type', 'achievement',
            'category', 'engagement',
            'title', 'Active Day!',
            'message', 'You''ve been very active today with ' || recent_activity || ' interactions. Great job staying connected!',
            'action', 'view_activity',
            'priority', 'low'
        ));
    END IF;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'generated_at', CURRENT_TIMESTAMP,
        'insights', insights,
        'total_insights', jsonb_array_length(insights)
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MAINTENANCE AND CLEANUP FUNCTIONS
-- =============================================

-- Comprehensive cleanup function
CREATE OR REPLACE FUNCTION cleanup_advanced_social_data()
RETURNS JSONB AS $$
DECLARE
    cleanup_stats JSONB;
    expired_recommendations INTEGER;
    expired_analytics INTEGER;
    old_interactions INTEGER;
    completed_goals INTEGER;
BEGIN
    -- Clean expired recommendations
    DELETE FROM friend_recommendations 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
    GET DIAGNOSTICS expired_recommendations = ROW_COUNT;
    
    -- Clean expired analytics cache
    DELETE FROM social_analytics_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS expired_analytics = ROW_COUNT;
    
    -- Archive old interactions (keep last 6 months)
    DELETE FROM social_interactions 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    GET DIAGNOSTICS old_interactions = ROW_COUNT;
    
    -- Clean completed old goals
    DELETE FROM social_goals 
    WHERE is_achieved = TRUE AND achieved_at < CURRENT_TIMESTAMP - INTERVAL '3 months';
    GET DIAGNOSTICS completed_goals = ROW_COUNT;
    
    -- Return cleanup statistics
    cleanup_stats := jsonb_build_object(
        'expired_recommendations_deleted', expired_recommendations,
        'expired_analytics_deleted', expired_analytics,
        'old_interactions_deleted', old_interactions,
        'completed_goals_deleted', completed_goals,
        'cleanup_timestamp', CURRENT_TIMESTAMP
    );
    
    RETURN cleanup_stats;
END;
$$ LANGUAGE plpgsql;

-- Update all friendship strengths for a user
CREATE OR REPLACE FUNCTION recalculate_all_friendship_strengths(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    friend_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    FOR friend_record IN 
        SELECT friend_id FROM friendships WHERE user_id = p_user_id
    LOOP
        PERFORM recalculate_friendship_strength(p_user_id, friend_record.friend_id);
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RECOMMENDATION ENGINE VIEWS
-- =============================================

-- Potential friends based on mutual connections
CREATE OR REPLACE VIEW mutual_friend_recommendations AS
SELECT DISTINCT
    f1.user_id,
    f2.friend_id as potential_friend_id,
    u.username as potential_friend_username,
    u.full_name as potential_friend_name,
    COUNT(f1.friend_id) as mutual_friends_count,
    array_agg(DISTINCT mu.username) as mutual_friends_list,
    LEAST(1.0, 0.5 + (COUNT(f1.friend_id)::DECIMAL / 10) * 0.5) as confidence_score
FROM friendships f1
JOIN friendships f2 ON f1.friend_id = f2.user_id
JOIN users u ON f2.friend_id = u.id
JOIN users mu ON f1.friend_id = mu.id
WHERE f2.friend_id != f1.user_id  -- Not recommending self
  AND f2.friend_id NOT IN (  -- Not already friends
      SELECT friend_id FROM friendships WHERE user_id = f1.user_id
  )
  AND f2.friend_id NOT IN (  -- Not blocked
      SELECT blocked_user_id FROM blocked_users WHERE user_id = f1.user_id
  )
  AND f1.user_id NOT IN (  -- Not blocked by them
      SELECT blocked_user_id FROM blocked_users WHERE user_id = f2.friend_id
  )
GROUP BY f1.user_id, f2.friend_id, u.username, u.full_name
HAVING COUNT(f1.friend_id) >= 2  -- At least 2 mutual friends
ORDER BY f1.user_id, COUNT(f1.friend_id) DESC;

-- Language-based recommendations
CREATE OR REPLACE VIEW language_match_recommendations AS
SELECT DISTINCT
    up1.user_id,
    up2.user_id as potential_friend_id,
    u2.username as potential_friend_username,
    u2.full_name as potential_friend_name,
    up1.known_language as user_knows,
    up1.learning_language as user_learning,
    up2.known_language as friend_knows,
    up2.learning_language as friend_learning,
    CASE 
        WHEN up1.known_language = up2.learning_language AND up1.learning_language = up2.known_language THEN 0.9
        WHEN up1.known_language = up2.learning_language THEN 0.7
        WHEN up1.learning_language = up2.known_language THEN 0.7
        ELSE 0.5
    END as confidence_score
FROM user_preferences up1
JOIN user_preferences up2 ON (
    up1.known_language = up2.learning_language OR 
    up1.learning_language = up2.known_language
)
JOIN users u2 ON up2.user_id = u2.id
WHERE up1.user_id != up2.user_id  -- Not self
  AND up2.user_id NOT IN (  -- Not already friends
      SELECT friend_id FROM friendships WHERE user_id = up1.user_id
  )
  AND up2.user_id NOT IN (  -- Not blocked
      SELECT blocked_user_id FROM blocked_users WHERE user_id = up1.user_id
  )
  AND up1.user_id NOT IN (  -- Not blocked by them
      SELECT blocked_user_id FROM blocked_users WHERE user_id = up2.user_id
  );

-- =============================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================

-- System performance metrics
CREATE OR REPLACE VIEW advanced_social_performance_metrics AS
SELECT 
    'friend_groups' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_records,
    pg_size_pretty(pg_total_relation_size('friend_groups')) as table_size
FROM friend_groups
UNION ALL
SELECT 
    'social_interactions',
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    pg_size_pretty(pg_total_relation_size('social_interactions'))
FROM social_interactions
UNION ALL
SELECT 
    'friend_recommendations',
    COUNT(*),
    COUNT(*) FILTER (WHERE generated_at >= CURRENT_DATE - INTERVAL '7 days'),
    pg_size_pretty(pg_total_relation_size('friend_recommendations'))
FROM friend_recommendations
UNION ALL
SELECT 
    'conversation_previews',
    COUNT(*),
    COUNT(*) FILTER (WHERE last_updated >= CURRENT_DATE - INTERVAL '7 days'),
    pg_size_pretty(pg_total_relation_size('conversation_previews'))
FROM conversation_previews;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON FUNCTION generate_social_analytics(INTEGER, INTEGER) IS 'Generates comprehensive social analytics for a user over specified period';
COMMENT ON FUNCTION calculate_social_health_score(INTEGER) IS 'Calculates overall social health score (0-100) based on various factors';
COMMENT ON FUNCTION generate_friend_recommendations(INTEGER, INTEGER) IS 'Generates AI-powered friend recommendations based on multiple algorithms';
COMMENT ON FUNCTION update_social_goal_progress(INTEGER, VARCHAR, INTEGER) IS 'Updates progress towards user social goals';
COMMENT ON FUNCTION cache_social_analytics(INTEGER, VARCHAR, INTEGER) IS 'Caches analytics data for improved performance';
COMMENT ON FUNCTION get_social_analytics(INTEGER, VARCHAR, BOOLEAN) IS 'Gets cached analytics or generates fresh data if needed';
COMMENT ON FUNCTION generate_social_insights(INTEGER) IS 'Generates AI-like personalized insights and suggestions';
COMMENT ON FUNCTION cleanup_advanced_social_data() IS 'Comprehensive cleanup of expired and old social data';

COMMENT ON VIEW weekly_interaction_summary IS 'Weekly summary of user interactions for analytics';
COMMENT ON VIEW friend_engagement_ranking IS 'Ranking of friends by engagement level and interaction strength';
COMMENT ON VIEW social_activity_heatmap IS 'Heatmap data showing when users are most active socially';
COMMENT ON VIEW conversation_health_indicators IS 'Health metrics for user conversations and messaging patterns';
COMMENT ON VIEW mutual_friend_recommendations IS 'Friend recommendations based on mutual connections';
COMMENT ON VIEW language_match_recommendations IS 'Friend recommendations based on language learning matches';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 3.3 Social Analytics Views and Functions created successfully!';
    RAISE NOTICE '📊 Analytics Functions: generate_social_analytics, calculate_social_health_score, generate_social_insights';
    RAISE NOTICE '🔧 Utility Functions: recommendation engine, goal tracking, caching, cleanup';
    RAISE NOTICE '📈 Performance Views: interaction summaries, engagement rankings, activity heatmaps';
    RAISE NOTICE '🎯 Recommendation Views: mutual friends, language matches with confidence scoring';
    RAISE NOTICE '⚡ All functions optimized for performance with proper indexing and caching';
END $$;
