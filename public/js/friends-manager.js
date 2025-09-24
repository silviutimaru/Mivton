/**
 * 🚀 MIVTON PHASE 3.1 - FRIENDS MANAGER (FIXED VERSION)
 * Enterprise-grade friends list management with real-time updates
 * 
 * Features:
 * - Friends list with online status
 * - Search and filter friends
 * - Friend actions (chat, remove, block)
 * - WORKING Profile modal integration
 * - Mobile-responsive design
 * - Real-time status updates
 * - Integration with Phase 2.3 components
 */

class MivtonFriendsManager extends MivtonBaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        this.options = {
            searchDebounceTime: 300,
            refreshInterval: 120000, // 2 minutes - less aggressive refresh
            pageSize: 20,
            showOnlineOnly: false,
            ...options
        };

        this.state = {
            friends: [],
            loading: false,
            error: null,
            searchQuery: '',
            currentPage: 1,
            totalPages: 1,
            stats: {
                total_friends: 0,
                online_friends: 0,
                away_friends: 0,
                offline_friends: 0
            },
            filters: {
                status: 'all', // all, online, away, offline
                language: 'all'
            }
        };

        this.searchTimeout = null;
        this.refreshTimer = null;
        this.selectedFriendId = null;

        this.initialize();
        
        // Register with enhanced socket client for real-time updates
        if (window.enhancedSocketClient) {
            window.enhancedSocketClient.registerFriendsManager(this);
        } else {
            // Wait for socket client to be ready
            document.addEventListener('socketClientReady', () => {
                if (window.enhancedSocketClient) {
                    window.enhancedSocketClient.registerFriendsManager(this);
                }
            });
        }
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Friends Manager...');
            
            this.createFriendsInterface();
            this.bindEvents();
            await this.loadFriends();
            this.startAutoRefresh();

            console.log('✅ Friends Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Friends Manager:', error);
            this.showError('Failed to initialize friends system');
        }
    }

    createFriendsInterface() {
        this.element.innerHTML = `
            <div class="friends-manager" data-component="friends-manager">
                <!-- Friends Header -->
                <div class="friends-header">
                    <div class="friends-title">
                        <h2>
                            <i class="fas fa-users"></i>
                            My Friends
                            <span class="friends-count" data-friends-count="0">0</span>
                        </h2>
                        <div class="friends-stats">
                            <span class="stat online" data-online-count="0">
                                <i class="fas fa-circle"></i> 0 online
                            </span>
                        </div>
                    </div>
                    
                    <div class="friends-actions">
                        <button class="btn btn-primary" data-action="add-friend">
                            <i class="fas fa-user-plus"></i>
                            Add Friend
                        </button>
                        <button class="btn btn-secondary" data-action="view-requests">
                            <i class="fas fa-inbox"></i>
                            Requests
                            <span class="notification-badge" data-requests-count="0" style="display: none;"></span>
                        </button>
                    </div>
                </div>

                <!-- Search & Filters -->
                <div class="friends-controls">
                    <div class="search-container">
                        <i class="fas fa-search search-icon"></i>
                        <input 
                            type="text" 
                            class="search-input" 
                            placeholder="Search friends..."
                            data-search-input
                        >
                        <button class="clear-search" data-clear-search style="display: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="friends-filters">
                        <select class="filter-select" data-filter="status">
                            <option value="all">All Friends</option>
                            <option value="online">Online</option>
                            <option value="away">Away</option>  
                            <option value="offline">Offline</option>
                        </select>
                        
                        <select class="filter-select" data-filter="language">
                            <option value="all">All Languages</option>
                        </select>
                        
                        <button class="btn btn-text" data-action="refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>

                <!-- Friends List -->
                <div class="friends-content">
                    <div class="friends-loading" data-loading style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Loading friends...</p>
                    </div>

                    <div class="friends-error" data-error style="display: none;">
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p data-error-message>Something went wrong</p>
                            <button class="btn btn-primary" data-action="retry">Try Again</button>
                        </div>
                    </div>

                    <div class="friends-empty" data-empty style="display: none;">
                        <div class="empty-state">
                            <i class="fas fa-user-friends"></i>
                            <h3>No Friends Yet</h3>
                            <p>Start building your network by adding friends!</p>
                            <button class="btn btn-primary" data-action="add-friend">
                                <i class="fas fa-user-plus"></i>
                                Add Your First Friend
                            </button>
                        </div>
                    </div>

                    <div class="friends-list" data-friends-list>
                        <!-- Friends will be rendered here -->
                    </div>

                    <!-- Pagination -->
                    <div class="friends-pagination" data-pagination style="display: none;">
                        <button class="btn btn-secondary" data-action="prev-page" disabled>
                            <i class="fas fa-chevron-left"></i>
                            Previous
                        </button>
                        
                        <span class="pagination-info">
                            Page <span data-current-page>1</span> of <span data-total-pages>1</span>
                        </span>
                        
                        <button class="btn btn-secondary" data-action="next-page" disabled>
                            Next
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <!-- Friend Actions Modal -->
                <div class="modal" data-friend-actions-modal style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 data-modal-title>Friend Actions</h3>
                            <button class="modal-close" data-close-modal>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="friend-profile">
                                <div class="friend-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="friend-info">
                                    <h4 data-friend-name>Friend Name</h4>
                                    <p data-friend-username>@username</p>
                                    <span class="status-indicator" data-friend-status></span>
                                </div>
                            </div>
                            
                            <div class="friend-actions-list">
                                <button class="action-btn chat" data-action="chat" data-friend-id="${this.selectedFriendId}" onclick="startDirectChatFromModal(this)">
                                    <i class="fas fa-comments"></i>
                                    Start Chat
                                </button>
                                
                                <button class="action-btn profile" data-action="view-profile">
                                    <i class="fas fa-user"></i>
                                    View Profile
                                </button>
                                
                                <button class="action-btn remove" data-action="remove-friend">
                                    <i class="fas fa-user-minus"></i>
                                    Remove Friend
                                </button>
                                
                                <button class="action-btn block" data-action="block-user">
                                    <i class="fas fa-ban"></i>
                                    Block User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Apply component styling
        this.element.classList.add('mivton-friends-manager');
    }

    bindEvents() {
        // Search input
        const searchInput = this.element.querySelector('[data-search-input]');
        const clearSearch = this.element.querySelector('[data-clear-search]');

        searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        clearSearch?.addEventListener('click', () => {
            this.clearSearch();
        });

        // Filter selects
        const filterSelects = this.element.querySelectorAll('[data-filter]');
        filterSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleFilter(e.target.dataset.filter, e.target.value);
            });
        });

        // Action buttons
        this.element.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleAction(action, e.target.closest('[data-action]'));
            }
        });

        // Friend card clicks
        this.element.addEventListener('click', (e) => {
            const friendCard = e.target.closest('[data-friend-id]');
            if (friendCard && !e.target.closest('[data-action]')) {
                const friendId = parseInt(friendCard.dataset.friendId);
                this.showFriendActions(friendId);
            }
        });

        // Modal events
        const modal = this.element.querySelector('[data-friend-actions-modal]');
        const closeModal = this.element.querySelector('[data-close-modal]');
        
        closeModal?.addEventListener('click', () => {
            this.hideFriendActions();
        });

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideFriendActions();
            }
        });
    }

    async loadFriends(page = 1, retryCount = 0) {
        try {
            this.setState({ loading: true, error: null });

            const params = new URLSearchParams({
                page: page.toString(),
                limit: this.options.pageSize.toString(),
                search: this.state.searchQuery,
                status: this.state.filters.status,
                language: this.state.filters.language
            });

            const response = await fetch(`/api/friends?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limited - implement exponential backoff
                    if (retryCount < 3) {
                        const backoffTime = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                        console.log(`⏳ Rate limited, retrying in ${backoffTime}ms...`);
                        setTimeout(() => {
                            this.loadFriends(page, retryCount + 1);
                        }, backoffTime);
                        return;
                    }
                    throw new Error('Service temporarily busy. Please try again in a few minutes.');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                console.log('🔍 DEBUG: Friends API response:', data);
                console.log('🔍 DEBUG: Friends array:', data.friends);
                
                this.setState({
                    friends: data.friends || [],
                    stats: data.stats || {},
                    currentPage: data.pagination?.page || 1,
                    totalPages: data.pagination?.pages || 1,
                    loading: false
                });

                this.renderFriends();
                this.updateStats();
                this.updatePagination();
            } else {
                throw new Error(data.error || 'Failed to load friends');
            }

        } catch (error) {
            console.error('❌ Error loading friends:', error);
            this.setState({ 
                loading: false, 
                error: error.message || 'Failed to load friends' 
            });
            this.showError(this.state.error);
        }
    }

    renderFriends() {
        const friendsList = this.element.querySelector('[data-friends-list]');
        const emptyState = this.element.querySelector('[data-empty]');
        const loadingState = this.element.querySelector('[data-loading]');
        const errorState = this.element.querySelector('[data-error]');

        // Hide all states
        [emptyState, loadingState, errorState].forEach(el => {
            if (el) el.style.display = 'none';
        });

        if (this.state.loading) {
            if (loadingState) loadingState.style.display = 'block';
            return;
        }

        if (this.state.error) {
            if (errorState) errorState.style.display = 'block';
            return;
        }

        if (this.state.friends.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Render friends
        if (friendsList) {
            friendsList.innerHTML = this.state.friends.map(friend => 
                this.renderFriendCard(friend)
            ).join('');
        }
    }

    renderFriendCard(friend) {
        const onlineStatusClass = this.getStatusClass(friend.online_status);
        const languageFlag = this.getLanguageFlag(friend.native_language);
        
        // DEBUG: Log friend data to see what's available
        console.log('🔍 Friend data:', friend);
        console.log('🔍 Friend ID options:', {
            id: friend.id,
            user_id: friend.user_id,
            friend_id: friend.friend_id,
            userId: friend.userId,
            friendId: friend.friendId
        });
        
        return `
            <div class="friend-card ${onlineStatusClass}" data-friend-id="${friend.id || friend.user_id || friend.friend_id || 'unknown'}">
                <div class="friend-avatar">
                    <i class="fas fa-user"></i>
                    <div class="status-indicator ${friend.online_status}"></div>
                </div>
                
                <div class="friend-info">
                    <div class="friend-header">
                        <h4 class="friend-name">
                            ${this.escapeHtml(friend.full_name)}
                            ${friend.is_verified ? '<i class="fas fa-check-circle verified"></i>' : ''}
                        </h4>
                        <span class="friend-username">@${this.escapeHtml(friend.username)}</span>
                    </div>
                    
                    <div class="friend-meta">
                        <span class="friend-status ${friend.online_status}">
                            <i class="fas fa-circle"></i>
                            ${friend.online_status}
                        </span>
                        
                        ${languageFlag ? `
                            <span class="friend-language">
                                ${languageFlag} ${friend.native_language}
                            </span>
                        ` : ''}
                        
                        ${friend.mutual_friends_count > 0 ? `
                            <span class="mutual-friends">
                                <i class="fas fa-users"></i>
                                ${friend.mutual_friends_count} mutual
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="friend-actions">
                    <button class="btn btn-sm btn-primary chat-button" data-friend-id="${friend.id || friend.user_id || friend.friend_id || 'unknown'}" onclick="startDirectChat('${friend.id || friend.user_id || friend.friend_id || 'unknown'}', '${friend.full_name.replace(/'/g, "\\'")}')" title="Start Chat">
                        <i class="fas fa-comments"></i>
                        <span>Chat</span>
                    </button>
                    
                    <button class="btn btn-sm btn-secondary" data-action="more" data-friend-id="${friend.id || friend.user_id || friend.friend_id || 'unknown'}" title="More Options">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        const statusClasses = {
            'online': 'friend-online',
            'away': 'friend-away',
            'offline': 'friend-offline'
        };
        return statusClasses[status] || 'friend-offline';
    }

    getLanguageFlag(language) {
        const languageFlags = {
            'English': '🇺🇸',
            'Spanish': '🇪🇸',
            'French': '🇫🇷',
            'German': '🇩🇪',
            'Italian': '🇮🇹',
            'Portuguese': '🇵🇹',
            'Russian': '🇷🇺',
            'Chinese': '🇨🇳',
            'Japanese': '🇯🇵',
            'Korean': '🇰🇷'
        };
        return languageFlags[language] || '🌐';
    }

    updateStats() {
        const friendsCount = this.element.querySelector('[data-friends-count]');
        const onlineCount = this.element.querySelector('[data-online-count]');

        if (friendsCount) {
            friendsCount.textContent = this.state.stats.total_friends || 0;
        }

        if (onlineCount) {
            const online = this.state.stats.online_friends || 0;
            onlineCount.innerHTML = `<i class="fas fa-circle"></i> ${online} online`;
        }
    }

    updatePagination() {
        const pagination = this.element.querySelector('[data-pagination]');
        const prevBtn = this.element.querySelector('[data-action="prev-page"]');
        const nextBtn = this.element.querySelector('[data-action="next-page"]');
        const currentPageSpan = this.element.querySelector('[data-current-page]');
        const totalPagesSpan = this.element.querySelector('[data-total-pages]');

        if (this.state.totalPages <= 1) {
            if (pagination) pagination.style.display = 'none';
            return;
        }

        if (pagination) pagination.style.display = 'flex';

        if (prevBtn) {
            prevBtn.disabled = this.state.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.state.currentPage >= this.state.totalPages;
        }

        if (currentPageSpan) {
            currentPageSpan.textContent = this.state.currentPage;
        }

        if (totalPagesSpan) {
            totalPagesSpan.textContent = this.state.totalPages;
        }
    }

    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        const clearBtn = this.element.querySelector('[data-clear-search]');
        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }

        this.searchTimeout = setTimeout(() => {
            this.setState({ searchQuery: query, currentPage: 1 });
            this.loadFriends(1);
        }, this.options.searchDebounceTime);
    }

    clearSearch() {
        const searchInput = this.element.querySelector('[data-search-input]');
        const clearBtn = this.element.querySelector('[data-clear-search]');
        
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        
        this.setState({ searchQuery: '', currentPage: 1 });
        this.loadFriends(1);
    }

    handleFilter(filterType, value) {
        this.setState({
            filters: {
                ...this.state.filters,
                [filterType]: value
            },
            currentPage: 1
        });
        this.loadFriends(1);
    }

    async handleAction(action, element) {
        const friendId = element?.dataset.friendId ? parseInt(element.dataset.friendId) : null;

        switch (action) {
            case 'add-friend':
                this.showAddFriendDialog();
                break;
            case 'view-requests':
                this.showFriendRequests();
                break;
            case 'refresh':
                await this.loadFriends(this.state.currentPage);
                break;
            case 'retry':
                await this.loadFriends(this.state.currentPage);
                break;
            case 'prev-page':
                if (this.state.currentPage > 1) {
                    await this.loadFriends(this.state.currentPage - 1);
                }
                break;
            case 'next-page':
                if (this.state.currentPage < this.state.totalPages) {
                    await this.loadFriends(this.state.currentPage + 1);
                }
                break;
            case 'chat':
                if (friendId) {
                    this.startChat(friendId);
                }
                break;
            case 'more':
                if (friendId) {
                    this.showFriendActions(friendId);
                }
                break;
            case 'view-profile':
                if (this.selectedFriendId) {
                    this.viewProfile(this.selectedFriendId);
                }
                break;
            case 'remove-friend':
                if (this.selectedFriendId) {
                    await this.removeFriend(this.selectedFriendId);
                }
                break;
            case 'block-user':
                if (this.selectedFriendId) {
                    await this.blockUser(this.selectedFriendId);
                }
                break;
        }
    }

    showFriendActions(friendId) {
        console.log('🔍 DEBUG: showFriendActions called with friendId:', friendId);
        console.log('🔍 DEBUG: Available friends:', this.state.friends);
        
        const friend = this.state.friends.find(f => f.id === friendId || f.user_id === friendId || f.friend_id === friendId);
        if (!friend) {
            console.error('❌ Friend not found with ID:', friendId);
            return;
        }
        
        console.log('🔍 DEBUG: Found friend:', friend);
        this.selectedFriendId = friendId;
        
        const modal = this.element.querySelector('[data-friend-actions-modal]');
        const friendName = modal?.querySelector('[data-friend-name]');
        const friendUsername = modal?.querySelector('[data-friend-username]');
        const friendStatus = modal?.querySelector('[data-friend-status]');

        if (friendName) friendName.textContent = friend.full_name;
        if (friendUsername) friendUsername.textContent = `@${friend.username}`;
        if (friendStatus) {
            friendStatus.className = `status-indicator ${friend.online_status}`;
            friendStatus.textContent = friend.online_status;
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('modal-active');
        }
    }

    hideFriendActions() {
        const modal = this.element.querySelector('[data-friend-actions-modal]');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('modal-active');
        }
        this.selectedFriendId = null;
    }

    async removeFriend(friendId) {
        try {
            const friend = this.state.friends.find(f => f.id === friendId);
            if (!friend) return;

            const confirmed = await this.showConfirmDialog(
                'Remove Friend',
                `Are you sure you want to remove ${friend.full_name} from your friends?`,
                'Remove',
                'destructive'
            );

            if (!confirmed) return;

            const response = await fetch(`/api/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                window.toast?.show(
                    `${friend.full_name} removed from friends`,
                    'success'
                );
                
                this.hideFriendActions();
                await this.loadFriends(this.state.currentPage);
            } else {
                throw new Error(data.error || 'Failed to remove friend');
            }

        } catch (error) {
            console.error('❌ Error removing friend:', error);
            window.toast?.show(
                'Failed to remove friend',
                'error'
            );
        }
    }

    async blockUser(friendId) {
        try {
            const friend = this.state.friends.find(f => f.id === friendId);
            if (!friend) return;

            const confirmed = await this.showConfirmDialog(
                'Block User',
                `Are you sure you want to block ${friend.full_name}? They will be removed from your friends and won't be able to contact you.`,
                'Block',
                'destructive'
            );

            if (!confirmed) return;

            const response = await fetch('/api/blocked-users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: friendId,
                    reason: 'Blocked from friends list'
                })
            });

            const data = await response.json();

            if (data.success) {
                window.toast?.show(
                    `${friend.full_name} has been blocked`,
                    'success'
                );
                
                this.hideFriendActions();
                await this.loadFriends(this.state.currentPage);
            } else {
                throw new Error(data.error || 'Failed to block user');
            }

        } catch (error) {
            console.error('❌ Error blocking user:', error);
            window.toast?.show(
                'Failed to block user',
                'error'
            );
        }
    }

    async startChat(friendId) {
        try {
            console.log(`🚀 Starting real chat with friend ${friendId}`);
            
            // Get friend info
            const friendCard = this.element.querySelector(`[data-friend-id="${friendId}"]`);
            const friendName = friendCard?.querySelector('.friend-name')?.textContent?.trim() || 'Friend';

            // Initialize complete chat system if not already done
            if (!window.completeChatSystem) {
                console.log('🔄 Initializing complete chat system...');
                window.completeChatSystem = new CompleteChatSystem();
                await window.completeChatSystem.init();
            }
            
            // Open conversation
            await window.completeChatSystem.openConversation(friendId, friendName);
            
            console.log(`✅ Real chat opened with ${friendName}`);
            
        } catch (error) {
            console.error('❌ Error starting real chat:', error);
            alert('Failed to start chat. Please try again.');
        }
        
        // Close the friend actions modal if it's open
        this.hideFriendActions();
    }

    // 🚀 ENHANCED PROFILE VIEW FUNCTION WITH DEBUG
    viewProfile(friendId) {
        try {
            console.log('👤 Enhanced profile view for friend:', friendId);
            
            if (window.MivtonDebug) {
                window.MivtonDebug.log('ProfileView', 'START', `Viewing profile for friend ${friendId}`);
            }
            
            // Hide the friend actions modal first
            this.hideFriendActions();
            
            // Check if MivtonComponents is available
            if (!window.MivtonComponents) {
                console.error('❌ MivtonComponents not available');
                window.toast?.show('Component system not loaded', 'error');
                return;
            }
            
            // Check if ProfileModal class is available
            if (!window.MivtonComponents.ProfileModal) {
                console.error('❌ ProfileModal class not available');
                console.log('🔍 Available components:', Object.keys(window.MivtonComponents));
                
                // Try to force initialize if debug system is available
                if (window.MivtonComponents.forceInitProfileModal) {
                    console.log('🔄 Attempting force initialization...');
                    const modal = window.MivtonComponents.forceInitProfileModal();
                    if (modal) {
                        console.log('✅ Force initialization successful');
                        modal.show(friendId);
                        return;
                    }
                }
                
                window.toast?.show('Profile viewer not available', 'error');
                return;
            }
            
            // Find or create the profile modal container
            let profileModal = document.getElementById('profileModal');
            
            if (!profileModal) {
                console.warn('⚠️ Profile modal container not found, creating one');
                profileModal = document.createElement('div');
                profileModal.setAttribute('data-component', 'profile-modal');
                profileModal.id = 'profileModal';
                document.body.appendChild(profileModal);
                console.log('✅ Created profile modal container');
            }
            
            // Initialize profile modal if not already done
            if (!profileModal.mivtonComponent) {
                try {
                    console.log('🔄 Initializing profile modal component...');
                    profileModal.mivtonComponent = new window.MivtonComponents.ProfileModal(profileModal);
                    console.log('✅ Profile modal component initialized');
                    
                    if (window.MivtonDebug) {
                        window.MivtonDebug.log('ProfileView', 'INIT', 'Profile modal component initialized');
                    }
                } catch (error) {
                    console.error('❌ Failed to initialize profile modal:', error);
                    if (window.MivtonDebug) {
                        window.MivtonDebug.error('ProfileView', error);
                    }
                    window.toast?.show('Failed to load profile viewer', 'error');
                    return;
                }
            }
            
            // Show the profile
            if (profileModal.mivtonComponent && typeof profileModal.mivtonComponent.show === 'function') {
                try {
                    console.log('🚀 Showing profile modal for user:', friendId);
                    profileModal.mivtonComponent.show(friendId);
                    console.log('✅ Profile modal show() called successfully');
                    
                    if (window.MivtonDebug) {
                        window.MivtonDebug.log('ProfileView', 'SUCCESS', `Profile shown for friend ${friendId}`);
                    }
                    
                    // Add a small success indicator
                    if (window.toast) {
                        window.toast.show('Loading profile...', 'info', 1500);
                    }
                    
                } catch (error) {
                    console.error('❌ Error showing profile modal:', error);
                    if (window.MivtonDebug) {
                        window.MivtonDebug.error('ProfileView', error);
                    }
                    window.toast?.show('Failed to show profile', 'error');
                }
            } else {
                console.error('❌ Profile modal component not properly initialized or show method not available');
                console.log('🔍 Profile modal component:', profileModal.mivtonComponent);
                window.toast?.show('Profile viewer not ready', 'error');
            }
            
        } catch (error) {
            console.error('❌ Unexpected error in viewProfile:', error);
            if (window.MivtonDebug) {
                window.MivtonDebug.error('ProfileView', error);
            }
            window.toast?.show('An unexpected error occurred', 'error');
        }
    }

    showAddFriendDialog() {
        // Integration with user search (Phase 2.3)
        console.log('➕ Show add friend dialog');
        window.toast?.show('Use the user search to find and add friends!', 'info');
    }

    showFriendRequests() {
        // Navigate to friend requests page
        console.log('📨 Show friend requests');
        window.location.href = '/dashboard?tab=friend-requests';
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            // Only refresh if not currently loading and no modals are open
            if (!this.state.loading && !this.selectedFriendId) {
                this.loadFriends(this.state.currentPage);
            }
        }, this.options.refreshInterval);
    }

    showError(message) {
        const errorState = this.element.querySelector('[data-error]');
        const errorMessage = this.element.querySelector('[data-error-message]');
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        if (errorState) {
            errorState.style.display = 'block';
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

    /**
     * Real-time status update method called by socket client
     */
    updateFriendStatus(friendId, status, activityMessage = null) {
        try {
            console.log(`🔄 Updating friend ${friendId} status to ${status} in friends manager`);
            
            // Find friend in current state
            const friendIndex = this.state.friends.findIndex(f => f.id === friendId);
            if (friendIndex !== -1) {
                // Update friend status in state
                this.state.friends[friendIndex].online_status = status;
                if (activityMessage) {
                    this.state.friends[friendIndex].activity_message = activityMessage;
                }
                
                // Update stats
                this.recalculateStats();
                
                // Re-render if needed (only if friend is currently visible)
                const friendCard = this.element.querySelector(`[data-friend-id="${friendId}"]`);
                if (friendCard) {
                    this.updateFriendCardStatus(friendCard, status, activityMessage);
                }
                
                // Update UI stats
                this.updateStats();
                
                console.log(`✅ Friend ${friendId} status updated to ${status}`);
            }
        } catch (error) {
            console.error('❌ Error updating friend status:', error);
        }
    }
    
    /**
     * Update individual friend card status
     */
    updateFriendCardStatus(friendCard, status, activityMessage = null) {
        try {
            // Update status indicator
            const statusIndicator = friendCard.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${status}`;
            }
            
            // Update status text
            const statusText = friendCard.querySelector('.friend-status');
            if (statusText) {
                statusText.className = `friend-status ${status}`;
                statusText.innerHTML = `<i class="fas fa-circle"></i> ${status}`;
            }
            
            // Update card class
            friendCard.className = friendCard.className.replace(/friend-(online|away|offline)/g, '');
            friendCard.classList.add(`friend-${status}`);
            
            // Add visual animation for status change
            friendCard.classList.add('status-updating');
            setTimeout(() => {
                friendCard.classList.remove('status-updating');
            }, 300);
            
        } catch (error) {
            console.error('❌ Error updating friend card status:', error);
        }
    }
    
    /**
     * Recalculate stats from current friends state
     */
    recalculateStats() {
        try {
            const stats = {
                total_friends: this.state.friends.length,
                online_friends: this.state.friends.filter(f => f.online_status === 'online').length,
                away_friends: this.state.friends.filter(f => f.online_status === 'away').length,
                offline_friends: this.state.friends.filter(f => f.online_status === 'offline').length
            };
            
            this.setState({ stats });
            
        } catch (error) {
            console.error('❌ Error recalculating stats:', error);
        }
    }
    
    /**
     * Force refresh friends list (called by socket events)
     */
    async refreshFriendsList() {
        try {
            console.log('🔄 Refreshing friends list from socket event...');
            await this.loadFriends(this.state.currentPage);
        } catch (error) {
            console.error('❌ Error refreshing friends list:', error);
        }
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        super.destroy();
    }
}

// Register component globally with enhanced registration system
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    
    // Use enhanced registration if available, fallback to direct assignment
    if (window.MivtonComponents.register) {
        window.MivtonComponents.register('FriendsManager', MivtonFriendsManager);
    } else {
        window.MivtonComponents.FriendsManager = MivtonFriendsManager;
        console.log('✅ FriendsManager registered (fallback mode)');
    }
}

/**
 * 🚀 MESSAGES MANAGER - Complete messaging system with persistence
 * Features: Offline messaging, message history, unread counts, notifications
 */

class MivtonMessagesManager extends MivtonBaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        this.options = {
            refreshInterval: 30000, // 30 seconds
            pageSize: 20,
            ...options
        };

        this.state = {
            conversations: [],
            currentConversation: null,
            unreadCount: 0,
            loading: false,
            error: null
        };

        this.refreshTimer = null;
        this.isInitialized = false;
        
        // FIXED: Add error tracking to prevent infinite loops
        this.errorCount = 0;
        this.maxErrors = 3;
        this.isCircuitBreakerOpen = false;
        this.lastErrorTime = null;
        this.circuitBreakerTimeout = 60000; // 1 minute

        this.initialize();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Messages Manager...');
            
            this.createMessagesInterface();
            this.bindEvents();
            await this.loadConversations();
            this.startAutoRefresh();
            
            this.isInitialized = true;
            console.log('✅ Messages Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Messages Manager:', error);
            this.showError('Failed to initialize messages system');
        }
    }

    createMessagesInterface() {
        this.element.innerHTML = `
            <div class="messages-manager" data-component="messages-manager">
                <!-- Messages Header -->
                <div class="messages-header">
                    <div class="messages-title">
                        <h2>
                            <i class="fas fa-envelope"></i>
                            Messages
                            <span class="unread-badge" data-unread-count="0" style="display: none;">0</span>
                        </h2>
                        <div class="messages-stats">
                            <span class="stat" data-total-conversations="0">
                                <i class="fas fa-comments"></i> 0 conversations
                            </span>
                        </div>
                    </div>
                    
                    <div class="messages-actions">
                        <button class="btn btn-primary" data-action="compose">
                            <i class="fas fa-plus"></i>
                            New Message
                        </button>
                        <button class="btn btn-secondary" data-action="refresh">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>

                <!-- Messages Content -->
                <div class="messages-content">
                    <!-- Loading State -->
                    <div class="messages-loading" data-loading style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Loading messages...</p>
                    </div>

                    <!-- Error State -->
                    <div class="messages-error" data-error style="display: none;">
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p data-error-message>Something went wrong</p>
                            <button class="btn btn-primary" data-action="retry">Try Again</button>
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div class="messages-empty" data-empty style="display: none;">
                        <div class="empty-state">
                            <i class="fas fa-envelope-open"></i>
                            <h3>No Messages Yet</h3>
                            <p>Start a conversation with your friends!</p>
                            <button class="btn btn-primary" data-action="compose">
                                <i class="fas fa-plus"></i>
                                Send Your First Message
                            </button>
                        </div>
                    </div>

                    <!-- Conversations List -->
                    <div class="conversations-list" data-conversations-list>
                        <!-- Conversations will be rendered here -->
                    </div>
                </div>
            </div>
        `;

        this.element.classList.add('mivton-messages-manager');
    }

    bindEvents() {
        // Action buttons
        this.element.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (!action) return;

            e.preventDefault();
            e.stopPropagation();

            switch (action) {
                case 'compose':
                    this.openComposeModal();
                    break;
                case 'refresh':
                    this.loadConversations();
                    break;
                case 'retry':
                    this.loadConversations();
                    break;
                case 'open-conversation':
                    const conversationId = e.target.closest('[data-conversation-id]')?.dataset.conversationId;
                    if (conversationId) {
                        this.openConversation(conversationId);
                    }
                    break;
            }
        });
    }

    async loadConversations() {
        try {
            // FIXED: Check circuit breaker before making API calls
            if (this.isCircuitBreakerOpen) {
                const timeSinceLastError = Date.now() - this.lastErrorTime;
                if (timeSinceLastError < this.circuitBreakerTimeout) {
                    console.log('🔒 Circuit breaker open, skipping API call');
                    this.state.conversations = await this.loadFallbackConversations();
                    this.renderConversations();
                    return;
                } else {
                    // Reset circuit breaker
                    console.log('🔄 Circuit breaker timeout reached, resetting');
                    this.isCircuitBreakerOpen = false;
                    this.errorCount = 0;
                }
            }
            
            this.showLoading();
            console.log('📬 Loading conversations...');
            
            // Try to load from API first
            try {
                const response = await fetch('/api/chat/conversations', {
                    method: 'GET',
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    this.state.conversations = data.conversations || [];
                    console.log('✅ Conversations loaded from API:', this.state.conversations.length);
                    
                    // Reset error count on success
                    this.errorCount = 0;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (apiError) {
                console.warn('⚠️ API error, using fallback:', apiError);
                
                // FIXED: Increment error count and check circuit breaker
                this.errorCount++;
                this.lastErrorTime = Date.now();
                
                if (this.errorCount >= this.maxErrors) {
                    this.isCircuitBreakerOpen = true;
                    console.log('🚨 Circuit breaker opened due to repeated failures');
                }
                
                this.state.conversations = await this.loadFallbackConversations();
            }

            // Calculate unread count
            this.state.unreadCount = this.state.conversations.reduce((total, conv) => {
                return total + (conv.unread_count || 0);
            }, 0);

            this.renderConversations();
            this.updateUnreadBadge();
            this.hideLoading();

        } catch (error) {
            console.error('❌ Error loading conversations:', error);
            this.showError('Failed to load messages');
            
            // FIXED: Increment error count for unexpected errors
            this.errorCount++;
            this.lastErrorTime = Date.now();
            
            if (this.errorCount >= this.maxErrors) {
                this.isCircuitBreakerOpen = true;
                console.log('🚨 Circuit breaker opened due to unexpected errors');
            }
        }
    }

    async loadFallbackConversations() {
        // Fallback: Return empty array if no API data available
        console.log('⚠️ No API data available, showing empty messages');
        return [];
    }

    renderConversations() {
        const conversationsList = this.element.querySelector('[data-conversations-list]');
        if (!conversationsList) return;

        if (this.state.conversations.length === 0) {
            this.showEmpty();
            return;
        }

        this.hideEmpty();

        conversationsList.innerHTML = this.state.conversations.map(conv => `
            <div class="conversation-item ${conv.unread_count > 0 ? 'unread' : ''}" 
                 data-conversation-id="${conv.conversation_id || conv.id}" 
                 data-action="open-conversation">
                <div class="conversation-avatar">
                    <img src="${conv.friend_profile_picture || '/images/default-avatar.svg'}" 
                         alt="${conv.friend_name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div class="default-avatar" style="display:none; width:40px; height:40px; border-radius:50%; background:linear-gradient(45deg,#667eea,#764ba2); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:14px;">${conv.friend_name.charAt(0).toUpperCase()}</div>
                    ${conv.unread_count > 0 ? '<span class="unread-dot"></span>' : ''}
                </div>
                
                <div class="conversation-info">
                    <div class="conversation-header">
                        <h4 class="conversation-name">${conv.friend_name}</h4>
                        <span class="conversation-time">${this.formatTime(conv.last_message_at)}</span>
                    </div>
                    
                    <div class="conversation-preview">
                        <p class="conversation-message">${conv.last_message_body || 'No messages yet'}</p>
                        ${conv.unread_count > 0 ? `<span class="unread-count">${conv.unread_count}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Update stats
        const totalConversations = this.element.querySelector('[data-total-conversations]');
        if (totalConversations) {
            totalConversations.textContent = `${this.state.conversations.length} conversations`;
        }
    }

    async openConversation(conversationId) {
        try {
            console.log(`📖 Opening conversation ${conversationId}`);
            
            const conversation = this.state.conversations.find(c => 
                (c.conversation_id || c.id) == conversationId
            );
            
            if (!conversation) {
                console.error('❌ Conversation not found:', conversationId);
                return;
            }

            // Mark as read
            await this.markAsRead(conversation.friend_id);
            
            // Open chat with the friend
            if (window.bulletproofChat) {
                window.bulletproofChat.openConversation(conversation.friend_id, conversation.friend_name);
            } else {
                console.warn('⚠️ Chat system not available');
                alert('Chat system not available. Please try again.');
            }

        } catch (error) {
            console.error('❌ Error opening conversation:', error);
        }
    }

    async markAsRead(friendId) {
        try {
            // Update local state
            const conversation = this.state.conversations.find(c => c.friend_id === friendId);
            if (conversation) {
                conversation.unread_count = 0;
                this.renderConversations();
                this.updateUnreadBadge();
            }

            // Try to mark as read via API
            try {
                await fetch(`/api/chat/mark-read/${friendId}`, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (apiError) {
                console.warn('⚠️ API mark-read failed:', apiError);
            }

        } catch (error) {
            console.error('❌ Error marking as read:', error);
        }
    }

    updateUnreadBadge() {
        const unreadBadge = this.element.querySelector('[data-unread-count]');
        if (!unreadBadge) return;

        if (this.state.unreadCount > 0) {
            unreadBadge.textContent = this.state.unreadCount;
            unreadBadge.style.display = 'inline-block';
        } else {
            unreadBadge.style.display = 'none';
        }

        // Update global unread count for other components
        window.messagesUnreadCount = this.state.unreadCount;
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('messagesUnreadUpdated', {
            detail: { unreadCount: this.state.unreadCount }
        }));
    }

    openComposeModal() {
        // For now, redirect to friends section to start a chat
        if (window.showSection) {
            window.showSection('friends');
        } else {
            alert('Please go to Friends section to start a new conversation.');
        }
    }

    startAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            if (this.isInitialized) {
                this.loadConversations();
            }
        }, this.options.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffHours < 1) {
            const minutes = Math.floor(diffMs / (1000 * 60));
            return minutes < 1 ? 'Just now' : `${minutes}m ago`;
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)}h ago`;
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    showLoading() {
        const loading = this.element.querySelector('[data-loading]');
        const error = this.element.querySelector('[data-error]');
        const empty = this.element.querySelector('[data-empty]');
        
        if (loading) loading.style.display = 'block';
        if (error) error.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    hideLoading() {
        const loading = this.element.querySelector('[data-loading]');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        const loading = this.element.querySelector('[data-loading]');
        const error = this.element.querySelector('[data-error]');
        const empty = this.element.querySelector('[data-empty]');
        const errorMessage = this.element.querySelector('[data-error-message]');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'block';
        if (empty) empty.style.display = 'none';
        if (errorMessage) errorMessage.textContent = message;
    }

    showEmpty() {
        const loading = this.element.querySelector('[data-loading]');
        const error = this.element.querySelector('[data-error]');
        const empty = this.element.querySelector('[data-empty]');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (empty) empty.style.display = 'block';
    }

    hideEmpty() {
        const empty = this.element.querySelector('[data-empty]');
        if (empty) empty.style.display = 'none';
    }

    destroy() {
        this.stopAutoRefresh();
        super.destroy();
    }
}

// Auto-initialize friends managers
document.addEventListener('DOMContentLoaded', () => {
    const friendsElements = document.querySelectorAll('[data-component="friends-manager"]');
    friendsElements.forEach(element => {
        if (!element.mivtonComponent) {
            element.mivtonComponent = new MivtonFriendsManager(element);
        }
    });

    // Auto-initialize messages managers
    const messagesElements = document.querySelectorAll('[data-component="messages-manager"]');
    messagesElements.forEach(element => {
        if (!element.mivtonComponent) {
            element.mivtonComponent = new MivtonMessagesManager(element);
        }
    });
});
