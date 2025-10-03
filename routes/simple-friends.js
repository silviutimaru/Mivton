// Simple Friends API Bypass - Returns mock data for testing
// Bypasses complex database schemas and PostgreSQL syntax issues

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/friends
 * Simple bypass version - returns mock friends for testing
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`📋 Simple friends API - Getting friends for user ${userId}`);
        
        // Return mock friends data
        const mockFriends = [
            {
                id: 1,
                username: 'demo_friend_1',
                full_name: 'Demo Friend One',
                status: 'online',
                native_language: 'en',
                is_verified: true,
                last_login: new Date().toISOString(),
                friendship_created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                last_activity: new Date().toISOString(),
                online_status: 'online'
            },
            {
                id: 2,
                username: 'demo_friend_2',
                full_name: 'Demo Friend Two',
                status: 'offline',
                native_language: 'es',
                is_verified: true,
                last_login: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                friendship_created: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                last_activity: new Date(Date.now() - 3600000).toISOString(),
                online_status: 'away'
            },
            {
                id: 3,
                username: 'demo_friend_3',
                full_name: 'Demo Friend Three',
                status: 'offline',
                native_language: 'fr',
                is_verified: false,
                last_login: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
                friendship_created: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
                last_activity: new Date(Date.now() - 86400000 * 2).toISOString(),
                online_status: 'offline'
            }
        ];
        
        // Apply search filter if provided
        let filteredFriends = mockFriends;
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            filteredFriends = mockFriends.filter(friend => 
                friend.username.toLowerCase().includes(searchTerm) ||
                friend.full_name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply status filter if provided
        if (req.query.status && req.query.status !== 'all') {
            filteredFriends = filteredFriends.filter(friend => 
                friend.online_status === req.query.status
            );
        }
        
        // Apply language filter if provided
        if (req.query.language && req.query.language !== 'all') {
            filteredFriends = filteredFriends.filter(friend => 
                friend.native_language === req.query.language
            );
        }
        
        // Simple pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedFriends = filteredFriends.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            friends: paginatedFriends,
            pagination: {
                page: page,
                limit: limit,
                total: filteredFriends.length,
                totalPages: Math.ceil(filteredFriends.length / limit),
                hasNext: endIndex < filteredFriends.length,
                hasPrev: page > 1
            },
            stats: {
                online: filteredFriends.filter(f => f.online_status === 'online').length,
                away: filteredFriends.filter(f => f.online_status === 'away').length,
                offline: filteredFriends.filter(f => f.online_status === 'offline').length,
                total: filteredFriends.length
            },
            message: 'Simple friends API working with mock data'
        });
        
    } catch (error) {
        console.error('❌ Simple friends API error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to retrieve friends list',
            code: 'FRIENDS_FETCH_ERROR',
            message: error.message
        });
    }
});

/**
 * GET /api/friends/search
 * Simple user search for adding friends
 */
router.get('/search', async (req, res) => {
    try {
        console.log(`🔍 Simple friend search by user ${req.user.id}`);
        
        const searchTerm = req.query.q || '';
        
        // Mock search results
        const mockUsers = [
            {
                id: 10,
                username: 'searchable_user_1',
                full_name: 'Searchable User One',
                native_language: 'en',
                is_verified: true,
                status: 'online'
            },
            {
                id: 11,
                username: 'searchable_user_2',
                full_name: 'Searchable User Two',
                native_language: 'es',
                is_verified: false,
                status: 'offline'
            }
        ];
        
        let filteredUsers = mockUsers;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredUsers = mockUsers.filter(user => 
                user.username.toLowerCase().includes(term) ||
                user.full_name.toLowerCase().includes(term)
            );
        }
        
        res.json({
            success: true,
            users: filteredUsers,
            total: filteredUsers.length,
            query: searchTerm,
            message: 'Simple user search working with mock data'
        });
        
    } catch (error) {
        console.error('❌ Simple friend search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed',
            code: 'SEARCH_ERROR'
        });
    }
});

/**
 * POST /api/friends/request
 * Send friend request (mock)
 */
router.post('/request', async (req, res) => {
    try {
        const { userId } = req.body;
        console.log(`🤝 Mock friend request from ${req.user.id} to ${userId}`);
        
        res.json({
            success: true,
            message: 'Friend request sent successfully (mock)',
            data: {
                requestId: Date.now(),
                to_user: userId,
                from_user: req.user.id,
                status: 'pending',
                created_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Simple friend request error:', error);
        res.status(500).json({
            success: false,
            error: 'Friend request failed',
            code: 'REQUEST_ERROR'
        });
    }
});

/**
 * DELETE /api/friends/:friendId
 * Remove friend (mock)
 */
router.delete('/:friendId', async (req, res) => {
    try {
        const { friendId } = req.params;
        console.log(`💔 Mock friend removal: ${req.user.id} removing ${friendId}`);
        
        res.json({
            success: true,
            message: 'Friend removed successfully (mock)',
            removedFriend: {
                id: friendId,
                removed_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('❌ Simple friend removal error:', error);
        res.status(500).json({
            success: false,
            error: 'Friend removal failed',
            code: 'REMOVAL_ERROR'
        });
    }
});

module.exports = router;