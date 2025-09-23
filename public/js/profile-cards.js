/**
 * ==============================================
 * MIVTON - PROFILE CARDS COMPONENT
 * Phase 2.3 - User Interface Polish
 * User profile card system with status indicators
 * ==============================================
 */

/**
 * Profile Cards Component
 * Handles user profile card display and interactions
 */
class MivtonProfileCards extends MivtonBaseComponent {
    constructor(element, options = {}) {
        const defaultOptions = {
            cardLayout: 'grid', // 'grid', 'list', 'compact'
            showStatus: true,
            showLanguage: true,
            showActions: true,
            enableTooltips: true,
            enableAnimations: true,
            skeletonCount: 6,
            refreshInterval: 30000, // 30 seconds for status updates
            ...options
        };
        
        super(element, defaultOptions);
        
        // Component state
        this.cardsState = {
            users: [],
            loading: false,
            error: null,
            selectedCards: new Set(),
            sortBy: 'name',
            filterBy: null
        };
        
        // Status update interval
        this.statusUpdateInterval = null;
        
        // Initialize component
        this.initializeCards();
    }
    
    /**
     * Initialize profile cards
     */
    initializeCards() {
        try {
            this.setupContainer();
            this.setupEventListeners();
            this.startStatusUpdates();
            
            this.log('Profile cards initialized successfully');
        } catch (error) {
            this.handleError(error, 'initializeCards');
        }
    }
    
    /**
     * Setup container structure
     */
    setupContainer() {
        if (!this.element) return;
        
        this.element.className = `profile-cards-container ${this.options.cardLayout}`;
        this.element.innerHTML = `
            <div class="profile-cards-grid">
                ${this.createSkeletonCards()}
            </div>
        `;
        
        this.cardsGrid = this.element.querySelector('.profile-cards-grid');
    }
    
    /**
     * Create skeleton loading cards
     */
    createSkeletonCards() {
        return Array(this.options.skeletonCount).fill(0).map(() => `
            <div class="profile-card skeleton">
                <div class="profile-card-header">
                    <div class="skeleton-element skeleton-avatar"></div>
                    <div class="profile-info">
                        <div class="skeleton-element skeleton-text title"></div>
                        <div class="skeleton-element skeleton-text subtitle"></div>
                        <div class="skeleton-element skeleton-text content"></div>
                    </div>
                </div>
                <div class="profile-details">
                    <div class="skeleton-element skeleton-text"></div>
                    <div class="skeleton-element skeleton-text"></div>
                </div>
                <div class="skeleton-element skeleton-button"></div>
            </div>
        `).join('');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (!this.cardsGrid) return;
        
        // Card click events
        this.cardsGrid.addEventListener('click', (e) => {
            this.handleCardClick(e);
        });
        
        // Card hover events for tooltips
        if (this.options.enableTooltips) {
            this.cardsGrid.addEventListener('mouseenter', (e) => {
                if (e.target.closest('.profile-card')) {
                    this.showTooltip(e);
                }
            }, true);
            
            this.cardsGrid.addEventListener('mouseleave', (e) => {
                if (e.target.closest('.profile-card')) {
                    this.hideTooltip(e);
                }
            }, true);
        }
        
        // Keyboard navigation
        this.cardsGrid.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }
    
    /**
     * Load and display user data
     */
    async loadUsers(users = null) {
        try {
            this.setLoadingState(true);
            
            if (users) {
                // Use provided users data
                this.cardsState.users = users;
            } else {
                // Fetch users from API
                const response = await fetch('/api/users/profiles');
                if (!response.ok) {
                    throw new Error(`Failed to load users: ${response.status}`);
                }
                
                const data = await response.json();
                this.cardsState.users = data.users || [];
            }
            
            this.renderCards();
            this.emit('users-loaded', { users: this.cardsState.users });
            
        } catch (error) {
            this.handleLoadError(error);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Render profile cards
     */
    renderCards() {
        if (!this.cardsGrid) return;
        
        if (this.cardsState.users.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Sort users
        const sortedUsers = this.sortUsers(this.cardsState.users, this.cardsState.sortBy);
        
        // Filter users if needed
        const filteredUsers = this.cardsState.filterBy ? 
            this.filterUsers(sortedUsers, this.cardsState.filterBy) : 
            sortedUsers;
        
        // Generate cards HTML
        const cardsHTML = filteredUsers.map(user => this.createProfileCard(user)).join('');
        
        // Animate cards in
        if (this.options.enableAnimations) {
            this.cardsGrid.style.opacity = '0';
            this.cardsGrid.innerHTML = cardsHTML;
            
            // Trigger reflow
            this.cardsGrid.offsetHeight;
            
            this.cardsGrid.style.transition = 'opacity 0.3s ease';
            this.cardsGrid.style.opacity = '1';
        } else {
            this.cardsGrid.innerHTML = cardsHTML;
        }
        
        // Setup tooltips
        if (this.options.enableTooltips) {
            this.setupTooltips();
        }
    }
    
    /**
     * Create individual profile card
     */
    createProfileCard(user) {
        const statusClass = user.status || 'offline';
        const isOnline = ['online', 'away', 'busy'].includes(statusClass);
        const languageFlag = this.getLanguageFlag(user.native_language);
        const languageName = this.getLanguageName(user.native_language);
        const cardId = `profile-card-${user.id}`;
        
        return `
            <div class="profile-card ${this.options.cardLayout}" 
                 data-user-id="${user.id}" 
                 data-status="${statusClass}"
                 id="${cardId}"
                 tabindex="0"
                 role="button"
                 aria-label="Profile card for ${user.full_name || user.username}">
                
                <div class="profile-card-header">
                    <div class="profile-avatar presence-indicator avatar-medium">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" alt="${user.full_name || user.username}" loading="lazy">` :
                            this.generateAvatarInitials(user.full_name || user.username)
                        }
                        ${this.options.showStatus ? `
                            <div class="status-indicator ${statusClass} ${isOnline ? 'pulse' : ''}" 
                                 title="${this.getStatusText(statusClass)}"
                                 aria-label="User status: ${statusClass}"></div>
                        ` : ''}
                    </div>
                    
                    <div class="profile-info">
                        <div class="profile-name">
                            ${user.full_name || user.username}
                            ${user.is_verified ? `
                                <span class="profile-badge verified" 
                                      title="Verified user" 
                                      aria-label="Verified">✓</span>
                            ` : ''}
                            ${user.is_admin ? `
                                <span class="profile-badge admin" 
                                      title="Administrator" 
                                      aria-label="Admin">Admin</span>
                            ` : ''}
                            ${this.isNewUser(user.created_at) ? `
                                <span class="profile-badge new" 
                                      title="New user" 
                                      aria-label="New user">New</span>
                            ` : ''}
                        </div>
                        
                        <div class="profile-username">@${user.username}</div>
                        
                        ${this.options.showStatus ? `
                            <div class="profile-status">
                                <div class="status-dot ${statusClass}"></div>
                                <span class="status-text">${this.capitalizeFirst(statusClass)}</span>
                                ${user.status_message ? `
                                    <span class="status-message" title="${user.status_message}">
                                        "${user.status_message}"
                                    </span>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="profile-details">
                    ${this.options.showLanguage && user.native_language ? `
                        <div class="profile-detail-item">
                            <i class="profile-detail-icon fas fa-globe" aria-hidden="true"></i>
                            <div class="profile-language">
                                <span class="language-flag" role="img" aria-label="${languageName}">${languageFlag}</span>
                                <span class="language-name">${languageName}</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${user.last_seen ? `
                        <div class="profile-detail-item">
                            <i class="profile-detail-icon fas fa-clock" aria-hidden="true"></i>
                            <span class="profile-detail-text">Last seen ${this.formatRelativeTime(user.last_seen)}</span>
                        </div>
                    ` : ''}
                    
                    ${user.created_at ? `
                        <div class="profile-detail-item">
                            <i class="profile-detail-icon fas fa-calendar" aria-hidden="true"></i>
                            <span class="profile-detail-text">Joined ${this.formatDate(user.created_at)}</span>
                        </div>
                    ` : ''}
                    
                    ${user.friend_count ? `
                        <div class="profile-detail-item">
                            <i class="profile-detail-icon fas fa-users" aria-hidden="true"></i>
                            <span class="profile-detail-text">${user.friend_count} friends</span>
                        </div>
                    ` : ''}
                </div>
                
                ${this.options.showActions ? `
                    <div class="profile-actions">
                        ${this.createActionButtons(user)}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Create action buttons for profile card
     */
    createActionButtons(user) {
        const buttons = [];
        
        // Add friend button (if not already friends)
        if (!user.is_friend && !user.friend_request_sent) {
            buttons.push(`
                <button class="profile-action-btn primary" 
                        data-action="add-friend" 
                        data-user-id="${user.id}"
                        aria-label="Send friend request to ${user.full_name || user.username}">
                    <i class="fas fa-user-plus" aria-hidden="true"></i>
                    <span>Add Friend</span>
                </button>
            `);
        } else if (user.friend_request_sent) {
            buttons.push(`
                <button class="profile-action-btn secondary disabled" 
                        disabled
                        aria-label="Friend request already sent">
                    <i class="fas fa-clock" aria-hidden="true"></i>
                    <span>Pending</span>
                </button>
            `);
        } else if (user.is_friend) {
            buttons.push(`
                <button class="profile-action-btn success" 
                        data-action="message" 
                        data-user-id="${user.id}"
                        aria-label="Send message to ${user.full_name || user.username}">
                    <i class="fas fa-comment" aria-hidden="true"></i>
                    <span>Message</span>
                </button>
            `);
        }
        
        // View profile button
        buttons.push(`
            <button class="profile-action-btn secondary" 
                    data-action="view-profile" 
                    data-user-id="${user.id}"
                    aria-label="View profile of ${user.full_name || user.username}">
                <i class="fas fa-eye" aria-hidden="true"></i>
                <span>View</span>
            </button>
        `);
        
        // Block/More options (in dropdown)
        buttons.push(`
            <div class="profile-action-dropdown">
                <button class="profile-action-btn secondary dropdown-toggle" 
                        data-action="more-options" 
                        data-user-id="${user.id}"
                        aria-label="More options for ${user.full_name || user.username}"
                        aria-haspopup="true"
                        aria-expanded="false">
                    <i class="fas fa-ellipsis-v" aria-hidden="true"></i>
                </button>
                <div class="dropdown-menu" role="menu">
                    <button class="dropdown-item danger" 
                            data-action="block-user" 
                            data-user-id="${user.id}"
                            role="menuitem">
                        <i class="fas fa-ban" aria-hidden="true"></i>
                        Block User
                    </button>
                    <button class="dropdown-item" 
                            data-action="report-user" 
                            data-user-id="${user.id}"
                            role="menuitem">
                        <i class="fas fa-flag" aria-hidden="true"></i>
                        Report User
                    </button>
                </div>
            </div>
        `);
        
        return buttons.join('');
    }
    
    /**
     * Generate avatar initials
     */
    generateAvatarInitials(name) {
        const initials = name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
            
        return `<span class="avatar-initials">${initials}</span>`;
    }
    
    /**
     * Check if user is new (joined within last 30 days)
     */
    isNewUser(createdAt) {
        if (!createdAt) return false;
        
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        return new Date(createdAt).getTime() > thirtyDaysAgo;
    }
    
    /**
     * Get status text
     */
    getStatusText(status) {
        const statusTexts = {
            online: 'Online',
            away: 'Away',
            busy: 'Busy - Do not disturb',
            offline: 'Offline'
        };
        return statusTexts[status] || 'Unknown';
    }
    
    /**
     * Handle card click events
     */
    handleCardClick(event) {
        const button = event.target.closest('.profile-action-btn');
        const dropdown = event.target.closest('.profile-action-dropdown');
        const card = event.target.closest('.profile-card');
        
        if (button && !button.disabled) {
            event.stopPropagation();
            this.handleActionClick(button);
        } else if (dropdown) {
            event.stopPropagation();
            this.handleDropdownClick(dropdown, event);
        } else if (card) {
            this.handleCardSelect(card, event);
        }
    }
    
    /**
     * Handle action button clicks
     */
    async handleActionClick(button) {
        const action = button.dataset.action;
        const userId = parseInt(button.dataset.userId);
        
        if (!userId) return;
        
        switch (action) {
            case 'add-friend':
                await this.handleAddFriend(userId, button);
                break;
            case 'message':
                this.handleSendMessage(userId);
                break;
            case 'view-profile':
                this.handleViewProfile(userId);
                break;
            case 'block-user':
                await this.handleBlockUser(userId, button);
                break;
            case 'report-user':
                this.handleReportUser(userId);
                break;
            case 'more-options':
                this.toggleDropdown(button);
                break;
        }
    }
    
    /**
     * Handle add friend action
     */
    async handleAddFriend(userId, button) {
        try {
            this.setButtonLoading(button, 'Adding...');
            
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
            
            // Update button state
            button.innerHTML = '<i class="fas fa-clock"></i><span>Pending</span>';
            button.classList.remove('primary');
            button.classList.add('secondary', 'disabled');
            button.disabled = true;
            
            // Update user data
            const user = this.cardsState.users.find(u => u.id === userId);
            if (user) {
                user.friend_request_sent = true;
            }
            
            // Show success toast
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.success('Friend request sent!');
            }
            
            // Emit event
            this.emit('friend-request-sent', { userId, user });
            
        } catch (error) {
            this.setButtonLoading(button, 'Add Friend', false);
            
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.error('Failed to send friend request');
            }
            
            this.handleError(error, 'handleAddFriend');
        }
    }
    
    /**
     * Handle send message action
     */
    handleSendMessage(userId) {
        this.emit('message-requested', { userId });
    }
    
    /**
     * Handle view profile action
     */
    handleViewProfile(userId) {
        this.emit('profile-view-requested', { userId });
    }
    
    /**
     * Handle block user action
     */
    async handleBlockUser(userId, button) {
        // Show confirmation modal
        if (window.MivtonComponents?.Modal) {
            const user = this.cardsState.users.find(u => u.id === userId);
            const userName = user?.full_name || user?.username || 'this user';
            
            const confirmed = await window.MivtonComponents.Modal.confirm(
                'Block User',
                `Are you sure you want to block ${userName}? They won't be able to send you messages or friend requests.`,
                'Block',
                'Cancel'
            );
            
            if (!confirmed) return;
        }
        
        try {
            this.setButtonLoading(button, 'Blocking...');
            
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
            
            // Remove card from view with animation
            const card = button.closest('.profile-card');
            if (card && this.options.enableAnimations) {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8) translateY(-20px)';
                
                setTimeout(() => {
                    card.remove();
                    this.updateCardCount();
                }, 300);
            } else if (card) {
                card.remove();
                this.updateCardCount();
            }
            
            // Update state
            this.cardsState.users = this.cardsState.users.filter(u => u.id !== userId);
            
            // Show success toast
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.success('User blocked successfully');
            }
            
            // Emit event
            this.emit('user-blocked', { userId });
            
        } catch (error) {
            this.setButtonLoading(button, '<i class="fas fa-ban"></i>Block', false);
            
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.error('Failed to block user');
            }
            
            this.handleError(error, 'handleBlockUser');
        }
    }
    
    /**
     * Handle report user action
     */
    handleReportUser(userId) {
        this.emit('user-report-requested', { userId });
    }
    
    /**
     * Handle dropdown toggle
     */
    toggleDropdown(button) {
        const dropdown = button.closest('.profile-action-dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        this.cardsGrid.querySelectorAll('.profile-action-dropdown.open').forEach(d => {
            d.classList.remove('open');
            d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        });
        
        // Toggle current dropdown
        if (!isOpen) {
            dropdown.classList.add('open');
            button.setAttribute('aria-expanded', 'true');
            
            // Position menu
            this.positionDropdownMenu(dropdown, menu);
            
            // Close on outside click
            setTimeout(() => {
                document.addEventListener('click', this.closeDropdownOnOutsideClick.bind(this, dropdown));
            }, 0);
        }
    }
    
    /**
     * Position dropdown menu
     */
    positionDropdownMenu(dropdown, menu) {
        const rect = dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if there's enough space below
        if (rect.bottom + menu.offsetHeight > viewportHeight) {
            menu.classList.add('dropdown-up');
        } else {
            menu.classList.remove('dropdown-up');
        }
    }
    
    /**
     * Close dropdown on outside click
     */
    closeDropdownOnOutsideClick(dropdown, event) {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
            dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            document.removeEventListener('click', this.closeDropdownOnOutsideClick);
        }
    }
    
    /**
     * Handle card selection
     */
    handleCardSelect(card, event) {
        const userId = parseInt(card.dataset.userId);
        
        if (event.ctrlKey || event.metaKey) {
            // Multi-select
            if (this.cardsState.selectedCards.has(userId)) {
                this.cardsState.selectedCards.delete(userId);
                card.classList.remove('selected');
            } else {
                this.cardsState.selectedCards.add(userId);
                card.classList.add('selected');
            }
        } else {
            // Single select (view profile)
            this.handleViewProfile(userId);
        }
        
        this.emit('card-selection-changed', {
            selectedCards: Array.from(this.cardsState.selectedCards)
        });
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(event) {
        const focusedCard = document.activeElement;
        if (!focusedCard || !focusedCard.classList.contains('profile-card')) return;
        
        const cards = Array.from(this.cardsGrid.querySelectorAll('.profile-card'));
        const currentIndex = cards.indexOf(focusedCard);
        let nextIndex = currentIndex;
        
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                nextIndex = Math.min(currentIndex + 1, cards.length - 1);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                nextIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.handleCardSelect(focusedCard, event);
                return;
            case 'Escape':
                focusedCard.blur();
                return;
            default:
                return;
        }
        
        event.preventDefault();
        cards[nextIndex]?.focus();
    }
    
    /**
     * Set button loading state
     */
    setButtonLoading(button, text, loading = true) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>${text}</span>`;
        } else {
            button.disabled = false;
            button.innerHTML = text;
        }
    }
    
    /**
     * Sort users
     */
    sortUsers(users, sortBy) {
        const sorted = [...users];
        
        switch (sortBy) {
            case 'name':
                sorted.sort((a, b) => {
                    const nameA = a.full_name || a.username;
                    const nameB = b.full_name || b.username;
                    return nameA.localeCompare(nameB);
                });
                break;
            case 'status':
                const statusOrder = { online: 0, away: 1, busy: 2, offline: 3 };
                sorted.sort((a, b) => {
                    return statusOrder[a.status || 'offline'] - statusOrder[b.status || 'offline'];
                });
                break;
            case 'recent':
                sorted.sort((a, b) => {
                    const timeA = new Date(a.last_seen || 0);
                    const timeB = new Date(b.last_seen || 0);
                    return timeB - timeA;
                });
                break;
            case 'joined':
                sorted.sort((a, b) => {
                    const timeA = new Date(a.created_at || 0);
                    const timeB = new Date(b.created_at || 0);
                    return timeB - timeA;
                });
                break;
        }
        
        return sorted;
    }
    
    /**
     * Filter users
     */
    filterUsers(users, filterBy) {
        switch (filterBy) {
            case 'online':
                return users.filter(user => ['online', 'away', 'busy'].includes(user.status));
            case 'friends':
                return users.filter(user => user.is_friend);
            case 'verified':
                return users.filter(user => user.is_verified);
            case 'new':
                return users.filter(user => this.isNewUser(user.created_at));
            default:
                return users;
        }
    }
    
    /**
     * Start status updates
     */
    startStatusUpdates() {
        if (this.options.refreshInterval > 0) {
            this.statusUpdateInterval = setInterval(() => {
                this.updateUserStatuses();
            }, this.options.refreshInterval);
        }
    }
    
    /**
     * Update user statuses
     */
    async updateUserStatuses() {
        try {
            const response = await fetch('/api/users/status-updates');
            if (!response.ok) return;
            
            const data = await response.json();
            const statusUpdates = data.updates || {};
            
            // Update status indicators
            Object.entries(statusUpdates).forEach(([userId, status]) => {
                const card = this.cardsGrid.querySelector(`[data-user-id="${userId}"]`);
                if (!card) return;
                
                // Update card data
                card.dataset.status = status.status;
                
                // Update status indicator
                const indicator = card.querySelector('.status-indicator');
                if (indicator) {
                    indicator.className = `status-indicator ${status.status} ${['online', 'away', 'busy'].includes(status.status) ? 'pulse' : ''}`;
                    indicator.title = this.getStatusText(status.status);
                }
                
                // Update status text
                const statusText = card.querySelector('.status-text');
                if (statusText) {
                    statusText.textContent = this.capitalizeFirst(status.status);
                }
                
                // Update status dot
                const statusDot = card.querySelector('.status-dot');
                if (statusDot) {
                    statusDot.className = `status-dot ${status.status}`;
                }
                
                // Update user data
                const user = this.cardsState.users.find(u => u.id === parseInt(userId));
                if (user) {
                    user.status = status.status;
                    user.last_seen = status.last_seen;
                }
            });
            
        } catch (error) {
            this.log('Failed to update user statuses:', error);
        }
    }
    
    /**
     * Setup tooltips
     */
    setupTooltips() {
        // Tooltips would be handled by a separate tooltip component
    }
    
    /**
     * Show tooltip
     */
    showTooltip(event) {
        // Tooltip implementation would go here
    }
    
    /**
     * Hide tooltip
     */
    hideTooltip(event) {
        // Tooltip implementation would go here
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        this.cardsGrid.innerHTML = `
            <div class="profile-cards-empty">
                <div class="empty-icon">👥</div>
                <h3 class="empty-title">No users found</h3>
                <p class="empty-text">No users match the current criteria.</p>
            </div>
        `;
    }
    
    /**
     * Handle load error
     */
    handleLoadError(error) {
        this.cardsState.error = error;
        
        this.cardsGrid.innerHTML = `
            <div class="profile-cards-error">
                <div class="error-icon">⚠️</div>
                <h3 class="error-title">Failed to load users</h3>
                <p class="error-text">Unable to load user profiles. Please try again.</p>
                <button class="error-retry-btn" onclick="this.loadUsers()">
                    <i class="fas fa-redo"></i>
                    Try Again
                </button>
            </div>
        `;
        
        this.handleError(error, 'loadUsers');
    }
    
    /**
     * Set loading state
     */
    setLoadingState(loading) {
        this.cardsState.loading = loading;
        
        if (loading) {
            this.element.classList.add('loading');
        } else {
            this.element.classList.remove('loading');
        }
    }
    
    /**
     * Update card count display
     */
    updateCardCount() {
        if (this.cardsState.users.length === 0) {
            this.renderEmptyState();
        }
        
        this.emit('card-count-changed', {
            count: this.cardsState.users.length
        });
    }
    
    /**
     * Public API: Set sort order
     */
    setSortBy(sortBy) {
        this.cardsState.sortBy = sortBy;
        this.renderCards();
    }
    
    /**
     * Public API: Set filter
     */
    setFilterBy(filterBy) {
        this.cardsState.filterBy = filterBy;
        this.renderCards();
    }
    
    /**
     * Public API: Add user
     */
    addUser(user) {
        this.cardsState.users.push(user);
        this.renderCards();
    }
    
    /**
     * Public API: Remove user
     */
    removeUser(userId) {
        this.cardsState.users = this.cardsState.users.filter(u => u.id !== userId);
        this.renderCards();
    }
    
    /**
     * Public API: Update user
     */
    updateUser(userId, updates) {
        const user = this.cardsState.users.find(u => u.id === userId);
        if (user) {
            Object.assign(user, updates);
            this.renderCards();
        }
    }
    
    /**
     * Public API: Get selected users
     */
    getSelectedUsers() {
        return this.cardsState.users.filter(user => 
            this.cardsState.selectedCards.has(user.id)
        );
    }
    
    /**
     * Public API: Clear selection
     */
    clearSelection() {
        this.cardsState.selectedCards.clear();
        this.cardsGrid.querySelectorAll('.profile-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
    }
    
    /**
     * Utility functions
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
    
    getLanguageName(languageCode) {
        const names = {
            en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
            pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
            ar: 'Arabic', hi: 'Hindi', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian',
            da: 'Danish', fi: 'Finnish', pl: 'Polish', tr: 'Turkish', el: 'Greek'
        };
        return names[languageCode] || 'Unknown';
    }
    
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
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
    
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    }
    
    /**
     * Component cleanup
     */
    onDestroy() {
        // Clear status update interval
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
        
        // Clear selection
        this.cardsState.selectedCards.clear();
        
        // Remove event listeners
        document.removeEventListener('click', this.closeDropdownOnOutsideClick);
        
        // Clear state
        this.cardsState = null;
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.ProfileCards = MivtonProfileCards;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonProfileCards;
}
