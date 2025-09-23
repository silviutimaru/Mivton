/**
 * ==============================================
 * MIVTON - USER PREFERENCES API ROUTES
 * Phase 2.3 - User Interface Polish
 * API endpoints for user preferences and settings
 * ==============================================
 */

const express = require('express');
const { query } = require('../database/connection');
const { LanguageUtils } = require('../public/js/languages');
const router = express.Router();

/**
 * GET /api/user/preferences
 * Get user preferences and settings
 */
router.get('/preferences', async (req, res) => {
    try {
        const userId = req.session?.userId || 1; // Mock for demo
        
        // For now, return mock preferences since the full user_preferences table 
        // may not exist yet in the current schema
        const mockPreferences = {
            theme: 'dark',
            language: 'en',
            notifications: true,
            autoStatus: true,
            fontSize: 14,
            compactMode: false,
            soundNotifications: true,
            messagePreviews: true,
            profileVisibility: 'public',
            showLanguage: true,
            showOnlineStatus: true
        };
        
        res.json({
            success: true,
            preferences: mockPreferences,
            languages: [
                { code: 'en', name: 'English', isPrimary: true, proficiency: 'native' }
            ]
        });
        
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load preferences'
        });
    }
});

/**
 * PUT /api/user/preferences
 * Update user preferences
 */
router.put('/preferences', async (req, res) => {
    try {
        const userId = req.session?.userId || 1; // Mock for demo
        const { preferences } = req.body;
        
        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Invalid preferences data'
            });
        }
        
        // For demo purposes, just acknowledge the update
        // In a full implementation, this would update the user_preferences table
        
        res.json({
            success: true,
            message: 'Preferences updated successfully',
            updated: Object.keys(preferences)
        });
        
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update preferences'
        });
    }
});

/**
 * PUT /api/user/language
 * Update user language preference
 */
router.put('/language', async (req, res) => {
    try {
        const userId = req.session?.userId || 1; // Mock for demo
        const { language } = req.body;
        
        if (!language) {
            return res.status(400).json({
                success: false,
                error: 'Language code is required'
            });
        }
        
        // Validate language using centralized language utils
        if (!LanguageUtils.isSupported(language)) {
            return res.status(400).json({
                success: false,
                error: 'Unsupported language code'
            });
        }
        
        const languageName = LanguageUtils.getLanguageName(language);
        
        try {
            // Try to update the native_language in users table if it exists
            await query(
                'UPDATE users SET native_language = $1 WHERE id = $2',
                [language, userId]
            );
        } catch (dbError) {
            console.log('Could not update user language in database (expected in demo mode)');
        }
        
        res.json({
            success: true,
            message: 'Language updated successfully',
            language: {
                code: language,
                name: languageName
            }
        });
        
    } catch (error) {
        console.error('Update language error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update language'
        });
    }
});

/**
 * PUT /api/user/status
 * Update user status and presence
 */
router.put('/status', async (req, res) => {
    try {
        const userId = req.session?.userId || 1; // Mock for demo
        const { status, message, autoStatus } = req.body;
        
        // Validate status
        if (!['online', 'away', 'busy', 'offline'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status value'
            });
        }
        
        // Validate message length
        if (message && message.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Status message must be 100 characters or less'
            });
        }
        
        // For demo purposes, just acknowledge the status update
        // In a full implementation, this would update the user_status table
        
        res.json({
            success: true,
            status: {
                status,
                message: message || null,
                autoStatus: autoStatus !== false,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update status'
        });
    }
});

/**
 * GET /api/user/status/sync
 * Sync user status with server (for real-time updates)
 */
router.get('/status/sync', async (req, res) => {
    try {
        const userId = req.session?.userId || 1; // Mock for demo
        
        // Return mock status data for demo
        res.json({
            success: true,
            status: 'online',
            message: null,
            last_seen: new Date().toISOString(),
            changed_at: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Status sync error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync status'
        });
    }
});

/**
 * GET /api/languages
 * Get available languages for language selector
 */
router.get('/languages', async (req, res) => {
    try {
        // Get all languages from centralized configuration
        const languages = LanguageUtils.getAllLanguages();
        const popular = LanguageUtils.getPopularLanguages();
        
        res.json({
            success: true,
            languages,
            popular
        });
        
    } catch (error) {
        console.error('Get languages error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load languages'
        });
    }
});

/**
 * POST /api/user/export
 * Export user data
 */
router.post('/export', async (req, res) => {
    try {
        const userId = req.session?.userId || 1; // Mock for demo
        
        // Get basic user data from existing users table
        let userData = {
            id: userId,
            username: 'demo_user',
            full_name: 'Demo User',
            email: 'demo@mivton.com',
            created_at: new Date()
        };
        
        try {
            const userResult = await query(
                'SELECT id, username, full_name, email, native_language, is_verified, created_at FROM users WHERE id = $1',
                [userId]
            );
            
            if (userResult.rows.length > 0) {
                userData = userResult.rows[0];
            }
        } catch (dbError) {
            console.log('Using mock user data for export (database not fully available)');
        }
        
        // Build export data
        const exportData = {
            export_info: {
                export_date: new Date().toISOString(),
                user_id: userId,
                format_version: '1.0'
            },
            profile: {
                username: userData.username,
                full_name: userData.full_name,
                email: userData.email,
                native_language: userData.native_language,
                is_verified: userData.is_verified,
                member_since: userData.created_at
            },
            preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true
            },
            privacy_note: "This export contains your personal data from Mivton. Handle with care and do not share with unauthorized parties."
        };
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="mivton-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`);
        
        res.json(exportData);
        
    } catch (error) {
        console.error('Export data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export data'
        });
    }
});

module.exports = router;
