/**
 * ==============================================
 * MIVTON - COMPLETE USER SEARCH API ROUTES
 * Fixed version with proper SQL parameter binding
 * ==============================================
 */

const express = require('express');
const { query } = require('../database/connection');
const router = express.Router();

/**
 * GET /api/users/search
 * Live user search with filters and pagination
 * Now respects privacy settings! - FIXED SQL BINDING
 */
router.get('/search', async (req, res) => {
    try {
        console.log('🔍 User search request:', req.query);
        
        const { q, limit = 20, page = 1, language, status, userType } = req.query;
        
        // Validate search query
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters long'
            });
        }
        
        const searchQuery = q.trim();
        const pageSize = Math.min(parseInt(limit), 50); // Max 50 results
        const offset = (parseInt(page) - 1) * pageSize;
        
        console.log('🔍 Searching for:', searchQuery, 'limit:', pageSize, 'offset:', offset);
        
        // Build WHERE conditions and parameters
        let whereConditions = [
            '(u.full_name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)',
            'COALESCE(u.is_blocked, false) = false',
            "COALESCE(u.profile_visibility, 'public') = 'public'" // ❗ PRIVACY FILTER: Only show public profiles
        ];
        let queryParams = [`%${searchQuery}%`];
        let paramCounter = 2;
        
        // Add language filter
        if (language) {
            whereConditions.push(`u.native_language = $${paramCounter}`);
            queryParams.push(language);
            paramCounter++;
        }
        
        // Add user type filter
        if (userType) {
            switch (userType) {
                case 'verified':
                    whereConditions.push('u.is_verified = true');
                    break;
                case 'new':
                    whereConditions.push(`u.created_at >= NOW() - INTERVAL '30 days'`);
                    break;
            }
        }
        
        // Build main query with proper parameter binding
        const mainQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.native_language,
                u.is_verified,
                u.is_admin,
                u.created_at,
                COALESCE(u.profile_visibility, 'public') as profile_visibility,
                COALESCE(u.show_language, true) as show_language,
                COALESCE(u.show_online_status, true) as show_online_status
            FROM users u
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY 
                u.is_verified DESC,
                CASE 
                    WHEN u.username ILIKE $1 THEN 1
                    WHEN u.full_name ILIKE $1 THEN 2
                    ELSE 3
                END,
                u.created_at DESC
            LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
        `;
        
        // Add limit and offset parameters
        queryParams.push(pageSize, offset);
        
        console.log('🔍 Executing query with params:', queryParams);
        console.log('🔍 Query:', mainQuery);
        console.log('🔒 Privacy filter: Only showing public profiles');
        
        // Execute search query
        const searchResult = await query(mainQuery, queryParams);
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            WHERE ${whereConditions.join(' AND ')}
        `;
        const countParams = queryParams.slice(0, paramCounter - 1); // Exclude limit and offset
        const countResult = await query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].total);
        
        console.log('✅ Search completed, found:', searchResult.rows.length, 'users, total:', totalCount);
        console.log('🔒 Privacy respected: Only public profiles included');
        
        // Process results with privacy respect
        const users = searchResult.rows.map(user => ({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            native_language: user.show_language ? user.native_language : null, // ❗ Respect language privacy
            is_verified: user.is_verified || false,
            is_admin: user.is_admin || false,
            status: user.show_online_status ? 'online' : null, // ❗ Respect status privacy
            last_seen: user.show_online_status ? new Date() : null,
            status_message: null,
            is_friend: false,
            friend_request_sent: false,
            friend_count: Math.floor(Math.random() * 50), // Mock friend count
            created_at: user.created_at,
            member_since: user.created_at
        }));
        
        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: pageSize,
                total: totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
                hasMore: offset + pageSize < totalCount
            },
            search: {
                query: searchQuery,
                filters: { language, status, userType }
            },
            privacy_note: 'Only public profiles are shown in search results'
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

/**
 * GET /api/users/profiles
 * Get user profiles for profile cards display
 */
router.get('/profiles', async (req, res) => {
    try {
        console.log('🔍 User profiles request:', req.query);
        
        const { limit = 20, sort = 'recent', filter } = req.query;
        const pageSize = Math.min(parseInt(limit), 50);
        
        // Build ORDER BY clause
        let orderBy = '';
        switch (sort) {
            case 'name':
                orderBy = 'COALESCE(u.full_name, u.username) ASC';
                break;
            case 'joined':
                orderBy = 'u.created_at DESC';
                break;
            case 'recent':
            default:
                orderBy = 'u.created_at DESC';
                break;
        }
        
        const profileQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.native_language,
                u.is_verified,
                u.is_admin,
                u.created_at
            FROM users u
            WHERE COALESCE(u.profile_visibility, 'public') = 'public'
            ORDER BY ${orderBy}
            LIMIT $1
        `;
        
        const result = await query(profileQuery, [pageSize]);
        
        console.log('✅ Profiles loaded, found:', result.rows.length, 'users');
        
        const users = result.rows.map(user => ({
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
            friend_count: Math.floor(Math.random() * 50), // Mock friend count
            created_at: user.created_at
        }));
        
        res.json({
            success: true,
            users
        });
        
    } catch (error) {
        console.error('❌ Get profiles error:', error);
        console.error('❌ Full error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to load user profiles'
        });
    }
});

/**
 * GET /api/users/:id/profile
 * Get detailed profile information for a specific user
 */
router.get('/:id/profile', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        console.log('🔍 User profile request for ID:', userId);
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }
        
        const profileQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.native_language,
                u.gender,
                u.is_verified,
                u.is_admin,
                u.created_at
            FROM users u
            WHERE u.id = $1
        `;
        
        const result = await query(profileQuery, [userId]);
        
        if (result.rows.length === 0) {
            console.log('❌ User not found for ID:', userId);
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        const user = result.rows[0];
        
        console.log('✅ User profile loaded for:', user.username);
        
        const profileData = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            is_verified: user.is_verified,
            is_admin: user.is_admin,
            created_at: user.created_at,
            native_language: user.native_language,
            status: 'online', // Mock status
            last_seen: new Date(),
            is_friend: false,
            friend_request_sent: false,
            friend_count: Math.floor(Math.random() * 50) // Mock friend count
        };
        
        res.json({
            success: true,
            user: profileData
        });
        
    } catch (error) {
        console.error('❌ Get user profile error:', error);
        console.error('❌ Full error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to load user profile'
        });
    }
});

module.exports = router;
