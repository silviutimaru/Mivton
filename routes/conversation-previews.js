const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../database/connection');

// Rate limiting for conversation previews
const conversationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many conversation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and auth to all routes
router.use(conversationLimit);
router.use(requireAuth);

// =============================================
// GET /api/conversation-previews - Get all conversation previews
// =============================================
router.get('/', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  query('filter')
    .optional()
    .isIn(['all', 'unread', 'priority', 'muted', 'active'])
    .withMessage('Invalid filter type'),
  query('sort')
    .optional()
    .isIn(['recent', 'priority', 'unread', 'alphabetical'])
    .withMessage('Invalid sort type')
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
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const filter = req.query.filter || 'all';
    const sort = req.query.sort || 'recent';
    
    // Build WHERE conditions based on filter
    let whereConditions = ['cp.user_id = $1'];
    let queryParams = [userId];
    
    switch (filter) {
      case 'unread':
        whereConditions.push('cp.unread_count > 0');
        break;
      case 'priority':
        whereConditions.push('cp.is_priority = TRUE');
        break;
      case 'muted':
        whereConditions.push('cp.is_muted = TRUE');
        break;
      case 'active':
        whereConditions.push('cp.last_activity_at > CURRENT_TIMESTAMP - INTERVAL \'7 days\'');
        break;
      // 'all' - no additional conditions
    }
    
    // Build ORDER BY clause based on sort
    let orderBy;
    switch (sort) {
      case 'priority':
        orderBy = 'cp.is_priority DESC, cp.last_updated DESC';
        break;
      case 'unread':
        orderBy = 'cp.unread_count DESC, cp.last_updated DESC';
        break;
      case 'alphabetical':
        orderBy = 'u.full_name ASC';
        break;
      case 'recent':
      default:
        orderBy = 'cp.last_updated DESC';
        break;
    }
    
    // Add limit and offset parameters
    queryParams.push(limit, offset);
    
    const result = await getDb().query(`
      SELECT 
        cp.*,
        u.username as friend_username,
        u.full_name as friend_full_name,
        u.profile_picture_url as friend_avatar,
        CASE WHEN up.status IS NOT NULL THEN up.status ELSE 'offline' END as friend_status,
        up.last_seen as friend_last_seen,
        up.activity_message as friend_activity_message,
        COALESCE(fis.friendship_strength, 0.5) as friendship_strength,
        fis.total_interactions,
        fis.last_interaction_at as last_friendship_interaction
      FROM conversation_previews cp
      JOIN users u ON cp.friend_id = u.id
      LEFT JOIN user_presence up ON u.id = up.user_id
      LEFT JOIN friend_interaction_summary fis ON cp.user_id = fis.user_id AND cp.friend_id = fis.friend_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);
    
    // Get total count for pagination
    const countResult = await getDb().query(`
      SELECT COUNT(*) as total
      FROM conversation_previews cp
      WHERE ${whereConditions.join(' AND ')}
    `, queryParams.slice(0, queryParams.length - 2));
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
        has_more: (offset + limit) < parseInt(countResult.rows[0].total)
      },
      filters: {
        applied_filter: filter,
        sort_order: sort
      }
    });
    
  } catch (error) {
    console.error('Error fetching conversation previews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation previews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/conversation-previews/summary - Get conversation summary statistics
// =============================================
router.get('/summary', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await getDb().query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE unread_count > 0) as unread_conversations,
        COUNT(*) FILTER (WHERE is_priority = TRUE) as priority_conversations,
        COUNT(*) FILTER (WHERE is_muted = TRUE) as muted_conversations,
        COUNT(*) FILTER (WHERE last_activity_at > CURRENT_TIMESTAMP - INTERVAL '1 day') as active_today,
        COUNT(*) FILTER (WHERE last_activity_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as active_this_week,
        SUM(unread_count) as total_unread_messages,
        AVG(unread_count) as avg_unread_per_conversation,
        MAX(last_activity_at) as most_recent_activity
      FROM conversation_previews
      WHERE user_id = $1
    `, [userId]);
    
    const summary = result.rows[0] || {};
    
    res.json({
      success: true,
      data: {
        total_conversations: parseInt(summary.total_conversations) || 0,
        unread_conversations: parseInt(summary.unread_conversations) || 0,
        priority_conversations: parseInt(summary.priority_conversations) || 0,
        muted_conversations: parseInt(summary.muted_conversations) || 0,
        active_today: parseInt(summary.active_today) || 0,
        active_this_week: parseInt(summary.active_this_week) || 0,
        total_unread_messages: parseInt(summary.total_unread_messages) || 0,
        avg_unread_per_conversation: parseFloat(summary.avg_unread_per_conversation) || 0,
        most_recent_activity: summary.most_recent_activity,
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching conversation summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// PUT /api/conversation-previews/:friendId - Update conversation preview
// =============================================
router.put('/:friendId', [
  param('friendId').isInt({ min: 1 }).withMessage('Friend ID must be a positive integer'),
  body('last_message_preview')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Preview message too long'),
  body('last_message_type')
    .optional()
    .isIn(['text', 'image', 'file', 'voice', 'video', 'system'])
    .withMessage('Invalid message type'),
  body('last_interaction_type')
    .optional()
    .isIn(['message', 'call', 'video_call', 'group_activity'])
    .withMessage('Invalid interaction type'),
  body('unread_count')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Unread count must be non-negative'),
  body('is_priority')
    .optional()
    .isBoolean()
    .withMessage('is_priority must be boolean'),
  body('is_muted')
    .optional()
    .isBoolean()
    .withMessage('is_muted must be boolean')
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
    const {
      last_message_preview,
      last_message_type,
      last_interaction_type,
      unread_count,
      is_priority,
      is_muted
    } = req.body;
    
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
    
    // Build update query dynamically
    const updateFields = [];
    const queryParams = [userId, friendId];
    let paramCount = 2;
    
    if (last_message_preview !== undefined) {
      paramCount++;
      updateFields.push(`last_message_preview = $${paramCount}`);
      queryParams.push(last_message_preview);
    }
    
    if (last_message_type !== undefined) {
      paramCount++;
      updateFields.push(`last_message_type = $${paramCount}`);
      queryParams.push(last_message_type);
    }
    
    if (last_interaction_type !== undefined) {
      paramCount++;
      updateFields.push(`last_interaction_type = $${paramCount}`);
      queryParams.push(last_interaction_type);
    }
    
    if (unread_count !== undefined) {
      paramCount++;
      updateFields.push(`unread_count = $${paramCount}`);
      queryParams.push(unread_count);
    }
    
    if (is_priority !== undefined) {
      paramCount++;
      updateFields.push(`is_priority = $${paramCount}`);
      queryParams.push(is_priority);
    }
    
    if (is_muted !== undefined) {
      paramCount++;
      updateFields.push(`is_muted = $${paramCount}`);
      queryParams.push(is_muted);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    // Always update activity time and last_updated
    updateFields.push('last_activity_at = CURRENT_TIMESTAMP');
    updateFields.push('last_updated = CURRENT_TIMESTAMP');
    
    const result = await getDb().query(`
      UPDATE conversation_previews 
      SET ${updateFields.join(', ')}
      WHERE user_id = $1 AND friend_id = $2
      RETURNING *
    `, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation preview not found'
      });
    }
    
    console.log(`✅ User ${userId} updated conversation preview with friend ${friendId}`);
    
    res.json({
      success: true,
      message: 'Conversation preview updated successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating conversation preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation preview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/conversation-previews/:friendId/mark-read - Mark conversation as read
// =============================================
router.post('/:friendId/mark-read', [
  param('friendId').isInt({ min: 1 }).withMessage('Friend ID must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid friend ID',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const friendId = parseInt(req.params.friendId);
    
    const result = await getDb().query(`
      UPDATE conversation_previews 
      SET unread_count = 0, last_updated = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND friend_id = $2
      RETURNING *
    `, [userId, friendId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation preview not found'
      });
    }
    
    console.log(`✅ User ${userId} marked conversation with friend ${friendId} as read`);
    
    res.json({
      success: true,
      message: 'Conversation marked as read',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark conversation as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;