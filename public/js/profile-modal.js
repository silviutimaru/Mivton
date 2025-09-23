/**
 * ==============================================
 * MIVTON - USER PROFILE MODAL COMPONENT
 * Profile viewing modal with detailed information
 * ==============================================
 */

class MivtonProfileModal extends MivtonBaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        this.options = {
            showMutualFriends: true,
            showActivityBadges: true,
            allowActions: true,
            closeOnOutsideClick: true,
            animationDuration: 300,
            ...options
        };

        this.state = {
            profile: null,
            mutualFriends: [],
            loading: false,
            error: null,
            isVisible: false
        };

        this.initialize();
    }

    initialize() {
        try {
            this.createModalStructure();
            this.bindEvents();
            
            console.log('🔍 Profile modal initialized:', {
                element: this.element,
                parent: this.element.parentNode,
                classes: this.element.className,
                id: this.element.id
            });
            
            console.log('✅ Profile modal initialized');
        } catch (error) {
            console.error('❌ Failed to initialize profile modal:', error);
        }
    }

    createModalStructure() {
        this.element.innerHTML = `
            <div class="profile-modal-overlay" data-modal-overlay>
                <div class="profile-modal-container" data-modal-container>
                    <div class="profile-modal-header">
                        <h2 class="profile-modal-title">User Profile</h2>
                        <button class="profile-modal-close" data-close-modal aria-label="Close profile">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="profile-modal-content">
                        <!-- Loading State -->
                        <div class="profile-loading" data-loading style="display: none;">
                            <div class="loading-spinner"></div>
                            <p>Loading profile...</p>
                        </div>

                        <!-- Error State -->
                        <div class="profile-error" data-error style="display: none;">
                            <div class="error-icon">⚠️</div>
                            <h3>Unable to Load Profile</h3>
                            <p data-error-message>Something went wrong</p>
                            <button class="btn btn-primary" data-retry>Try Again</button>
                        </div>

                        <!-- Profile Content -->
                        <div class="profile-content" data-profile-content style="display: none;">
                            <!-- Profile Header -->
                            <div class="profile-header">
                                <div class="profile-avatar-section">
                                    <div class="profile-avatar large" data-avatar>
                                        <i class="fas fa-user"></i>
                                        <div class="status-indicator" data-status-indicator></div>
                                    </div>
                                    <div class="profile-badges" data-badges></div>
                                </div>

                                <div class="profile-info">
                                    <div class="profile-name-section">
                                        <h3 class="profile-name" data-profile-name>User Name</h3>
                                        <span class="profile-username" data-profile-username>@username</span>
                                        <div class="profile-verification" data-verification style="display: none;">
                                            <i class="fas fa-check-circle verified"></i>
                                            <span>Verified</span>
                                        </div>
                                    </div>

                                    <div class="profile-status-section">
                                        <div class="profile-status" data-profile-status>
                                            <div class="status-dot" data-status-dot></div>
                                            <span class="status-text" data-status-text>Offline</span>
                                        </div>
                                        <div class="profile-activity" data-profile-activity style="display: none;">
                                            <span data-activity-message></span>
                                        </div>
                                    </div>

                                    <div class="profile-meta">
                                        <div class="profile-language" data-profile-language style="display: none;">
                                            <i class="fas fa-globe"></i>
                                            <span data-language-flag></span>
                                            <span data-language-name></span>
                                        </div>
                                        <div class="profile-joined">
                                            <i class="fas fa-calendar"></i>
                                            <span>Joined <span data-joined-date">2025</span></span>
                                        </div>
                                        <div class="profile-friends" data-profile-friends>
                                            <i class="fas fa-users"></i>
                                            <span data-friends-count>0</span> friends
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Profile Actions -->
                            <div class="profile-actions" data-profile-actions>
                                <button class="btn btn-primary" data-action="add-friend" style="display: none;">
                                    <i class="fas fa-user-plus"></i>
                                    Add Friend
                                </button>
                                <button class="btn btn-success" data-action="message" style="display: none;">
                                    <i class="fas fa-comment"></i>
                                    Send Message
                                </button>
                                <button class="btn btn-secondary" data-action="pending" disabled style="display: none;">
                                    <i class="fas fa-clock"></i>
                                    Request Pending
                                </button>
                                <button class="btn btn-secondary" data-action="accept-request" style="display: none;">
                                    <i class="fas fa-check"></i>
                                    Accept Request
                                </button>
                                <div class="profile-action-dropdown">
                                    <button class="btn btn-secondary dropdown-toggle" data-action="more">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <div class="dropdown-menu" data-dropdown-menu>
                                        <button class="dropdown-item" data-action="block">
                                            <i class="fas fa-ban"></i>
                                            Block User
                                        </button>
                                        <button class="dropdown-item" data-action="report">
                                            <i class="fas fa-flag"></i>
                                            Report User
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Profile Details -->
                            <div class="profile-details">
                                <!-- Mutual Friends -->
                                <div class="profile-section" data-mutual-friends-section style="display: none;">
                                    <h4 class="section-title">
                                        <i class="fas fa-users"></i>
                                        Mutual Friends (<span data-mutual-count>0</span>)
                                    </h4>
                                    <div class="mutual-friends-list" data-mutual-friends-list></div>
                                    <button class="btn btn-text" data-action="view-all-mutual" style="display: none;">
                                        View All Mutual Friends
                                    </button>
                                </div>

                                <!-- Activity & Badges -->
                                <div class="profile-section" data-activity-section>
                                    <h4 class="section-title">
                                        <i class="fas fa-trophy"></i>
                                        Activity & Achievements
                                    </h4>
                                    <div class="activity-badges" data-activity-badges></div>
                                    <div class="activity-stats" data-activity-stats></div>
                                </div>

                                <!-- Last Seen -->
                                <div class="profile-section" data-last-seen-section style="display: none;">
                                    <h4 class="section-title">
                                        <i class="fas fa-clock"></i>
                                        Last Activity
                                    </h4>
                                    <div class="last-seen-info">
                                        <span data-last-seen-text>Last seen recently</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="profile-modal-footer">
                        <button class="btn btn-secondary" data-close-modal>Close</button>
                    </div>
                </div>
            </div>
        `;

        this.element.classList.add('mivton-profile-modal');
    }

    bindEvents() {
        // Close modal events
        const closeButtons = this.element.querySelectorAll('[data-close-modal]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.hide());
        });

        // Overlay click to close
        if (this.options.closeOnOutsideClick) {
            const overlay = this.element.querySelector('[data-modal-overlay]');
            overlay?.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hide();
                }
            });
        }

        // Action buttons
        this.element.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleAction(action, e.target.closest('[data-action]'));
            }
        });

        // Retry button
        const retryBtn = this.element.querySelector('[data-retry]');
        retryBtn?.addEventListener('click', () => {
            if (this.state.profile?.id) {
                this.loadProfile(this.state.profile.id);
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (this.state.isVisible && e.key === 'Escape') {
                this.hide();
            }
        });
    }

    async show(userId) {
        try {
            console.log('🚀 Starting profile modal show for user:', userId);
            
            this.setState({ isVisible: true });
            
            // Force visibility with maximum z-index and important styles
            this.element.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                z-index: 2147483647 !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                align-items: center !important;
                justify-content: center !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            
            // Ensure modal container is also properly styled
            const modalContainer = this.element.querySelector('.profile-modal-container');
            if (modalContainer) {
                modalContainer.style.cssText = `
                    background: #1e293b !important;
                    border-radius: 16px !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3) !important;
                    max-width: 600px !important;
                    width: 100% !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    border: 1px solid #334155 !important;
                    color: #f1f5f9 !important;
                    position: relative !important;
                    z-index: 1 !important;
                `;
            }
            
            console.log('🔍 Modal element after showing:', {
                element: this.element,
                display: this.element.style.display,
                position: this.element.style.position,
                zIndex: this.element.style.zIndex,
                classes: this.element.className,
                isVisible: this.element.offsetHeight > 0,
                clientRect: this.element.getBoundingClientRect()
            });
            
            // Animate in
            requestAnimationFrame(() => {
                this.element.classList.add('modal-active');
                console.log('✅ Added modal-active class, classes now:', this.element.className);
            });

            await this.loadProfile(userId);
            
        } catch (error) {
            console.error('❌ Error showing profile modal:', error);
            this.showError('Failed to load profile');
        }
    }

    hide() {
        this.setState({ isVisible: false });
        this.element.classList.remove('modal-active');
        
        setTimeout(() => {
            this.element.style.display = 'none';
        }, this.options.animationDuration);
    }

    async loadProfile(userId) {
        try {
            this.setState({ loading: true, error: null });
            this.showLoadingState();

            // Load profile data
            const profileResponse = await fetch(`/api/user-profile/${userId}`);
            
            if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                throw new Error(errorData.error || `HTTP ${profileResponse.status}`);
            }

            const profileData = await profileResponse.json();
            
            if (!profileData.success) {
                throw new Error(profileData.error || 'Failed to load profile');
            }

            this.setState({ 
                profile: profileData.profile,
                loading: false 
            });

            // Load mutual friends if applicable
            if (this.options.showMutualFriends && 
                profileData.profile.friendship_status === 'friends') {
                await this.loadMutualFriends(userId);
            }

            // Load activity data
            if (this.options.showActivityBadges) {
                await this.loadActivity(userId);
            }

            this.renderProfile();

        } catch (error) {
            console.error('❌ Error loading profile:', error);
            this.setState({ 
                loading: false, 
                error: error.message || 'Failed to load profile' 
            });
            this.showError(this.state.error);
        }
    }

    async loadMutualFriends(userId) {
        try {
            const response = await fetch(`/api/user-profile/${userId}/mutual-friends?limit=6`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.setState({ mutualFriends: data.mutual_friends || [] });
                }
            }
        } catch (error) {
            console.log('Mutual friends not available:', error);
        }
    }

    async loadActivity(userId) {
        try {
            const response = await fetch(`/api/user-profile/${userId}/activity`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.setState({ 
                        profile: {
                            ...this.state.profile,
                            activity: data.activity
                        }
                    });
                }
            }
        } catch (error) {
            console.log('Activity data not available:', error);
        }
    }

    showLoadingState() {
        const loading = this.element.querySelector('[data-loading]');
        const content = this.element.querySelector('[data-profile-content]');
        const error = this.element.querySelector('[data-error]');

        if (loading) loading.style.display = 'block';
        if (content) content.style.display = 'none';
        if (error) error.style.display = 'none';
    }

    showError(message) {
        const loading = this.element.querySelector('[data-loading]');
        const content = this.element.querySelector('[data-profile-content]');
        const error = this.element.querySelector('[data-error]');
        const errorMessage = this.element.querySelector('[data-error-message]');

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        if (error) error.style.display = 'block';
        if (errorMessage) errorMessage.textContent = message;
    }

    renderProfile() {
        const profile = this.state.profile;
        if (!profile) return;

        this.showProfileContent();
        this.renderProfileHeader(profile);
        this.renderProfileActions(profile);
        this.renderMutualFriends();
        this.renderActivity(profile);
    }

    showProfileContent() {
        const loading = this.element.querySelector('[data-loading]');
        const content = this.element.querySelector('[data-profile-content]');
        const error = this.element.querySelector('[data-error]');

        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'block';
        if (error) error.style.display = 'none';
    }

    renderProfileHeader(profile) {
        // Avatar and status
        const avatar = this.element.querySelector('[data-avatar]');
        const statusIndicator = this.element.querySelector('[data-status-indicator]');
        
        if (avatar) {
            avatar.innerHTML = this.generateAvatar(profile.full_name || profile.username);
        }
        
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${profile.online_status}`;
        }

        // Name and username
        const profileName = this.element.querySelector('[data-profile-name]');
        const profileUsername = this.element.querySelector('[data-profile-username]');
        const verification = this.element.querySelector('[data-verification]');

        if (profileName) {
            profileName.textContent = profile.full_name || profile.username;
        }
        
        if (profileUsername) {
            profileUsername.textContent = `@${profile.username}`;
        }

        if (verification && profile.is_verified) {
            verification.style.display = 'flex';
        }

        // Status
        this.renderProfileStatus(profile);

        // Meta information
        this.renderProfileMeta(profile);

        // Badges
        this.renderProfileBadges(profile);
    }

    renderProfileStatus(profile) {
        const statusText = this.element.querySelector('[data-status-text]');
        const statusDot = this.element.querySelector('[data-status-dot]');
        const activitySection = this.element.querySelector('[data-profile-activity]');
        const activityMessage = this.element.querySelector('[data-activity-message]');

        if (statusText) {
            statusText.textContent = this.capitalizeFirst(profile.online_status);
        }

        if (statusDot) {
            statusDot.className = `status-dot ${profile.online_status}`;
        }

        if (profile.activity_message && activitySection && activityMessage) {
            activityMessage.textContent = profile.activity_message;
            activitySection.style.display = 'block';
        }
    }

    renderProfileMeta(profile) {
        // Language
        const languageSection = this.element.querySelector('[data-profile-language]');
        const languageFlag = this.element.querySelector('[data-language-flag]');
        const languageName = this.element.querySelector('[data-language-name]');

        if (profile.native_language && languageSection) {
            const flag = this.getLanguageFlag(profile.native_language);
            const name = this.getLanguageName(profile.native_language);
            
            if (languageFlag) languageFlag.textContent = flag;
            if (languageName) languageName.textContent = name;
            languageSection.style.display = 'flex';
        }

        // Joined date
        const joinedDate = this.element.querySelector('[data-joined-date]');
        if (joinedDate && profile.created_at) {
            joinedDate.textContent = this.formatDate(profile.created_at);
        }

        // Friends count
        const friendsSection = this.element.querySelector('[data-profile-friends]');
        const friendsCount = this.element.querySelector('[data-friends-count]');
        
        if (profile.total_friends_count !== null && friendsSection && friendsCount) {
            friendsCount.textContent = profile.total_friends_count;
            friendsSection.style.display = 'flex';
        }

        // Last seen
        const lastSeenSection = this.element.querySelector('[data-last-seen-section]');
        const lastSeenText = this.element.querySelector('[data-last-seen-text]');
        
        if (profile.last_seen && profile.online_status === 'offline' && lastSeenSection && lastSeenText) {
            lastSeenText.textContent = `Last seen ${this.formatRelativeTime(profile.last_seen)}`;
            lastSeenSection.style.display = 'block';
        }
    }

    renderProfileBadges(profile) {
        const badgesContainer = this.element.querySelector('[data-badges]');
        if (!badgesContainer) return;

        const badges = [];
        
        if (profile.is_verified) {
            badges.push('<div class="profile-badge verified" title="Verified User">✓</div>');
        }
        
        if (profile.is_admin) {
            badges.push('<div class="profile-badge admin" title="Administrator">Admin</div>');
        }

        // New user badge
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (profile.created_at && new Date(profile.created_at) > thirtyDaysAgo) {
            badges.push('<div class="profile-badge new" title="New User">New</div>');
        }

        badgesContainer.innerHTML = badges.join('');
    }

    renderProfileActions(profile) {
        if (!this.options.allowActions || profile.is_own_profile) {
            const actionsSection = this.element.querySelector('[data-profile-actions]');
            if (actionsSection) actionsSection.style.display = 'none';
            return;
        }

        // Show/hide action buttons based on friendship status
        const addFriendBtn = this.element.querySelector('[data-action="add-friend"]');
        const messageBtn = this.element.querySelector('[data-action="message"]');
        const pendingBtn = this.element.querySelector('[data-action="pending"]');
        const acceptBtn = this.element.querySelector('[data-action="accept-request"]');

        // Hide all buttons first
        [addFriendBtn, messageBtn, pendingBtn, acceptBtn].forEach(btn => {
            if (btn) btn.style.display = 'none';
        });

        // Show appropriate buttons
        switch (profile.friendship_status) {
            case 'none':
                if (addFriendBtn && profile.can_send_friend_request) {
                    addFriendBtn.style.display = 'inline-flex';
                }
                break;
            case 'friends':
                if (messageBtn) messageBtn.style.display = 'inline-flex';
                break;
            case 'request_sent':
                if (pendingBtn) pendingBtn.style.display = 'inline-flex';
                break;
            case 'request_received':
                if (acceptBtn) acceptBtn.style.display = 'inline-flex';
                break;
        }
    }

    renderMutualFriends() {
        const mutualSection = this.element.querySelector('[data-mutual-friends-section]');
        const mutualList = this.element.querySelector('[data-mutual-friends-list]');
        const mutualCount = this.element.querySelector('[data-mutual-count]');
        const viewAllBtn = this.element.querySelector('[data-action="view-all-mutual"]');

        if (!this.state.mutualFriends.length || !mutualSection) return;

        // Update count
        if (mutualCount) {
            mutualCount.textContent = this.state.mutualFriends.length;
        }

        // Render mutual friends
        if (mutualList) {
            mutualList.innerHTML = this.state.mutualFriends.map(friend => `
                <div class="mutual-friend-item" data-user-id="${friend.id}">
                    <div class="mutual-friend-avatar">
                        ${this.generateSmallAvatar(friend.full_name || friend.username)}
                        <div class="status-indicator small ${friend.online_status}"></div>
                    </div>
                    <div class="mutual-friend-info">
                        <div class="mutual-friend-name">${this.escapeHtml(friend.full_name || friend.username)}</div>
                        <div class="mutual-friend-username">@${this.escapeHtml(friend.username)}</div>
                    </div>
                </div>
            `).join('');
        }

        // Show section
        mutualSection.style.display = 'block';

        // Show "View All" button if there are more friends
        if (viewAllBtn && this.state.mutualFriends.length >= 6) {
            viewAllBtn.style.display = 'inline-flex';
        }
    }

    renderActivity(profile) {
        const activitySection = this.element.querySelector('[data-activity-section]');
        const badgesContainer = this.element.querySelector('[data-activity-badges]');
        const statsContainer = this.element.querySelector('[data-activity-stats]');

        if (!profile.activity || !activitySection) return;

        // Render badges
        if (badgesContainer && profile.activity.badges?.length) {
            badgesContainer.innerHTML = profile.activity.badges.map(badge => `
                <div class="activity-badge" title="${badge.description}">
                    <span class="badge-icon">${badge.icon}</span>
                    <span class="badge-name">${badge.name}</span>
                </div>
            `).join('');
        }

        // Render stats
        if (statsContainer) {
            const stats = [];
            
            if (profile.activity.languages_spoken?.length) {
                stats.push({
                    icon: '🌐',
                    label: 'Languages',
                    value: profile.activity.languages_spoken.length
                });
            }

            statsContainer.innerHTML = stats.map(stat => `
                <div class="activity-stat">
                    <span class="stat-icon">${stat.icon}</span>
                    <span class="stat-value">${stat.value}</span>
                    <span class="stat-label">${stat.label}</span>
                </div>
            `).join('');
        }
    }

    async handleAction(action, element) {
        if (!this.state.profile) return;

        const profile = this.state.profile;

        switch (action) {
            case 'add-friend':
                await this.sendFriendRequest(profile.id, element);
                break;
            case 'message':
                this.startMessage(profile.id);
                break;
            case 'accept-request':
                await this.acceptFriendRequest(profile.id, element);
                break;
            case 'block':
                await this.blockUser(profile.id);
                break;
            case 'report':
                this.reportUser(profile.id);
                break;
            case 'more':
                this.toggleDropdown(element);
                break;
            case 'view-all-mutual':
                this.viewAllMutualFriends(profile.id);
                break;
        }
    }

    async sendFriendRequest(userId, button) {
        try {
            this.setButtonLoading(button, 'Sending...');

            const response = await fetch('/api/friend-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiver_id: userId })
            });

            const data = await response.json();

            if (data.success) {
                // Update UI
                button.innerHTML = '<i class="fas fa-clock"></i> Request Pending';
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
                button.disabled = true;

                // Update state
                this.setState({
                    profile: {
                        ...this.state.profile,
                        friendship_status: 'request_sent'
                    }
                });

                // Show success message
                if (window.toast) {
                    window.toast.show('Friend request sent!', 'success');
                }
            } else {
                throw new Error(data.error || 'Failed to send friend request');
            }

        } catch (error) {
            console.error('❌ Error sending friend request:', error);
            this.setButtonLoading(button, '<i class="fas fa-user-plus"></i> Add Friend', false);
            
            if (window.toast) {
                window.toast.show('Failed to send friend request', 'error');
            }
        }
    }

    async acceptFriendRequest(userId, button) {
        try {
            this.setButtonLoading(button, 'Accepting...');

            // Find the friend request first
            const requestsResponse = await fetch('/api/friend-requests/received');
            const requestsData = await requestsResponse.json();
            
            const request = requestsData.requests?.find(r => r.sender_id === userId);
            if (!request) {
                throw new Error('Friend request not found');
            }

            const response = await fetch(`/api/friend-requests/${request.id}/accept`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                // Update UI to show message button
                button.innerHTML = '<i class="fas fa-comment"></i> Send Message';
                button.classList.remove('btn-secondary');
                button.classList.add('btn-success');
                button.dataset.action = 'message';

                // Update state
                this.setState({
                    profile: {
                        ...this.state.profile,
                        friendship_status: 'friends'
                    }
                });

                // Show success message
                if (window.toast) {
                    window.toast.show('Friend request accepted!', 'success');
                }
            } else {
                throw new Error(data.error || 'Failed to accept friend request');
            }

        } catch (error) {
            console.error('❌ Error accepting friend request:', error);
            this.setButtonLoading(button, '<i class="fas fa-check"></i> Accept Request', false);
            
            if (window.toast) {
                window.toast.show('Failed to accept friend request', 'error');
            }
        }
    }

    async blockUser(userId) {
        try {
            const confirmed = await this.showConfirmDialog(
                'Block User',
                `Are you sure you want to block ${this.state.profile.full_name || this.state.profile.username}?`,
                'Block',
                'destructive'
            );

            if (!confirmed) return;

            const response = await fetch('/api/blocked-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });

            const data = await response.json();

            if (data.success) {
                // Close modal and show success
                this.hide();
                
                if (window.toast) {
                    window.toast.show('User blocked successfully', 'success');
                }

                // Emit event for other components to update
                this.emit('user-blocked', { userId });
            } else {
                throw new Error(data.error || 'Failed to block user');
            }

        } catch (error) {
            console.error('❌ Error blocking user:', error);
            
            if (window.toast) {
                window.toast.show('Failed to block user', 'error');
            }
        }
    }

    startMessage(userId) {
        // Close modal and emit event for message system
        this.hide();
        this.emit('message-requested', { userId, profile: this.state.profile });
        
        // For now, show a placeholder message
        if (window.toast) {
            window.toast.show('Messaging feature coming soon!', 'info');
        }
    }

    reportUser(userId) {
        // Close modal and emit event for reporting system
        this.hide();
        this.emit('report-requested', { userId, profile: this.state.profile });
        
        // For now, show a placeholder message
        if (window.toast) {
            window.toast.show('Reporting feature coming soon!', 'info');
        }
    }

    viewAllMutualFriends(userId) {
        // Close modal and emit event for mutual friends view
        this.hide();
        this.emit('mutual-friends-requested', { userId, profile: this.state.profile });
    }

    // Utility methods
    generateAvatar(name) {
        const initials = name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
        return `<span class="avatar-initials">${initials}</span>`;
    }

    generateSmallAvatar(name) {
        const initials = name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
        return `<span class="avatar-initials small">${initials}</span>`;
    }

    getLanguageFlag(languageCode) {
        const flags = {
            en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
            pt: '🇵🇹', ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳'
        };
        return flags[languageCode] || '🌐';
    }

    getLanguageName(languageCode) {
        const names = {
            en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
            pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese'
        };
        return names[languageCode] || 'Unknown';
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
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

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    setButtonLoading(button, text, loading = true) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        } else {
            button.disabled = false;
            button.innerHTML = text;
        }
    }

    toggleDropdown(button) {
        const dropdown = button.closest('.profile-action-dropdown');
        const menu = dropdown.querySelector('.dropdown-menu');
        const isOpen = dropdown.classList.contains('open');

        if (!isOpen) {
            dropdown.classList.add('open');
            setTimeout(() => {
                document.addEventListener('click', this.closeDropdownOnOutsideClick.bind(this, dropdown));
            }, 0);
        } else {
            dropdown.classList.remove('open');
        }
    }

    closeDropdownOnOutsideClick(dropdown, event) {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
            document.removeEventListener('click', this.closeDropdownOnOutsideClick);
        }
    }

    async showConfirmDialog(title, message, confirmText, type = 'primary') {
        return new Promise((resolve) => {
            if (window.showConfirmDialog) {
                // Use the global confirm dialog function
                window.showConfirmDialog(message, title).then(resolve);
            } else {
                // Fallback to native confirm
                resolve(confirm(`${title}\n\n${message}`));
            }
        });
    }

    destroy() {
        // Clean up event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('click', this.closeDropdownOnOutsideClick);
        
        super.destroy();
    }
}

// Register component globally with enhanced registration system
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    
    // Use enhanced registration if available, fallback to direct assignment
    if (window.MivtonComponents.register) {
        window.MivtonComponents.register('ProfileModal', MivtonProfileModal);
    } else {
        window.MivtonComponents.ProfileModal = MivtonProfileModal;
        console.log('✅ ProfileModal registered (fallback mode)');
    }
}

// Auto-initialize profile modals
document.addEventListener('DOMContentLoaded', () => {
    const profileModalElements = document.querySelectorAll('[data-component="profile-modal"]');
    profileModalElements.forEach(element => {
        if (!element.mivtonComponent) {
            element.mivtonComponent = new MivtonProfileModal(element);
        }
    });
});
