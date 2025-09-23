/**
 * ==============================================
 * MIVTON - USER SEARCH UTILITIES
 * Phase 2.3 - User Interface Polish
 * Utility functions for user search and filtering
 * ==============================================
 */

/**
 * Search utilities and filters
 */
class UserSearchUtils {
    /**
     * Validate search query
     */
    static validateSearchQuery(query) {
        if (!query || typeof query !== 'string') {
            return { valid: false, error: 'Search query is required' };
        }
        
        const trimmed = query.trim();
        
        if (trimmed.length < 2) {
            return { valid: false, error: 'Search query must be at least 2 characters long' };
        }
        
        if (trimmed.length > 100) {
            return { valid: false, error: 'Search query must be 100 characters or less' };
        }
        
        // Check for potentially harmful content
        const harmfulPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];
        
        for (const pattern of harmfulPatterns) {
            if (pattern.test(trimmed)) {
                return { valid: false, error: 'Invalid characters in search query' };
            }
        }
        
        return { valid: true, query: trimmed };
    }
    
    /**
     * Sanitize search query for database
     */
    static sanitizeQuery(query) {
        if (!query) return '';
        
        return query
            .trim()
            .replace(/[%_\\]/g, '\\$&') // Escape SQL LIKE wildcards
            .replace(/\s+/g, ' ') // Normalize whitespace
            .substring(0, 100); // Limit length
    }
    
    /**
     * Get status indicator emoji/symbol
     */
    static getStatusIndicator(status) {
        const indicators = {
            online: '🟢',
            away: '🟡',
            busy: '🔴',
            offline: '⚫'
        };
        
        return indicators[status] || indicators.offline;
    }
    
    /**
     * Get relative time string
     */
    static getRelativeTime(date) {
        if (!date) return 'Unknown';
        
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        const diffWeeks = Math.floor(diffMs / (86400000 * 7));
        const diffMonths = Math.floor(diffMs / (86400000 * 30));
        const diffYears = Math.floor(diffMs / (86400000 * 365));
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffWeeks < 4) return `${diffWeeks}w ago`;
        if (diffMonths < 12) return `${diffMonths}mo ago`;
        return `${diffYears}y ago`;
    }
    
    /**
     * Format user data for search results
     */
    static formatUserResult(user, currentUserId = null) {
        const formatted = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            native_language: user.native_language,
            is_verified: Boolean(user.is_verified),
            is_admin: Boolean(user.is_admin),
            status: user.status || 'offline',
            last_seen: user.last_seen,
            status_message: user.status_message,
            is_friend: Boolean(user.is_friend),
            friend_request_sent: Boolean(user.friend_request_sent),
            friend_count: parseInt(user.friend_count) || 0,
            created_at: user.created_at,
            member_since: user.created_at
        };
        
        // Add computed fields
        formatted.display_name = user.full_name || user.username;
        formatted.is_online = ['online', 'away', 'busy'].includes(formatted.status);
        formatted.status_indicator = this.getStatusIndicator(formatted.status);
        
        // Add relative time since joining
        if (user.created_at) {
            formatted.member_since_relative = this.getRelativeTime(user.created_at);
        }
        
        // Add last seen relative time
        if (user.last_seen) {
            formatted.last_seen_relative = this.getRelativeTime(user.last_seen);
        }
        
        return formatted;
    }
    
    /**
     * Validate pagination parameters
     */
    static validatePagination(page = 1, limit = 20) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        return {
            page: Math.max(1, isNaN(pageNum) ? 1 : pageNum),
            limit: Math.min(50, Math.max(1, isNaN(limitNum) ? 20 : limitNum))
        };
    }
    
    /**
     * Calculate pagination info
     */
    static calculatePagination(page, limit, totalCount) {
        const totalPages = Math.ceil(totalCount / limit);
        const offset = (page - 1) * limit;
        
        return {
            page,
            limit,
            total: totalCount,
            totalPages,
            offset,
            hasMore: offset + limit < totalCount,
            hasPrevious: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            previousPage: page > 1 ? page - 1 : null
        };
    }
    
    /**
     * Get search suggestions based on query
     */
    static getSearchSuggestions(query, recentSearches = [], popularSearches = []) {
        if (!query || query.length < 2) {
            return {
                recent: recentSearches.slice(0, 5),
                popular: popularSearches.slice(0, 5),
                suggestions: []
            };
        }
        
        const lowerQuery = query.toLowerCase();
        
        // Filter recent searches
        const recentMatches = recentSearches
            .filter(search => search.toLowerCase().includes(lowerQuery))
            .slice(0, 3);
        
        // Filter popular searches
        const popularMatches = popularSearches
            .filter(search => search.toLowerCase().includes(lowerQuery))
            .slice(0, 3);
        
        // Generate suggestions
        const suggestions = [
            ...new Set([...recentMatches, ...popularMatches])
        ].slice(0, 5);
        
        return {
            recent: recentMatches,
            popular: popularMatches,
            suggestions
        };
    }
    
    /**
     * Highlight search terms in text
     */
    static highlightSearchTerms(text, query) {
        if (!text || !query) return text;
        
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    /**
     * Get available filter options
     */
    static getFilterOptions() {
        return {
            languages: [
                { code: 'en', name: 'English' },
                { code: 'es', name: 'Spanish' },
                { code: 'fr', name: 'French' },
                { code: 'de', name: 'German' },
                { code: 'it', name: 'Italian' },
                { code: 'pt', name: 'Portuguese' },
                { code: 'ru', name: 'Russian' },
                { code: 'ja', name: 'Japanese' },
                { code: 'ko', name: 'Korean' },
                { code: 'zh', name: 'Chinese' }
            ],
            statuses: [
                { value: 'online', label: 'Online', color: '#4ade80' },
                { value: 'away', label: 'Away', color: '#fbbf24' },
                { value: 'busy', label: 'Busy', color: '#f87171' },
                { value: 'offline', label: 'Offline', color: '#6b7280' }
            ],
            userTypes: [
                { value: 'verified', label: 'Verified Users' },
                { value: 'new', label: 'New Members' },
                { value: 'active', label: 'Recently Active' }
            ],
            sortOptions: [
                { value: 'relevance', label: 'Most Relevant' },
                { value: 'name', label: 'Name (A-Z)' },
                { value: 'newest', label: 'Newest Members' },
                { value: 'status', label: 'Online Status' },
                { value: 'activity', label: 'Last Active' }
            ]
        };
    }
    
    /**
     * Validate filter values
     */
    static validateFilters(filters) {
        const options = this.getFilterOptions();
        const validated = {};
        
        // Validate language
        if (filters.language) {
            const validLanguages = options.languages.map(l => l.code);
            if (validLanguages.includes(filters.language)) {
                validated.language = filters.language;
            }
        }
        
        // Validate status
        if (filters.status) {
            const validStatuses = options.statuses.map(s => s.value);
            if (validStatuses.includes(filters.status)) {
                validated.status = filters.status;
            }
        }
        
        // Validate user type
        if (filters.userType) {
            const validTypes = options.userTypes.map(t => t.value);
            if (validTypes.includes(filters.userType)) {
                validated.userType = filters.userType;
            }
        }
        
        // Validate sort
        if (filters.sortBy) {
            const validSorts = options.sortOptions.map(s => s.value);
            if (validSorts.includes(filters.sortBy)) {
                validated.sortBy = filters.sortBy;
            }
        }
        
        return validated;
    }
}

/**
 * Profile card utilities
 */
class ProfileCardUtils {
    /**
     * Generate user initials for avatar
     */
    static getUserInitials(user) {
        if (user.full_name) {
            return user.full_name
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        
        if (user.username) {
            return user.username.charAt(0).toUpperCase();
        }
        
        return '?';
    }
    
    /**
     * Get avatar background color based on user ID
     */
    static getAvatarColor(userId) {
        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#eab308',
            '#84cc16', '#22c55e', '#10b981', '#14b8a6',
            '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
            '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
        ];
        
        return colors[userId % colors.length];
    }
    
    /**
     * Format user card data
     */
    static formatCardData(user) {
        return {
            ...user,
            initials: this.getUserInitials(user),
            avatarColor: this.getAvatarColor(user.id),
            displayName: user.full_name || user.username,
            statusText: this.getStatusText(user),
            memberSince: UserSearchUtils.getRelativeTime(user.created_at)
        };
    }
    
    /**
     * Get status text for display
     */
    static getStatusText(user) {
        if (!user.status || user.status === 'offline') {
            return user.last_seen ? 
                `Last seen ${UserSearchUtils.getRelativeTime(user.last_seen)}` : 
                'Offline';
        }
        
        const statusMap = {
            online: 'Online now',
            away: 'Away',
            busy: 'Busy - Do not disturb'
        };
        
        return statusMap[user.status] || 'Unknown';
    }
    
    /**
     * Get action button configuration
     */
    static getActionButtons(user, currentUserId) {
        const buttons = [];
        
        if (user.id === currentUserId) {
            buttons.push({
                type: 'edit',
                label: 'Edit Profile',
                icon: 'fas fa-edit',
                variant: 'primary'
            });
        } else {
            // Message button
            buttons.push({
                type: 'message',
                label: 'Message',
                icon: 'fas fa-comment',
                variant: 'primary'
            });
            
            // Friend request button
            if (user.is_friend) {
                buttons.push({
                    type: 'unfriend',
                    label: 'Remove Friend',
                    icon: 'fas fa-user-minus',
                    variant: 'secondary'
                });
            } else if (user.friend_request_sent) {
                buttons.push({
                    type: 'cancel_request',
                    label: 'Cancel Request',
                    icon: 'fas fa-user-clock',
                    variant: 'secondary',
                    disabled: true
                });
            } else {
                buttons.push({
                    type: 'add_friend',
                    label: 'Add Friend',
                    icon: 'fas fa-user-plus',
                    variant: 'secondary'
                });
            }
            
            // More options
            buttons.push({
                type: 'more',
                label: 'More',
                icon: 'fas fa-ellipsis-v',
                variant: 'ghost'
            });
        }
        
        return buttons;
    }
}

// Export utilities
if (typeof window !== 'undefined') {
    window.MivtonUtils = window.MivtonUtils || {};
    window.MivtonUtils.UserSearchUtils = UserSearchUtils;
    window.MivtonUtils.ProfileCardUtils = ProfileCardUtils;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        UserSearchUtils,
        ProfileCardUtils
    };
}
