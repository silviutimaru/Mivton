// 🚨 CRITICAL: Fixed Dashboard.js with syntax error resolved - PART 2
// This continues the fix for the "Unexpected token '{'" error at line 1356

    // Continue with remaining methods... (fixing any missing methods)
    attachRequestButtonListeners() {
        console.log('🔗 Attaching request button listeners...');
        
        // Find all action buttons with data-action attributes
        const actionButtons = document.querySelectorAll('.action-btn[data-action]');
        console.log('🔍 Found', actionButtons.length, 'action buttons');
        
        actionButtons.forEach((button, index) => {
            const action = button.dataset.action;
            const requestId = button.dataset.requestId;
            
            console.log(`🔗 Button ${index}: action=${action}, requestId=${requestId}`);
            
            // Remove existing listeners to prevent duplicates
            button.onclick = null;
            
            // Add click handler
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🚀 Button clicked: action=${action}, requestId=${requestId}`);
                
                switch (action) {
                    case 'accept':
                        this.acceptFriendRequest(requestId);
                        break;
                    case 'decline':
                        this.declineFriendRequest(requestId);
                        break;
                    case 'cancel':
                        this.cancelFriendRequest(requestId);
                        break;
                    default:
                        console.warn('Unknown action:', action);
                }
            });
        });
        
        console.log('✅ Button listeners attached successfully');
    }
    
    async acceptFriendRequest(requestId) {
        try {
            console.log('🚀 Accept friend request triggered for:', requestId);
            
            // Find the request card to get user info for confirmation
            const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
            let senderName = 'this user';
            
            if (requestCard) {
                const nameElement = requestCard.querySelector('.user-name');
                if (nameElement) {
                    senderName = nameElement.textContent.replace('✓', '').trim();
                }
            }
            
            // 🚨 IMPORTANT: Show confirmation dialog
            const confirmed = await this.showConfirmDialog(
                `Are you sure you want to accept the friend request from ${senderName}?`,
                'Accept Friend Request',
                {
                    confirmText: '✅ Yes, Accept',
                    cancelText: '❌ Cancel',
                    type: 'success'
                }
            );
            
            if (!confirmed) {
                console.log('🙅 User cancelled friend request acceptance');
                return;
            }
            
            console.log('✅ User confirmed, accepting friend request:', requestId);
            
            const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                if (window.toast) {
                    window.toast.success(data.message || `Friend request from ${senderName} accepted!`);
                }
                
                // Remove the request card from UI
                const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
                if (requestCard) {
                    // Add a nice animation before removing
                    requestCard.style.transition = 'all 0.3s ease';
                    requestCard.style.opacity = '0';
                    requestCard.style.transform = 'scale(0.9)';
                    
                    setTimeout(() => {
                        requestCard.remove();
                    }, 300);
                }
                
                // Update stats
                this.stats.requests--;
                this.stats.friends++;
                this.updateBadgeCounts();
                this.updateStatsDisplay();
                
                // Reload requests to refresh counts
                setTimeout(() => {
                    this.loadFriendRequests();
                }, 500);
                
            } else {
                throw new Error(data.error || 'Failed to accept friend request');
            }
            
        } catch (error) {
            console.error('❌ Error accepting friend request:', error);
            if (window.toast) {
                window.toast.error('Failed to accept friend request: ' + error.message);
            }
        }
    }
    
    async declineFriendRequest(requestId) {
        try {
            console.log('❌ Declining friend request:', requestId);
            
            const response = await fetch(`/api/friend-requests/${requestId}/decline`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                if (window.toast) {
                    window.toast.success('Friend request declined');
                }
                
                // Remove the request card from UI
                const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
                if (requestCard) {
                    requestCard.remove();
                }
                
                // Update stats
                this.stats.requests--;
                this.updateBadgeCounts();
                
                // Reload requests to refresh counts
                await this.loadFriendRequests();
                
            } else {
                throw new Error(data.error || 'Failed to decline friend request');
            }
            
        } catch (error) {
            console.error('❌ Error declining friend request:', error);
            if (window.toast) {
                window.toast.error('Failed to decline friend request');
            }
        }
    }
    
    async cancelFriendRequest(requestId) {
        try {
            console.log('🗑️ Cancelling friend request:', requestId);
            
            const response = await fetch(`/api/friend-requests/${requestId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                if (window.toast) {
                    window.toast.success('Friend request cancelled');
                }
                
                // Remove the request card from UI
                const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
                if (requestCard) {
                    requestCard.remove();
                }
                
                // Reload requests to refresh counts
                await this.loadFriendRequests();
                
            } else {
                throw new Error(data.error || 'Failed to cancel friend request');
            }
            
        } catch (error) {
            console.error('❌ Error cancelling friend request:', error);
            if (window.toast) {
                window.toast.error('Failed to cancel friend request');
            }
        }
    }

    initializeFindSection() {
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Start searching</h3>
                    <p>Use the search box above to find friends by username or email.</p>
                </div>
            `;
        }
    }

    async performUserSearch(query) {
        const searchResults = document.getElementById('searchResults');
        const searchResultsCount = document.getElementById('searchResultsCount');
        
        if (!searchResults) return;

        console.log('🔍 Performing user search for:', query);

        // Show loading state
        searchResults.innerHTML = `
            <div class="text-center" style="padding: 40px;">
                <div class="spinner"></div>
                <p style="margin-top: 16px; color: var(--text-muted);">Searching...</p>
            </div>
        `;

        try {
            // Get language filter
            const languageFilter = document.getElementById('languageFilter');
            const language = languageFilter ? languageFilter.value : '';

            // Build search parameters
            const params = new URLSearchParams({
                q: query,
                limit: 20
            });
            
            if (language) {
                params.append('language', language);
            }

            console.log('🌐 Making API request to:', `/api/users/search?${params}`);

            // Make actual API call
            const response = await fetch(`/api/users/search?${params}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', response.status, errorText);
                throw new Error(`Search failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Search results received:', data);

            if (data.success && data.users) {
                // 🚨 IMPORTANT: Load friendship statuses for all users
                await this.loadFriendshipStatuses(data.users);
                
                this.displaySearchResults(data.users, query);
                
                // Update search results count
                if (searchResultsCount) {
                    const count = data.users.length;
                    searchResultsCount.textContent = `${count} user${count !== 1 ? 's' : ''} found`;
                }
            } else {
                console.log('⚠️ No users found or API returned error:', data);
                this.displayNoResults(query);
                
                if (searchResultsCount) {
                    searchResultsCount.textContent = '0 users found';
                }
            }

        } catch (error) {
            console.error('❌ Search error:', error);
            searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Search failed</h3>
                    <p>Unable to search at this time. Please try again.</p>
                    <button class="empty-action-btn" onclick="dashboard.performUserSearch('${query}')">Try Again</button>
                </div>
            `;
            
            if (searchResultsCount) {
                searchResultsCount.textContent = 'Search failed';
            }
        }
    }

    async loadFriendshipStatuses(users) {
        try {
            console.log('🔎 Loading friendship statuses for', users.length, 'users');
            
            // Get user IDs
            const userIds = users.map(user => user.id).filter(id => id !== this.currentUser?.id);
            
            if (userIds.length === 0) {
                console.log('🔎 No other users to check friendship status for');
                return;
            }
            
            // Check friendship statuses in batch
            const response = await fetch('/api/friends/status/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_ids: userIds
                })
            });
            
            if (response.ok) {
                const statusData = await response.json();
                console.log('✅ Retrieved friendship statuses:', statusData);
                
                // Update each user with their relationship status
                users.forEach(user => {
                    const status = statusData.statuses?.[user.id];
                    if (status) {
                        user.relationshipStatus = status.status; // 'friends', 'pending_sent', 'pending_received', 'none'
                        user.friendRequestId = status.request_id;
                    } else {
                        user.relationshipStatus = 'none';
                    }
                });
                
                console.log('✅ Updated users with relationship statuses');
            } else {
                console.warn('⚠️ Failed to load friendship statuses, using fallback API');
                // Fallback: load statuses individually (less efficient but works)
                await this.loadFriendshipStatusesIndividually(users);
            }
            
        } catch (error) {
            console.error('❌ Error loading friendship statuses:', error);
            // Set all to 'none' as fallback
            users.forEach(user => {
                if (user.id !== this.currentUser?.id) {
                    user.relationshipStatus = 'none';
                }
            });
        }
    }
    
    displaySearchResults(users, query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        if (users.length === 0) {
            this.displayNoResults(query);
            return;
        }
        
        // 🚨 IMPORTANT: Additional safety - log users for debugging
        console.log('🔍 Search results - Current user check:', {
            currentUserId: this.currentUser?.id,
            currentUsername: this.currentUser?.username,
            resultCount: users.length,
            userIds: users.map(u => ({ id: u.id, username: u.username, status: u.relationshipStatus }))
        });

        const resultsHTML = users.map(user => this.createUserCard(user)).join('');
        
        searchResults.innerHTML = `
            <div class="search-results-grid">
                ${resultsHTML}
            </div>
        `;
    }

    displayNoResults(query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        searchResults.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No users found</h3>
                <p>No users found matching "${query}". Try a different search term.</p>
            </div>
        `;
    }

    createUserCard(user) {
        const languageFlags = {
            'en': '🇺🇸', 'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
            'pt': '🇵🇹', 'ru': '🇷🇺', 'ja': '🇯🇵', 'ko': '🇰🇷', 'zh': '🇨🇳',
            // Add missing languages
            'hu': '🇭🇺', 'pl': '🇵🇱', 'ro': '🇷🇴', 'nl': '🇳🇱', 'sv': '🇸🇪',
            'da': '🇩🇰', 'no': '🇳🇴', 'fi': '🇫🇮', 'cs': '🇨🇿', 'sk': '🇸🇰',
            'hr': '🇭🇷', 'sr': '🇷🇸', 'bg': '🇧🇬', 'uk': '🇺🇦', 'el': '🇬🇷',
            'tr': '🇹🇷', 'ar': '🇸🇦', 'he': '🇮🇱', 'hi': '🇮🇳', 'th': '🇹🇭',
            'vi': '🇻🇳', 'id': '🇮🇩', 'ms': '🇲🇾', 'tl': '🇵🇭'
        };
        
        const languageNames = {
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
            'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese',
            // Add missing languages
            'hu': 'Hungarian', 'pl': 'Polish', 'ro': 'Romanian', 'nl': 'Dutch', 'sv': 'Swedish',
            'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'cs': 'Czech', 'sk': 'Slovak',
            'hr': 'Croatian', 'sr': 'Serbian', 'bg': 'Bulgarian', 'uk': 'Ukrainian', 'el': 'Greek',
            'tr': 'Turkish', 'ar': 'Arabic', 'he': 'Hebrew', 'hi': 'Hindi', 'th': 'Thai',
            'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Filipino'
        };

        const flag = languageFlags[user.native_language] || '🌐';
        const langName = languageNames[user.native_language] || user.native_language || 'Unknown';
        const initials = this.getUserInitials(user.full_name || user.username);
        const memberSince = new Date(user.created_at).getFullYear();
        
        // 🚨 IMPORTANT: Check if this is the current user
        // Handle both integer and string comparison for robustness
        const currentUserId = this.currentUser?.id;
        const isCurrentUser = currentUserId && (user.id === currentUserId || parseInt(user.id) === parseInt(currentUserId));
        
        // Get relationship status
        const relationshipStatus = user.relationshipStatus || 'none';
        
        console.log('🔍 Creating user card - Relationship check:', {
            userId: user.id,
            currentUserId: this.currentUser?.id,
            isCurrentUser: isCurrentUser,
            username: user.username,
            relationshipStatus: relationshipStatus
        });
        
        // Generate action buttons based on relationship status
        let actionButtons;
        
        if (isCurrentUser) {
            actionButtons = `
                <div class="user-actions">
                    <button class="user-action-btn disabled" disabled>
                        <span>👤</span>
                        That's You!
                    </button>
                    <button class="user-action-btn secondary" onclick="dashboard.viewUserProfile(${user.id})">
                        <span>👁️</span>
                        View
                    </button>
                </div>
            `;
        } else {
            switch (relationshipStatus) {
                case 'friends':
                    actionButtons = `
                        <div class="user-actions">
                            <button class="user-action-btn success" disabled>
                                <span>✅</span>
                                Friends
                            </button>
                            <button class="user-action-btn secondary" onclick="dashboard.viewUserProfile(${user.id})">
                                <span>👁️</span>
                                View
                            </button>
                        </div>
                    `;
                    break;
                case 'pending_sent':
                    actionButtons = `
                        <div class="user-actions">
                            <button class="user-action-btn warning" disabled>
                                <span>📬</span>
                                Request Sent
                            </button>
                            <button class="user-action-btn secondary" onclick="dashboard.viewUserProfile(${user.id})">
                                <span>👁️</span>
                                View
                            </button>
                        </div>
                    `;
                    break;
                case 'pending_received':
                    actionButtons = `
                        <div class="user-actions">
                            <button class="user-action-btn info" onclick="dashboard.showSection('requests')">
                                <span>📨</span>
                                Respond to Request
                            </button>
                            <button class="user-action-btn secondary" onclick="dashboard.viewUserProfile(${user.id})">
                                <span>👁️</span>
                                View
                            </button>
                        </div>
                    `;
                    break;
                case 'none':
                default:
                    actionButtons = `
                        <div class="user-actions">
                            <button class="user-action-btn primary" onclick="dashboard.sendFriendRequest(${user.id}, '${user.username}')">
                                <span>👋</span>
                                Add Friend
                            </button>
                            <button class="user-action-btn secondary" onclick="dashboard.viewUserProfile(${user.id})">
                                <span>👁️</span>
                                View
                            </button>
                        </div>
                    `;
                    break;
            }
        }

        return `
            <div class="user-card ${isCurrentUser ? 'current-user' : ''}" data-user-id="${user.id}">
                <div class="user-card-header">
                    <div class="user-avatar">
                        ${initials}
                        <div class="status-indicator ${user.status || 'offline'}"></div>
                        ${isCurrentUser ? '<div class="current-user-badge">YOU</div>' : ''}
                    </div>
                    <div class="user-info">
                        <div class="user-name">
                            ${user.full_name || user.username}
                            ${user.is_verified ? '<span class="verified-badge">✓</span>' : ''}
                            ${user.is_admin ? '<span class="admin-badge">Admin</span>' : ''}
                            ${isCurrentUser ? '<span class="you-badge">👤 You</span>' : ''}
                        </div>
                        <div class="user-username">@${user.username}</div>
                        <div class="user-status">
                            <span class="status-dot ${user.status || 'offline'}"></span>
                            <span class="status-text">${this.capitalizeFirst(user.status || 'offline')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-details">
                    <div class="user-detail">
                        <span class="detail-icon">🌐</span>
                        <span class="detail-text">${flag} ${langName}</span>
                    </div>
                    <div class="user-detail">
                        <span class="detail-icon">📅</span>
                        <span class="detail-text">Joined ${memberSince}</span>
                    </div>
                </div>
                
                ${actionButtons}
            </div>
        `;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    clearSearchResults() {
        const searchResults = document.getElementById('searchResults');
        const searchResultsCount = document.getElementById('searchResultsCount');
        
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Start searching</h3>
                    <p>Use the search box above to find friends by username or email.</p>
                </div>
            `;
        }
        
        if (searchResultsCount) {
            searchResultsCount.textContent = '0 users found';
        }
    }

    async loadBlockedUsers() {
        const blockedList = document.getElementById('blockedList');
        const blockedEmptyState = document.getElementById('blockedEmptyState');
        
        if (this.stats.blocked === 0) {
            if (blockedEmptyState) blockedEmptyState.style.display = 'block';
            if (blockedList) blockedList.style.display = 'none';
        } else {
            if (blockedEmptyState) blockedEmptyState.style.display = 'none';
            if (blockedList) blockedList.style.display = 'block';
            // TODO: Populate blocked users list
        }
    }

    initializeProfileSection() {
        // Profile section is already populated in updateProfileForm
        // Add any additional initialization here
    }

    setupEventListeners() {
        // Logout button - multiple approaches for reliability
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log('🔧 Setting up logout button listeners...');
            
            // Remove any existing listeners
            logoutBtn.onclick = null;
            
            // Add event listener
            const logoutHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 Logout button clicked!');
                this.handleLogout();
            };
            
            logoutBtn.addEventListener('click', logoutHandler);
            logoutBtn.onclick = logoutHandler;
            
            console.log('✅ Logout button listeners attached');
        } else {
            console.error('❌ Logout button not found!');
        }

        // Save profile button
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.handleSaveProfile());
        }

        // Notifications button
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => this.handleNotifications());
        }

        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('userSearchInput');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput && searchInput.value.trim()) {
                    this.performUserSearch(searchInput.value.trim());
                }
            });
        }
        
        if (searchInput) {
            // Search on Enter key
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && searchInput.value.trim()) {
                    this.performUserSearch(searchInput.value.trim());
                }
            });
            
            // Real-time search with debounce
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performUserSearch(query);
                    }, 300);
                } else if (query.length === 0) {
                    this.clearSearchResults();
                }
            });
        }
        
        // Language filter
        const languageFilter = document.getElementById('languageFilter');
        if (languageFilter) {
            languageFilter.addEventListener('change', () => {
                if (searchInput && searchInput.value.trim()) {
                    this.performUserSearch(searchInput.value.trim());
                }
            });
        }
    }

    async handleLogout() {
        let confirmed = true;
        
        if (window.showConfirmDialog) {
            try {
                confirmed = await window.showConfirmDialog(
                    'Are you sure you want to logout?',
                    'Confirm Logout'
                );
            } catch (error) {
                console.error('Confirm dialog error:', error);
                // If dialog fails, just proceed without confirmation
            }
        }

        if (!confirmed) return;

        try {
            if (window.loading) {
                window.loading.show('Logging out...');
            }

            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                window.location.href = '/';
            } else {
                throw new Error('Logout failed');
            }

        } catch (error) {
            console.error('Logout error:', error);
            if (window.toast) {
                window.toast.error('Logout failed. Please try again.');
            }
        } finally {
            if (window.loading) {
                window.loading.hide();
            }
        }
    }

    async handleSaveProfile() {
        console.log('💾 === SAVE PROFILE DEBUG START ===');
        
        try {
            // Debug: Check if elements exist
            const fullNameInput = document.getElementById('fullNameInput');
            const languageSelect = document.getElementById('nativeLanguageSelect');
            const genderSelect = document.getElementById('genderSelect');
            
            // Privacy settings elements
            const profileVisibilitySelect = document.getElementById('profileVisibility');
            const showLanguageCheckbox = document.getElementById('showLanguage');
            const showOnlineStatusCheckbox = document.getElementById('showOnlineStatus');
            
            console.log('🔍 Form elements found:');
            console.log('- Full Name Input:', fullNameInput, fullNameInput?.value);
            console.log('- Language Select:', languageSelect, languageSelect?.value);
            console.log('- Gender Select:', genderSelect, genderSelect?.value);
            console.log('- Profile Visibility:', profileVisibilitySelect, profileVisibilitySelect?.value);
            console.log('- Show Language:', showLanguageCheckbox, showLanguageCheckbox?.checked);
            console.log('- Show Online Status:', showOnlineStatusCheckbox, showOnlineStatusCheckbox?.checked);
            
            if (!fullNameInput || !languageSelect) {
                throw new Error('Required form elements not found!');
            }
            
            if (window.loading) {
                window.loading.show('Saving profile...');
            }

            // Save profile data first
            const profileData = {
                full_name: fullNameInput.value || '',
                native_language: languageSelect.value || 'en'
                // Note: Removed gender - now read-only for legal compliance
            };
            
            console.log('📤 Sending profile data:', profileData);
            console.log('🌐 Making API request to: /api/dashboard/profile');

            const profileResponse = await fetch('/api/dashboard/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });
            
            console.log('📡 Profile API Response:', {
                status: profileResponse.status,
                statusText: profileResponse.statusText,
                ok: profileResponse.ok
            });

            if (!profileResponse.ok) {
                const errorData = await profileResponse.text();
                console.error('❌ Profile API Error Response:', errorData);
                throw new Error(`Profile API Error: ${profileResponse.status} - ${errorData}`);
            }

            const profileResponseData = await profileResponse.json();
            console.log('✅ Profile API Response Data:', profileResponseData);
            
            // Save privacy settings if elements exist
            if (profileVisibilitySelect && showLanguageCheckbox && showOnlineStatusCheckbox) {
                const settingsData = {
                    profile_visibility: profileVisibilitySelect.value,
                    show_language: showLanguageCheckbox.checked,
                    show_online_status: showOnlineStatusCheckbox.checked
                };
                
                console.log('🔒 Sending privacy settings:', settingsData);
                console.log('🌐 Making API request to: /api/dashboard/settings');

                const settingsResponse = await fetch('/api/dashboard/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify(settingsData)
                });
                
                console.log('📡 Settings API Response:', {
                    status: settingsResponse.status,
                    statusText: settingsResponse.statusText,
                    ok: settingsResponse.ok
                });

                if (!settingsResponse.ok) {
                    const errorData = await settingsResponse.text();
                    console.error('❌ Settings API Error Response:', errorData);
                    // Don't throw here - profile was saved successfully
                    console.warn('⚠️ Privacy settings failed to save, but profile was updated');
                } else {
                    const settingsResponseData = await settingsResponse.json();
                    console.log('✅ Settings API Response Data:', settingsResponseData);
                }
            }
            
            // Update current user with the response
            if (profileResponseData.user) {
                this.currentUser = { ...this.currentUser, ...profileResponseData.user };
                console.log('👤 Updated current user:', this.currentUser);
            } else {
                this.currentUser = { ...this.currentUser, ...profileData };
                console.log('👤 Updated current user with form data:', this.currentUser);
            }
            
            // Update UI display
            this.updateUserDisplay();
            this.updateLanguageDisplay();
            
            if (window.toast) {
                window.toast.success('✅ Profile and privacy settings updated successfully!');
            }
            
            console.log('✅ Profile save completed successfully');
            
        } catch (error) {
            console.error('❌ Save profile error:', error);
            console.error('❌ Error stack:', error.stack);
            
            if (window.toast) {
                window.toast.error('Failed to save profile: ' + error.message);
            } else {
                alert('Failed to save profile: ' + error.message);
            }
        } finally {
            if (window.loading) {
                window.loading.hide();
            }
            console.log('💾 === SAVE PROFILE DEBUG END ===');
        }
    }

    async handleNotifications() {
        console.log('🔔 Opening notifications panel...');
        
        // Create notifications panel if it doesn't exist
        let notificationsPanel = document.getElementById('notificationsPanel');
        if (!notificationsPanel) {
            this.createNotificationsPanel();
            notificationsPanel = document.getElementById('notificationsPanel');
        }
        
        // Toggle panel visibility
        const isVisible = notificationsPanel.classList.contains('visible');
        if (isVisible) {
            this.hideNotificationsPanel();
        } else {
            this.showNotificationsPanel();
            await this.loadNotifications();
        }
    }
    
    createNotificationsPanel() {
        const panel = document.createElement('div');
        panel.id = 'notificationsPanel';
        panel.className = 'notifications-panel';
        panel.innerHTML = `
            <div class="notifications-header">
                <h3>🔔 Notifications</h3>
                <button class="close-btn" onclick="dashboard.hideNotificationsPanel()">×</button>
            </div>
            <div class="notifications-content" id="notificationsContent">
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading notifications...</p>
                </div>
            </div>
            <div class="notifications-footer">
                <button class="mark-all-read-btn" onclick="dashboard.markAllNotificationsRead()">
                    Mark All Read
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Close panel when clicking outside - with better event handling
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const notificationsBtn = document.getElementById('notificationsBtn');
                if (panel && !panel.contains(e.target) && notificationsBtn && !notificationsBtn.contains(e.target)) {
                    this.hideNotificationsPanel();
                }
            });
        }, 100);
    }
    
    showNotificationsPanel() {
        const panel = document.getElementById('notificationsPanel');
        console.log('🔍 Showing notifications panel:', panel);
        if (panel) {
            panel.classList.add('visible');
            console.log('🔍 Panel classes after showing:', panel.className);
            console.log('🔍 Panel visibility:', window.getComputedStyle(panel).visibility);
            console.log('🔍 Panel opacity:', window.getComputedStyle(panel).opacity);
        } else {
            console.error('❌ Notifications panel not found!');
        }
    }
    
    hideNotificationsPanel() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.remove('visible');
        }
    }
    
    async loadNotifications() {
        const content = document.getElementById('notificationsContent');
        if (!content) return;
        
        try {
            // Use the Phase 3.2 notifications API for consistency
            const response = await fetch('/api/notifications?limit=50', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Loaded notifications:', data);
                this.displayNotifications(data.notifications || []);
                
                // Update the notification badge with current unread count
                if (data.stats && data.stats.unread_count !== undefined) {
                    this.stats.unreadNotifications = data.stats.unread_count;
                    this.updateBadgeCounts();
                }
            } else {
                throw new Error('Failed to load notifications');
            }
            
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            content.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>Failed to load notifications</p>
                    <button class="retry-btn" onclick="dashboard.loadNotifications()">Try Again</button>
                </div>
            `;
        }
    }
    
    displayNotifications(notifications) {
        const content = document.getElementById('notificationsContent');
        if (!content) return;
        
        if (notifications.length === 0) {
            content.innerHTML = `
                <div class="empty-notifications">
                    <div class="empty-icon">🔔</div>
                    <h4>All caught up!</h4>
                    <p>No new notifications</p>
                </div>
            `;
            return;
        }
        
        const notificationsHTML = notifications.map(notification => this.createNotificationCard(notification)).join('');
        content.innerHTML = `
            <div class="notifications-list">
                ${notificationsHTML}
            </div>
        `;
    }
    
    createNotificationCard(notification) {
        const timeAgo = this.formatTimeAgo(new Date(notification.created_at));
        const isRead = notification.is_read;
        
        let icon = '🔔';
        let title = notification.message;
        let description = '';
        
        // Customize based on notification type
        switch (notification.type) {
            case 'friend_request':
                icon = '👋';
                title = `New friend request`;
                description = notification.message;
                break;
            case 'friend_accepted':
                icon = '✅';
                title = `Friend request accepted`;
                description = notification.message;
                break;
            case 'friend_declined':
                icon = '❌';
                title = `Friend request declined`;
                description = notification.message;
                break;
            default:
                title = notification.message;
        }
        
        return `
            <div class="notification-card ${isRead ? 'read' : 'unread'}" data-notification-id="${notification.id}">
                <div class="notification-icon">${icon}</div>
                <div class="notification-content">
                    <div class="notification-title">${title}</div>
                    ${description ? `<div class="notification-description">${description}</div>` : ''}
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${!isRead ? '<div class="unread-indicator"></div>' : ''}
            </div>
        `;
    }
    
    async showConfirmDialog(message, title = 'Confirm Action', options = {}) {
        return new Promise((resolve) => {
            console.log('💬 Showing confirmation dialog:', message);
            
            // Create modal element
            const modal = document.createElement('div');
            modal.className = 'confirm-modal-overlay';
            modal.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="confirm-modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="confirm-modal-actions">
                        <button class="confirm-btn cancel" data-result="false">
                            ${options.cancelText || '❌ Cancel'}
                        </button>
                        <button class="confirm-btn confirm ${options.type || 'primary'}" data-result="true">
                            ${options.confirmText || '✅ Confirm'}
                        </button>
                    </div>
                </div>
            `;
            
            // Add styles if not present
            if (!document.getElementById('confirm-modal-styles')) {
                const styles = document.createElement('style');
                styles.id = 'confirm-modal-styles';
                styles.textContent = `
                    .confirm-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        animation: fadeIn 0.2s ease;
                    }
                    
                    .confirm-modal {
                        background: white;
                        border-radius: 12px;
                        min-width: 400px;
                        max-width: 500px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                        animation: slideIn 0.3s ease;
                    }
                    
                    .confirm-modal-header {
                        padding: 20px 20px 0 20px;
                        border-bottom: 1px solid #eee;
                    }
                    
                    .confirm-modal-header h3 {
                        margin: 0 0 15px 0;
                        color: #333;
                        font-size: 1.2em;
                    }
                    
                    .confirm-modal-body {
                        padding: 20px;
                    }
                    
                    .confirm-modal-body p {
                        margin: 0;
                        color: #666;
                        line-height: 1.5;
                    }
                    
                    .confirm-modal-actions {
                        padding: 0 20px 20px 20px;
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }
                    
                    .confirm-btn {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                        min-width: 100px;
                    }
                    
                    .confirm-btn.cancel {
                        background: #6c757d;
                        color: white;
                    }
                    
                    .confirm-btn.cancel:hover {
                        background: #545b62;
                    }
                    
                    .confirm-btn.confirm.primary {
                        background: #007bff;
                        color: white;
                    }
                    
                    .confirm-btn.confirm.primary:hover {
                        background: #0056b3;
                    }
                    
                    .confirm-btn.confirm.success {
                        background: #28a745;
                        color: white;
                    }
                    
                    .confirm-btn.confirm.success:hover {
                        background: #1e7e34;
                    }
                    
                    .confirm-btn.confirm.danger {
                        background: #dc3545;
                        color: white;
                    }
                    
                    .confirm-btn.confirm.danger:hover {
                        background: #c82333;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    @keyframes slideIn {
                        from { transform: scale(0.9) translateY(-20px); opacity: 0; }
                        to { transform: scale(1) translateY(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            // Add click handlers
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    // Clicked outside - cancel
                    modal.remove();
                    resolve(false);
                }
                
                if (e.target.classList.contains('confirm-btn')) {
                    const result = e.target.dataset.result === 'true';
                    console.log('💬 User selected:', result ? 'Confirm' : 'Cancel');
                    modal.remove();
                    resolve(result);
                }
            });
            
            // Add keyboard handler
            const keyHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', keyHandler);
                    resolve(false);
                } else if (e.key === 'Enter') {
                    modal.remove();
                    document.removeEventListener('keydown', keyHandler);
                    resolve(true);
                }
            };
            document.addEventListener('keydown', keyHandler);
            
            // Add to DOM
            document.body.appendChild(modal);
            
            // Focus the confirm button
            setTimeout(() => {
                const confirmBtn = modal.querySelector('.confirm-btn.confirm');
                if (confirmBtn) {
                    confirmBtn.focus();
                }
            }, 100);
        });
    }
    
    async markAllNotificationsRead() {
        try {
            console.log('📚 Marking all notifications as read...');
            
            // Use the Phase 3.2 notifications API for consistency
            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Mark all read response:', data);
                
                // Update UI
                document.querySelectorAll('.notification-card.unread').forEach(card => {
                    card.classList.remove('unread');
                    card.classList.add('read');
                    const indicator = card.querySelector('.unread-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                });
                
                // Reset unread notification count to 0
                this.stats.unreadNotifications = 0;
                this.updateBadgeCounts();
                
                console.log('✅ Updated notification badge count to 0');
                
                if (window.toast) {
                    window.toast.success(`All notifications marked as read (${data.count || 0} notifications)`);
                }
            } else {
                throw new Error('Failed to mark notifications as read');
            }
            
        } catch (error) {
            console.error('❌ Error marking notifications as read:', error);
            if (window.toast) {
                window.toast.error('Failed to mark notifications as read');
            }
        }
    }
    
    async sendFriendRequest(userId, username) {
        try {
            console.log('📤 Sending friend request to user:', userId, username);
            
            // 🚨 IMPORTANT: Prevent sending friend request to yourself
            // Handle both integer and string comparison for robustness
            const currentUserId = this.currentUser?.id;
            if (currentUserId && (userId === currentUserId || parseInt(userId) === parseInt(currentUserId))) {
                console.error('❌ Cannot send friend request to yourself!', {
                    currentUserId: currentUserId,
                    targetUserId: userId,
                    currentUserType: typeof currentUserId,
                    targetUserType: typeof userId
                });
                if (window.toast) {
                    window.toast.error('❌ You cannot send a friend request to yourself!');
                }
                return;
            }
            
            const response = await fetch('/api/friend-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    receiver_id: userId,
                    message: `Hi ${username}, let's be friends on Mivton!`
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                if (window.toast) {
                    window.toast.success(`Friend request sent to ${username}!`);
                }
                
                // Update the button in the UI
                const userCard = document.querySelector(`[data-user-id="${userId}"]`);
                const addBtn = userCard?.querySelector('.user-action-btn.primary');
                if (addBtn) {
                    addBtn.innerHTML = '<span>✅</span> Request Sent';
                    addBtn.disabled = true;
                    addBtn.classList.remove('primary');
                    addBtn.classList.add('success');
                }
                
                // Update stats
                this.stats.requests++;
                this.updateBadgeCounts();
                
            } else {
                throw new Error(data.error || 'Failed to send friend request');
            }
            
        } catch (error) {
            console.error('❌ Friend request error:', error);
            if (window.toast) {
                if (error.message.includes('Cannot send friend request to yourself')) {
                    window.toast.error('❌ You cannot send a friend request to yourself!');
                } else if (error.message.includes('ALREADY_FRIENDS')) {
                    window.toast.info('You are already friends with this user');
                } else if (error.message.includes('REQUEST_EXISTS')) {
                    window.toast.info('Friend request already sent');
                } else {
                    window.toast.error('Failed to send friend request: ' + error.message);
                }
            }
        }
    }
    
    viewUserProfile(userId) {
        console.log('👁️ Viewing profile for user:', userId);
        if (window.toast) {
            window.toast.info('User profiles coming soon!');
        }
    }
    
    // Friend-specific functions
    viewFriendProfile(friendId) {
        console.log('👥 Viewing friend profile for:', friendId);
        
        // Create a modal or panel to show friend details
        this.showFriendProfileModal(friendId);
    }
    
    async showFriendProfileModal(friendId) {
        try {
            // For now, show a simple modal with friend info
            const friendCard = document.querySelector(`[data-friend-id="${friendId}"]`);
            let friendName = 'Friend';
            let friendUsername = '';
            
            if (friendCard) {
                const nameElement = friendCard.querySelector('.friend-name');
                const usernameElement = friendCard.querySelector('.friend-username');
                
                if (nameElement) {
                    friendName = nameElement.textContent.replace('✓', '').trim();
                }
                if (usernameElement) {
                    friendUsername = usernameElement.textContent;
                }
            }
            
            if (window.toast) {
                window.toast.info(`Friend profile for ${friendName} coming soon!`);
            }
            
        } catch (error) {
            console.error('Error showing friend profile modal:', error);
            if (window.toast) {
                window.toast.error('Unable to show friend profile');
            }
        }
    }
    
    startChat(friendId) {
        console.log('💬 Starting chat with friend:', friendId);
        if (window.toast) {
            window.toast.info('Chat functionality coming soon!');
        }
    }
    
    async removeFriend(friendId, friendName) {
        console.log('🗑️ Removing friend:', friendId, friendName);
        if (window.toast) {
            window.toast.info('Remove friend functionality coming soon!');
        }
    }
}

// Create global dashboard instance
let dashboard;

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Dashboard...');
    try {
        dashboard = new Dashboard();
        window.dashboard = dashboard; // Make it globally accessible
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Dashboard:', error);
    }
});

console.log('✅ Fixed Dashboard.js loaded - syntax error resolved');
