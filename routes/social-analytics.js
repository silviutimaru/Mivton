const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../database/connection');

// Rate limiting for analytics operations
const analyticsLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs (analytics are expensive)
  message: 'Too many analytics requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and auth to all routes
router.use(analyticsLimit);
router.use(requireAuth);

// =============================================
// GET /api/social-analytics/overview - Get comprehensive social analytics
// =============================================
router.get('/overview', [
  query('period_days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Period must be between 1 and 365 days')
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
    const periodDays = parseInt(req.query.period_days) || 30;
    
    // Try to get from cache first
    try {
      const cachedAnalytics = await getDb().query(
        'SELECT get_social_analytics($1, $2, $3) as analytics',
        [userId, 'weekly_summary', false]
      );
      
      if (cachedAnalytics.rows.length > 0 && cachedAnalytics.rows[0].analytics) {
        return res.json({
          success: true,
          data: cachedAnalytics.rows[0].analytics,
          cached: true
        });
      }
    } catch (cacheError) {
      console.log('Cache miss, generating fresh analytics:', cacheError.message);
    }
    
    // Generate fresh analytics
    const analyticsResult = await getDb().query(
      'SELECT generate_social_analytics($1, $2) as analytics',
      [userId, periodDays]
    );
    
    if (analyticsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unable to generate analytics'
      });
    }
    
    const analytics = analyticsResult.rows[0].analytics;
    
    res.json({
      success: true,
      data: analytics,
      cached: false
    });
    
  } catch (error) {
    console.error('Error fetching social analytics overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/social-analytics/interactions - Get interaction history and patterns
// =============================================
router.get('/interactions', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
  query('friend_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Friend ID must be positive'),
  query('interaction_type')
    .optional()
    .isIn(['message', 'call', 'video_call', 'profile_view', 'group_add'])
    .withMessage('Invalid interaction type')
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
    const friendId = req.query.friend_id ? parseInt(req.query.friend_id) : null;
    const interactionType = req.query.interaction_type;
    
    // Build query based on filters
    let whereConditions = ['si.user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;
    
    if (friendId) {
      paramCount++;
      whereConditions.push(`si.friend_id = $${paramCount}`);
      queryParams.push(friendId);
    }
    
    if (interactionType) {
      paramCount++;
      whereConditions.push(`si.interaction_type = $${paramCount}`);
      queryParams.push(interactionType);
    }
    
    // Add limit and offset
    queryParams.push(limit, offset);
    
    const result = await getDb().query(`
      SELECT 
        si.*,
        u.username as friend_username,
        u.full_name as friend_full_name,
        u.profile_picture_url as friend_avatar
      FROM social_interactions si
      JOIN users u ON si.friend_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY si.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);
    
    // Get total count for pagination
    const countResult = await getDb().query(`
      SELECT COUNT(*) as total
      FROM social_interactions si
      WHERE ${whereConditions.join(' AND ')}
    `, queryParams.slice(0, paramCount));
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
        has_more: (offset + limit) < parseInt(countResult.rows[0].total)
      }
    });
    
  } catch (error) {
    console.error('Error fetching interaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interaction history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/social-analytics/friends/engagement - Get friend engagement ranking
// =============================================
router.get('/friends/engagement', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
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
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await getDb().query(`
      SELECT *
      FROM friend_engagement_ranking
      WHERE user_id = $1
      ORDER BY strength_rank ASC
      LIMIT $2
    `, [userId, limit]);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching friend engagement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friend engagement data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/social-analytics/activity/heatmap - Get activity heatmap data
// =============================================
router.get('/activity/heatmap', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await getDb().query(`
      SELECT *
      FROM social_activity_heatmap
      WHERE user_id = $1
      ORDER BY day_of_week, hour_of_day
    `, [userId]);
    
    // Transform data into a more usable format
    const heatmapData = {};
    for (let day = 0; day <= 6; day++) {
      heatmapData[day] = {};
      for (let hour = 0; hour <= 23; hour++) {
        heatmapData[day][hour] = {
          interaction_count: 0,
          unique_friends: 0,
          interaction_types: []
        };
      }
    }
    
    // Fill in actual data
    result.rows.forEach(row => {
      heatmapData[row.day_of_week][row.hour_of_day] = {
        interaction_count: row.interaction_count,
        unique_friends: row.unique_friends,
        interaction_types: row.interaction_types
      };
    });
    
    res.json({
      success: true,
      data: heatmapData,
      metadata: {
        days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        period: 'Last 30 days'
      }
    });
    
  } catch (error) {
    console.error('Error fetching activity heatmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity heatmap',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/social-analytics/insights - Get personalized social insights
// =============================================
router.get('/insights', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await getDb().query(
      'SELECT generate_social_insights($1) as insights',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unable to generate insights'
      });
    }
    
    const insights = result.rows[0].insights;
    
    res.json({
      success: true,
      data: insights
    });
    
  } catch (error) {
    console.error('Error generating social insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate social insights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/social-analytics/health-score - Get social health score
// =============================================
router.get('/health-score', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await getDb().query(
      'SELECT calculate_social_health_score($1) as health_score',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Unable to calculate health score'
      });
    }
    
    const healthScore = result.rows[0].health_score;
    
    // Get breakdown of factors
    const breakdown = await getDb().query(`
      SELECT 
        COUNT(f.friend_id) as friend_count,
        COUNT(si.id) FILTER (WHERE si.created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_interactions,
        COUNT(si.id) FILTER (WHERE si.created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_interactions,
        COUNT(fg.id) FILTER (WHERE fg.is_default = FALSE) as custom_groups,
        COALESCE(AVG(cp.unread_count), 0) as avg_unread_ratio
      FROM users u
      LEFT JOIN friendships f ON u.id = f.user_id
      LEFT JOIN social_interactions si ON u.id = si.user_id
      LEFT JOIN friend_groups fg ON u.id = fg.user_id
      LEFT JOIN conversation_previews cp ON u.id = cp.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);
    
    const factors = breakdown.rows[0] || {};
    
    res.json({
      success: true,
      data: {
        health_score: healthScore,
        score_category: getHealthScoreCategory(healthScore),
        factors: {
          friend_network: Math.min(20, parseInt(factors.friend_count) * 2),
          recent_activity: Math.min(20, parseInt(factors.recent_interactions)),
          consistency: Math.min(20, parseInt(factors.monthly_interactions) / 2),
          organization: Math.min(20, parseInt(factors.custom_groups) * 5),
          responsiveness: Math.max(0, 20 - Math.floor(parseFloat(factors.avg_unread_ratio) * 10))
        },
        recommendations: getHealthScoreRecommendations(healthScore, factors)
      }
    });
    
  } catch (error) {
    console.error('Error calculating social health score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate social health score',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/social-analytics/weekly-summary - Get weekly interaction summary
// =============================================
router.get('/weekly-summary', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await getDb().query(`
      SELECT *
      FROM weekly_interaction_summary
      WHERE user_id = $1
      ORDER BY week_start DESC
      LIMIT 8
    `, [userId]);
    
    res.json({
      success: true,
      data: result.rows,
      metadata: {
        period: 'Last 8 weeks',
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/social-analytics/conversation-health - Get conversation health indicators
// =============================================
router.get('/conversation-health', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await getDb().query(`
      SELECT *
      FROM conversation_health_indicators
      WHERE user_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          total_conversations: 0,
          conversations_with_unread: 0,
          priority_conversations: 0,
          muted_conversations: 0,
          active_today: 0,
          active_this_week: 0,
          inactive_conversations: 0,
          total_unread_messages: 0,
          avg_unread_per_conversation: 0,
          health_status: 'no_data'
        }
      });
    }
    
    const healthData = result.rows[0];
    
    // Calculate health status
    let healthStatus = 'good';
    if (healthData.total_unread_messages > 20) healthStatus = 'needs_attention';
    if (healthData.inactive_conversations > healthData.total_conversations * 0.5) healthStatus = 'poor';
    if (healthData.active_this_week === 0 && healthData.total_conversations > 0) healthStatus = 'poor';
    
    res.json({
      success: true,
      data: {
        ...healthData,
        health_status: healthStatus
      }
    });
    
  } catch (error) {
    console.error('Error fetching conversation health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation health data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/social-analytics/refresh-cache - Refresh analytics cache
// =============================================
router.post('/refresh-cache', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Refresh all analytics caches
    await getDb().query(
      'SELECT cache_social_analytics($1, $2, $3)',
      [userId, 'weekly_summary', 7]
    );
    
    await getDb().query(
      'SELECT cache_social_analytics($1, $2, $3)',
      [userId, 'friend_engagement', 30]
    );
    
    await getDb().query(
      'SELECT cache_social_analytics($1, $2, $3)',
      [userId, 'activity_patterns', 30]
    );
    
    console.log(`✅ Analytics cache refreshed for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Analytics cache refreshed successfully'
    });
    
  } catch (error) {
    console.error('Error refreshing analytics cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh analytics cache',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// Helper Functions
// =============================================

function getHealthScoreCategory(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'very_poor';
}

function getHealthScoreRecommendations(score, factors) {
  const recommendations = [];
  
  if (parseInt(factors.friend_count) < 5) {
    recommendations.push({
      type: 'expand_network',
      message: 'Consider connecting with more friends to enrich your social experience',
      priority: 'high'
    });
  }
  
  if (parseInt(factors.recent_interactions) < 5) {
    recommendations.push({
      type: 'increase_activity',
      message: 'Try to interact more frequently with your friends',
      priority: 'medium'
    });
  }
  
  if (parseInt(factors.custom_groups) === 0) {
    recommendations.push({
      type: 'organize_friends',
      message: 'Create friend groups to better organize your connections',
      priority: 'low'
    });
  }
  
  if (parseFloat(factors.avg_unread_ratio) > 5) {
    recommendations.push({
      type: 'improve_responsiveness',
      message: 'Try to respond to messages more promptly',
      priority: 'medium'
    });
  }
  
  return recommendations;
}

module.exports = router;