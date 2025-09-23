// Dashboard Utilities
const { db } = require('../database/connection');

/**
 * Dashboard utility functions for Phase 2.1
 */

/**
 * Get user dashboard statistics
 * @param {number} userId - User ID
 * @returns {Object} User statistics
 */
async function getUserStats(userId) {
    try {
        // For Phase 2.1, return basic stats
        // In future phases, calculate from actual data
        const stats = {
            friends: 0,
            requests: 0,
            blocked: 0,
            messages: 0,
            languages: 1,
            hours: 0,
            onlineCount: 1
        };

        return stats;
        
    } catch (error) {
        console.error('Error getting user stats:', error);
        throw error;
    }
}

/**
 * Get user's recent activity
 * @param {number} userId - User ID
 * @param {number} limit - Number of activities to return
 * @returns {Array} Recent activities
 */
async function getRecentActivity(userId, limit = 10) {
    try {
        // For Phase 2.1, return welcome activity
        // In future phases, query actual activity log
        const activities = [
            {
                id: 1,
                type: 'welcome',
                title: 'Welcome to Mivton!',
                description: 'Your multilingual chat journey begins here',
                icon: '🎉',
                timestamp: new Date().toISOString(),
                timeAgo: 'Just now'
            }
        ];

        return activities.slice(0, limit);
        
    } catch (error) {
        console.error('Error getting recent activity:', error);
        throw error;
    }
}

/**
 * Update user profile information
 * @param {number} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Object} Updated user data
 */
async function updateUserProfile(userId, profileData) {
    try {
        const { full_name, native_language, gender } = profileData;

        const updateQuery = `
            UPDATE users 
            SET 
                full_name = COALESCE($1, full_name),
                native_language = COALESCE($2, native_language),
                gender = COALESCE($3, gender),
                updated_at = NOW()
            WHERE id = $4
            RETURNING id, username, email, full_name, native_language, gender, 
                     is_verified, created_at, updated_at
        `;

        const result = await db.query(updateQuery, [
            full_name || null,
            native_language || null,
            gender || null,
            userId
        ]);

        if (result.rows.length === 0) {
            throw new Error('User not found');
        }

        return result.rows[0];
        
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
}

/**
 * Search for users
 * @param {number} currentUserId - Current user ID (to exclude from results)
 * @param {string} query - Search query
 * @param {Object} filters - Search filters
 * @returns {Array} Search results
 */
async function searchUsers(currentUserId, query, filters = {}) {
    try {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchTerm = `%${query.trim().toLowerCase()}%`;
        let searchQuery = `
            SELECT id, username, full_name, native_language, is_verified, created_at
            FROM users 
            WHERE id != $1 
            AND (
                LOWER(username) LIKE $2 
                OR LOWER(email) LIKE $2 
                OR LOWER(full_name) LIKE $2
            )
            AND is_blocked = false
        `;

        const queryParams = [currentUserId, searchTerm];

        // Add language filter if specified
        if (filters.language && filters.language !== '') {
            searchQuery += ` AND native_language = $${queryParams.length + 1}`;
            queryParams.push(filters.language);
        }

        searchQuery += ` ORDER BY created_at DESC LIMIT 20`;

        const result = await db.query(searchQuery, queryParams);

        return result.rows.map(user => ({
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            native_language: user.native_language,
            is_verified: user.is_verified,
            created_at: user.created_at,
            initials: getUserInitials(user.full_name || user.username)
        }));
        
    } catch (error) {
        console.error('Error searching users:', error);
        throw error;
    }
}

/**
 * Get user initials for avatar display
 * @param {string} name - User's full name or username
 * @returns {string} User initials (max 2 characters)
 */
function getUserInitials(name) {
    if (!name) return '?';
    
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 2);
}

/**
 * Format language code to readable name
 * @param {string} langCode - Language code (e.g., 'en', 'es')
 * @returns {Object} Language info with name and flag
 */
function getLanguageInfo(langCode) {
    const languages = {
        'en': { name: 'English', flag: '🇺🇸' },
        'es': { name: 'Spanish', flag: '🇪🇸' },
        'fr': { name: 'French', flag: '🇫🇷' },
        'de': { name: 'German', flag: '🇩🇪' },
        'it': { name: 'Italian', flag: '🇮🇹' },
        'pt': { name: 'Portuguese', flag: '🇵🇹' },
        'ru': { name: 'Russian', flag: '🇷🇺' },
        'ja': { name: 'Japanese', flag: '🇯🇵' },
        'ko': { name: 'Korean', flag: '🇰🇷' },
        'zh': { name: 'Chinese', flag: '🇨🇳' }
    };

    return languages[langCode] || languages['en'];
}

/**
 * Validate language code
 * @param {string} langCode - Language code to validate
 * @returns {boolean} Whether the language code is valid
 */
function isValidLanguage(langCode) {
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
    return validLanguages.includes(langCode);
}

/**
 * Validate gender value
 * @param {string} gender - Gender value to validate
 * @returns {boolean} Whether the gender value is valid
 */
function isValidGender(gender) {
    const validGenders = ['male', 'female', 'other', ''];
    return validGenders.includes(gender);
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted relative time
 */
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return days === 1 ? '1 day ago' : `${days} days ago`;
    } else if (hours > 0) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (minutes > 0) {
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    } else {
        return 'Just now';
    }
}

/**
 * Format large numbers with K/M suffixes
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Generate user-friendly error messages
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
function getUserFriendlyErrorMessage(error) {
    const errorMessages = {
        'ECONNREFUSED': 'Unable to connect to the database. Please try again later.',
        'ENOTFOUND': 'Network connection error. Please check your internet connection.',
        'ETIMEDOUT': 'Request timed out. Please try again.',
        'User not found': 'The requested user could not be found.',
        'Invalid language code': 'Please select a valid language.',
        'Invalid gender value': 'Please select a valid gender option.'
    };

    return errorMessages[error.message] || errorMessages[error.code] || 'An unexpected error occurred. Please try again.';
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .trim();
}

/**
 * Validate profile update data
 * @param {Object} data - Profile data to validate
 * @returns {Object} Validation result
 */
function validateProfileData(data) {
    const errors = [];
    
    if (data.full_name && data.full_name.length > 100) {
        errors.push('Full name must be less than 100 characters');
    }
    
    if (data.native_language && !isValidLanguage(data.native_language)) {
        errors.push('Invalid language selection');
    }
    
    if (data.gender && !isValidGender(data.gender)) {
        errors.push('Invalid gender selection');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Log dashboard activity for analytics
 * @param {number} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} metadata - Additional metadata
 */
async function logDashboardActivity(userId, action, metadata = {}) {
    try {
        // For Phase 2.1, just log to console
        // In future phases, store in analytics table
        console.log(`Dashboard Activity: User ${userId} performed ${action}`, metadata);
        
    } catch (error) {
        // Don't throw errors for logging failures
        console.error('Failed to log dashboard activity:', error);
    }
}

module.exports = {
    getUserStats,
    getRecentActivity,
    updateUserProfile,
    searchUsers,
    getUserInitials,
    getLanguageInfo,
    isValidLanguage,
    isValidGender,
    formatTimeAgo,
    formatNumber,
    getUserFriendlyErrorMessage,
    sanitizeInput,
    validateProfileData,
    logDashboardActivity
};