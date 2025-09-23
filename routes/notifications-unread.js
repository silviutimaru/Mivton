// MISSING API ENDPOINT - Add this to your routes
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/notifications/unread
 * Get unread notifications for current user
 */
router.get('/unread', requireAuth, async (req, res) => {
  try {
    const { getDb } = require('../database/connection');
    const db = getDb();
    
    const notifications = await db.query(`
      SELECT 
        fn.id,
        fn.type,
        fn.message,
        fn.data,
        fn.created_at,
        us.username as sender_username,
        us.full_name as sender_name
      FROM friend_notifications fn
      JOIN users us ON fn.sender_id = us.id
      WHERE fn.user_id = $1 
        AND fn.is_read = false
      ORDER BY fn.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    
    res.json({
      success: true,
      notifications: notifications.rows,
      count: notifications.rows.length
    });
    
  } catch (error) {
    console.error('❌ Get unread notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load notifications'
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const { getDb } = require('../database/connection');
    const db = getDb();
    
    const result = await db.query(`
      UPDATE friend_notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('❌ Mark notification read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

module.exports = router;
