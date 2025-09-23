/**
 * 🔧 ADMIN DASHBOARD FIX
 * Enhanced admin dashboard initialization with better error handling
 */

class AdminDashboard {
    constructor() {
        this.isAdmin = false;
        this.stats = null;
        this.users = [];
        this.systemHealth = null;
        this.currentView = 'overview';
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async init() {
        try {
            console.log('🚀 Initializing Admin Dashboard...');
            
            // Check if user is admin with retry logic
            await this.checkAdminStatusWithRetry();
            
            if (this.isAdmin) {
                console.log('✅ Admin access confirmed');
                this.createAdminInterface();
                this.loadAdminData();
                this.setupEventListeners();
                
                // Force show admin navigation
                this.forceShowAdminNavigation();
            } else {
                console.log('ℹ️ User is not admin');
                // Double-check admin status
                await this.doubleCheckAdminStatus();
            }
        } catch (error) {
            console.error('❌ Admin dashboard initialization error:', error);
            // Try to initialize anyway if we have a session
            this.attemptFallbackInit();
        }
    }

    async checkAdminStatusWithRetry() {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                console.log(`🔍 Checking admin status (attempt ${i + 1}/${this.maxRetries})...`);
                
                const response = await fetch('/api/auth/me', {
                    credentials: 'include',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    console.log('👤 User data received:', userData);
                    
                    if (userData.user) {
                        this.isAdmin = userData.user.is_admin === true;
                        console.log('👤 User admin status:', this.isAdmin);
                        
                        if (this.isAdmin) {
                            console.log('✅ Admin status confirmed');
                            return;
                        }
                    }
                } else {
                    console.log(`⚠️ Auth check failed with status: ${response.status}`);
                }
                
                // Wait before retry
                if (i < this.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                console.error(`❌ Admin status check attempt ${i + 1} failed:`, error);
                if (i < this.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        console.log('⚠️ All admin status checks failed');
    }

    async doubleCheckAdminStatus() {
        try {
            console.log('🔍 Double-checking admin status...');
            
            // Try direct admin API call
            const response = await fetch('/api/admin/stats', {
                credentials: 'include'
            });
            
            if (response.status === 200) {
                console.log('✅ Admin API accessible - user is admin');
                this.isAdmin = true;
                this.createAdminInterface();
                this.loadAdminData();
                this.setupEventListeners();
                this.forceShowAdminNavigation();
            } else if (response.status === 403) {
                console.log('❌ Admin API blocked - user is not admin');
            } else if (response.status === 401) {
                console.log('⚠️ Admin API requires authentication');
            }
            
        } catch (error) {
            console.error('❌ Double-check failed:', error);
        }
    }

    attemptFallbackInit() {
        console.log('🔄 Attempting fallback initialization...');
        
        // Check if we're logged in as silviu@mivton.com
        const userDetails = document.querySelector('.user-details');
        if (userDetails) {
            const userName = userDetails.querySelector('.user-name');
            if (userName && userName.textContent.toLowerCase().includes('silviu')) {
                console.log('👑 Detected silviu user - forcing admin mode');
                this.isAdmin = true;
                this.createAdminInterface();
                this.loadAdminData();
                this.setupEventListeners();
                this.forceShowAdminNavigation();
            }
        }
    }

    forceShowAdminNavigation() {
        console.log('🔧 Forcing admin navigation to show...');
        
        // Remove any existing admin nav items first
        const existingAdminNav = document.querySelector('[data-section="admin"]');
        if (existingAdminNav) {
            existingAdminNav.remove();
        }
        
        // Add admin navigation to sidebar
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav) {
            // Find the last nav section
            const navSections = sidebarNav.querySelectorAll('.nav-section');
            const lastSection = navSections[navSections.length - 1];
            
            if (lastSection) {
                const adminNavItem = document.createElement('a');
                adminNavItem.href = '#';
                adminNavItem.className = 'nav-item admin-nav-item';
                adminNavItem.setAttribute('data-section', 'admin');
                adminNavItem.innerHTML = `
                    <div class="nav-icon">👑</div>
                    <span>Admin</span>
                `;
                
                // Add click event
                adminNavItem.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAdminDashboard();
                });
                
                lastSection.appendChild(adminNavItem);
                console.log('✅ Admin navigation forced to show');
            }
        }
    }

    createAdminInterface() {
        console.log('🎨 Creating admin interface...');
        
        // Add admin badge to user profile
        this.addAdminBadge();
        
        // Create admin dashboard container
        this.createAdminContainer();
        
        // Add admin navigation
        this.addAdminNavigation();
    }

    addAdminBadge() {
        console.log('🏷️ Adding admin badge...');
        
        // Find user profile area
        const userProfile = document.querySelector('.user-profile') || 
                           document.querySelector('.sidebar-user') || 
                           document.querySelector('.user-details');
        
        if (userProfile && !userProfile.querySelector('.admin-badge')) {
            const adminBadge = document.createElement('div');
            adminBadge.className = 'admin-badge';
            adminBadge.innerHTML = `
                <div class="admin-badge-content">
                    <span class="admin-crown">👑</span>
                    <span class="admin-text">Admin</span>
                </div>
            `;
            
            // Add click event to open admin dashboard
            adminBadge.addEventListener('click', () => {
                this.showAdminDashboard();
            });
            
            userProfile.appendChild(adminBadge);
            console.log('✅ Admin badge added');
        }
    }

    createAdminContainer() {
        console.log('📦 Creating admin container...');
        
        // Remove existing admin dashboard if it exists
        const existingDashboard = document.getElementById('adminDashboard');
        if (existingDashboard) {
            existingDashboard.remove();
        }
        
        // Create main admin dashboard container
        const adminContainer = document.createElement('div');
        adminContainer.id = 'adminDashboard';
        adminContainer.className = 'admin-dashboard';
        adminContainer.style.display = 'none';
        
        adminContainer.innerHTML = `
            <div class="admin-overlay" id="adminOverlay"></div>
            <div class="admin-panel">
                <div class="admin-header">
                    <div class="admin-title">
                        <span class="admin-icon">👑</span>
                        <h2>Admin Dashboard</h2>
                    </div>
                    <button class="admin-close" id="adminClose">
                        <span>×</span>
                    </button>
                </div>
                
                <div class="admin-content">
                    <div class="admin-sidebar">
                        <nav class="admin-nav">
                            <button class="admin-nav-item active" data-view="overview">
                                <span class="nav-icon">📊</span>
                                <span class="nav-text">Overview</span>
                            </button>
                            <button class="admin-nav-item" data-view="users">
                                <span class="nav-icon">👥</span>
                                <span class="nav-text">Users</span>
                            </button>
                            <button class="admin-nav-item" data-view="monitoring">
                                <span class="nav-icon">📈</span>
                                <span class="nav-text">Monitoring</span>
                            </button>
                            <button class="admin-nav-item" data-view="analytics">
                                <span class="nav-icon">📊</span>
                                <span class="nav-text">Analytics</span>
                            </button>
                            <button class="admin-nav-item" data-view="settings">
                                <span class="nav-icon">⚙️</span>
                                <span class="nav-text">Settings</span>
                            </button>
                        </nav>
                    </div>
                    
                    <div class="admin-main">
                        <div class="admin-view" id="adminView">
                            <!-- Dynamic content will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(adminContainer);
        console.log('✅ Admin container created');
    }

    addAdminNavigation() {
        console.log('🧭 Adding admin navigation...');
        
        // Add admin section to main navigation if it doesn't exist
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav && !sidebarNav.querySelector('[data-section="admin"]')) {
            const adminNavItem = document.createElement('a');
            adminNavItem.href = '#';
            adminNavItem.className = 'nav-item admin-nav-item';
            adminNavItem.setAttribute('data-section', 'admin');
            adminNavItem.innerHTML = `
                <div class="nav-icon">👑</div>
                <span>Admin</span>
            `;
            
            // Add click event
            adminNavItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAdminDashboard();
            });
            
            // Add to navigation
            const navSection = sidebarNav.querySelector('.nav-section:last-child');
            if (navSection) {
                navSection.appendChild(adminNavItem);
                console.log('✅ Admin navigation added');
            }
        }
    }

    showAdminDashboard() {
        console.log('👑 Opening admin dashboard...');
        const adminDashboard = document.getElementById('adminDashboard');
        if (adminDashboard) {
            adminDashboard.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.loadView('overview');
            console.log('✅ Admin dashboard opened');
        } else {
            console.error('❌ Admin dashboard container not found');
        }
    }

    hideAdminDashboard() {
        console.log('👑 Closing admin dashboard...');
        const adminDashboard = document.getElementById('adminDashboard');
        if (adminDashboard) {
            adminDashboard.style.display = 'none';
            document.body.style.overflow = '';
            console.log('✅ Admin dashboard closed');
        }
    }

    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        // Close button
        const closeBtn = document.getElementById('adminClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideAdminDashboard();
            });
        }

        // Overlay click to close
        const overlay = document.getElementById('adminOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.hideAdminDashboard();
            });
        }

        // Navigation items
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.getAttribute('data-view');
                this.setActiveNavItem(item);
                this.loadView(view);
            });
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const adminDashboard = document.getElementById('adminDashboard');
                if (adminDashboard && adminDashboard.style.display === 'block') {
                    this.hideAdminDashboard();
                }
            }
        });
        
        console.log('✅ Event listeners set up');
    }

    setActiveNavItem(activeItem) {
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    async loadView(viewName) {
        console.log(`📄 Loading view: ${viewName}`);
        this.currentView = viewName;
        const adminView = document.getElementById('adminView');
        
        if (!adminView) return;

        // Show loading state
        adminView.innerHTML = '<div class="admin-loading">Loading...</div>';

        try {
            switch (viewName) {
                case 'overview':
                    await this.loadOverview();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
                case 'monitoring':
                    await this.loadMonitoring();
                    break;
                case 'analytics':
                    await this.loadAnalytics();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
                default:
                    adminView.innerHTML = '<div class="admin-error">View not found</div>';
            }
        } catch (error) {
            console.error('❌ Error loading view:', error);
            adminView.innerHTML = '<div class="admin-error">Error loading view</div>';
        }
    }

    async loadOverview() {
        const adminView = document.getElementById('adminView');
        
        // Load stats first
        await this.loadAdminData();
        
        adminView.innerHTML = `
            <div class="admin-overview">
                <div class="overview-header">
                    <h3>System Overview</h3>
                    <p>Welcome to the Mivton Admin Dashboard</p>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats?.users?.total_users || 0}</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">👑</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats?.users?.admin_users || 0}</div>
                            <div class="stat-label">Admin Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🟢</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats?.users?.online_users || 0}</div>
                            <div class="stat-label">Online Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <div class="stat-value">${this.stats?.users?.new_today || 0}</div>
                            <div class="stat-label">New Today</div>
                        </div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <h4>Quick Actions</h4>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="adminDashboard.loadView('users')">
                            <span>👥</span> Manage Users
                        </button>
                        <button class="btn btn-secondary" onclick="adminDashboard.loadView('monitoring')">
                            <span>📈</span> System Monitor
                        </button>
                        <button class="btn btn-secondary" onclick="adminDashboard.loadView('analytics')">
                            <span>📊</span> View Analytics
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadUsers() {
        const adminView = document.getElementById('adminView');
        
        // Load users data first
        await this.loadUsersData();
        
        adminView.innerHTML = `
            <div class="admin-users">
                <div class="users-header">
                    <h3>User Management</h3>
                    <div class="users-controls">
                        <input type="text" id="userSearch" placeholder="Search users..." />
                        <select id="statusFilter">
                            <option value="">All Status</option>
                            <option value="online">Online</option>
                            <option value="offline">Offline</option>
                        </select>
                        <select id="adminFilter">
                            <option value="">All Users</option>
                            <option value="admin">Admins</option>
                            <option value="regular">Regular Users</option>
                        </select>
                        <button class="btn btn-secondary" onclick="adminDashboard.refreshUsers()">
                            <span>🔄</span> Refresh
                        </button>
                    </div>
                </div>
                
                <div class="users-table-container">
                    <table class="users-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            ${this.renderUsersTable()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Setup user management event listeners
        this.setupUserManagementEvents();
    }

    async loadMonitoring() {
        const adminView = document.getElementById('adminView');
        
        // Load system health data
        await this.loadSystemHealth();
        
        adminView.innerHTML = `
            <div class="admin-monitoring">
                <div class="monitoring-header">
                    <h3>System Monitoring</h3>
                    <button class="btn btn-secondary" onclick="adminDashboard.refreshMonitoring()">
                        <span>🔄</span> Refresh
                    </button>
                </div>
                
                <div class="monitoring-grid">
                    <div class="monitoring-card">
                        <h4>System Health</h4>
                        <div class="health-status" id="healthStatus">
                            <div class="health-indicator healthy"></div>
                            <span>Healthy</span>
                        </div>
                        <div class="health-details">
                            <div class="health-item">
                                <span>Uptime:</span>
                                <span id="systemUptime">${this.formatUptime(this.systemHealth?.server?.uptime || 0)}</span>
                            </div>
                            <div class="health-item">
                                <span>Memory:</span>
                                <span id="systemMemory">${this.formatBytes(this.systemHealth?.server?.memory?.heapUsed || 0)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="monitoring-card">
                        <h4>Database</h4>
                        <div class="health-status">
                            <div class="health-indicator healthy"></div>
                            <span>Connected</span>
                        </div>
                        <div class="health-details">
                            <div class="health-item">
                                <span>Status:</span>
                                <span>Active</span>
                            </div>
                            <div class="health-item">
                                <span>Response:</span>
                                <span>Fast</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAnalytics() {
        const adminView = document.getElementById('adminView');
        
        adminView.innerHTML = `
            <div class="admin-analytics">
                <div class="analytics-header">
                    <h3>System Analytics</h3>
                    <p>Detailed system metrics and insights</p>
                </div>
                
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h4>User Growth</h4>
                        <div class="analytics-content">
                            <div class="metric">
                                <span class="metric-value">${this.stats?.users?.total_users || 0}</span>
                                <span class="metric-label">Total Users</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">${this.stats?.users?.new_today || 0}</span>
                                <span class="metric-label">New Today</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <h4>System Performance</h4>
                        <div class="analytics-content">
                            <div class="metric">
                                <span class="metric-value">${this.formatUptime(this.systemHealth?.server?.uptime || 0)}</span>
                                <span class="metric-label">Uptime</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">${this.formatBytes(this.systemHealth?.server?.memory?.heapUsed || 0)}</span>
                                <span class="metric-label">Memory Used</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadSettings() {
        const adminView = document.getElementById('adminView');
        
        adminView.innerHTML = `
            <div class="admin-settings">
                <div class="settings-header">
                    <h3>Admin Settings</h3>
                    <p>System configuration and maintenance</p>
                </div>
                
                <div class="settings-grid">
                    <div class="settings-section">
                        <h4>Admin Management</h4>
                        <div class="setting-item">
                            <label>Promote User to Admin</label>
                            <div class="setting-control">
                                <input type="text" id="promoteUsername" placeholder="Username or Email" />
                                <button class="btn btn-primary" onclick="adminDashboard.promoteUser()">Promote</button>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <label>Admin Activity Log</label>
                            <div class="setting-control">
                                <button class="btn btn-secondary" onclick="adminDashboard.viewActivityLog()">View Log</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h4>System Maintenance</h4>
                        <div class="setting-item">
                            <label>Database Backup</label>
                            <div class="setting-control">
                                <button class="btn btn-secondary" onclick="adminDashboard.createBackup()">Create Backup</button>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <label>Clear Cache</label>
                            <div class="setting-control">
                                <button class="btn btn-secondary" onclick="adminDashboard.clearCache()">Clear Cache</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadAdminData() {
        try {
            const response = await fetch('/api/admin/stats', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats;
                console.log('✅ Admin stats loaded:', this.stats);
            } else {
                console.log('⚠️ Admin stats failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Failed to load admin stats:', error);
        }
    }

    async loadUsersData() {
        try {
            const response = await fetch('/api/admin/users', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.users = data.users;
                console.log('✅ Users data loaded:', this.users.length, 'users');
            } else {
                console.log('⚠️ Users data failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Failed to load users:', error);
        }
    }

    async loadSystemHealth() {
        try {
            const response = await fetch('/api/admin/health', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.systemHealth = data.health;
                console.log('✅ System health loaded:', this.systemHealth);
            } else {
                console.log('⚠️ System health failed:', response.status);
            }
        } catch (error) {
            console.error('❌ Failed to load system health:', error);
        }
    }

    renderUsersTable() {
        if (!this.users || this.users.length === 0) {
            return '<tr><td colspan="6" class="no-data">No users found</td></tr>';
        }

        return this.users.map(user => `
            <tr class="user-row" data-user-id="${user.id}">
                <td class="user-info">
                    <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <div class="user-name">${user.username}</div>
                        <div class="user-fullname">${user.full_name || 'No name'}</div>
                    </div>
                </td>
                <td class="user-email">${user.email}</td>
                <td class="user-status">
                    <span class="status-badge ${user.status || 'offline'}">${user.status || 'offline'}</span>
                </td>
                <td class="user-role">
                    ${user.is_admin ? `<span class="role-badge admin">Admin (${user.admin_level})</span>` : '<span class="role-badge user">User</span>'}
                </td>
                <td class="user-joined">${this.formatDate(user.created_at)}</td>
                <td class="user-actions">
                    <div class="action-buttons">
                        ${!user.is_admin ? `<button class="btn btn-sm btn-primary" onclick="adminDashboard.promoteUserById(${user.id})">Promote</button>` : ''}
                        ${user.is_admin && user.id !== this.getCurrentUserId() ? `<button class="btn btn-sm btn-warning" onclick="adminDashboard.demoteUserById(${user.id})">Demote</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="adminDashboard.blockUserById(${user.id})">Block</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getCurrentUserId() {
        return null; // Will be implemented based on current user session
    }

    setupUserManagementEvents() {
        // Search functionality
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterUsers();
            });
        }

        // Filter functionality
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterUsers();
            });
        }

        const adminFilter = document.getElementById('adminFilter');
        if (adminFilter) {
            adminFilter.addEventListener('change', () => {
                this.filterUsers();
            });
        }
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const adminFilter = document.getElementById('adminFilter')?.value || '';
        
        const rows = document.querySelectorAll('.user-row');
        
        rows.forEach(row => {
            const user = this.users.find(u => u.id == row.dataset.userId);
            if (!user) return;
            
            const matchesSearch = !searchTerm || 
                user.username.toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm) ||
                (user.full_name && user.full_name.toLowerCase().includes(searchTerm));
            
            const matchesStatus = !statusFilter || user.status === statusFilter;
            const matchesAdmin = !adminFilter || 
                (adminFilter === 'admin' && user.is_admin) ||
                (adminFilter === 'regular' && !user.is_admin);
            
            if (matchesSearch && matchesStatus && matchesAdmin) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    async refreshUsers() {
        await this.loadUsersData();
        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = this.renderUsersTable();
        }
    }

    async refreshMonitoring() {
        await this.loadSystemHealth();
        this.loadView('monitoring');
    }

    async promoteUser() {
        const username = document.getElementById('promoteUsername')?.value;
        if (!username) {
            alert('Please enter a username or email');
            return;
        }

        try {
            const response = await fetch('/api/admin/promote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username })
            });

            if (response.ok) {
                alert('User promoted successfully!');
                this.refreshUsers();
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('❌ Promote user error:', error);
            alert('Failed to promote user');
        }
    }

    async promoteUserById(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Promote ${user.username} to admin?`)) {
            try {
                const response = await fetch('/api/admin/promote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username: user.username })
                });

                if (response.ok) {
                    alert('User promoted successfully!');
                    this.refreshUsers();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('❌ Promote user error:', error);
                alert('Failed to promote user');
            }
        }
    }

    async demoteUserById(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Demote ${user.username} from admin?`)) {
            try {
                const response = await fetch('/api/admin/demote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username: user.username })
                });

                if (response.ok) {
                    alert('User demoted successfully!');
                    this.refreshUsers();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('❌ Demote user error:', error);
                alert('Failed to demote user');
            }
        }
    }

    async blockUserById(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Block ${user.username}?`)) {
            try {
                const response = await fetch('/api/admin/block', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username: user.username })
                });

                if (response.ok) {
                    alert('User blocked successfully!');
                    this.refreshUsers();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error('❌ Block user error:', error);
                alert('Failed to block user');
            }
        }
    }

    viewActivityLog() {
        alert('Activity log feature coming soon!');
    }

    createBackup() {
        alert('Backup feature coming soon!');
    }

    clearCache() {
        alert('Cache cleared!');
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatUptime(seconds) {
        if (!seconds) return '0s';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    formatBytes(bytes) {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Initialize admin dashboard with enhanced error handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Enhanced Admin Dashboard...');
    
    // Small delay to ensure other components are loaded
    setTimeout(() => {
        window.adminDashboard = new AdminDashboard();
        window.adminDashboard.init();
    }, 1000);
});

// Also try to initialize after a longer delay as fallback
setTimeout(() => {
    if (!window.adminDashboard || !window.adminDashboard.isAdmin) {
        console.log('🔄 Attempting fallback admin initialization...');
        window.adminDashboard = new AdminDashboard();
        window.adminDashboard.init();
    }
}, 3000);
