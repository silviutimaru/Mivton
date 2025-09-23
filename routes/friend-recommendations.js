const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../database/connection');

// Rate limiting for friend recommendations
const recommendationsLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: 'Too many recommendation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting and auth to all routes
router.use(recommendationsLimit);
router.use(requireAuth);

// =============================================
// GET /api/friend-recommendations - Get friend recommendations
// =============================================
router.get('/', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  query('reason')
    .optional()
    .isIn(['mutual_friends', 'language_match', 'activity_pattern', 'location_proximity', 'interest_similarity'])
    .withMessage('Invalid recommendation reason'),
  query('min_confidence')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Confidence must be between 0 and 1')
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
    const limit = parseInt(req.query.limit) || 10;
    const reason = req.query.reason;
    const minConfidence = parseFloat(req.query.min_confidence) || 0.3;
    
    // First, try to get existing recommendations
    let whereConditions = ['fr.user_id = $1', 'fr.is_dismissed = FALSE', 'fr.expires_at > CURRENT_TIMESTAMP'];
    let queryParams = [userId];
    let paramCount = 1;
    
    if (reason) {
      paramCount++;
      whereConditions.push(`fr.recommendation_reason = $${paramCount}`);
      queryParams.push(reason);
    }
    
    paramCount++;
    whereConditions.push(`fr.confidence_score >= $${paramCount}`);
    queryParams.push(minConfidence);
    
    // Add limit
    queryParams.push(limit);
    
    let result = await getDb().query(`
      SELECT 
        fr.*,
        u.username,
        u.full_name,
        u.profile_picture_url,
        CASE WHEN up.status IS NOT NULL THEN up.status ELSE 'offline' END as online_status,
        up.last_seen
      FROM friend_recommendations fr
      JOIN users u ON fr.recommended_user_id = u.id
      LEFT JOIN user_presence up ON u.id = up.user_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY fr.confidence_score DESC, fr.generated_at DESC
      LIMIT $${paramCount + 1}
    `, queryParams);
    
    // If we don't have enough recommendations, generate new ones
    if (result.rows.length < limit) {
      try {
        await getDb().query(
          'SELECT * FROM generate_friend_recommendations($1, $2)',
          [userId, limit * 2] // Generate more to have options
        );
        
        // Re-query with fresh recommendations
        result = await getDb().query(`
          SELECT 
            fr.*,
            u.username,
            u.full_name,
            u.profile_picture_url,
            CASE WHEN up.status IS NOT NULL THEN up.status ELSE 'offline' END as online_status,
            up.last_seen
          FROM friend_recommendations fr
          JOIN users u ON fr.recommended_user_id = u.id
          LEFT JOIN user_presence up ON u.id = up.user_id
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY fr.confidence_score DESC, fr.generated_at DESC
          LIMIT $${paramCount + 1}
        `, queryParams);
        
      } catch (generationError) {
        console.error('Error generating recommendations:', generationError);
      }
    }
    
    // Enhance recommendations with additional context
    const enhancedRecommendations = await Promise.all(
      result.rows.map(async (rec) => {
        try {
          // Get mutual friends if it's a mutual_friends recommendation
          if (rec.recommendation_reason === 'mutual_friends') {
            const mutualFriends = await getDb().query(`
              SELECT u.username, u.full_name
              FROM friendships f1
              JOIN friendships f2 ON f1.friend_id = f2.user_id
              JOIN users u ON f1.friend_id = u.id
              WHERE f1.user_id = $1 AND f2.friend_id = $2
              LIMIT 5
            `, [userId, rec.recommended_user_id]);
            
            rec.mutual_friends = mutualFriends.rows;
          }
          
          // Get language compatibility if it's a language_match recommendation
          if (rec.recommendation_reason === 'language_match') {
            const languageMatch = await getDb().query(`
              SELECT 
                up1.known_language as user_knows,
                up1.learning_language as user_learning,
                up2.known_language as friend_knows,
                up2.learning_language as friend_learning
              FROM user_preferences up1, user_preferences up2
              WHERE up1.user_id = $1 AND up2.user_id = $2
              AND (up1.known_language = up2.learning_language OR up1.learning_language = up2.known_language)
              LIMIT 1
            `, [userId, rec.recommended_user_id]);
            
            rec.language_compatibility = languageMatch.rows[0] || null;
          }
          
          return rec;
        } catch (enhanceError) {
          console.error('Error enhancing recommendation:', enhanceError);
          return rec;
        }
      })
    );
    
    res.json({
      success: true,
      data: enhancedRecommendations,
      total: enhancedRecommendations.length,
      metadata: {
        min_confidence: minConfidence,
        reason_filter: reason || 'all',
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching friend recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch friend recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/friend-recommendations/generate - Generate new recommendations
// =============================================
router.post('/generate', [
  body('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
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
    const limit = req.body.limit || 10;
    
    // Clear old recommendations first
    await getDb().query(
      'DELETE FROM friend_recommendations WHERE user_id = $1 AND expires_at < CURRENT_TIMESTAMP',
      [userId]
    );
    
    // Generate new recommendations
    const result = await getDb().query(
      'SELECT * FROM generate_friend_recommendations($1, $2)',
      [userId, limit]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No new recommendations available at this time',
        data: [],
        total: 0
      });
    }
    
    console.log(`✅ Generated ${result.rows.length} friend recommendations for user ${userId}`);
    
    res.json({
      success: true,
      message: `Generated ${result.rows.length} new recommendations`,
      data: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error generating friend recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate friend recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/friend-recommendations/:id/dismiss - Dismiss a recommendation
// =============================================
router.post('/:id/dismiss', [
  param('id').isInt({ min: 1 }).withMessage('Recommendation ID must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recommendation ID',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const recommendationId = parseInt(req.params.id);
    
    // Check if recommendation exists and belongs to user
    const recommendation = await getDb().query(
      'SELECT * FROM friend_recommendations WHERE id = $1 AND user_id = $2',
      [recommendationId, userId]
    );
    
    if (recommendation.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found'
      });
    }
    
    if (recommendation.rows[0].is_dismissed) {
      return res.status(400).json({
        success: false,
        message: 'Recommendation is already dismissed'
      });
    }
    
    // Dismiss the recommendation
    const result = await getDb().query(`
      UPDATE friend_recommendations 
      SET is_dismissed = TRUE, dismissed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [recommendationId, userId]);
    
    console.log(`✅ User ${userId} dismissed recommendation ${recommendationId}`);
    
    res.json({
      success: true,
      message: 'Recommendation dismissed successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error dismissing recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss recommendation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/friend-recommendations/:id/accept - Accept and send friend request
// =============================================
router.post('/:id/accept', [
  param('id').isInt({ min: 1 }).withMessage('Recommendation ID must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recommendation ID',
        errors: errors.array()
      });
    }
    
    const userId = req.session.userId;
    const recommendationId = parseInt(req.params.id);
    
    // Check if recommendation exists and belongs to user
    const recommendation = await getDb().query(
      'SELECT * FROM friend_recommendations WHERE id = $1 AND user_id = $2 AND is_dismissed = FALSE',
      [recommendationId, userId]
    );
    
    if (recommendation.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active recommendation not found'
      });
    }
    
    const recommendedUserId = recommendation.rows[0].recommended_user_id;
    
    // Check if already friends
    const existingFriendship = await getDb().query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [userId, recommendedUserId]
    );
    
    if (existingFriendship.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this user'
      });
    }
    
    // Check if friend request already exists
    const existingRequest = await getDb().query(
      'SELECT id FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3',
      [userId, recommendedUserId, 'pending']
    );
    
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent to this user'
      });
    }
    
    // Begin transaction
    const client = await getDb().connect();
    await client.query('BEGIN');
    
    try {
      // Send friend request
      const friendRequest = await client.query(`
        INSERT INTO friend_requests (sender_id, receiver_id, status, message)
        VALUES ($1, $2, 'pending', 'Friend request from recommendation')
        RETURNING *
      `, [userId, recommendedUserId]);
      
      // Mark recommendation as accepted
      await client.query(`
        UPDATE friend_recommendations 
        SET is_accepted = TRUE
        WHERE id = $1
      `, [recommendationId]);
      
      // Create notification for the recommended user (if notifications table exists)
      try {
        await client.query(`
          INSERT INTO notifications (user_id, type, title, message, data, created_at)
          VALUES ($1, 'friend_request', 'New Friend Request', 
                  'You have a new friend request', 
                  $2, CURRENT_TIMESTAMP)
        `, [recommendedUserId, JSON.stringify({
          sender_id: userId,
          request_id: friendRequest.rows[0].id,
          from_recommendation: true
        })]);
      } catch (notificationError) {
        // Notifications table might not exist, continue without failing
        console.log('Could not create notification:', notificationError.message);
      }
      
      await client.query('COMMIT');
      
      // Get user details for response
      const userDetails = await getDb().query(
        'SELECT username, full_name FROM users WHERE id = $1',
        [recommendedUserId]
      );
      
      console.log(`✅ User ${userId} accepted recommendation ${recommendationId} and sent friend request to ${recommendedUserId}`);
      
      res.json({
        success: true,
        message: 'Friend request sent successfully',
        data: {
          friend_request: friendRequest.rows[0],
          recommended_user: userDetails.rows[0],
          recommendation: recommendation.rows[0]
        }
      });
      
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error accepting recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept recommendation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// GET /api/friend-recommendations/stats - Get recommendation statistics
// =============================================
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const result = await getDb().query(`
      SELECT 
        COUNT(*) as total_recommendations,
        COUNT(*) FILTER (WHERE is_dismissed = FALSE AND expires_at > CURRENT_TIMESTAMP) as active_recommendations,
        COUNT(*) FILTER (WHERE is_dismissed = TRUE) as dismissed_recommendations,
        COUNT(*) FILTER (WHERE is_accepted = TRUE) as accepted_recommendations,
        COUNT(DISTINCT recommendation_reason) as recommendation_types,
        AVG(confidence_score) as avg_confidence_score,
        MAX(confidence_score) as max_confidence_score,
        MIN(confidence_score) as min_confidence_score
      FROM friend_recommendations
      WHERE user_id = $1
    `, [userId]);
    
    const stats = result.rows[0] || {};
    
    // Get breakdown by reason
    const reasonBreakdown = await getDb().query(`
      SELECT 
        recommendation_reason,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence,
        COUNT(*) FILTER (WHERE is_accepted = TRUE) as accepted_count
      FROM friend_recommendations
      WHERE user_id = $1
      GROUP BY recommendation_reason
      ORDER BY count DESC
    `, [userId]);
    
    res.json({
      success: true,
      data: {
        ...stats,
        total_recommendations: parseInt(stats.total_recommendations) || 0,
        active_recommendations: parseInt(stats.active_recommendations) || 0,
        dismissed_recommendations: parseInt(stats.dismissed_recommendations) || 0,
        accepted_recommendations: parseInt(stats.accepted_recommendations) || 0,
        recommendation_types: parseInt(stats.recommendation_types) || 0,
        avg_confidence_score: parseFloat(stats.avg_confidence_score) || 0,
        max_confidence_score: parseFloat(stats.max_confidence_score) || 0,
        min_confidence_score: parseFloat(stats.min_confidence_score) || 0,
        reason_breakdown: reasonBreakdown.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching recommendation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendation statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;