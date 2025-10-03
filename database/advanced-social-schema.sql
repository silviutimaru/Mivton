-- =============================================
-- Phase 3.3 - Advanced Social Features Schema
-- =============================================
-- This extends Phase 3.1 & 3.2 with advanced social capabilities
-- Created: 2025-01-31
-- Dependencies: friends-schema.sql, realtime-schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- FRIEND GROUPS TABLE
-- =============================================
-- Organize friends into custom groups (Close Friends, Work, Family, etc.)
CREATE TABLE IF NOT EXISTS friend_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1', -- Hex color for visual grouping
    icon VARCHAR(50) DEFAULT 'users', -- Icon identifier
    is_default BOOLEAN DEFAULT FALSE, -- System-created default group
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT valid_name_length CHECK (LENGTH(TRIM(name)) >= 1),
    UNIQUE(user_id, name) -- Prevent duplicate group names per user
);

-- =============================================
-- FRIEND GROUP MEMBERS TABLE
-- =============================================
-- Many-to-many relationship between groups and friends
CREATE TABLE IF NOT EXISTS friend_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Who added them to this group
    
    -- Ensure friendship exists before group membership
    CONSTRAINT fk_friendship_exists 
        FOREIGN KEY (user_id, friend_id) 
        REFERENCES friendships(user_id, friend_id) 
        ON DELETE CASCADE,
    
    -- Prevent duplicate memberships
    UNIQUE(group_id, user_id, friend_id)
);

-- =============================================
-- SOCIAL INTERACTIONS TABLE
-- =============================================
-- Track all types of social interactions for analytics
CREATE TABLE IF NOT EXISTS social_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'message', 'call', 'video_call', 'profile_view', 'group_add'
    interaction_subtype VARCHAR(50), -- Additional context (e.g., 'incoming', 'outgoing')
    metadata JSONB DEFAULT '{}', -- Store interaction-specific data
    duration_seconds INTEGER, -- For calls, conversation length
    context VARCHAR(100), -- Context where interaction happened
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_interaction_type CHECK (
        interaction_type IN ('message', 'call', 'video_call', 'profile_view', 'group_add', 'group_remove', 'status_update', 'activity_share')
    ),
    CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

-- =============================================
-- FRIEND RECOMMENDATIONS TABLE
-- =============================================
-- AI-powered friend suggestions based on multiple factors
CREATE TABLE IF NOT EXISTS friend_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommended_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_reason VARCHAR(100) NOT NULL, -- 'mutual_friends', 'language_match', 'activity_pattern', 'location_proximity'
    confidence_score DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00 confidence in recommendation
    reason_data JSONB DEFAULT '{}', -- Additional data supporting the recommendation
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_accepted BOOLEAN DEFAULT FALSE, -- Tracked if they become friends
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    dismissed_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
    CONSTRAINT different_users CHECK (user_id != recommended_user_id),
    CONSTRAINT valid_reason CHECK (
        recommendation_reason IN ('mutual_friends', 'language_match', 'activity_pattern', 'location_proximity', 'interest_similarity', 'ai_generated')
    ),
    
    -- Prevent duplicate recommendations
    UNIQUE(user_id, recommended_user_id, recommendation_reason)
);

-- =============================================
-- USER PRIVACY SETTINGS TABLE
-- =============================================
-- Granular privacy controls with group-based permissions
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL, -- 'profile_visibility', 'activity_visibility', 'friend_list_visibility', etc.
    setting_value TEXT NOT NULL, -- 'public', 'friends', 'group_only', 'private', custom JSON
    applies_to_group_id INTEGER REFERENCES friend_groups(id) ON DELETE CASCADE, -- NULL = applies to all
    priority INTEGER DEFAULT 1, -- Higher priority overrides lower priority settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_setting_key CHECK (
        setting_key IN (
            'profile_visibility', 'activity_visibility', 'friend_list_visibility', 
            'online_status_visibility', 'last_seen_visibility', 'conversation_previews',
            'recommendation_preferences', 'notification_settings', 'activity_feed_visibility'
        )
    ),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
    
    -- Unique settings per user per group
    UNIQUE(user_id, setting_key, applies_to_group_id)
);

-- Conversation previews table removed per user request (chat functionality)

-- =============================================
-- SOCIAL ANALYTICS CACHE TABLE
-- =============================================
-- Pre-computed analytics for better performance
CREATE TABLE IF NOT EXISTS social_analytics_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analytics_type VARCHAR(50) NOT NULL, -- 'weekly_summary', 'friend_engagement', 'activity_patterns'
    analytics_period DATE NOT NULL, -- Period this data covers
    data JSONB NOT NULL, -- Pre-computed analytics data
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 day'),
    
    -- Constraints
    CONSTRAINT valid_analytics_type CHECK (
        analytics_type IN ('weekly_summary', 'friend_engagement', 'activity_patterns', 'interaction_trends', 'social_health')
    ),
    
    -- One cache entry per user per type per period
    UNIQUE(user_id, analytics_type, analytics_period)
);

-- =============================================
-- FRIEND INTERACTION SUMMARY TABLE
-- =============================================
-- Aggregate interaction data for faster queries
CREATE TABLE IF NOT EXISTS friend_interaction_summary (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_messages INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    total_video_calls INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP,
    friendship_strength DECIMAL(3,2) DEFAULT 0.50, -- Calculated friendship strength (0.00-1.00)
    interaction_frequency VARCHAR(20) DEFAULT 'low', -- 'very_high', 'high', 'medium', 'low', 'very_low'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_counts CHECK (
        total_messages >= 0 AND total_calls >= 0 AND 
        total_video_calls >= 0 AND total_interactions >= 0
    ),
    CONSTRAINT valid_friendship_strength CHECK (
        friendship_strength >= 0.00 AND friendship_strength <= 1.00
    ),
    CONSTRAINT valid_frequency CHECK (
        interaction_frequency IN ('very_high', 'high', 'medium', 'low', 'very_low')
    ),
    
    -- One summary per friendship pair
    UNIQUE(user_id, friend_id)
);

-- =============================================
-- SOCIAL GOALS TABLE
-- =============================================
-- User-defined social interaction goals
CREATE TABLE IF NOT EXISTS social_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL, -- 'daily_interactions', 'weekly_calls', 'new_friends', 'group_activities'
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_achieved BOOLEAN DEFAULT FALSE,
    achieved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_goal_type CHECK (
        goal_type IN ('daily_interactions', 'weekly_calls', 'new_friends', 'group_activities', 'message_conversations')
    ),
    CONSTRAINT valid_period_type CHECK (
        period_type IN ('daily', 'weekly', 'monthly', 'yearly')
    ),
    CONSTRAINT valid_values CHECK (target_value > 0 AND current_value >= 0),
    CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Friend Groups indexes
CREATE INDEX IF NOT EXISTS idx_friend_groups_user ON friend_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_groups_user_active ON friend_groups(user_id) WHERE is_default = FALSE;

-- Friend Group Members indexes
CREATE INDEX IF NOT EXISTS idx_friend_group_members_group ON friend_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_members_user ON friend_group_members(user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_members_friend ON friend_group_members(friend_id);

-- Social Interactions indexes (optimized for analytics queries)
CREATE INDEX IF NOT EXISTS idx_social_interactions_user_time ON social_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_interactions_friend_time ON social_interactions(friend_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_interactions_type ON social_interactions(interaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_interactions_user_friend ON social_interactions(user_id, friend_id, created_at DESC);

-- Friend Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_friend_recommendations_user ON friend_recommendations(user_id, expires_at) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_friend_recommendations_score ON friend_recommendations(user_id, confidence_score DESC) WHERE is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_friend_recommendations_cleanup ON friend_recommendations(expires_at) WHERE is_dismissed = FALSE;

-- Privacy Settings indexes
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON user_privacy_settings(user_id, setting_key);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_group ON user_privacy_settings(applies_to_group_id) WHERE applies_to_group_id IS NOT NULL;

-- Conversation Previews indexes
CREATE INDEX IF NOT EXISTS idx_conversation_previews_user ON conversation_previews(user_id, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_previews_priority ON conversation_previews(user_id, is_priority DESC, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_previews_unread ON conversation_previews(user_id, unread_count DESC) WHERE unread_count > 0;

-- Social Analytics Cache indexes
CREATE INDEX IF NOT EXISTS idx_social_analytics_user_type ON social_analytics_cache(user_id, analytics_type, analytics_period DESC);
CREATE INDEX IF NOT EXISTS idx_social_analytics_cleanup ON social_analytics_cache(expires_at);

-- Friend Interaction Summary indexes
CREATE INDEX IF NOT EXISTS idx_friend_interaction_user ON friend_interaction_summary(user_id, friendship_strength DESC);
CREATE INDEX IF NOT EXISTS idx_friend_interaction_strength ON friend_interaction_summary(user_id, last_interaction_at DESC);

-- Social Goals indexes
CREATE INDEX IF NOT EXISTS idx_social_goals_user_active ON social_goals(user_id, is_active, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_social_goals_period ON social_goals(period_start, period_end) WHERE is_active = TRUE;

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Update friend_groups updated_at timestamp
CREATE OR REPLACE FUNCTION update_friend_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_groups_timestamp
    BEFORE UPDATE ON friend_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_friend_groups_timestamp();

-- Update privacy settings timestamp
CREATE OR REPLACE FUNCTION update_privacy_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_privacy_settings_timestamp
    BEFORE UPDATE ON user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_privacy_settings_timestamp();

-- Update conversation previews timestamp
CREATE OR REPLACE FUNCTION update_conversation_previews_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_previews_timestamp
    BEFORE UPDATE ON conversation_previews
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_previews_timestamp();

-- Auto-update friend interaction summary
CREATE OR REPLACE FUNCTION update_friend_interaction_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update summary when new interaction is added
    INSERT INTO friend_interaction_summary (user_id, friend_id, total_interactions, last_interaction_at, updated_at)
    VALUES (NEW.user_id, NEW.friend_id, 1, NEW.created_at, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, friend_id)
    DO UPDATE SET
        total_interactions = friend_interaction_summary.total_interactions + 1,
        total_messages = CASE WHEN NEW.interaction_type = 'message' 
                              THEN friend_interaction_summary.total_messages + 1 
                              ELSE friend_interaction_summary.total_messages END,
        total_calls = CASE WHEN NEW.interaction_type = 'call' 
                           THEN friend_interaction_summary.total_calls + 1 
                           ELSE friend_interaction_summary.total_calls END,
        total_video_calls = CASE WHEN NEW.interaction_type = 'video_call' 
                                 THEN friend_interaction_summary.total_video_calls + 1 
                                 ELSE friend_interaction_summary.total_video_calls END,
        last_interaction_at = NEW.created_at,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_friend_interaction_summary
    AFTER INSERT ON social_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_friend_interaction_summary();

-- =============================================
-- DEFAULT PRIVACY SETTINGS FUNCTION
-- =============================================

-- Function to create default privacy settings for new users
CREATE OR REPLACE FUNCTION create_default_privacy_settings(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_privacy_settings (user_id, setting_key, setting_value, priority) VALUES
    (p_user_id, 'profile_visibility', 'friends', 1),
    (p_user_id, 'activity_visibility', 'friends', 1),
    (p_user_id, 'friend_list_visibility', 'friends', 1),
    (p_user_id, 'online_status_visibility', 'friends', 1),
    (p_user_id, 'last_seen_visibility', 'friends', 1),
    (p_user_id, 'conversation_previews', 'enabled', 1),
    (p_user_id, 'recommendation_preferences', 'enabled', 1),
    (p_user_id, 'activity_feed_visibility', 'friends', 1)
    ON CONFLICT (user_id, setting_key, applies_to_group_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to create default friend group for new users
CREATE OR REPLACE FUNCTION create_default_friend_group(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    group_id INTEGER;
BEGIN
    INSERT INTO friend_groups (user_id, name, description, color, icon, is_default)
    VALUES (p_user_id, 'All Friends', 'Default group for all friends', '#6366f1', 'users', TRUE)
    ON CONFLICT (user_id, name) DO NOTHING
    RETURNING id INTO group_id;
    
    -- If no group_id (conflict), get existing one
    IF group_id IS NULL THEN
        SELECT id INTO group_id FROM friend_groups 
        WHERE user_id = p_user_id AND is_default = TRUE LIMIT 1;
    END IF;
    
    RETURN group_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Function to clean up expired recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM friend_recommendations 
    WHERE expires_at < CURRENT_TIMESTAMP AND is_dismissed = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_analytics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM social_analytics_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate friendship strength
CREATE OR REPLACE FUNCTION recalculate_friendship_strength(p_user_id INTEGER, p_friend_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    strength_score DECIMAL(3,2);
    total_interactions INTEGER;
    recent_interactions INTEGER;
    days_since_last INTEGER;
    interaction_variety INTEGER;
BEGIN
    -- Get interaction counts
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'), 0),
        COALESCE(EXTRACT(DAYS FROM CURRENT_TIMESTAMP - MAX(created_at)), 999),
        COALESCE(COUNT(DISTINCT interaction_type), 0)
    INTO total_interactions, recent_interactions, days_since_last, interaction_variety
    FROM social_interactions 
    WHERE (user_id = p_user_id AND friend_id = p_friend_id) 
       OR (user_id = p_friend_id AND friend_id = p_user_id);
    
    -- Calculate strength score (0.00 to 1.00)
    strength_score := LEAST(1.00, 
        (total_interactions::DECIMAL / 100) * 0.4 +  -- 40% based on total interactions
        (recent_interactions::DECIMAL / 20) * 0.3 +  -- 30% based on recent activity
        (CASE WHEN days_since_last < 7 THEN 1.0 ELSE GREATEST(0.0, 1.0 - days_since_last::DECIMAL / 30) END) * 0.2 +  -- 20% recency
        (interaction_variety::DECIMAL / 5) * 0.1     -- 10% variety of interactions
    );
    
    -- Update the summary
    INSERT INTO friend_interaction_summary (user_id, friend_id, friendship_strength, updated_at)
    VALUES (p_user_id, p_friend_id, strength_score, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, friend_id)
    DO UPDATE SET
        friendship_strength = strength_score,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN strength_score;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for friend groups with member counts
CREATE OR REPLACE VIEW friend_groups_with_counts AS
SELECT 
    fg.*,
    COALESCE(member_counts.member_count, 0) as member_count
FROM friend_groups fg
LEFT JOIN (
    SELECT group_id, COUNT(*) as member_count
    FROM friend_group_members
    GROUP BY group_id
) member_counts ON fg.id = member_counts.group_id;

-- View for active friend recommendations
CREATE OR REPLACE VIEW active_friend_recommendations AS
SELECT 
    fr.*,
    ru.username as recommended_username,
    ru.full_name as recommended_full_name,
    ru.profile_picture_url as recommended_avatar
FROM friend_recommendations fr
JOIN users ru ON fr.recommended_user_id = ru.id
WHERE fr.is_dismissed = FALSE 
  AND fr.expires_at > CURRENT_TIMESTAMP
ORDER BY fr.confidence_score DESC, fr.generated_at DESC;

-- View for conversation previews with friend details
CREATE OR REPLACE VIEW conversation_previews_detailed AS
SELECT 
    cp.*,
    u.username as friend_username,
    u.full_name as friend_full_name,
    u.profile_picture_url as friend_avatar,
    up.status as friend_status,
    up.last_seen as friend_last_seen
FROM conversation_previews cp
JOIN users u ON cp.friend_id = u.id
LEFT JOIN user_presence up ON u.id = up.user_id
ORDER BY cp.is_priority DESC, cp.last_updated DESC;

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE friend_groups IS 'Custom groups for organizing friends (Close Friends, Work, Family, etc.)';
COMMENT ON TABLE friend_group_members IS 'Many-to-many relationship between friend groups and friends';
COMMENT ON TABLE social_interactions IS 'Comprehensive tracking of all social interactions for analytics';
COMMENT ON TABLE friend_recommendations IS 'AI-powered friend suggestions with confidence scoring';
COMMENT ON TABLE user_privacy_settings IS 'Granular privacy controls with group-based permissions';
COMMENT ON TABLE conversation_previews IS 'Quick access to recent conversations with unread counts';
COMMENT ON TABLE social_analytics_cache IS 'Pre-computed analytics data for performance optimization';
COMMENT ON TABLE friend_interaction_summary IS 'Aggregated interaction data for faster relationship queries';
COMMENT ON TABLE social_goals IS 'User-defined social interaction goals and tracking';

COMMENT ON FUNCTION create_default_privacy_settings(INTEGER) IS 'Creates default privacy settings for new users';
COMMENT ON FUNCTION create_default_friend_group(INTEGER) IS 'Creates default "All Friends" group for new users';
COMMENT ON FUNCTION cleanup_expired_recommendations() IS 'Removes expired friend recommendations';
COMMENT ON FUNCTION cleanup_expired_analytics() IS 'Removes expired analytics cache entries';
COMMENT ON FUNCTION recalculate_friendship_strength(INTEGER, INTEGER) IS 'Calculates friendship strength score based on interactions';

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 3.3 Advanced Social Features Schema created successfully!';
    RAISE NOTICE '📊 Tables created: friend_groups, friend_group_members, social_interactions, friend_recommendations, user_privacy_settings, conversation_previews, social_analytics_cache, friend_interaction_summary, social_goals';
    RAISE NOTICE '🔧 Functions created: Default privacy settings, friend groups, cleanup functions, friendship strength calculation';
    RAISE NOTICE '📈 Views created: friend_groups_with_counts, active_friend_recommendations, conversation_previews_detailed';
    RAISE NOTICE '⚡ Performance indexes and triggers configured';
END $$;
