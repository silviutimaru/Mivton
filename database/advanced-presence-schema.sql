-- 🚀 MIVTON ADVANCED PRESENCE CONTROL SCHEMA
-- Database extensions for granular presence visibility controls
-- Created: August 1, 2025

-- ============================================================================
-- 1. USER PRESENCE SETTINGS TABLE (Advanced privacy controls)
-- ============================================================================
-- Stores detailed presence privacy preferences for each user
CREATE TABLE IF NOT EXISTS user_presence_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Privacy visibility modes
    privacy_mode VARCHAR(20) DEFAULT 'friends' CHECK (privacy_mode IN (
        'everyone',      -- Visible to all users
        'friends',       -- Visible only to friends  
        'active_chats',  -- Only users with active conversations
        'selected',      -- Only chosen contacts
        'nobody'         -- Completely private
    )),
    
    -- Specific allowed contacts (JSON array of user IDs)
    allowed_contacts JSONB DEFAULT '[]'::jsonb,
    
    -- Auto-away settings
    auto_away_enabled BOOLEAN DEFAULT TRUE,
    auto_away_minutes INTEGER DEFAULT 5 CHECK (auto_away_minutes BETWEEN 1 AND 60),
    
    -- Advanced privacy controls
    block_unknown_users BOOLEAN DEFAULT FALSE,     -- Block messages from non-friends
    show_activity_to_friends BOOLEAN DEFAULT TRUE, -- Show activity message to friends
    allow_urgent_override BOOLEAN DEFAULT TRUE,    -- Allow urgent messages in DND mode
    
    -- Last seen visibility
    show_last_seen VARCHAR(20) DEFAULT 'friends' CHECK (show_last_seen IN (
        'everyone', 'friends', 'nobody'
    )),
    
    -- Online indicator visibility  
    show_online_status VARCHAR(20) DEFAULT 'friends' CHECK (show_online_status IN (
        'everyone', 'friends', 'nobody'
    )),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. CONTACT RESTRICTIONS TABLE (Per-contact permissions)
-- ============================================================================
-- Allows setting specific restrictions for individual contacts
CREATE TABLE IF NOT EXISTS contact_restrictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Restriction types
    can_see_online BOOLEAN DEFAULT TRUE,
    can_see_activity BOOLEAN DEFAULT TRUE,
    can_send_messages BOOLEAN DEFAULT TRUE,
    can_make_calls BOOLEAN DEFAULT TRUE,
    can_see_last_seen BOOLEAN DEFAULT TRUE,
    
    -- Quiet hours (JSON with time ranges)
    quiet_hours JSONB,
    
    -- Temporary restrictions
    restriction_until TIMESTAMP,
    restriction_reason VARCHAR(200),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, contact_id),
    CHECK (user_id != contact_id)
);

-- ============================================================================
-- 3. USER ACTIVITY TRACKING TABLE (Activity monitoring)
-- ============================================================================
-- Tracks user activity for auto-away functionality
CREATE TABLE IF NOT EXISTS user_activity_tracking (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity timestamps
    last_mouse_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_keyboard_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_page_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_api_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Activity counters (for analytics)
    daily_actions INTEGER DEFAULT 0,
    session_actions INTEGER DEFAULT 0,
    
    -- Auto-away state
    is_auto_away BOOLEAN DEFAULT FALSE,
    auto_away_since TIMESTAMP,
    
    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. DND EXCEPTIONS TABLE (Do Not Disturb overrides)
-- ============================================================================
-- Manages exceptions for DND mode (urgent contacts, active chats, etc.)
CREATE TABLE IF NOT EXISTS dnd_exceptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Exception types
    exception_type VARCHAR(30) NOT NULL CHECK (exception_type IN (
        'urgent_contact',    -- Specific user can always contact
        'active_chat',       -- Active conversation exception
        'keyword_override',  -- Message contains urgent keywords
        'time_based',        -- Time-based exception (work hours, etc.)
        'group_chat'         -- Group chat exceptions
    )),
    
    -- Exception data (JSON with specific rules)
    exception_data JSONB NOT NULL,
    
    -- Validity period
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- User presence settings indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_settings_privacy 
    ON user_presence_settings(privacy_mode, updated_at);

CREATE INDEX IF NOT EXISTS idx_user_presence_settings_auto_away 
    ON user_presence_settings(auto_away_enabled, auto_away_minutes);

-- Contact restrictions indexes
CREATE INDEX IF NOT EXISTS idx_contact_restrictions_user 
    ON contact_restrictions(user_id, contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_restrictions_contact 
    ON contact_restrictions(contact_id, user_id);

-- User activity tracking indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_auto_away 
    ON user_activity_tracking(is_auto_away, auto_away_since);

CREATE INDEX IF NOT EXISTS idx_user_activity_last_activity 
    ON user_activity_tracking(user_id, last_page_activity);

-- DND exceptions indexes
CREATE INDEX IF NOT EXISTS idx_dnd_exceptions_user_active 
    ON dnd_exceptions(user_id, is_active, exception_type);

CREATE INDEX IF NOT EXISTS idx_dnd_exceptions_validity 
    ON dnd_exceptions(valid_from, valid_until) WHERE is_active = TRUE;

-- ============================================================================
-- ENHANCED FUNCTIONS FOR ADVANCED PRESENCE
-- ============================================================================

/**
 * Check if user can see another user's presence
 * Returns visibility permissions based on privacy settings
 */
CREATE OR REPLACE FUNCTION can_see_user_presence(
    viewer_id INTEGER,
    target_id INTEGER
)
RETURNS TABLE(
    can_see_status BOOLEAN,
    can_see_activity BOOLEAN,
    can_see_last_seen BOOLEAN,
    visible_status VARCHAR(20)
) AS $$
DECLARE
    target_settings RECORD;
    viewer_relationship VARCHAR(20);
    allowed_contacts_array INTEGER[];
BEGIN
    -- Get target user's presence and privacy settings
    SELECT 
        up.status,
        up.activity_message,
        COALESCE(ups.privacy_mode, 'friends') as privacy_mode,
        COALESCE(ups.allowed_contacts, '[]'::jsonb) as allowed_contacts,
        COALESCE(ups.show_activity_to_friends, TRUE) as show_activity_to_friends,
        COALESCE(ups.show_last_seen, 'friends') as show_last_seen,
        COALESCE(ups.show_online_status, 'friends') as show_online_status
    INTO target_settings
    FROM user_presence up
    LEFT JOIN user_presence_settings ups ON ups.user_id = up.user_id
    WHERE up.user_id = target_id;
    
    -- If target user not found, return no visibility
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FALSE, FALSE, 'offline'::VARCHAR(20);
        RETURN;
    END IF;
    
    -- Convert JSONB array to INTEGER array for easier processing
    SELECT ARRAY(
        SELECT (jsonb_array_elements_text(target_settings.allowed_contacts))::INTEGER
    ) INTO allowed_contacts_array;
    
    -- Determine viewer's relationship to target
    SELECT CASE
        WHEN EXISTS(
            SELECT 1 FROM friendships f 
            WHERE ((f.user1_id = viewer_id AND f.user2_id = target_id) 
                   OR (f.user1_id = target_id AND f.user2_id = viewer_id))
            AND f.status = 'active'
        ) THEN 'friend'
        WHEN EXISTS(
            SELECT 1 FROM chat_sessions cs
            WHERE ((cs.user1_id = viewer_id AND cs.user2_id = target_id)
                   OR (cs.user1_id = target_id AND cs.user2_id = viewer_id))
            AND cs.status = 'active'
            AND cs.last_activity > NOW() - INTERVAL '24 hours'
        ) THEN 'active_chat'
        ELSE 'stranger'
    END INTO viewer_relationship;
    
    -- Apply privacy rules
    CASE target_settings.privacy_mode
        WHEN 'everyone' THEN
            RETURN QUERY SELECT 
                TRUE, 
                target_settings.show_activity_to_friends,
                target_settings.show_last_seen != 'nobody',
                CASE WHEN target_settings.status = 'invisible' THEN 'offline' ELSE target_settings.status END;
        
        WHEN 'friends' THEN
            RETURN QUERY SELECT 
                viewer_relationship = 'friend',
                viewer_relationship = 'friend' AND target_settings.show_activity_to_friends,
                viewer_relationship = 'friend' AND target_settings.show_last_seen IN ('everyone', 'friends'),
                CASE 
                    WHEN viewer_relationship = 'friend' AND target_settings.status != 'invisible' THEN target_settings.status
                    ELSE 'offline'
                END;
        
        WHEN 'active_chats' THEN
            RETURN QUERY SELECT 
                viewer_relationship = 'active_chat',
                viewer_relationship = 'active_chat' AND target_settings.show_activity_to_friends,
                viewer_relationship = 'active_chat',
                CASE 
                    WHEN viewer_relationship = 'active_chat' AND target_settings.status != 'invisible' THEN target_settings.status
                    ELSE 'offline'
                END;
        
        WHEN 'selected' THEN
            RETURN QUERY SELECT 
                viewer_id = ANY(allowed_contacts_array),
                viewer_id = ANY(allowed_contacts_array) AND target_settings.show_activity_to_friends,
                viewer_id = ANY(allowed_contacts_array),
                CASE 
                    WHEN viewer_id = ANY(allowed_contacts_array) AND target_settings.status != 'invisible' THEN target_settings.status
                    ELSE 'offline'
                END;
        
        WHEN 'nobody' THEN
            RETURN QUERY SELECT FALSE, FALSE, FALSE, 'offline'::VARCHAR(20);
        
        ELSE
            -- Default to friends mode
            RETURN QUERY SELECT 
                viewer_relationship = 'friend',
                viewer_relationship = 'friend',
                viewer_relationship = 'friend',
                CASE 
                    WHEN viewer_relationship = 'friend' AND target_settings.status != 'invisible' THEN target_settings.status
                    ELSE 'offline'
                END;
    END CASE;
END;
$$ LANGUAGE plpgsql;

/**
 * Check if user can contact another user based on presence and privacy settings
 */
CREATE OR REPLACE FUNCTION can_contact_user(
    sender_id INTEGER,
    target_id INTEGER,
    is_urgent BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    can_contact BOOLEAN,
    requires_confirmation BOOLEAN,
    restriction_reason VARCHAR(100)
) AS $$
DECLARE
    visibility_result RECORD;
    target_settings RECORD;
    contact_restriction RECORD;
BEGIN
    -- Check basic visibility first
    SELECT * INTO visibility_result FROM can_see_user_presence(sender_id, target_id);
    
    -- If can't see status, can't contact
    IF NOT visibility_result.can_see_status THEN
        RETURN QUERY SELECT FALSE, FALSE, 'User privacy settings prevent contact';
        RETURN;
    END IF;
    
    -- If user is offline, can't contact in real-time
    IF visibility_result.visible_status = 'offline' THEN
        RETURN QUERY SELECT FALSE, FALSE, 'User is offline';
        RETURN;
    END IF;
    
    -- Get target user's settings for DND and contact restrictions
    SELECT 
        COALESCE(ups.allow_urgent_override, TRUE) as allow_urgent_override,
        COALESCE(ups.block_unknown_users, FALSE) as block_unknown_users
    INTO target_settings
    FROM user_presence_settings ups
    WHERE ups.user_id = target_id;
    
    -- Check for specific contact restrictions
    SELECT * INTO contact_restriction
    FROM contact_restrictions cr
    WHERE cr.user_id = target_id AND cr.contact_id = sender_id
    AND (cr.restriction_until IS NULL OR cr.restriction_until > CURRENT_TIMESTAMP);
    
    -- Apply contact restrictions if they exist
    IF FOUND AND contact_restriction.can_send_messages = FALSE THEN
        RETURN QUERY SELECT FALSE, FALSE, 'Contact restricted by user';
        RETURN;
    END IF;
    
    -- Handle DND/Busy status
    IF visibility_result.visible_status = 'busy' THEN
        -- Check if urgent override is allowed
        IF is_urgent AND COALESCE(target_settings.allow_urgent_override, TRUE) THEN
            RETURN QUERY SELECT TRUE, TRUE, 'Urgent message override for DND mode';
            RETURN;
        END IF;
        
        -- Check if there's an active chat
        IF EXISTS(
            SELECT 1 FROM chat_sessions cs
            WHERE ((cs.user1_id = sender_id AND cs.user2_id = target_id)
                   OR (cs.user1_id = target_id AND cs.user2_id = sender_id))
            AND cs.status = 'active'
            AND cs.last_activity > NOW() - INTERVAL '24 hours'
        ) THEN
            RETURN QUERY SELECT TRUE, FALSE, 'Active chat exception';
            RETURN;
        END IF;
        
        -- Check if sender is in allowed contacts for DND
        IF EXISTS(
            SELECT 1 FROM user_presence_settings ups
            WHERE ups.user_id = target_id
            AND ups.allowed_contacts ? sender_id::text
        ) THEN
            RETURN QUERY SELECT TRUE, FALSE, 'Selected contact exception';
            RETURN;
        END IF;
        
        -- Otherwise, contact requires confirmation for DND
        RETURN QUERY SELECT TRUE, TRUE, 'User is in Do Not Disturb mode';
        RETURN;
    END IF;
    
    -- For other statuses (online, away), allow contact
    RETURN QUERY SELECT TRUE, FALSE, 'Contact allowed';
END;
$$ LANGUAGE plpgsql;

/**
 * Update user activity for auto-away detection
 */
CREATE OR REPLACE FUNCTION update_user_activity(
    target_user_id INTEGER,
    activity_type VARCHAR(20) DEFAULT 'page'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_tracking (
        user_id, 
        last_page_activity,
        last_api_activity,
        session_actions,
        updated_at
    )
    VALUES (
        target_user_id,
        CASE WHEN activity_type = 'page' THEN CURRENT_TIMESTAMP ELSE NULL END,
        CASE WHEN activity_type = 'api' THEN CURRENT_TIMESTAMP ELSE NULL END,
        1,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
        last_page_activity = CASE 
            WHEN activity_type = 'page' THEN CURRENT_TIMESTAMP 
            ELSE user_activity_tracking.last_page_activity 
        END,
        last_api_activity = CASE 
            WHEN activity_type = 'api' THEN CURRENT_TIMESTAMP 
            ELSE user_activity_tracking.last_api_activity 
        END,
        session_actions = user_activity_tracking.session_actions + 1,
        updated_at = CURRENT_TIMESTAMP;
        
    -- Reset auto-away if user was auto-away and now active
    UPDATE user_activity_tracking 
    SET is_auto_away = FALSE, auto_away_since = NULL
    WHERE user_id = target_user_id AND is_auto_away = TRUE;
END;
$$ LANGUAGE plpgsql;

/**
 * Process auto-away for inactive users
 */
CREATE OR REPLACE FUNCTION process_auto_away_users()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Find users who should be set to auto-away
    FOR user_record IN
        SELECT 
            uat.user_id,
            ups.auto_away_minutes
        FROM user_activity_tracking uat
        JOIN user_presence_settings ups ON ups.user_id = uat.user_id
        JOIN user_presence up ON up.user_id = uat.user_id
        WHERE ups.auto_away_enabled = TRUE
        AND uat.is_auto_away = FALSE
        AND up.status = 'online'
        AND uat.last_page_activity < NOW() - (ups.auto_away_minutes || ' minutes')::INTERVAL
        AND up.socket_count > 0  -- Only for users who are still connected
    LOOP
        -- Set user to away status
        UPDATE user_presence 
        SET status = 'away', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = user_record.user_id;
        
        -- Mark as auto-away
        UPDATE user_activity_tracking 
        SET is_auto_away = TRUE, auto_away_since = CURRENT_TIMESTAMP
        WHERE user_id = user_record.user_id;
        
        -- Log the auto-away event
        INSERT INTO realtime_events_log (event_type, user_id, event_data, success)
        VALUES ('auto_away_triggered', user_record.user_id, 
                jsonb_build_object('minutes_inactive', user_record.auto_away_minutes), TRUE);
        
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR ADVANCED PRESENCE
-- ============================================================================

/**
 * Trigger to update user_presence_settings timestamp
 */
CREATE OR REPLACE FUNCTION update_presence_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_presence_settings_updated_at ON user_presence_settings;
CREATE TRIGGER trigger_presence_settings_updated_at
    BEFORE UPDATE ON user_presence_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_presence_settings_timestamp();

-- ============================================================================
-- VIEWS FOR EASY DATA ACCESS
-- ============================================================================

/**
 * View combining user presence with privacy settings
 */
CREATE OR REPLACE VIEW v_user_presence_full AS
SELECT 
    up.user_id,
    u.username,
    u.full_name,
    up.status as actual_status,
    up.activity_message,
    up.last_seen,
    up.socket_count,
    up.updated_at as presence_updated,
    
    -- Privacy settings
    COALESCE(ups.privacy_mode, 'friends') as privacy_mode,
    COALESCE(ups.allowed_contacts, '[]'::jsonb) as allowed_contacts,
    COALESCE(ups.auto_away_enabled, TRUE) as auto_away_enabled,
    COALESCE(ups.auto_away_minutes, 5) as auto_away_minutes,
    COALESCE(ups.block_unknown_users, FALSE) as block_unknown_users,
    COALESCE(ups.show_activity_to_friends, TRUE) as show_activity_to_friends,
    COALESCE(ups.allow_urgent_override, TRUE) as allow_urgent_override,
    COALESCE(ups.show_last_seen, 'friends') as show_last_seen,
    COALESCE(ups.show_online_status, 'friends') as show_online_status,
    
    -- Activity tracking
    uat.is_auto_away,
    uat.auto_away_since,
    uat.last_page_activity,
    uat.session_actions
FROM user_presence up
JOIN users u ON u.id = up.user_id
LEFT JOIN user_presence_settings ups ON ups.user_id = up.user_id
LEFT JOIN user_activity_tracking uat ON uat.user_id = up.user_id
WHERE u.is_blocked = FALSE;

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Create default presence settings for existing users
INSERT INTO user_presence_settings (user_id, privacy_mode, auto_away_enabled, auto_away_minutes)
SELECT 
    id,
    'friends',
    TRUE,
    5
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_presence_settings ups WHERE ups.user_id = users.id
);

-- Create activity tracking entries for existing users
INSERT INTO user_activity_tracking (user_id)
SELECT id
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_activity_tracking uat WHERE uat.user_id = users.id
);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Advanced Presence Control Schema created successfully!';
    RAISE NOTICE '🔒 Privacy Features: Everyone, Friends, Active Chats, Selected, Nobody';
    RAISE NOTICE '🚫 DND Features: Do Not Disturb with urgent overrides and exceptions';
    RAISE NOTICE '👁️ Visibility: Granular control over status, activity, and last seen';
    RAISE NOTICE '🤖 Auto-Away: Configurable automatic away detection';
    RAISE NOTICE '⚡ Performance: Optimized indexes and helper functions';
END $$;
