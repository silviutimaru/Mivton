/**
 * ==============================================
 * MIVTON - SIMPLIFIED USER SEARCH API ROUTES
 * Temporary fix for the 500 error issue
 * ==============================================
 */

const express = require('express');
const { query } = require('../database/connection');
const router = express.Router();

/**
 * GET /api/users/search
 * Simplified user search (temporary fix)
 */
router.get('/search', async (req, res) => {
    try {
        console.log('🔍 User search request:', req.query);
        
        const { q, limit = 20 } = req.query;
        
        // Validate search query
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters long'
            });
        }
        
        const searchQuery = q.trim();
        const pageSize = Math.min(parseInt(limit), 50); // Max 50 results
        
        console.log('🔍 Searching for:', searchQuery, 'limit:', pageSize);
        
        // Simple search query
        const searchSql = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.native_language,
                u.is_verified,
                u.is_admin,
                u.created_at
            FROM users u
            WHERE (u.full_name ILIKE $1 OR u.username ILIKE $1)
            ORDER BY u.created_at DESC
            LIMIT $2
        `;
        
        const searchParams = [`%${searchQuery}%`, pageSize];
        
        console.log('🔍 Executing query with params:', searchParams);
        
        // Execute search query
        const searchResult = await query(searchSql, searchParams);
        
        console.log('✅ Search completed, found:', searchResult.rows.length, 'users');
        
        // Process results
        const users = searchResult.rows.map(user => ({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            native_language: user.native_language,
            is_verified: user.is_verified,
            is_admin: user.is_admin,
            status: 'online', // Mock status
            last_seen: new Date(),
            status_message: null,
            is_friend: false,
            friend_request_sent: false,
            friend_count: 0,
            created_at: user.created_at,
            member_since: user.created_at
        }));
        
        res.json({
            success: true,
            users,
            pagination: {
                page: 1,
                limit: pageSize,
                total: users.length,
                totalPages: 1,
                hasMore: false
            },
            search: {
                query: searchQuery,
                filters: {}
            }
        });
        
    } catch (error) {
        console.error('❌ User search error:', error);
        console.error('❌ Full error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Search temporarily unavailable',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
