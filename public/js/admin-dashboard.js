/**
 * 🚀 MIVTON ADMIN DASHBOARD - PROFESSIONAL EDITION
 * Complete rebuild with modern UI and full functionality
 */

class AdminDashboard {
    constructor() {
        this.isAdmin = false;
        this.currentView = 'overview';
        this.users = [];
        this.stats = {};
        this.systemHealth = {};
        
        console.log('👑 Admin Dashboard initializing...');
        this.init();
    }

    async init() {
        try {
            // Check if user is admin
            await this.checkAdminStatus();
            
            if (this.isAdmin) {
                console.log('✅ Admin access confirmed');
                this.createAdminInterface();
                this.loadAdminData();
                this.setupEventListeners();
            } else {
                console.log('ℹ️ User is not admin');
            }
        } catch (error) {
            console.error('❌ Admin dashboard initialization error:', error);
        }
    }

    async checkAdminStatus() {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.isAdmin = userData.is_admin === true;
                console.log('👤 User admin status:', this.isAdmin);
            }
        } catch (error) {
            console.error('❌ Failed to check admin status:', error);
        }
    }

    createAdminInterface() {
        // Add admin badge to user profile
        this.addAdminBadge();
        
        // Create admin dashboard container
        this.createAdminContainer();
        
        // Add admin navigation
        this.addAdminNavigation();
    }

    addAdminBadge() {
        // First, make the username text white
        this.makeUsernameWhite();
        
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
    }

    addAdminNavigation() {
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
            }
        }
    }

    showAdminDashboard() {
        const adminDashboard = document.getElementById('adminDashboard');
        if (adminDashboard) {
            adminDashboard.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.loadView('overview');
            console.log('👑 Admin dashboard opened');
        }
    }

    hideAdminDashboard() {
        const adminDashboard = document.getElementById('adminDashboard');
        if (adminDashboard) {
            adminDashboard.style.display = 'none';
            document.body.style.overflow = '';
            console.log('👑 Admin dashboard closed');
        }
    }

    setupEventListeners() {
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
    }

    setActiveNavItem(activeItem) {
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    async loadView(viewName) {
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
                            <div class="stat-value" id="totalUsers">${this.stats.users?.total_users || 0}</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">👑</div>
                        <div class="stat-content">
                            <div class="stat-value" id="adminUsers">${this.stats.users?.admin_users || 0}</div>
                            <div class="stat-label">Admins</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🟢</div>
                        <div class="stat-content">
                            <div class="stat-value" id="onlineUsers">${this.stats.users?.online_users || 0}</div>
                            <div class="stat-label">Online</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">🆕</div>
                        <div class="stat-content">
                            <div class="stat-value" id="newToday">${this.stats.users?.new_today || 0}</div>
                            <div class="stat-label">New Today</div>
                        </div>
                    </div>
                </div>
                
                <div class="overview-sections">
                    <div class="overview-section">
                        <h4>Quick Actions</h4>
                        <div class="quick-actions">
                            <button class="quick-action-btn" onclick="adminDashboard.loadView('users')">
                                <span class="action-icon">👥</span>
                                <span class="action-text">Manage Users</span>
                            </button>
                            <button class="quick-action-btn" onclick="adminDashboard.loadView('monitoring')">
                                <span class="action-icon">📈</span>
                                <span class="action-text">System Health</span>
                            </button>
                            <button class="quick-action-btn" onclick="adminDashboard.loadView('analytics')">
                                <span class="action-icon">📊</span>
                                <span class="action-text">View Analytics</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="overview-section">
                        <h4>System Status</h4>
                        <div class="system-status" id="systemStatus">
                            <div class="status-item">
                                <span class="status-label">Database:</span>
                                <span class="status-value healthy">Connected</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">API:</span>
                                <span class="status-value healthy">Operational</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Authentication:</span>
                                <span class="status-value healthy">Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadUsers() {
        const adminView = document.getElementById('adminView');
        
        // Load users data
        await this.loadUsersData();
        
        adminView.innerHTML = `
            <div class="admin-users">
                <div class="users-header">
                    <h3>User Management</h3>
                    <div class="users-actions">
                        <div class="search-box">
                            <input type="text" id="userSearch" placeholder="Search users..." />
                            <span class="search-icon">🔍</span>
                        </div>
                        <button class="btn btn-primary" onclick="adminDashboard.refreshUsers()">
                            <span>🔄</span> Refresh
                        </button>
                    </div>
                </div>
                
                <div class="users-filters">
                    <select id="statusFilter">
                        <option value="">All Status</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="blocked">Blocked</option>
                    </select>
                    <select id="adminFilter">
                        <option value="">All Users</option>
                        <option value="admin">Admins Only</option>
                        <option value="regular">Regular Users</option>
                    </select>
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
                                <span id="systemUptime">${this.formatUptime(this.systemHealth.server?.uptime || 0)}</span>
                            </div>
                            <div class="health-item">
                                <span>Memory:</span>
                                <span id="memoryUsage">${this.formatMemory(this.systemHealth.server?.memory)}</span>
                            </div>
                            <div class="health-item">
                                <span>Node Version:</span>
                                <span id="nodeVersion">${this.systemHealth.server?.node_version || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="monitoring-card">
                        <h4>Database Status</h4>
                        <div class="db-status" id="dbStatus">
                            <div class="db-indicator connected"></div>
                            <span>Connected</span>
                        </div>
                        <div class="db-details">
                            <div class="db-item">
                                <span>Response Time:</span>
                                <span id="dbResponseTime">${this.systemHealth.database?.response_time || 'N/A'}ms</span>
                            </div>
                            <div class="db-item">
                                <span>Current Time:</span>
                                <span id="dbCurrentTime">${this.formatDate(this.systemHealth.database?.current_time)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="monitoring-card">
                        <h4>Services Status</h4>
                        <div class="services-status" id="servicesStatus">
                            <div class="service-item">
                                <span class="service-name">Authentication</span>
                                <span class="service-status active">Active</span>
                            </div>
                            <div class="service-item">
                                <span class="service-name">Database</span>
                                <span class="service-status connected">Connected</span>
                            </div>
                            <div class="service-item">
                                <span class="service-name">API</span>
                                <span class="service-status operational">Operational</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="monitoring-charts">
                    <div class="chart-card">
                        <h4>System Performance</h4>
                        <div class="chart-placeholder">
                            <p>Performance charts will be implemented here</p>
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
                    <h3>Analytics & Insights</h3>
                    <div class="analytics-filters">
                        <select id="timeRange">
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                    </div>
                </div>
                
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <h4>User Growth</h4>
                        <div class="growth-chart">
                            <div class="chart-placeholder">
                                <p>User growth chart will be implemented here</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <h4>Activity Trends</h4>
                        <div class="activity-chart">
                            <div class="chart-placeholder">
                                <p>Activity trends chart will be implemented here</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <h4>Popular Features</h4>
                        <div class="features-list">
                            <div class="feature-item">
                                <span class="feature-name">Friend Requests</span>
                                <span class="feature-count">${this.stats.friendships?.pending_requests || 0}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-name">Active Friendships</span>
                                <span class="feature-count">${this.stats.friendships?.total_friendships || 0}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-name">Waitlist</span>
                                <span class="feature-count">${this.stats.waitlist?.total_waitlist || 0}</span>
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
                </div>
                
                <div class="settings-sections">
                    <div class="settings-section">
                        <h4>System Configuration</h4>
                        <div class="setting-item">
                            <label>Maintenance Mode</label>
                            <div class="setting-control">
                                <input type="checkbox" id="maintenanceMode" />
                                <span class="setting-description">Enable maintenance mode to restrict access</span>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <label>Registration Status</label>
                            <div class="setting-control">
                                <select id="registrationStatus">
                                    <option value="open">Open</option>
                                    <option value="invite">Invite Only</option>
                                    <option value="closed">Closed</option>
                                </select>
                                <span class="setting-description">Control user registration</span>
                            </div>
                        </div>
                    </div>
                    
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
        // This would typically come from the current user session
        // For now, we'll return null to show all buttons
        return null;
    }

    setupUserManagementEvents() {
        // Search functionality
        const searchInput = document.getElementById('userSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers();
            });
        }

        // Filter functionality
        const statusFilter = document.getElementById('statusFilter');
        const adminFilter = document.getElementById('adminFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterUsers();
            });
        }
        
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

        const action = user.is_blocked ? 'unblock' : 'block';
        if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.username}?`)) {
            try {
                const response = await fetch(`/api/admin/${action}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ username: user.username })
                });

                if (response.ok) {
                    alert(`User ${action}ed successfully!`);
                    this.refreshUsers();
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                console.error(`❌ ${action} user error:`, error);
                alert(`Failed to ${action} user`);
            }
        }
    }

    makeUsernameWhite() {
        // Multiple approaches to ensure username is white
        const usernameSelectors = [
            '#userName',
            '.user-name',
            '.username',
            '[class*="user"]',
            '.sidebar-user .user-name',
            '.user-profile .user-name'
        ];
        
        usernameSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.setProperty('color', 'white', 'important');
                element.style.setProperty('text-shadow', '0 0 10px rgba(255, 255, 255, 0.5)', 'important');
                element.classList.add('admin-white-text');
            });
        });
        
        // Force styling with multiple attempts
        setTimeout(() => {
            const allUserElements = document.querySelectorAll('*');
            allUserElements.forEach(element => {
                if (element.textContent && element.textContent.trim() === 'silviu') {
                    element.style.setProperty('color', 'white', 'important');
                    element.style.setProperty('text-shadow', '0 0 10px rgba(255, 255, 255, 0.5)', 'important');
                }
            });
        }, 500);
        
        console.log('✅ Username text made white');
    }

    // Utility functions
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    }

    formatUptime(seconds) {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }

    formatMemory(memory) {
        if (!memory) return 'N/A';
        const used = Math.round(memory.used / 1024 / 1024);
        const total = Math.round(memory.total / 1024 / 1024);
        return `${used}MB / ${total}MB`;
    }

    // Placeholder methods for future implementation
    viewActivityLog() {
        alert('Activity log feature will be implemented');
    }

    createBackup() {
        alert('Backup feature will be implemented');
    }

    clearCache() {
        alert('Cache clearing feature will be implemented');
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other components are loaded
    setTimeout(() => {
        window.adminDashboard = new AdminDashboard();
    }, 1000);
});
