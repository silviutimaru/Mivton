const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../database/connection');

// Rate limiting for privacy controls
const privacyLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many privacy requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and auth to all routes
router.use(privacyLimit);
router.use(requireAuth);

// Valid privacy settings and values
const VALID_PRIVACY_SETTINGS = {
  profile_visibility: ['public', 'friends', 'private'],
  activity_visibility: ['public', 'friends', 'group_only', 'private'],
  friend_list_visibility: ['public', 'friends', 'private'],
  online_status_visibility: ['public', 'friends', 'private'],
  last_seen_visibility: ['public', 'friends', 'private'],
  conversation_previews: ['enabled', 'friends_only', 'disabled'],
  recommendation_preferences: ['enabled', 'limited', 'disabled'],
  activity_feed_visibility: ['public', 'friends', 'group_only', 'private']
};

// Input validation helpers
const validatePrivacySetting = [
  body('setting_key')
    .isIn(Object.keys(VALID_PRIVACY_SETTINGS))
    .withMessage('Invalid privacy setting key'),
  body('setting_value')
    .custom((value, { req }) => {
      const key = req.body.setting_key;
      if (key && VALID_PRIVACY_SETTINGS[key]) {
        return VALID_PRIVACY_SETTINGS[key].includes(value);
      }
      return false;
    })
    .withMessage('Invalid privacy setting value'),
  body('applies_to_group_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10')
];

// =============================================
// GET /api/privacy-controls - Get all privacy settings
// =============================================
router.get('/', [
  query('group_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const groupId = req.query.group_id ? parseInt(req.query.group_id) : null;
    
    let query;
    let queryParams = [userId];
    
    if (groupId) {
      // Get settings for specific group
      query = `
        SELECT 
          ups.*,
          fg.name as group_name,
          fg.color as group_color
        FROM user_privacy_settings ups
        LEFT JOIN friend_groups fg ON ups.applies_to_group_id = fg.id
        WHERE ups.user_id = $1 AND ups.applies_to_group_id = $2
        ORDER BY ups.setting_key, ups.priority DESC
      `;
      queryParams.push(groupId);
    } else {
      // Get all settings, organized by key
      query = `
        SELECT 
          ups.*,
          fg.name as group_name,
          fg.color as group_color
        FROM user_privacy_settings ups
        LEFT JOIN friend_groups fg ON ups.applies_to_group_id = fg.id
        WHERE ups.user_id = $1
        ORDER BY ups.setting_key, ups.priority DESC, ups.applies_to_group_id NULLS FIRST
      `;
    }
    
    const result = await getDb().query(query, queryParams);
    
    // Organize settings by key
    const settingsByKey = {};
    const globalSettings = {};
    const groupSettings = {};
    
    result.rows.forEach(setting => {
      const key = setting.setting_key;
      
      if (!settingsByKey[key]) {
        settingsByKey[key] = [];
      }
      settingsByKey[key].push(setting);
      
      if (setting.applies_to_group_id === null) {
        globalSettings[key] = setting;
      } else {
        if (!groupSettings[setting.applies_to_group_id]) {
          groupSettings[setting.applies_to_group_id] = {};
        }
        groupSettings[setting.applies_to_group_id][key] = setting;
      }
    });
    
    res.json({
      success: true,
      data: {
        all_settings: result.rows,
        settings_by_key: settingsByKey,
        global_settings: globalSettings,
        group_settings: groupSettings,
        available_settings: VALID_PRIVACY_SETTINGS
      }
    });
    
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch privacy settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/privacy-controls - Create or update privacy setting
// =============================================
router.post('/', validatePrivacySetting, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const { setting_key, setting_value, applies_to_group_id = null, priority = 1 } = req.body;
    
    // If group is specified, verify it belongs to user
    if (applies_to_group_id) {
      const groupCheck = await getDb().query(
        'SELECT id FROM friend_groups WHERE id = $1 AND user_id = $2',
        [applies_to_group_id, userId]
      );
      
      if (groupCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Friend group not found'
        });
      }
    }
    
    // Upsert the privacy setting
    const result = await getDb().query(`
      INSERT INTO user_privacy_settings (user_id, setting_key, setting_value, applies_to_group_id, priority)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, setting_key, applies_to_group_id)
      DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        priority = EXCLUDED.priority,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, setting_key, setting_value, applies_to_group_id, priority]);
    
    // Get group name if applicable
    let groupName = null;
    if (applies_to_group_id) {
      const groupResult = await getDb().query(
        'SELECT name FROM friend_groups WHERE id = $1',
        [applies_to_group_id]
      );
      groupName = groupResult.rows[0]?.name;
    }
    
    console.log(`✅ User ${userId} updated privacy setting: ${setting_key} = ${setting_value}${applies_to_group_id ? ` (group: ${groupName})` : ' (global)'}`);
    
    res.json({
      success: true,
      message: 'Privacy setting updated successfully',
      data: {
        ...result.rows[0],
        group_name: groupName
      }
    });
    
  } catch (error) {
    console.error('Error updating privacy setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy setting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// PUT /api/privacy-controls/bulk - Bulk update privacy settings
// =============================================
router.put('/bulk', [
  body('settings')
    .isArray({ min: 1 })
    .withMessage('Settings must be a non-empty array'),
  body('settings.*.setting_key')
    .isIn(Object.keys(VALID_PRIVACY_SETTINGS))
    .withMessage('Invalid privacy setting key'),
  body('settings.*.setting_value')
    .custom((value, { req }) => {
      const settingIndex = req.body.settings.findIndex(s => s.setting_value === value);
      if (settingIndex >= 0) {
        const key = req.body.settings[settingIndex].setting_key;
        if (key && VALID_PRIVACY_SETTINGS[key]) {
          return VALID_PRIVACY_SETTINGS[key].includes(value);
        }
      }
      return false;
    })
    .withMessage('Invalid privacy setting value'),
  body('settings.*.applies_to_group_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const { settings } = req.body;
    
    // Verify all groups belong to user
    const groupIds = settings
      .filter(s => s.applies_to_group_id)
      .map(s => s.applies_to_group_id);
    
    if (groupIds.length > 0) {
      const groupCheck = await getDb().query(
        'SELECT id FROM friend_groups WHERE id = ANY($1) AND user_id = $2',
        [groupIds, userId]
      );
      
      if (groupCheck.rows.length !== groupIds.length) {
        return res.status(404).json({
          success: false,
          message: 'One or more friend groups not found'
        });
      }
    }
    
    // Begin transaction
    const client = await getDb().connect();
    await client.query('BEGIN');
    
    try {
      const updatedSettings = [];
      
      for (const setting of settings) {
        const { setting_key, setting_value, applies_to_group_id = null, priority = 1 } = setting;
        
        const result = await client.query(`
          INSERT INTO user_privacy_settings (user_id, setting_key, setting_value, applies_to_group_id, priority)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, setting_key, applies_to_group_id)
          DO UPDATE SET 
            setting_value = EXCLUDED.setting_value,
            priority = EXCLUDED.priority,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [userId, setting_key, setting_value, applies_to_group_id, priority]);
        
        updatedSettings.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      
      console.log(`✅ User ${userId} bulk updated ${updatedSettings.length} privacy settings`);
      
      res.json({
        success: true,
        message: `Updated ${updatedSettings.length} privacy settings`,
        data: updatedSettings
      });
      
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error bulk updating privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update privacy settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// DELETE /api/privacy-controls/:id - Delete privacy setting
// =============================================
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Setting ID must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid setting ID',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const settingId = parseInt(req.params.id);
    
    // Check if setting exists and belongs to user
    const existing = await getDb().query(
      'SELECT * FROM user_privacy_settings WHERE id = $1 AND user_id = $2',
      [settingId, userId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Privacy setting not found'
      });
    }
    
    // Delete the setting
    await getDb().query(
      'DELETE FROM user_privacy_settings WHERE id = $1 AND user_id = $2',
      [settingId, userId]
    );
    
    console.log(`✅ User ${userId} deleted privacy setting ${settingId} (${existing.rows[0].setting_key})`);
    
    res.json({
      success: true,
      message: 'Privacy setting deleted successfully',
      data: existing.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting privacy setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete privacy setting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/privacy-controls/check/:friendId - Check privacy permissions for friend
// =============================================
router.get('/check/:friendId', [
  param('friendId').isInt({ min: 1 }).withMessage('Friend ID must be a positive integer'),
  query('setting_key')
    .optional()
    .isIn(Object.keys(VALID_PRIVACY_SETTINGS))
    .withMessage('Invalid privacy setting key')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const friendId = parseInt(req.params.friendId);
    const settingKey = req.query.setting_key;
    
    // Verify friendship exists
    const friendshipCheck = await getDb().query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [userId, friendId]
    );
    
    if (friendshipCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }
    
    // Get friend's groups for this user
    const friendGroups = await getDb().query(`
      SELECT DISTINCT group_id
      FROM friend_group_members
      WHERE user_id = $1 AND friend_id = $2
    `, [userId, friendId]);
    
    const groupIds = friendGroups.rows.map(row => row.group_id);
    
    // Build privacy check query
    let whereConditions = ['ups.user_id = $1'];
    let queryParams = [userId];
    
    if (settingKey) {
      whereConditions.push('ups.setting_key = $2');
      queryParams.push(settingKey);
    }
    
    // Get applicable privacy settings (group-specific override global)
    const privacySettings = await getDb().query(`
      SELECT DISTINCT ON (ups.setting_key)
        ups.*,
        fg.name as group_name
      FROM user_privacy_settings ups
      LEFT JOIN friend_groups fg ON ups.applies_to_group_id = fg.id
      WHERE ${whereConditions.join(' AND ')}
        AND (ups.applies_to_group_id IS NULL OR ups.applies_to_group_id = ANY($${queryParams.length + 1}))
      ORDER BY ups.setting_key, 
               CASE WHEN ups.applies_to_group_id IS NULL THEN 0 ELSE ups.priority END DESC,
               ups.applies_to_group_id DESC NULLS LAST
    `, [...queryParams, groupIds]);
    
    // Determine permissions
    const permissions = {};
    privacySettings.rows.forEach(setting => {
      const key = setting.setting_key;
      const value = setting.setting_value;
      
      let hasAccess = false;
      
      switch (value) {
        case 'public':
          hasAccess = true;
          break;
        case 'friends':
        case 'friends_only':
        case 'enabled':
          hasAccess = true; // They are friends
          break;
        case 'group_only':
          hasAccess = setting.applies_to_group_id && groupIds.includes(setting.applies_to_group_id);
          break;
        case 'private':
        case 'disabled':
          hasAccess = false;
          break;
        case 'limited':
          hasAccess = true; // Limited access still allows basic functionality
          break;
        default:
          hasAccess = false;
      }
      
      permissions[key] = {
        has_access: hasAccess,
        setting_value: value,
        applies_to_group: setting.applies_to_group_id,
        group_name: setting.group_name,
        reason: getPermissionReason(value, hasAccess, setting.applies_to_group_id ? 'group' : 'global')
      };
    });
    
    res.json({
      success: true,
      data: {
        friend_id: friendId,
        friend_groups: groupIds,
        permissions: permissions,
        checked_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error checking privacy permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check privacy permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/privacy-controls/reset-defaults - Reset to default privacy settings
// =============================================
router.post('/reset-defaults', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Delete all existing settings
    await getDb().query(
      'DELETE FROM user_privacy_settings WHERE user_id = $1',
      [userId]
    );
    
    // Create default settings
    await getDb().query(
      'SELECT create_default_privacy_settings($1)',
      [userId]
    );
    
    // Get the new default settings
    const result = await getDb().query(
      'SELECT * FROM user_privacy_settings WHERE user_id = $1 ORDER BY setting_key',
      [userId]
    );
    
    console.log(`✅ User ${userId} reset privacy settings to defaults`);
    
    res.json({
      success: true,
      message: 'Privacy settings reset to defaults',
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error resetting privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset privacy settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/privacy-controls/available-settings - Get available privacy settings
// =============================================
router.get('/available-settings', async (req, res) => {
  try {
    const settingsInfo = Object.entries(VALID_PRIVACY_SETTINGS).map(([key, values]) => ({
      key,
      name: formatSettingName(key),
      description: getSettingDescription(key),
      available_values: values.map(value => ({
        value,
        name: formatSettingValue(value),
        description: getValueDescription(key, value)
      })),
      default_value: getDefaultValue(key),
      category: getSettingCategory(key)
    }));
    
    res.json({
      success: true,
      data: {
        settings: settingsInfo,
        categories: {
          profile: 'Profile & Identity',
          activity: 'Activity & Presence',
          social: 'Social Features',
          communication: 'Communication & Messaging'
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching available settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// Helper Functions
// =============================================

function getPermissionReason(value, hasAccess, scope) {
  if (hasAccess) {
    return `Access granted (${value} - ${scope})`;
  } else {
    return `Access denied (${value} - ${scope})`;
  }
}

function formatSettingName(key) {
  return key.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatSettingValue(value) {
  return value.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function getSettingDescription(key) {
  const descriptions = {
    profile_visibility: 'Who can see your profile information',
    activity_visibility: 'Who can see your activity and interactions',
    friend_list_visibility: 'Who can see your friends list',
    online_status_visibility: 'Who can see when you are online',
    last_seen_visibility: 'Who can see when you were last active',
    conversation_previews: 'Enable conversation previews and quick actions',
    recommendation_preferences: 'Receive friend recommendations',
    activity_feed_visibility: 'Who can see your activity in feeds'
  };
  return descriptions[key] || 'Privacy setting';
}

function getValueDescription(key, value) {
  const descriptions = {
    public: 'Visible to everyone',
    friends: 'Visible to friends only',
    group_only: 'Visible to specific friend groups only',
    private: 'Not visible to anyone',
    enabled: 'Feature is enabled',
    disabled: 'Feature is disabled',
    friends_only: 'Available to friends only',
    limited: 'Limited functionality'
  };
  return descriptions[value] || value;
}

function getDefaultValue(key) {
  const defaults = {
    profile_visibility: 'friends',
    activity_visibility: 'friends',
    friend_list_visibility: 'friends',
    online_status_visibility: 'friends',
    last_seen_visibility: 'friends',
    conversation_previews: 'enabled',
    recommendation_preferences: 'enabled',
    activity_feed_visibility: 'friends'
  };
  return defaults[key] || 'friends';
}

function getSettingCategory(key) {
  const categories = {
    profile_visibility: 'profile',
    activity_visibility: 'activity',
    friend_list_visibility: 'social',
    online_status_visibility: 'activity',
    last_seen_visibility: 'activity',
    conversation_previews: 'communication',
    recommendation_preferences: 'social',
    activity_feed_visibility: 'activity'
  };
  return categories[key] || 'general';
}

module.exports = router;