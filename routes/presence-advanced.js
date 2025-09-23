/**
 * 🚀 MIVTON ADVANCED PRESENCE CONTROL API
 * Enhanced presence system with granular visibility controls
 * 
 * Features:
 * - Advanced status modes (Online, Away, Do Not Disturb, Invisible, Offline)
 * - Granular privacy controls (Everyone, Friends, Active Chats, Selected, Nobody)
 * - Contact-specific permissions
 * - Auto-away functionality
 * - Activity message management
 * - DND exceptions for urgent messages
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for presence operations
const presenceRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute for presence updates
    message: {
        error: 'Too many presence requests. Please try again later.',
        code: 'PRESENCE_RATE_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => `presence_advanced_${req.user?.id || req.ip}`
});

router.use(presenceRateLimit);
router.use(requireAuth);

// Enhanced presence statuses with detailed behavior
const PRESENCE_STATUSES = {
    ONLINE: 'online',           // Available and active
    AWAY: 'away',              // Away from keyboard
    BUSY: 'busy',              // Do not disturb (DND)
    INVISIBLE: 'invisible',     // Appear offline
    OFFLINE: 'offline'         // Not available
};

const PRIVACY_MODES = {
    EVERYONE: 'everyone',           // Visible to all users
    FRIENDS: 'friends',            // Visible only to friends
    ACTIVE_CHATS: 'active_chats',  // Only users with active conversations
    SELECTED: 'selected',          // Only chosen contacts
    NOBODY: 'nobody'              // Completely private
};

/**
 * GET /api/presence/advanced/status
 * Get user's advanced presence status with privacy settings
 */
router.get('/status', async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`👁️ Getting advanced presence status for user ${userId}`);

        const result = await pool.query(`
            SELECT 
                up.status,
                up.activity_message,
                up.last_seen,
                up.socket_count,
                up.updated_at,
                ups.privacy_mode,
                ups.auto_away_enabled,
                ups.auto_away_minutes,
                ups.allowed_contacts,
                ups.block_unknown_users,
                ups.show_activity_to_friends,
                ups.allow_urgent_override
            FROM user_presence up
            LEFT JOIN user_presence_settings ups ON ups.user_id = up.user_id
            WHERE up.user_id = $1
        `, [userId]);

        let presenceData;
        if (result.rows.length > 0) {
            presenceData = result.rows[0];
        } else {
            // Create default presence
            presenceData = {
                status: 'offline',
                activity_message: null,
                last_seen: new Date(),
                socket_count: 0,
                privacy_mode: 'friends',
                auto_away_enabled: true,
                auto_away_minutes: 5,
                allowed_contacts: [],
                block_unknown_users: false,
                show_activity_to_friends: true,
                allow_urgent_override: true
            };
        }

        console.log(`✅ Advanced presence status retrieved for user ${userId}: ${presenceData.status}`);

        res.json({
            success: true,
            presence: {
                user_id: userId,
                status: presenceData.status,
                activity_message: presenceData.activity_message,
                last_seen: presenceData.last_seen,
                socket_count: presenceData.socket_count,
                is_online: presenceData.socket_count > 0,
                privacy_settings: {
                    privacy_mode: presenceData.privacy_mode || 'friends',
                    auto_away_enabled: presenceData.auto_away_enabled !== false,
                    auto_away_minutes: presenceData.auto_away_minutes || 5,
                    allowed_contacts: presenceData.allowed_contacts || [],
                    block_unknown_users: presenceData.block_unknown_users === true,
                    show_activity_to_friends: presenceData.show_activity_to_friends !== false,
                    allow_urgent_override: presenceData.allow_urgent_override !== false
                },
                updated_at: presenceData.updated_at
            }
        });

    } catch (error) {
        console.error('❌ Error getting advanced presence status:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve advanced presence status',
            code: 'ADVANCED_PRESENCE_ERROR'
        });
    }
});

/**
 * PUT /api/presence/advanced/status
 * Update user's advanced presence status with privacy controls
 */
router.put('/status', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            status, 
            activity_message, 
            privacy_mode, 
            allowed_contacts,
            auto_away_enabled,
            auto_away_minutes,
            block_unknown_users,
            show_activity_to_friends,
            allow_urgent_override
        } = req.body;

        // Validate status
        if (status && !Object.values(PRESENCE_STATUSES).includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid presence status',
                code: 'INVALID_STATUS',
                valid_statuses: Object.values(PRESENCE_STATUSES)
            });
        }

        // Validate privacy mode
        if (privacy_mode && !Object.values(PRIVACY_MODES).includes(privacy_mode)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid privacy mode',
                code: 'INVALID_PRIVACY_MODE',
                valid_modes: Object.values(PRIVACY_MODES)
            });
        }

        // Validate activity message
        if (activity_message && activity_message.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Activity message too long (max 100 characters)',
                code: 'ACTIVITY_MESSAGE_TOO_LONG'
            });
        }

        // Validate allowed contacts
        if (allowed_contacts && !Array.isArray(allowed_contacts)) {
            return res.status(400).json({
                success: false,
                error: 'Allowed contacts must be an array',
                code: 'INVALID_ALLOWED_CONTACTS'
            });
        }

        console.log(`🔄 Updating advanced presence for user ${userId}: ${status}`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update or create user presence
            if (status) {
                await client.query(`
                    INSERT INTO user_presence (user_id, status, activity_message, updated_at)
                    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        activity_message = EXCLUDED.activity_message,
                        last_seen = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                `, [userId, status, activity_message || null]);
            }

            // Update or create presence settings
            if (privacy_mode !== undefined || allowed_contacts !== undefined || 
                auto_away_enabled !== undefined || auto_away_minutes !== undefined) {
                
                await client.query(`
                    INSERT INTO user_presence_settings (
                        user_id, privacy_mode, allowed_contacts, auto_away_enabled, 
                        auto_away_minutes, block_unknown_users, show_activity_to_friends,
                        allow_urgent_override, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id) DO UPDATE SET
                        privacy_mode = COALESCE(EXCLUDED.privacy_mode, user_presence_settings.privacy_mode),
                        allowed_contacts = COALESCE(EXCLUDED.allowed_contacts, user_presence_settings.allowed_contacts),
                        auto_away_enabled = COALESCE(EXCLUDED.auto_away_enabled, user_presence_settings.auto_away_enabled),
                        auto_away_minutes = COALESCE(EXCLUDED.auto_away_minutes, user_presence_settings.auto_away_minutes),
                        block_unknown_users = COALESCE(EXCLUDED.block_unknown_users, user_presence_settings.block_unknown_users),
                        show_activity_to_friends = COALESCE(EXCLUDED.show_activity_to_friends, user_presence_settings.show_activity_to_friends),
                        allow_urgent_override = COALESCE(EXCLUDED.allow_urgent_override, user_presence_settings.allow_urgent_override),
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    userId,
                    privacy_mode || null,
                    allowed_contacts ? JSON.stringify(allowed_contacts) : null,
                    auto_away_enabled,
                    auto_away_minutes,
                    block_unknown_users,
                    show_activity_to_friends,
                    allow_urgent_override
                ]);
            }

            // Log the presence change
            await client.query(`
                INSERT INTO realtime_events_log (event_type, user_id, event_data, success)
                VALUES ('presence_updated', $1, $2, TRUE)
            `, [userId, JSON.stringify({ status, privacy_mode, activity_message })]);

            await client.query('COMMIT');

            // Broadcast presence update to friends (via socket if available)
            if (global.io) {
                await broadcastPresenceUpdate(userId, {
                    status,
                    activity_message,
                    privacy_mode
                });
            }

            console.log(`✅ Advanced presence updated for user ${userId}`);

            // Get updated presence to return
            const updatedResult = await pool.query(`
                SELECT 
                    up.status,
                    up.activity_message,
                    up.last_seen,
                    up.socket_count,
                    ups.privacy_mode,
                    ups.allowed_contacts,
                    up.updated_at
                FROM user_presence up
                LEFT JOIN user_presence_settings ups ON ups.user_id = up.user_id
                WHERE up.user_id = $1
            `, [userId]);

            const updatedPresence = updatedResult.rows[0];

            res.json({
                success: true,
                message: 'Advanced presence updated successfully',
                presence: {
                    user_id: userId,
                    status: updatedPresence.status,
                    activity_message: updatedPresence.activity_message,
                    privacy_mode: updatedPresence.privacy_mode,
                    allowed_contacts: updatedPresence.allowed_contacts || [],
                    updated_at: updatedPresence.updated_at
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error updating advanced presence:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update advanced presence status',
            code: 'ADVANCED_PRESENCE_UPDATE_ERROR'
        });
    }
});

/**
 * GET /api/presence/advanced/visibility/:targetUserId
 * Check if current user can see target user's presence
 */
router.get('/visibility/:targetUserId', async (req, res) => {
    try {
        const userId = req.user.id;
        const targetUserId = parseInt(req.params.targetUserId);

        if (!targetUserId || isNaN(targetUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid target user ID',
                code: 'INVALID_TARGET_USER_ID'
            });
        }

        console.log(`🔍 Checking presence visibility from user ${userId} to user ${targetUserId}`);

        const visibility = await checkPresenceVisibility(userId, targetUserId);

        res.json({
            success: true,
            visibility: {
                can_see_status: visibility.canSeeStatus,
                can_see_activity: visibility.canSeeActivity,
                can_contact: visibility.canContact,
                contact_restrictions: visibility.contactRestrictions,
                visible_status: visibility.visibleStatus,
                reason: visibility.reason
            }
        });

    } catch (error) {
        console.error('❌ Error checking presence visibility:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to check presence visibility',
            code: 'PRESENCE_VISIBILITY_ERROR'
        });
    }
});

/**
 * POST /api/presence/advanced/contact-check
 * Check if user can be contacted based on current presence settings
 */
router.post('/contact-check', async (req, res) => {
    try {
        const userId = req.user.id;
        const { target_user_id, message_type = 'normal', is_urgent = false } = req.body;

        if (!target_user_id) {
            return res.status(400).json({
                success: false,
                error: 'Target user ID is required',
                code: 'MISSING_TARGET_USER_ID'
            });
        }

        console.log(`📞 Checking contact permissions from user ${userId} to user ${target_user_id}`);

        const contactCheck = await checkContactPermissions(userId, target_user_id, {
            messageType: message_type,
            isUrgent: is_urgent
        });

        res.json({
            success: true,
            contact_check: {
                can_contact: contactCheck.canContact,
                requires_confirmation: contactCheck.requiresConfirmation,
                suggested_delay: contactCheck.suggestedDelay,
                alternative_methods: contactCheck.alternativeMethods,
                reason: contactCheck.reason,
                target_status: contactCheck.targetStatus
            }
        });

    } catch (error) {
        console.error('❌ Error checking contact permissions:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to check contact permissions',
            code: 'CONTACT_CHECK_ERROR'
        });
    }
});

/**
 * GET /api/presence/advanced/friends-filtered
 * Get friends list filtered by their visibility settings
 */
router.get('/friends-filtered', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status_filter, include_invisible = false } = req.query;

        console.log(`👥 Getting filtered friends presence for user ${userId}`);

        const result = await pool.query(`
            SELECT 
                f.user2_id as friend_id,
                u.username as friend_username,
                u.full_name as friend_full_name,
                u.is_verified as friend_verified,
                CASE 
                    WHEN ups.privacy_mode = 'nobody' 
                        OR (ups.privacy_mode = 'selected' AND NOT (ups.allowed_contacts ? '${userId}'))
                        OR (up.status = 'invisible' AND $2 = FALSE)
                    THEN 'offline'
                    ELSE up.status
                END as visible_status,
                CASE 
                    WHEN ups.show_activity_to_friends = FALSE 
                        OR ups.privacy_mode = 'nobody'
                        OR (ups.privacy_mode = 'selected' AND NOT (ups.allowed_contacts ? '${userId}'))
                    THEN NULL
                    ELSE up.activity_message
                END as visible_activity_message,
                up.last_seen,
                up.socket_count,
                ups.privacy_mode,
                CASE 
                    WHEN up.status = 'busy' AND ups.allow_urgent_override = TRUE THEN TRUE
                    ELSE FALSE
                END as accepts_urgent_messages,
                -- Check if there's an active chat (placeholder for future chat system)
                FALSE as has_active_chat
            FROM friendships f
            JOIN users u ON f.user2_id = u.id
            LEFT JOIN user_presence up ON up.user_id = f.user2_id
            LEFT JOIN user_presence_settings ups ON ups.user_id = f.user2_id
            WHERE f.user1_id = $1
            AND u.is_blocked = FALSE
            ORDER BY 
                CASE 
                    WHEN up.status = 'online' THEN 1
                    WHEN up.status = 'away' THEN 2
                    WHEN up.status = 'busy' THEN 3
                    ELSE 4
                END,
                u.full_name ASC
        `, [userId, include_invisible === 'true']);

        // Apply status filter if provided
        let friends = result.rows;
        if (status_filter && Object.values(PRESENCE_STATUSES).includes(status_filter)) {
            friends = friends.filter(friend => friend.visible_status === status_filter);
        }

        // Calculate contact permissions for each friend
        const friendsWithPermissions = friends.map(friend => ({
            ...friend,
            contact_permissions: calculateContactPermissions(userId, friend)
        }));

        console.log(`✅ Retrieved ${friendsWithPermissions.length} friends with filtered presence`);

        res.json({
            success: true,
            friends: friendsWithPermissions,
            stats: {
                total: friends.length,
                online: friends.filter(f => f.visible_status === 'online').length,
                away: friends.filter(f => f.visible_status === 'away').length,
                busy: friends.filter(f => f.visible_status === 'busy').length,
                offline: friends.filter(f => f.visible_status === 'offline').length
            }
        });

    } catch (error) {
        console.error('❌ Error getting filtered friends presence:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve filtered friends presence',
            code: 'FILTERED_FRIENDS_ERROR'
        });
    }
});

/**
 * PUT /api/presence/advanced/privacy
 * Update privacy settings only
 */
router.put('/privacy', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            privacy_mode,
            allowed_contacts,
            block_unknown_users,
            show_activity_to_friends,
            allow_urgent_override
        } = req.body;

        console.log(`🔒 Updating privacy settings for user ${userId}`);

        await pool.query(`
            INSERT INTO user_presence_settings (
                user_id, privacy_mode, allowed_contacts, block_unknown_users,
                show_activity_to_friends, allow_urgent_override, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                privacy_mode = COALESCE(EXCLUDED.privacy_mode, user_presence_settings.privacy_mode),
                allowed_contacts = COALESCE(EXCLUDED.allowed_contacts, user_presence_settings.allowed_contacts),
                block_unknown_users = COALESCE(EXCLUDED.block_unknown_users, user_presence_settings.block_unknown_users),
                show_activity_to_friends = COALESCE(EXCLUDED.show_activity_to_friends, user_presence_settings.show_activity_to_friends),
                allow_urgent_override = COALESCE(EXCLUDED.allow_urgent_override, user_presence_settings.allow_urgent_override),
                updated_at = CURRENT_TIMESTAMP
        `, [
            userId,
            privacy_mode || null,
            allowed_contacts ? JSON.stringify(allowed_contacts) : null,
            block_unknown_users,
            show_activity_to_friends,
            allow_urgent_override
        ]);

        console.log(`✅ Privacy settings updated for user ${userId}`);

        res.json({
            success: true,
            message: 'Privacy settings updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating privacy settings:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update privacy settings',
            code: 'PRIVACY_UPDATE_ERROR'
        });
    }
});

/**
 * GET /api/presence/advanced/options
 * Get available presence status and privacy options
 */
router.get('/options', (req, res) => {
    try {
        const statusOptions = Object.entries(PRESENCE_STATUSES).map(([key, value]) => ({
            key,
            value,
            label: getStatusLabel(value),
            description: getStatusDescription(value),
            icon: getStatusIcon(value),
            allows_interaction: getAllowsInteraction(value)
        }));

        const privacyOptions = Object.entries(PRIVACY_MODES).map(([key, value]) => ({
            key,
            value,
            label: getPrivacyLabel(value),
            description: getPrivacyDescription(value)
        }));

        res.json({
            success: true,
            options: {
                statuses: statusOptions,
                privacy_modes: privacyOptions
            }
        });

    } catch (error) {
        console.error('❌ Error getting presence options:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve presence options',
            code: 'PRESENCE_OPTIONS_ERROR'
        });
    }
});

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Check presence visibility between two users
 */
async function checkPresenceVisibility(viewerId, targetUserId) {
    try {
        // Get target user's presence and privacy settings
        const result = await pool.query(`
            SELECT 
                up.status,
                up.activity_message,
                ups.privacy_mode,
                ups.allowed_contacts,
                ups.show_activity_to_friends,
                -- Check if viewer is friend
                EXISTS(
                    SELECT 1 FROM friendships f
                    WHERE ((f.user1_id = $1 AND f.user2_id = $2) OR (f.user1_id = $2 AND f.user2_id = $1))
                    AND f.status = 'active'
                ) as is_friend,
                -- Check if there's active chat (placeholder for future chat system)
                FALSE as has_active_chat
            FROM user_presence up
            LEFT JOIN user_presence_settings ups ON ups.user_id = up.user_id
            WHERE up.user_id = $2
        `, [viewerId, targetUserId]);

        if (result.rows.length === 0) {
            return {
                canSeeStatus: false,
                canSeeActivity: false,
                canContact: false,
                visibleStatus: 'offline',
                reason: 'User not found'
            };
        }

        const target = result.rows[0];
        const privacyMode = target.privacy_mode || 'friends';
        const allowedContacts = target.allowed_contacts || [];

        // If user is invisible, show as offline (unless viewer is allowed)
        if (target.status === 'invisible') {
            const canSeeInvisible = privacyMode === 'selected' && allowedContacts.includes(viewerId);
            if (!canSeeInvisible) {
                return {
                    canSeeStatus: true,
                    canSeeActivity: false,
                    canContact: false,
                    visibleStatus: 'offline',
                    reason: 'User appears offline'
                };
            }
        }

        // Check visibility based on privacy mode
        let canSeeStatus = false;
        let canSeeActivity = false;

        switch (privacyMode) {
            case 'everyone':
                canSeeStatus = true;
                canSeeActivity = target.show_activity_to_friends !== false;
                break;
            case 'friends':
                canSeeStatus = target.is_friend;
                canSeeActivity = target.is_friend && target.show_activity_to_friends !== false;
                break;
            case 'active_chats':
                canSeeStatus = target.has_active_chat;
                canSeeActivity = target.has_active_chat && target.show_activity_to_friends !== false;
                break;
            case 'selected':
                canSeeStatus = allowedContacts.includes(viewerId);
                canSeeActivity = allowedContacts.includes(viewerId) && target.show_activity_to_friends !== false;
                break;
            case 'nobody':
                canSeeStatus = false;
                canSeeActivity = false;
                break;
        }

        // Determine contact ability
        const canContact = canSeeStatus && target.status !== 'offline' && 
                          (target.status !== 'busy' || target.has_active_chat || allowedContacts.includes(viewerId));

        return {
            canSeeStatus,
            canSeeActivity,
            canContact,
            visibleStatus: canSeeStatus ? target.status : 'offline',
            contactRestrictions: target.status === 'busy' ? 'dnd_mode' : null,
            reason: canSeeStatus ? 'Allowed by privacy settings' : 'Restricted by privacy settings'
        };

    } catch (error) {
        console.error('Error checking presence visibility:', error);
        return {
            canSeeStatus: false,
            canSeeActivity: false,
            canContact: false,
            visibleStatus: 'offline',
            reason: 'Error checking visibility'
        };
    }
}

/**
 * Check contact permissions between users
 */
async function checkContactPermissions(senderId, targetUserId, options = {}) {
    try {
        const visibility = await checkPresenceVisibility(senderId, targetUserId);
        
        if (!visibility.canContact) {
            return {
                canContact: false,
                requiresConfirmation: false,
                suggestedDelay: null,
                alternativeMethods: [],
                reason: visibility.reason,
                targetStatus: visibility.visibleStatus
            };
        }

        // Special handling for busy/DND mode
        if (visibility.visibleStatus === 'busy') {
            if (options.isUrgent) {
                return {
                    canContact: true,
                    requiresConfirmation: true,
                    suggestedDelay: null,
                    alternativeMethods: ['urgent_notification'],
                    reason: 'Urgent message override for DND mode',
                    targetStatus: 'busy'
                };
            } else {
                return {
                    canContact: true,
                    requiresConfirmation: true,
                    suggestedDelay: 3600, // 1 hour
                    alternativeMethods: ['schedule_message', 'leave_note'],
                    reason: 'User is in Do Not Disturb mode',
                    targetStatus: 'busy'
                };
            }
        }

        return {
            canContact: true,
            requiresConfirmation: false,
            suggestedDelay: null,
            alternativeMethods: [],
            reason: 'Normal contact allowed',
            targetStatus: visibility.visibleStatus
        };

    } catch (error) {
        console.error('Error checking contact permissions:', error);
        return {
            canContact: false,
            requiresConfirmation: false,
            reason: 'Error checking permissions',
            targetStatus: 'unknown'
        };
    }
}

/**
 * Calculate contact permissions for a friend
 */
function calculateContactPermissions(userId, friend) {
    const permissions = {
        can_message: false,
        can_call: false,
        requires_confirmation: false,
        message_delay: null,
        restrictions: []
    };

    // Basic status checks
    if (friend.visible_status === 'offline') {
        permissions.restrictions.push('User is offline');
        return permissions;
    }

    if (friend.visible_status === 'invisible') {
        permissions.restrictions.push('User appears offline');
        return permissions;
    }

    // Normal contact permissions
    permissions.can_message = true;
    permissions.can_call = friend.visible_status === 'online';

    // Special handling for busy status
    if (friend.visible_status === 'busy') {
        if (friend.has_active_chat) {
            permissions.can_message = true;
            permissions.requires_confirmation = false;
        } else {
            permissions.can_message = friend.accepts_urgent_messages;
            permissions.requires_confirmation = true;
            permissions.message_delay = 3600; // 1 hour suggested delay
            permissions.restrictions.push('User is in Do Not Disturb mode');
        }
        permissions.can_call = false;
    }

    return permissions;
}

/**
 * Broadcast presence update to relevant users
 */
async function broadcastPresenceUpdate(userId, presenceData) {
    try {
        if (!global.io) return;

        // Get user's friends who can see the status update
        const result = await pool.query(`
            SELECT DISTINCT f.user1_id as friend_id
            FROM friendships f
            JOIN user_presence_settings ups ON ups.user_id = $1
            WHERE f.user2_id = $1
            AND (
                ups.privacy_mode = 'everyone'
                OR ups.privacy_mode = 'friends'
                OR (ups.privacy_mode = 'selected' AND (ups.allowed_contacts ? f.user1_id::text))
            )
        `, [userId]);

        const visibleToUsers = result.rows.map(row => row.friend_id);

        // Broadcast to each friend's socket connections
        visibleToUsers.forEach(friendId => {
            global.io.to(`user_${friendId}`).emit('friend:presence:update', {
                friend_id: userId,
                status: presenceData.status,
                activity_message: presenceData.activity_message,
                updated_at: new Date().toISOString()
            });
        });

        console.log(`📡 Broadcasted presence update to ${visibleToUsers.length} friends`);

    } catch (error) {
        console.error('Error broadcasting presence update:', error);
    }
}

// Status helper functions
function getStatusLabel(status) {
    const labels = {
        online: 'Online',
        away: 'Away', 
        busy: 'Do Not Disturb',
        invisible: 'Invisible',
        offline: 'Offline'
    };
    return labels[status] || 'Unknown';
}

function getStatusDescription(status) {
    const descriptions = {
        online: 'Available and active',
        away: 'Away from keyboard',
        busy: 'Do not disturb - only urgent messages or active chats',
        invisible: 'Appear offline to others',
        offline: 'Not available'
    };
    return descriptions[status] || 'Unknown status';
}

function getStatusIcon(status) {
    const icons = {
        online: '🟢',
        away: '🟡',
        busy: '🔴',
        invisible: '⚫',
        offline: '⚪'
    };
    return icons[status] || '⚪';
}

function getAllowsInteraction(status) {
    return ['online', 'away'].includes(status);
}

function getPrivacyLabel(mode) {
    const labels = {
        everyone: 'Everyone',
        friends: 'Friends Only',
        active_chats: 'Active Chats Only',
        selected: 'Selected Contacts',
        nobody: 'Nobody'
    };
    return labels[mode] || 'Unknown';
}

function getPrivacyDescription(mode) {
    const descriptions = {
        everyone: 'Visible to all users',
        friends: 'Visible only to friends',
        active_chats: 'Only users with active conversations',
        selected: 'Only chosen contacts can see status',
        nobody: 'Completely private'
    };
    return descriptions[mode] || 'Unknown privacy mode';
}

module.exports = router;
