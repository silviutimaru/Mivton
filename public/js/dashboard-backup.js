// Dashboard JavaScript - Main functionality - FIXED VERSION

class Dashboard {
    constructor() {
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
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Dashboard initializing...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Load user data
            await this.loadUserData();
            
            // Initialize UI components
            this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Start real-time notifications polling
            this.startNotificationPolling();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            console.log('✅ Dashboard initialized successfully');
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            const errorMessage = error && error.message ? error.message : 'Unknown error occurred';
            if (window.toast) {
                window.toast.error('Failed to initialize dashboard: ' + errorMessage);
            }
            this.hideLoadingScreen();
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 1000);
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('❌ 401 Unauthorized - redirecting to login');
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error('Failed to load user data');
            }

            const data = await response.json();
            
            // Extract just the user object, not the entire response
            this.currentUser = data.user || data;
            
            console.log('🔍 User data loaded:', this.currentUser);
            
            this.updateUserDisplay();
            
        } catch (error) {
            console.error('Error loading user data:', error);
            const errorMessage = error && error.message ? error.message : 'Failed to load user data';
            if (window.toast) {
                window.toast.error(errorMessage);
            }
            throw error;
        }
    }

    updateUserDisplay() {
        if (!this.currentUser) return;

        // Update user name displays
        const userNameElements = [
            document.getElementById('userName'),
            document.getElementById('welcomeUserName'),
            document.getElementById('profileName')
        ];

        const userName = this.currentUser.full_name || this.currentUser.fullName || this.currentUser.username;
        userNameElements.forEach(element => {
            if (element) {
                element.textContent = userName;
            }
        });

        // Update user avatars
        const avatarElements = [
            document.getElementById('userAvatar'),
            document.getElementById('mobileUserAvatar'),
            document.getElementById('profileAvatar')
        ];

        const initials = this.getUserInitials(userName);
        avatarElements.forEach(element => {
            if (element) {
                element.textContent = initials;
            }
        });

        // Update profile form
        this.updateProfileForm();
    }

    getUserInitials(name) {
        if (!name || typeof name !== 'string') {
            return '?';
        }
        
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    updateProfileForm() {
        if (!this.currentUser) return;

        const elements = {
            fullNameInput: this.currentUser.full_name || this.currentUser.fullName || '',
            emailInput: this.currentUser.email || '',
            profileUsername: '@' + (this.currentUser.username || ''),
            nativeLanguageSelect: this.currentUser.native_language || this.currentUser.nativeLanguage || 'en',
            genderSelect: this.currentUser.gender || '',
            joinedDate: new Date(this.currentUser.created_at).getFullYear()
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
                    element.value = value;
                } else {
                    element.textContent = value;
                }
            }
        });

        // Show verified badge if user is verified
        const verifiedBadge = document.getElementById('verifiedBadge');
        if (verifiedBadge && this.currentUser.is_verified) {
            verifiedBadge.style.display = 'inline-block';
        }
    }

    initializeComponents() {
        // Initialize mobile menu
        this.initializeMobileMenu();
        
        // Initialize navigation
        this.initializeNavigation();
    }

    initializeMobileMenu() {
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
                const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                if (mobileMenuBtn) {
                    mobileMenuBtn.classList.remove('active');
                }
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                    if (mobileMenuBtn) {
                        mobileMenuBtn.classList.remove('active');
                    }
                }
            }
        });
    }

    initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-section]');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });
    }

    showSection(sectionName) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${sectionName}-section`);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        // Update header title and breadcrumb
        const sectionTitle = document.getElementById('sectionTitle');
        const currentSection = document.getElementById('currentSection');
        
        const titles = {
            overview: 'Overview',
            friends: 'Friends',
            requests: 'Friend Requests',
            find: 'Find Friends',
            blocked: 'Blocked Users',
            profile: 'Profile & Settings'
        };

        if (sectionTitle) sectionTitle.textContent = titles[sectionName] || sectionName;
        if (currentSection) currentSection.textContent = titles[sectionName] || sectionName;

        this.currentSection = sectionName;

        // Close mobile sidebar
        const sidebar = document.getElementById('sidebar');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (window.innerWidth <= 768 && sidebar) {
            sidebar.classList.remove('open');
            if (mobileMenuBtn) {
                mobileMenuBtn.classList.remove('active');
            }
        }

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        console.log('💻 Loading section data for:', sectionName);
        switch (sectionName) {
            case 'friends':
                await this.loadFriends();
                break;
            case 'requests':
                console.log('📨 Loading requests section...');
                await this.loadFriendRequests();
                break;
            case 'find':
                this.initializeFindSection();
                break;
            case 'blocked':
                await this.loadBlockedUsers();
                break;
            case 'profile':
                this.initializeProfileSection();
                break;
        }
        console.log('✅ Section data loaded for:', sectionName);
    }

    async loadDashboardData() {
        try {
            await this.loadDashboardStats();
            this.updateBadgeCounts();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadDashboardStats() {
        try {
            // Initialize default stats
            this.stats = {
                friends: 0,
                requests: 0,
                blocked: 0,
                messages: 0,
                languages: 1,
                hours: 0,
                unreadNotifications: 0
            };
            
            // Try to load friend request stats
            try {
                const statsResponse = await fetch('/api/friend-requests/stats', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    this.stats.requests = statsData.stats.received.pending || 0;
                } else if (statsResponse.status === 401) {
                    console.log('❌ 401 error loading stats - user not authenticated');
                    window.location.href = '/login.html';
                    return;
                }
            } catch (error) {
                console.warn('Could not load friend request stats:', error);
            }
            
            this.updateStatsDisplay();
            
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.updateStatsDisplay();
        }
    }

    updateStatsDisplay() {
        const elements = {
            statMessages: this.stats.messages,
            statLanguages: this.stats.languages,
            statFriends: this.stats.friends,
            statHours: this.stats.hours,
            totalFriends: this.stats.friends,
            onlineCount: 1
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateBadgeCounts() {
        const badges = {
            friendsCount: this.stats.friends,
            requestsCount: this.stats.requests,
            blockedCount: this.stats.blocked,
            notificationBadge: this.stats.unreadNotifications || this.stats.requests || 0
        };

        Object.entries(badges).forEach(([id, count]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = count;
                
                // Add notification class for requests and notifications
                if (id === 'requestsCount' || id === 'notificationBadge') {
                    element.classList.toggle('has-notifications', count > 0);
                }
            }
        });
    }

    async loadFriends() {
        console.log('👥 Loading friends list...');
        try {
            const response = await fetch('/api/friends', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.log('❌ 401 error loading friends - redirecting to login');
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(`Friends API failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Friends data received:', data);
            
            // Update friends count in stats
            if (data.stats) {
                this.stats.friends = data.stats.total_friends || 0;
                this.updateStatsDisplay();
            }
            
        } catch (error) {
            console.error('❌ Error loading friends:', error);
        }
    }

    async loadFriendRequests() {
        console.log('📨 Loading friend requests...');
        
        try {
            // Load received requests
            const receivedResponse = await fetch('/api/friend-requests/received', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!receivedResponse.ok) {
                if (receivedResponse.status === 401) {
                    console.log('❌ 401 error loading friend requests - redirecting to login');
                    window.location.href = '/login.html';
                    return;
                }
                console.error('❌ Failed to load received requests:', receivedResponse.status);
                return;
            }
            
            const receivedData = await receivedResponse.json();
            console.log('✅ Received requests:', receivedData);
            this.displayReceivedRequests(receivedData.requests || []);
            
        } catch (error) {
            console.error('❌ Error loading friend requests:', error);
        }
    }

    displayReceivedRequests(requests) {
        const receivedContainer = document.getElementById('received-requests');
        if (!receivedContainer) return;
        
        // Force the container to be visible
        receivedContainer.style.display = 'block';
        receivedContainer.classList.add('active');
        
        if (requests.length === 0) {
            receivedContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📨</div>
                    <h3>No friend requests</h3>
                    <p>You're all caught up! No pending friend requests.</p>
                </div>
            `;
        } else {
            const requestsHTML = requests.map(request => this.createRequestCard(request)).join('');
            receivedContainer.innerHTML = `
                <div class="requests-list">
                    ${requestsHTML}
                </div>
            `;
            
            // Attach button listeners
            setTimeout(() => {
                this.attachRequestButtonListeners();
            }, 100);
        }
        
        // Update badge count
        this.stats.requests = requests.length;
        this.updateBadgeCounts();
    }

    createRequestCard(request) {
        const initials = this.getUserInitials(request.sender_full_name || request.sender_username);
        return `
            <div class="request-card" data-request-id="${request.id}">
                <div class="request-header">
                    <div class="user-avatar">${initials}</div>
                    <div class="request-info">
                        <div class="user-name">${request.sender_full_name || request.sender_username}</div>
                        <div class="user-username">@${request.sender_username}</div>
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

    attachRequestButtonListeners() {
        const buttons = document.querySelectorAll('.action-btn[data-action]');
        buttons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const action = button.dataset.action;
                const requestId = button.dataset.requestId;
                
                if (action === 'accept') {
                    await this.acceptFriendRequest(requestId);
                } else if (action === 'decline') {
                    await this.declineFriendRequest(requestId);
                }
            });
        });
    }

    async acceptFriendRequest(requestId) {
        try {
            const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                if (window.toast) {
                    window.toast.success('Friend request accepted!');
                }
                
                // Remove the request card from UI
                const requestCard = document.querySelector(`[data-request-id="${requestId}"]`);
                if (requestCard) {
                    requestCard.remove();
                }
                
                // Update stats
                this.stats.requests--;
                this.stats.friends++;
                this.updateBadgeCounts();
                this.updateStatsDisplay();
                
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
            const response = await fetch(`/api/friend-requests/${requestId}/decline`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
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

    async loadBlockedUsers() {
        const blockedList = document.getElementById('blockedList');
        const blockedEmptyState = document.getElementById('blockedEmptyState');
        
        if (this.stats.blocked === 0) {
            if (blockedEmptyState) blockedEmptyState.style.display = 'block';
            if (blockedList) blockedList.style.display = 'none';
        } else {
            if (blockedEmptyState) blockedEmptyState.style.display = 'none';
            if (blockedList) blockedList.style.display = 'block';
        }
    }

    initializeProfileSection() {
        // Profile section is already populated in updateProfileForm
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log('🔧 Setting up logout button listeners...');
            
            const logoutHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 Logout button clicked!');
                this.handleLogout();
            };
            
            logoutBtn.addEventListener('click', logoutHandler);
            console.log('✅ Logout button listeners attached');
        } else {
            console.error('❌ Logout button not found!');
        }

        // Save profile button
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.handleSaveProfile());
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
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && searchInput.value.trim()) {
                    this.performUserSearch(searchInput.value.trim());
                }
            });
        }
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
            console.error('Logout error:', error);
            if (window.toast) {
                window.toast.error('Logout failed. Please try again.');
            }
        }
    }

    async handleSaveProfile() {
        try {
            const fullNameInput = document.getElementById('fullNameInput');
            const languageSelect = document.getElementById('nativeLanguageSelect');
            
            if (!fullNameInput || !languageSelect) {
                throw new Error('Required form elements not found!');
            }

            const profileData = {
                full_name: fullNameInput.value || '',
                native_language: languageSelect.value || 'en'
            };
            
            const response = await fetch('/api/dashboard/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login.html';
                    return;
                }
                throw new Error(`Profile API Error: ${response.status}`);
            }

            const responseData = await response.json();
            
            // Update current user
            this.currentUser = { ...this.currentUser, ...profileData };
            this.updateUserDisplay();
            
            if (window.toast) {
                window.toast.success('✅ Profile updated successfully!');
            }
            
        } catch (error) {
            console.error('❌ Save profile error:', error);
            if (window.toast) {
                window.toast.error('Failed to save profile: ' + error.message);
            }
        }
    }

    async performUserSearch(query) {
        console.log('🔍 User search not implemented yet:', query);
        if (window.toast) {
            window.toast.info('User search feature coming soon!');
        }
    }

    startNotificationPolling() {
        console.log('🔔 Starting notification polling...');
        // Basic polling implementation - don't poll too aggressively for now
        this.notificationInterval = setInterval(() => {
            // Check for updates if user is active
            if (document.hasFocus()) {
                this.loadDashboardStats();
            }
        }, 60000); // Check every minute instead of 15 seconds
    }

    stopNotificationPolling() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
        }
    }

    // Add cleanup method
    destroy() {
        this.stopNotificationPolling();
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

console.log('✅ Dashboard.js loaded successfully - FIXED VERSION');
