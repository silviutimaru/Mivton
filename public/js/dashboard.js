/**
 * ==============================================
 * MIVTON DASHBOARD - COMPLETE IMPLEMENTATION
 * With Fixed User Search Functionality
 * ==============================================
 */

class Dashboard {
    constructor() {
        console.log('🚀 Dashboard initializing...');
        
        // Dashboard state
        this.currentUser = null;
        this.currentSection = 'overview';
        this.stats = {
            friends: 0,
            requests: 0,
            blocked: 0,
            messages: 0,
            languages: 0,
            hours: 0,
            unreadNotifications: 0
        };
        
        // Search state
        this.searchResults = [];
        this.searchQuery = '';
        this.searchFilters = {};
        
        // Initialize dashboard
        this.init();
    }

    async init() {
        try {
            console.log('🔄 Loading dashboard components...');
            
            // Hide loading screen initially
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'flex';
            }
            
            // Load user data first
            await this.loadUserData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize components
            this.initializeComponents();
            
            // Load dashboard stats
            await this.loadDashboardStats();
            
            // Hide loading screen
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                document.getElementById('dashboardWrapper').style.display = 'block';
            }, 1000);
            
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard. Please refresh the page.');
        }
    }

    async loadUserData() {
        try {
            console.log('👤 Loading user data...');
            
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user || data;
                this.updateUserDisplay();
                console.log('✅ User data loaded');
            } else if (response.status === 401) {
                // User not authenticated, redirect to login
                window.location.href = '/login.html';
            } else {
                throw new Error('Failed to load user data');
            }
            
        } catch (error) {
            console.error('❌ Error loading user data:', error);
            throw error;
        }
    }

    updateUserDisplay() {
        if (!this.currentUser) return;
        
        const userName = this.currentUser.full_name || this.currentUser.username || 'User';
        const userInitials = this.getUserInitials(userName);
        
        // Update user name displays
        const userNameElements = ['userName', 'welcomeUserName', 'profileName'];
        userNameElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = userName;
            }
        });
        
        // Update user avatars
        const avatarElements = ['userAvatar', 'profileAvatar', 'mobileUserAvatar'];
        avatarElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = userInitials;
            }
        });
        
        // Update profile username
        const profileUsername = document.getElementById('profileUsername');
        if (profileUsername) {
            profileUsername.textContent = `@${this.currentUser.username}`;
        }
        
        // Update joined date
        const joinedDate = document.getElementById('joinedDate');
        if (joinedDate && this.currentUser.created_at) {
            const date = new Date(this.currentUser.created_at);
            joinedDate.textContent = date.getFullYear();
        }
        
        // Update language
        const userLanguage = document.getElementById('userLanguage');
        if (userLanguage && this.currentUser.native_language) {
            userLanguage.textContent = this.getLanguageName(this.currentUser.native_language);
        }
        
        // Update verified badge
        const verifiedBadge = document.getElementById('verifiedBadge');
        if (verifiedBadge && this.currentUser.is_verified) {
            verifiedBadge.style.display = 'inline-block';
        }
    }

    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Navigation listeners
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });
        
        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        const sidebarClose = document.getElementById('sidebarClose');
        
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                mobileMenuBtn.classList.toggle('active');
            });
        }
        
        if (sidebarClose && sidebar) {
            sidebarClose.addEventListener('click', () => {
                sidebar.classList.remove('open');
                mobileMenuBtn?.classList.remove('active');
            });
        }
        
        // Search functionality
        this.setupSearchListeners();
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // Profile save button
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                this.saveProfile();
            });
        }
        
        // Tab switching for requests
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchRequestsTab(btn.dataset.tab);
            });
        });
    }

    setupSearchListeners() {
        console.log('🔍 Setting up search listeners...');
        
        const searchInput = document.getElementById('userSearchInput');
        const searchBtn = document.getElementById('searchBtn');
        const languageFilter = document.getElementById('languageFilter');
        
        if (searchInput) {
            // Search on input with debounce
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 500); // 500ms debounce
                } else if (query.length === 0) {
                    this.clearSearchResults();
                }
            });
            
            // Search on Enter key
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = e.target.value.trim();
                    if (query.length >= 2) {
                        this.performSearch(query);
                    }
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput?.value.trim();
                if (query && query.length >= 2) {
                    this.performSearch(query);
                }
            });
        }
        
        if (languageFilter) {
            languageFilter.addEventListener('change', () => {
                const query = searchInput?.value.trim();
                if (query && query.length >= 2) {
                    this.performSearch(query);
                }
            });
        }
    }

    async performSearch(query) {
        try {
            console.log('🔍 Performing search for:', query);
            
            this.searchQuery = query;
            this.showSearchLoading();
            
            // Get filter values
            const languageFilter = document.getElementById('languageFilter');
            const language = languageFilter?.value || '';
            
            // Build search URL
            const searchParams = new URLSearchParams({
                q: query,
                limit: 20,
                page: 1
            });
            
            if (language) {
                searchParams.append('language', language);
            }
            
            const response = await fetch(`/api/users/search?${searchParams}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.searchResults = data.users || [];
                this.displaySearchResults(data);
                console.log('✅ Search completed, found:', this.searchResults.length, 'users');
            } else {
                throw new Error(`Search failed: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Search error:', error);
            this.showSearchError('Search failed. Please try again.');
        }
    }

    showSearchLoading() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-loading">
                    <div class="loading-spinner small"></div>
                    <p>Searching users...</p>
                </div>
            `;
        }
    }

    showSearchError(message) {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="search-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Search Error</h3>
                    <p>${message}</p>
                    <button class="retry-btn" onclick="dashboard.retrySearch()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    retrySearch() {
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput && this.searchQuery) {
            this.performSearch(this.searchQuery);
        }
    }

    displaySearchResults(data) {
        const resultsContainer = document.getElementById('searchResults');
        const searchResultsCount = document.getElementById('searchResultsCount');
        
        if (!resultsContainer) return;
        
        const users = data.users || [];
        const pagination = data.pagination || {};
        
        // Update count
        if (searchResultsCount) {
            searchResultsCount.textContent = `${pagination.total || users.length} users found`;
        }
        
        if (users.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No users found</h3>
                    <p>Try different search terms or check your filters.</p>
                </div>
            `;
            return;
        }
        
        // Generate user cards
        const userCardsHTML = users.map(user => this.createUserCard(user)).join('');
        
        resultsContainer.innerHTML = `
            <div class="search-results-grid">
                ${userCardsHTML}
            </div>
        `;
        
        // Attach event listeners for friend request buttons
        this.attachFriendRequestListeners();
    }

    createUserCard(user) {
        const initials = this.getUserInitials(user.full_name || user.username);
        const languageFlag = user.native_language ? this.getLanguageFlag(user.native_language) : '';
        const languageName = user.native_language ? this.getLanguageName(user.native_language) : '';
        const memberSince = this.formatDate(user.created_at);
        
        return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="user-card-header">
                    <div class="user-avatar-large">${initials}</div>
                    <div class="user-status-indicator ${user.status || 'offline'}"></div>
                </div>
                
                <div class="user-card-body">
                    <div class="user-name">
                        ${user.full_name || user.username}
                        ${user.is_verified ? '<span class="verified-badge">✓</span>' : ''}
                        ${user.is_admin ? '<span class="admin-badge">👑</span>' : ''}
                    </div>
                    <div class="user-username">@${user.username}</div>
                    
                    ${languageName ? `
                        <div class="user-language">
                            <span class="language-flag">${languageFlag}</span>
                            <span class="language-name">${languageName}</span>
                        </div>
                    ` : ''}
                    
                    <div class="user-stats">
                        <div class="stat-item">
                            <span class="stat-value">${user.friend_count || 0}</span>
                            <span class="stat-label">Friends</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${memberSince}</span>
                            <span class="stat-label">Joined</span>
                        </div>
                    </div>
                </div>
                
                <div class="user-card-footer">
                    ${this.generateUserActionButtons(user)}
                </div>
            </div>
        `;
    }

    generateUserActionButtons(user) {
        // Don't show buttons for current user
        if (this.currentUser && user.id === this.currentUser.id) {
            return '<div class="user-action-note">This is you</div>';
        }
        
        if (user.is_friend) {
            return `
                <button class="user-action-btn friend" disabled>
                    <span>✅</span> Already Friends
                </button>
            `;
        }
        
        if (user.friend_request_sent) {
            return `
                <button class="user-action-btn pending" disabled>
                    <span>⏳</span> Request Sent
                </button>
            `;
        }
        
        return `
            <button class="user-action-btn primary" data-action="send-request" data-user-id="${user.id}" data-username="${user.username}">
                <span>➕</span> Add Friend
            </button>
            <button class="user-action-btn secondary" data-action="view-profile" data-user-id="${user.id}">
                <span>👤</span> View Profile
            </button>
        `;
    }

    attachFriendRequestListeners() {
        document.querySelectorAll('[data-action="send-request"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                const username = e.target.dataset.username;
                this.sendFriendRequest(userId, username, btn);
            });
        });
        
        document.querySelectorAll('[data-action="view-profile"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.viewUserProfile(userId);
            });
        });
    }

    async sendFriendRequest(userId, username, buttonElement) {
        try {
            console.log('📤 Sending friend request to user:', username);
            
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<span>⏳</span> Sending...';
            
            const response = await fetch('/api/friend-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ receiver_id: parseInt(userId) })
            });
            
            const data = await response.json();
            
            if (data.success) {
                buttonElement.innerHTML = '<span>✅</span> Request Sent';
                buttonElement.className = 'user-action-btn pending';
                this.showToast('Friend request sent!', 'success');
                console.log('✅ Friend request sent successfully');
            } else {
                // Handle specific error cases
                if (data.code === 'ALREADY_FRIENDS') {
                    buttonElement.innerHTML = '<span>✅</span> Already Friends';
                    buttonElement.className = 'user-action-btn friend';
                    this.showToast('You are already friends with this user', 'info');
                } else if (data.code === 'REQUEST_EXISTS') {
                    buttonElement.innerHTML = '<span>⏳</span> Request Sent';
                    buttonElement.className = 'user-action-btn pending';
                    this.showToast('Friend request already sent', 'info');
                } else if (data.code === 'REQUEST_ALREADY_ACCEPTED') {
                    buttonElement.innerHTML = '<span>✅</span> Already Friends';
                    buttonElement.className = 'user-action-btn friend';
                    this.showToast('You are already friends with this user', 'info');
                } else {
                    throw new Error(data.error || 'Failed to send friend request');
                }
            }
            
        } catch (error) {
            console.error('❌ Error sending friend request:', error);
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<span>➕</span> Add Friend';
            this.showToast('Failed to send friend request', 'error');
        }
    }

    viewUserProfile(userId) {
        console.log('👤 Viewing profile for user ID:', userId);
        // For now, just show a simple alert
        this.showToast('Profile viewing coming soon!', 'info');
    }

    clearSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        const searchResultsCount = document.getElementById('searchResultsCount');
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `
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
        
        this.searchResults = [];
        this.searchQuery = '';
    }

    initializeComponents() {
        console.log('🔧 Initializing components...');
        
        // Initialize any components that need special setup
        this.initializeTooltips();
        this.initializeModals();
    }

    initializeTooltips() {
        // Add tooltips for verified badges, admin badges, etc.
        document.querySelectorAll('.verified-badge').forEach(badge => {
            badge.title = 'Verified User';
        });
        
        document.querySelectorAll('.admin-badge').forEach(badge => {
            badge.title = 'Administrator';
        });
    }

    initializeModals() {
        // Initialize confirmation modal
        const modal = document.getElementById('confirmModal');
        if (modal) {
            document.getElementById('modalCancel')?.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    }

    showSection(sectionName) {
        console.log('📄 Showing section:', sectionName);
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Activate current section
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        const activeSection = document.getElementById(`${sectionName}-section`);
        
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        if (activeSection) {
            activeSection.classList.add('active');
        }
        
        // Update header
        this.updateSectionHeader(sectionName);
        
        // Load section-specific data
        this.loadSectionData(sectionName);
        
        this.currentSection = sectionName;
    }

    updateSectionHeader(sectionName) {
        const sectionTitle = document.getElementById('sectionTitle');
        const currentSection = document.getElementById('currentSection');
        
        const titles = {
            overview: 'Overview',
            friends: 'Friends',
            requests: 'Friend Requests',
            find: 'Find Users',
            blocked: 'Blocked Users',
            profile: 'Profile & Settings'
        };
        
        if (sectionTitle) {
            sectionTitle.textContent = titles[sectionName] || 'Dashboard';
        }
        
        if (currentSection) {
            currentSection.textContent = titles[sectionName] || 'Overview';
        }
    }

    async loadSectionData(sectionName) {
        console.log('📊 Loading data for section:', sectionName);
        
        try {
            switch (sectionName) {
                case 'overview':
                    await this.loadOverviewData();
                    break;
                case 'friends':
                    await this.loadFriendsData();
                    break;
                case 'requests':
                    await this.loadRequestsData();
                    break;
                case 'blocked':
                    await this.loadBlockedUsersData();
                    break;
                case 'profile':
                    await this.loadProfileData();
                    break;
                case 'find':
                    // Clear search when entering find section
                    this.clearSearchResults();
                    break;
            }
        } catch (error) {
            console.error(`❌ Error loading ${sectionName} data:`, error);
        }
    }

    async loadOverviewData() {
        // Overview data is loaded in loadDashboardStats
    }

    async loadFriendsData() {
        console.log('👥 Loading friends data...');
        // Friends data will be handled by the friends manager component
    }

    async loadRequestsData() {
        console.log('📨 Loading friend requests data...');
        
        try {
            // Load received requests
            const receivedResponse = await fetch('/api/friend-requests/received', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (receivedResponse.ok) {
                const receivedData = await receivedResponse.json();
                this.displayReceivedRequests(receivedData.requests || []);
            }
            
            // Load sent requests
            const sentResponse = await fetch('/api/friend-requests/sent', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (sentResponse.ok) {
                const sentData = await sentResponse.json();
                this.displaySentRequests(sentData.requests || []);
            }
            
        } catch (error) {
            console.error('❌ Error loading requests:', error);
        }
    }

    displayReceivedRequests(requests) {
        const container = document.getElementById('received-requests');
        if (!container) return;
        
        if (requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📨</div>
                    <h3>No friend requests</h3>
                    <p>You're all caught up! No pending friend requests.</p>
                </div>
            `;
        } else {
            const requestsHTML = requests.map(request => this.createRequestCard(request)).join('');
            container.innerHTML = `<div class="requests-list">${requestsHTML}</div>`;
            
            // Attach button listeners
            this.attachRequestButtonListeners();
        }
        
        // Update badge count
        const requestsCount = document.getElementById('requestsCount');
        if (requestsCount) {
            requestsCount.textContent = requests.length;
            requestsCount.style.display = requests.length > 0 ? 'block' : 'none';
        }
    }

    displaySentRequests(requests) {
        const container = document.getElementById('sent-requests');
        if (!container) return;
        
        if (requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📤</div>
                    <h3>No sent requests</h3>
                    <p>Start connecting by sending friend requests!</p>
                    <button class="empty-action-btn" onclick="dashboard.showSection('find')">
                        Find Friends
                    </button>
                </div>
            `;
        } else {
            const requestsHTML = requests.map(request => this.createSentRequestCard(request)).join('');
            container.innerHTML = `<div class="requests-list">${requestsHTML}</div>`;
        }
    }

    createRequestCard(request) {
        const initials = this.getUserInitials(request.sender_full_name || request.sender_username);
        const timeAgo = this.getTimeAgo(request.created_at);
        
        return `
            <div class="request-card" data-request-id="${request.id}">
                <div class="request-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="request-info">
                        <div class="user-name">${request.sender_full_name || request.sender_username}</div>
                        <div class="user-username">@${request.sender_username}</div>
                        <div class="request-time">${timeAgo}</div>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="action-btn success" data-action="accept" data-request-id="${request.id}">
                        <span>✅</span> Accept
                    </button>
                    <button class="action-btn danger" data-action="decline" data-request-id="${request.id}">
                        <span>❌</span> Decline
                    </button>
                </div>
            </div>
        `;
    }

    createSentRequestCard(request) {
        const initials = this.getUserInitials(request.receiver_full_name || request.receiver_username);
        const timeAgo = this.getTimeAgo(request.created_at);
        
        return `
            <div class="request-card sent">
                <div class="request-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="request-info">
                        <div class="user-name">${request.receiver_full_name || request.receiver_username}</div>
                        <div class="user-username">@${request.receiver_username}</div>
                        <div class="request-time">${timeAgo}</div>
                    </div>
                </div>
                <div class="request-status">
                    <span class="status-pending">⏳ Pending</span>
                </div>
            </div>
        `;
    }

    attachRequestButtonListeners() {
        document.querySelectorAll('[data-action="accept"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.target.dataset.requestId;
                this.acceptFriendRequest(requestId);
            });
        });
        
        document.querySelectorAll('[data-action="decline"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.target.dataset.requestId;
                this.declineFriendRequest(requestId);
            });
        });
    }

    async acceptFriendRequest(requestId) {
        try {
            console.log('✅ Accepting friend request:', requestId);
            
            const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Friend request accepted!', 'success');
                await this.loadRequestsData(); // Reload requests
                await this.loadDashboardStats(); // Update stats
            } else {
                throw new Error(data.error || 'Failed to accept request');
            }
            
        } catch (error) {
            console.error('❌ Error accepting request:', error);
            this.showToast('Failed to accept friend request', 'error');
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
            
            if (data.success) {
                this.showToast('Friend request declined', 'success');
                await this.loadRequestsData(); // Reload requests
            } else {
                throw new Error(data.error || 'Failed to decline request');
            }
            
        } catch (error) {
            console.error('❌ Error declining request:', error);
            this.showToast('Failed to decline friend request', 'error');
        }
    }

    switchRequestsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.getElementById(`${tabName}-requests`)?.classList.add('active');
    }

    async loadBlockedUsersData() {
        console.log('🚫 Loading blocked users data...');
        // Implementation for blocked users will be added later
    }

    async loadProfileData() {
        console.log('⚙️ Loading profile data...');
        
        if (!this.currentUser) return;
        
        // Fill profile form with current user data
        const fullNameInput = document.getElementById('fullNameInput');
        const emailInput = document.getElementById('emailInput');
        const nativeLanguageSelect = document.getElementById('nativeLanguageSelect');
        const genderSelect = document.getElementById('genderSelect');
        
        if (fullNameInput) fullNameInput.value = this.currentUser.full_name || '';
        if (emailInput) emailInput.value = this.currentUser.email || '';
        if (nativeLanguageSelect) nativeLanguageSelect.value = this.currentUser.native_language || 'en';
        if (genderSelect) genderSelect.value = this.currentUser.gender || '';
    }

    async saveProfile() {
        try {
            console.log('💾 Saving profile...');
            
            const fullName = document.getElementById('fullNameInput')?.value;
            const nativeLanguage = document.getElementById('nativeLanguageSelect')?.value;
            
            const profileData = {
                full_name: fullName,
                native_language: nativeLanguage
            };
            
            const response = await fetch('/api/dashboard/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showToast('Profile updated successfully!', 'success');
                await this.loadUserData(); // Reload user data
            } else {
                throw new Error(data.error || 'Failed to update profile');
            }
            
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            this.showToast('Failed to update profile', 'error');
        }
    }

    async loadDashboardStats() {
        try {
            console.log('📊 Loading dashboard stats...');
            
            const response = await fetch('/api/dashboard/stats', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Stats response:', data);
                
                // Handle both old and new response formats
                const stats = data.stats || data;
                this.updateDashboardStats(stats);
                
                console.log('✅ Dashboard stats loaded and updated');
            } else {
                console.warn('⚠️ Failed to load dashboard stats:', response.status);
            }
            
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
        }
    }

    updateDashboardStats(stats) {
        console.log('🔄 Updating dashboard stats with:', stats);
        
        // Update various stat displays
        const statElements = {
            statMessages: stats.messages || 0,
            statLanguages: stats.languages || 1,
            statFriends: stats.friends || 0,
            statHours: stats.hours || 0,
            onlineCount: stats.onlineCount || stats.online || 1,
            totalFriends: stats.friends || 0,
            friendsCount: stats.friends || 0
        };
        
        console.log('🔄 Stat elements to update:', statElements);
        
        Object.entries(statElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`✅ Updating ${id} to ${value}`);
                element.textContent = value;
            } else {
                console.warn(`⚠️ Element not found: ${id}`);
            }
        });
        
        // Update requests badge count
        const requestsCount = document.getElementById('requestsCount');
        if (requestsCount) {
            const requestsValue = stats.requests || 0;
            console.log(`📨 Updating requests count to ${requestsValue}`);
            requestsCount.textContent = requestsValue;
            requestsCount.style.display = requestsValue > 0 ? 'block' : 'none';
        }
        
        // Update blocked users badge count
        const blockedCount = document.getElementById('blockedCount');
        if (blockedCount) {
            const blockedValue = stats.blocked || 0;
            console.log(`🚫 Updating blocked count to ${blockedValue}`);
            blockedCount.textContent = blockedValue;
            blockedCount.style.display = blockedValue > 0 ? 'block' : 'none';
        }
        
        // Update notification badge
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
            const unreadCount = stats.unread_notifications || 0;
            console.log(`🔔 Updating notification badge to ${unreadCount}`);
            notificationBadge.textContent = unreadCount;
            notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
        
        console.log('✅ Dashboard stats update completed');
        
        // Store stats in instance for real-time updates
        this.stats = {
            friends: stats.friends || 0,
            requests: stats.requests || 0,
            blocked: stats.blocked || 0,
            messages: stats.messages || 0,
            languages: stats.languages || 1,
            hours: stats.hours || 0,
            unreadNotifications: stats.unread_notifications || 0
        };
    }

    async handleLogout() {
        try {
            console.log('🚪 Logging out...');
            
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
            console.error('❌ Logout error:', error);
            this.showToast('Logout failed', 'error');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || 'ℹ️';
    }

    showError(message) {
        console.error('🚨 Dashboard Error:', message);
        this.showToast(message, 'error');
    }

    // Helper methods for search functionality
    getLanguageFlag(languageCode) {
        // Use the centralized language utility if available
        if (window.MivtonLanguages?.LanguageUtils) {
            return window.MivtonLanguages.LanguageUtils.getLanguageFlag(languageCode);
        }
        
        // Fallback to basic flags
        const flags = {
            en: '🇺🇸', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
            pt: '🇵🇹', ru: '🇷🇺', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
            ar: '🇸🇦', hi: '🇮🇳', nl: '🇳🇱', sv: '🇸🇪', no: '🇳🇴',
            da: '🇩🇰', fi: '🇫🇮', pl: '🇵🇱', tr: '🇹🇷', el: '🇬🇷',
            he: '🇮🇱', th: '🇹🇭', vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾',
            tl: '🇵🇭', uk: '🇺🇦', cs: '🇨🇿', sk: '🇸🇰', hu: '🇭🇺',
            ro: '🇷🇴', bg: '🇧🇬', hr: '🇭🇷', sl: '🇸🇮', et: '🇪🇪',
            lv: '🇱🇻', lt: '🇱🇹'
        };
        return flags[languageCode] || '🌐';
    }

    getLanguageName(languageCode) {
        // Use the centralized language utility if available
        if (window.MivtonLanguages?.LanguageUtils) {
            return window.MivtonLanguages.LanguageUtils.getLanguageName(languageCode);
        }
        
        // Fallback to basic names
        const names = {
            en: 'English', es: 'Spanish', fr: 'French', de: 'German', 
            it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', 
            ko: 'Korean', zh: 'Chinese', ar: 'Arabic', hi: 'Hindi',
            nl: 'Dutch', sv: 'Swedish', no: 'Norwegian', da: 'Danish',
            fi: 'Finnish', pl: 'Polish', tr: 'Turkish', el: 'Greek',
            he: 'Hebrew', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian',
            ms: 'Malay', tl: 'Filipino', uk: 'Ukrainian', cs: 'Czech',
            sk: 'Slovak', hu: 'Hungarian', ro: 'Romanian', bg: 'Bulgarian',
            hr: 'Croatian', sl: 'Slovenian', et: 'Estonian', lv: 'Latvian',
            lt: 'Lithuanian'
        };
        return names[languageCode] || 'Unknown';
    }

    getUserInitials(name) {
        if (!name) return '?';
        return name.split(' ')
                  .map(word => word.charAt(0).toUpperCase())
                  .join('')
                  .substring(0, 2);
    }

    formatDate(dateString) {
        if (!dateString) return 'Recently';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    }

    getTimeAgo(dateString) {
        if (!dateString) return 'Recently';
        
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return this.formatDate(dateString);
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Real-time update method for external components
    updateFriendsCount(newCount) {
        console.log(`🔄 Real-time friends count update: ${newCount}`);
        
        // Update all friends count displays immediately
        const friendCountElements = ['statFriends', 'totalFriends', 'friendsCount'];
        friendCountElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = newCount;
                console.log(`✅ Updated ${id} to ${newCount}`);
            }
        });
        
        // Update internal stats
        if (this.stats) {
            this.stats.friends = newCount;
        }
    }
    
    // Real-time update method for request counts
    updateRequestsCount(newCount) {
        console.log(`🔄 Real-time requests count update: ${newCount}`);
        
        const requestsCount = document.getElementById('requestsCount');
        if (requestsCount) {
            requestsCount.textContent = newCount;
            requestsCount.style.display = newCount > 0 ? 'block' : 'none';
        }
        
        // Update internal stats
        if (this.stats) {
            this.stats.requests = newCount;
        }
    }

    // Cleanup method
    destroy() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
        }
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing dashboard...');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        try {
            if (!window.dashboard) {
                window.dashboard = new Dashboard();
                console.log('✅ Dashboard initialized successfully');
            }
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            
            // Show user-friendly error message
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.innerHTML = `
                    <div class="loading-content">
                        <div class="loading-logo">MIVTON</div>
                        <div class="error-message">
                            <h3>⚠️ Dashboard Error</h3>
                            <p>There was an error loading the dashboard. Please refresh the page.</p>
                            <button onclick="location.reload()" style="
                                background: #007bff; 
                                color: white; 
                                border: none; 
                                padding: 10px 20px; 
                                border-radius: 5px; 
                                cursor: pointer;
                                margin-top: 10px;
                            ">
                                🔄 Refresh Page
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }, 100);
});

// Global function to show sections (for onclick handlers)
function showSection(sectionName) {
    if (window.dashboard) {
        window.dashboard.showSection(sectionName);
    }
}

// Global function for attaching request button listeners
function attachRequestButtonListeners() {
    if (window.dashboard) {
        window.dashboard.attachRequestButtonListeners();
    }
}

console.log('✅ Dashboard.js loaded successfully - SEARCH FUNCTIONALITY IMPLEMENTED');