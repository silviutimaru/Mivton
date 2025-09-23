/**
 * ==============================================
 * MIVTON - USER SEARCH COMPONENT
 * Phase 2.3 - User Interface Polish
 * Live user search functionality with filters and results
 * ==============================================
 */

/**
 * User Search Component
 * Extends BaseComponent for consistent architecture
 */
class MivtonUserSearch extends MivtonBaseComponent {
    constructor(element, options = {}) {
        const defaultOptions = {
            searchDelay: 300,
            minSearchLength: 2,
            maxResults: 20,
            enableFilters: true,
            enableHistory: true,
            autoFocus: false,
            placeholder: 'Search by username or email...',
            apiEndpoint: '/api/users/search',
            ...options
        };
        
        super(element, defaultOptions);
        
        // Search state
        this.searchState = {
            query: '',
            filters: {},
            results: [],
            loading: false,
            hasSearched: false,
            currentPage: 1,
            totalResults: 0
        };
        
        // Search history
        this.searchHistory = [];
        
        // Debounced search function
        this.debouncedSearch = this.debounce(this.performSearch.bind(this), this.options.searchDelay);
        
        // Initialize component
        this.initializeSearch();
    }
    
    /**
     * Initialize search functionality
     */
    initializeSearch() {
        try {
            this.createSearchElements();
            this.setupEventListeners();
            this.loadSearchHistory();
            
            if (this.options.autoFocus && this.searchInput) {
                setTimeout(() => this.searchInput.focus(), 100);
            }
            
            this.log('User search initialized successfully');
        } catch (error) {
            this.handleError(error, 'initializeSearch');
        }
    }
    
    /**
     * Create search UI elements
     */
    createSearchElements() {
        if (!this.element) return;
        
        // Main search container
        this.element.innerHTML = `
            <div class="search-container">
                <div class="search-box">
                    <div class="search-input-wrapper">
                        <i class="search-icon fas fa-search"></i>
                        <input type="text" 
                               class="search-input" 
                               placeholder="${this.options.placeholder}"
                               autocomplete="off"
                               spellcheck="false">
                        <button class="search-clear-btn" type="button" style="display: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                ${this.options.enableFilters ? this.createFiltersHTML() : ''}
                
                <div class="search-results">
                    <div class="search-empty-state">
                        <div class="search-empty-icon">🔍</div>
                        <h3 class="search-empty-title">Start searching</h3>
                        <p class="search-empty-text">Use the search box above to find friends by username or email.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Cache DOM elements
        this.searchInput = this.element.querySelector('.search-input');
        this.clearBtn = this.element.querySelector('.search-clear-btn');
        this.resultsContainer = this.element.querySelector('.search-results');
        this.filtersContainer = this.element.querySelector('.search-filters');
        
        if (this.options.enableFilters) {
            this.filterSelects = this.element.querySelectorAll('.filter-select');
        }
    }
    
    /**
     * Create filters HTML
     */
    createFiltersHTML() {
        return `
            <div class="search-filters">
                <div class="filter-group">
                    <label class="filter-label">Language</label>
                    <select class="filter-select" data-filter="language">
                        <option value="">All Languages</option>
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="ru">Russian</option>
                        <option value="ja">Japanese</option>
                        <option value="ko">Korean</option>
                        <option value="zh">Chinese</option>
                        <option value="ar">Arabic</option>
                        <option value="hi">Hindi</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Status</label>
                    <select class="filter-select" data-filter="status">
                        <option value="">Any Status</option>
                        <option value="online">Online</option>
                        <option value="away">Away</option>
                        <option value="busy">Busy</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">User Type</label>
                    <select class="filter-select" data-filter="userType">
                        <option value="">All Users</option>
                        <option value="verified">Verified</option>
                        <option value="new">New Users</option>
                    </select>
                </div>
                
                <div class="active-filters"></div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.searchInput) return;
        
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });
        
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(true);
            } else if (e.key === 'Escape') {
                this.clearSearch();
            }
        });
        
        this.searchInput.addEventListener('focus', () => {
            this.element.classList.add('search-focused');
        });
        
        this.searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.element.classList.remove('search-focused');
            }, 150);
        });
        
        // Clear button event
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Filter events
        if (this.filterSelects) {
            this.filterSelects.forEach(select => {
                select.addEventListener('change', (e) => {
                    this.handleFilterChange(e.target.dataset.filter, e.target.value);
                });
            });
        }
        
        // Results container events
        this.resultsContainer.addEventListener('click', (e) => {
            this.handleResultClick(e);
        });
    }
    
    /**
     * Handle search input changes
     */
    handleSearchInput(value) {
        const trimmedValue = value.trim();
        this.searchState.query = trimmedValue;
        
        // Update UI state
        this.updateInputState(trimmedValue);
        
        // Perform search if meets criteria
        if (trimmedValue.length >= this.options.minSearchLength) {
            this.debouncedSearch();
        } else if (trimmedValue.length === 0) {
            this.clearResults();
        }
    }
    
    /**
     * Update input UI state
     */
    updateInputState(value) {
        const wrapper = this.searchInput?.parentElement;
        if (!wrapper) return;
        
        if (value.length > 0) {
            wrapper.classList.add('has-content');
            this.clearBtn.style.display = 'flex';
        } else {
            wrapper.classList.remove('has-content');
            this.clearBtn.style.display = 'none';
        }
    }
    
    /**
     * Handle filter changes
     */
    handleFilterChange(filterType, value) {
        if (value) {
            this.searchState.filters[filterType] = value;
        } else {
            delete this.searchState.filters[filterType];
        }
        
        this.updateActiveFilters();
        
        // Re-search if we have a query
        if (this.searchState.query.length >= this.options.minSearchLength) {
            this.debouncedSearch();
        }
    }
    
    /**
     * Update active filters display
     */
    updateActiveFilters() {
        const activeFiltersContainer = this.element.querySelector('.active-filters');
        if (!activeFiltersContainer) return;
        
        const filterTags = Object.entries(this.searchState.filters).map(([key, value]) => {
            const label = this.getFilterLabel(key, value);
            return `
                <div class="filter-tag">
                    ${label}
                    <button class="filter-tag-remove" data-filter="${key}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        activeFiltersContainer.innerHTML = filterTags;
        
        // Add remove event listeners
        activeFiltersContainer.querySelectorAll('.filter-tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.closest('.filter-tag-remove').dataset.filter;
                this.removeFilter(filterType);
            });
        });
    }
    
    /**
     * Get human-readable filter label
     */
    getFilterLabel(filterType, value) {
        const labels = {
            language: {
                en: 'English', es: 'Spanish', fr: 'French', de: 'German',
                it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese',
                ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi'
            },
            status: {
                online: 'Online', away: 'Away', busy: 'Busy'
            },
            userType: {
                verified: 'Verified', new: 'New Users'
            }
        };
        
        return labels[filterType]?.[value] || value;
    }
    
    /**
     * Remove specific filter
     */
    removeFilter(filterType) {
        delete this.searchState.filters[filterType];
        
        // Update filter select
        const select = this.element.querySelector(`[data-filter="${filterType}"]`);
        if (select) {
            select.value = '';
        }
        
        this.updateActiveFilters();
        
        // Re-search if we have a query
        if (this.searchState.query.length >= this.options.minSearchLength) {
            this.debouncedSearch();
        }
    }
    
    /**
     * Perform search API call
     */
    async performSearch(immediate = false) {
        if (!immediate && this.searchState.loading) return;
        
        const query = this.searchState.query.trim();
        if (query.length < this.options.minSearchLength) return;
        
        try {
            this.setLoadingState(true);
            
            // Build search parameters
            const params = new URLSearchParams({
                q: query,
                limit: this.options.maxResults,
                page: this.searchState.currentPage,
                ...this.searchState.filters
            });
            
            // Make API request
            const response = await fetch(`${this.options.apiEndpoint}?${params}`);
            
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Update search state
            this.searchState.results = data.users || [];
            this.searchState.totalResults = data.total || 0;
            this.searchState.hasSearched = true;
            
            // Display results
            this.displayResults();
            
            // Save to history
            this.saveSearchToHistory(query, this.searchState.filters, this.searchState.totalResults);
            
            // Emit search event
            this.emit('search-completed', {
                query,
                filters: this.searchState.filters,
                results: this.searchState.results,
                total: this.searchState.totalResults
            });
            
        } catch (error) {
            this.handleSearchError(error);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Display search results
     */
    displayResults() {
        if (!this.resultsContainer) return;
        
        if (this.searchState.results.length === 0) {
            this.displayEmptyResults();
            return;
        }
        
        const resultsHTML = `
            <div class="search-results-header">
                <div class="search-results-count">
                    ${this.searchState.totalResults} user${this.searchState.totalResults !== 1 ? 's' : ''} found
                </div>
                <div class="search-results-sort">
                    <span class="sort-label">Sort by:</span>
                    <select class="sort-select">
                        <option value="relevance">Relevance</option>
                        <option value="name">Name</option>
                        <option value="status">Online Status</option>
                        <option value="recent">Recently Active</option>
                    </select>
                </div>
            </div>
            <div class="profile-cards-grid">
                ${this.searchState.results.map(user => this.createUserCard(user)).join('')}
            </div>
        `;
        
        this.resultsContainer.innerHTML = resultsHTML;
        
        // Setup sort functionality
        const sortSelect = this.resultsContainer.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortResults(e.target.value);
            });
        }
    }
    
    /**
     * Create user profile card HTML
     */
    createUserCard(user) {
        const statusClass = user.status || 'offline';
        const languageFlag = this.getLanguageFlag(user.native_language);
        const languageName = this.getLanguageName(user.native_language);
        
        return `
            <div class="profile-card" data-user-id="${user.id}">
                <div class="profile-card-header">
                    <div class="profile-avatar presence-indicator">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" alt="${user.full_name || user.username}">` :
                            (user.full_name || user.username).charAt(0).toUpperCase()
                        }
                        <div class="status-indicator ${statusClass} pulse"></div>
                    </div>
                    <div class="profile-info">
                        <div class="profile-name">
                            ${user.full_name || user.username}
                            ${user.is_verified ? '<span class="profile-badge verified">✓</span>' : ''}
                            ${user.is_admin ? '<span class="profile-badge admin">Admin</span>' : ''}
                        </div>
                        <div class="profile-username">@${user.username}</div>
                        <div class="profile-status">
                            <div class="status-dot ${statusClass}"></div>
                            <span class="status-text">${this.capitalizeFirst(statusClass)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-details">
                    <div class="profile-detail-item">
                        <i class="profile-detail-icon fas fa-globe"></i>
                        <div class="profile-language">
                            <span class="language-flag">${languageFlag}</span>
                            <span class="language-name">${languageName}</span>
                        </div>
                    </div>
                    ${user.last_seen ? `
                        <div class="profile-detail-item">
                            <i class="profile-detail-icon fas fa-clock"></i>
                            <span class="profile-detail-text">Last seen ${this.formatRelativeTime(user.last_seen)}</span>
                        </div>
                    ` : ''}
                    ${user.member_since ? `
                        <div class="profile-detail-item">
                            <i class="profile-detail-icon fas fa-calendar"></i>
                            <span class="profile-detail-text">Joined ${this.formatDate(user.member_since)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="profile-actions">
                    <button class="profile-action-btn primary" data-action="add-friend" data-user-id="${user.id}">
                        <i class="fas fa-user-plus"></i>
                        Add Friend
                    </button>
                    <button class="profile-action-btn secondary" data-action="view-profile" data-user-id="${user.id}">
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                    <button class="profile-action-btn danger" data-action="block-user" data-user-id="${user.id}">
                        <i class="fas fa-ban"></i>
                        Block
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Display empty search results
     */
    displayEmptyResults() {
        const hasFilters = Object.keys(this.searchState.filters).length > 0;
        const query = this.searchState.query;
        
        this.resultsContainer.innerHTML = `
            <div class="search-empty-state">
                <div class="search-empty-icon">🔍</div>
                <h3 class="search-empty-title">No users found</h3>
                <p class="search-empty-text">
                    ${hasFilters ? 
                        `No users match your search for "${query}" with the current filters.` :
                        `No users found matching "${query}".`
                    }
                </p>
                ${hasFilters ? `
                    <button class="search-empty-action" onclick="this.clearFilters()">
                        Clear Filters
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Handle search errors
     */
    handleSearchError(error) {
        this.log('Search error:', error);
        
        this.resultsContainer.innerHTML = `
            <div class="search-empty-state">
                <div class="search-empty-icon">⚠️</div>
                <h3 class="search-empty-title">Search Error</h3>
                <p class="search-empty-text">
                    Unable to search at the moment. Please try again.
                </p>
                <button class="search-empty-action" onclick="this.performSearch(true)">
                    Try Again
                </button>
            </div>
        `;
        
        // Show toast notification
        if (window.MivtonComponents?.Toast) {
            window.MivtonComponents.Toast.error('Search temporarily unavailable');
        }
    }
    
    /**
     * Handle result card clicks
     */
    handleResultClick(event) {
        const button = event.target.closest('.profile-action-btn');
        if (!button) return;
        
        const action = button.dataset.action;
        const userId = parseInt(button.dataset.userId);
        
        switch (action) {
            case 'add-friend':
                this.handleAddFriend(userId, button);
                break;
            case 'view-profile':
                this.handleViewProfile(userId);
                break;
            case 'block-user':
                this.handleBlockUser(userId, button);
                break;
        }
    }
    
    /**
     * Handle add friend action
     */
    async handleAddFriend(userId, button) {
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            
            const response = await fetch('/api/friends/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send friend request');
            }
            
            button.innerHTML = '<i class="fas fa-check"></i> Sent!';
            button.classList.remove('primary');
            button.classList.add('success');
            
            // Show success toast
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.success('Friend request sent!');
            }
            
            // Emit event
            this.emit('friend-request-sent', { userId });
            
        } catch (error) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus"></i> Add Friend';
            
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.error('Failed to send friend request');
            }
            
            this.handleError(error, 'handleAddFriend');
        }
    }
    
    /**
     * Handle view profile action
     */
    handleViewProfile(userId) {
        this.emit('view-profile-requested', { userId });
        
        // Navigate to profile or open modal
        // This would be handled by the parent component
    }
    
    /**
     * Handle block user action
     */
    async handleBlockUser(userId, button) {
        // Show confirmation modal first
        if (window.MivtonComponents?.Modal) {
            const confirmed = await window.MivtonComponents.Modal.confirm(
                'Block User',
                'Are you sure you want to block this user? They won\'t be able to send you messages or friend requests.'
            );
            
            if (!confirmed) return;
        }
        
        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Blocking...';
            
            const response = await fetch('/api/users/block', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId })
            });
            
            if (!response.ok) {
                throw new Error('Failed to block user');
            }
            
            // Remove the card from results
            const card = button.closest('.profile-card');
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
            
            // Show success toast
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.success('User blocked successfully');
            }
            
            // Emit event
            this.emit('user-blocked', { userId });
            
        } catch (error) {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-ban"></i> Block';
            
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.error('Failed to block user');
            }
            
            this.handleError(error, 'handleBlockUser');
        }
    }
    
    /**
     * Sort search results
     */
    sortResults(sortBy) {
        const sortedResults = [...this.searchState.results];
        
        switch (sortBy) {
            case 'name':
                sortedResults.sort((a, b) => {
                    const nameA = a.full_name || a.username;
                    const nameB = b.full_name || b.username;
                    return nameA.localeCompare(nameB);
                });
                break;
            case 'status':
                const statusOrder = { online: 0, away: 1, busy: 2, offline: 3 };
                sortedResults.sort((a, b) => {
                    return statusOrder[a.status || 'offline'] - statusOrder[b.status || 'offline'];
                });
                break;
            case 'recent':
                sortedResults.sort((a, b) => {
                    const timeA = new Date(a.last_seen || 0);
                    const timeB = new Date(b.last_seen || 0);
                    return timeB - timeA;
                });
                break;
            case 'relevance':
            default:
                // Keep original order (relevance from server)
                break;
        }
        
        this.searchState.results = sortedResults;
        
        // Re-render just the cards
        const cardsContainer = this.resultsContainer.querySelector('.profile-cards-grid');
        if (cardsContainer) {
            cardsContainer.innerHTML = this.searchState.results.map(user => this.createUserCard(user)).join('');
        }
    }
    
    /**
     * Clear search and results
     */
    clearSearch() {
        this.searchInput.value = '';
        this.searchState.query = '';
        this.searchState.hasSearched = false;
        this.updateInputState('');
        this.clearResults();
        this.searchInput.focus();
    }
    
    /**
     * Clear search results
     */
    clearResults() {
        this.searchState.results = [];
        this.searchState.totalResults = 0;
        
        this.resultsContainer.innerHTML = `
            <div class="search-empty-state">
                <div class="search-empty-icon">🔍</div>
                <h3 class="search-empty-title">Start searching</h3>
                <p class="search-empty-text">Use the search box above to find friends by username or email.</p>
            </div>
        `;
    }
    
    /**
     * Clear all filters
     */
    clearFilters() {
        this.searchState.filters = {};
        
        // Reset filter selects
        if (this.filterSelects) {
            this.filterSelects.forEach(select => {
                select.value = '';
            });
        }
        
        this.updateActiveFilters();
        
        // Re-search if we have a query
        if (this.searchState.query.length >= this.options.minSearchLength) {
            this.debouncedSearch();
        }
    }
    
    /**
     * Set loading state
     */
    setLoadingState(loading) {
        this.searchState.loading = loading;
        
        if (loading) {
            this.element.classList.add('searching');
            this.resultsContainer.innerHTML = `
                <div class="search-loading">
                    <div class="loading-spinner"></div>
                    <span>Searching...</span>
                </div>
            `;
        } else {
            this.element.classList.remove('searching');
        }
    }
    
    /**
     * Save search to history
     */
    saveSearchToHistory(query, filters, resultCount) {
        if (!this.options.enableHistory) return;
        
        const searchEntry = {
            query,
            filters: { ...filters },
            resultCount,
            timestamp: Date.now()
        };
        
        // Remove duplicate entries
        this.searchHistory = this.searchHistory.filter(entry => 
            entry.query !== query || JSON.stringify(entry.filters) !== JSON.stringify(filters)
        );
        
        // Add to beginning
        this.searchHistory.unshift(searchEntry);
        
        // Keep only last 10 searches
        this.searchHistory = this.searchHistory.slice(0, 10);
        
        // Note: In Claude environment, we can't use localStorage
        // This would be saved on the server in a real implementation
    }
    
    /**
     * Load search history
     */
    loadSearchHistory() {
        if (!this.options.enableHistory) return;
        
        // In a real implementation, this would load from server
        this.searchHistory = [];
    }
    
    /**
     * Utility: Get language flag emoji
     */
    getLanguageFlag(languageCode) {
        const flags = {
            en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
            pt: '🇵🇹', ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
            ar: '🇸🇦', hi: '🇮🇳', nl: '🇳🇱', sv: '🇸🇪', no: '🇳🇴',
            da: '🇩🇰', fi: '🇫🇮', pl: '🇵🇱', tr: '🇹🇷', el: '🇬🇷'
        };
        return flags[languageCode] || '🌐';
    }
    
    /**
     * Utility: Get language name
     */
    getLanguageName(languageCode) {
        const names = {
            en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
            pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
            ar: 'Arabic', hi: 'Hindi', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian',
            da: 'Danish', fi: 'Finnish', pl: 'Polish', tr: 'Turkish', el: 'Greek'
        };
        return names[languageCode] || 'Unknown';
    }
    
    /**
     * Utility: Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    /**
     * Utility: Format relative time
     */
    formatRelativeTime(timestamp) {
        const now = Date.now();
        const time = new Date(timestamp).getTime();
        const diff = now - time;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }
    
    /**
     * Utility: Format date
     */
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    }
    
    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Get current search results
     */
    getResults() {
        return {
            query: this.searchState.query,
            filters: { ...this.searchState.filters },
            results: [...this.searchState.results],
            total: this.searchState.totalResults,
            hasSearched: this.searchState.hasSearched
        };
    }
    
    /**
     * Set search query programmatically
     */
    setQuery(query, performSearch = true) {
        if (this.searchInput) {
            this.searchInput.value = query;
            this.handleSearchInput(query);
            
            if (performSearch && query.length >= this.options.minSearchLength) {
                this.performSearch(true);
            }
        }
    }
    
    /**
     * Set filters programmatically
     */
    setFilters(filters, performSearch = true) {
        this.searchState.filters = { ...filters };
        
        // Update filter selects
        if (this.filterSelects) {
            this.filterSelects.forEach(select => {
                const filterType = select.dataset.filter;
                if (filters[filterType]) {
                    select.value = filters[filterType];
                }
            });
        }
        
        this.updateActiveFilters();
        
        if (performSearch && this.searchState.query.length >= this.options.minSearchLength) {
            this.performSearch(true);
        }
    }
    
    /**
     * Component cleanup
     */
    onDestroy() {
        // Clear debounce timeout
        if (this.debouncedSearch) {
            clearTimeout(this.debouncedSearch);
        }
        
        // Clear search history from memory
        this.searchHistory = [];
        this.searchState = null;
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.UserSearch = MivtonUserSearch;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonUserSearch;
}
