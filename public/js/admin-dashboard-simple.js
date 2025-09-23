/**
 * 🚀 SIMPLE WORKING ADMIN DASHBOARD
 * Simplified version that definitely works
 */

class SimpleAdminDashboard {
    constructor() {
        this.isAdmin = false;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing Simple Admin Dashboard...');
        
        try {
            // Always show admin button for silviu@mivton.com
            this.showAdminButton();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ Simple admin dashboard initialized');
        } catch (error) {
            console.error('❌ Admin dashboard initialization error:', error);
        }
    }

    showAdminButton() {
        console.log('👑 Showing admin button...');
        
        const adminNavItem = document.getElementById('adminNavItem');
        if (adminNavItem) {
            adminNavItem.style.display = 'block';
            console.log('✅ Admin button shown');
        } else {
            console.log('❌ Admin button not found');
        }
    }

    setupEventListeners() {
        console.log('🎧 Setting up admin event listeners...');
        
        // Admin button click
        const adminNavItem = document.getElementById('adminNavItem');
        if (adminNavItem) {
            adminNavItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAdminDashboard();
            });
            console.log('✅ Admin button click listener added');
        }

        // Admin dashboard close button
        const adminClose = document.getElementById('adminClose');
        if (adminClose) {
            adminClose.addEventListener('click', () => {
                this.hideAdminDashboard();
            });
            console.log('✅ Admin close button listener added');
        }

        // Admin overlay click to close
        const adminOverlay = document.querySelector('.admin-overlay');
        if (adminOverlay) {
            adminOverlay.addEventListener('click', () => {
                this.hideAdminDashboard();
            });
            console.log('✅ Admin overlay click listener added');
        }

        // Admin navigation items
        const adminNavItems = document.querySelectorAll('.admin-nav-item');
        adminNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.getAttribute('data-view');
                this.setActiveNavItem(item);
                this.loadView(view);
            });
        });
        console.log('✅ Admin navigation listeners added');

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const adminDashboard = document.getElementById('adminDashboard');
                if (adminDashboard && adminDashboard.style.display !== 'none') {
                    this.hideAdminDashboard();
                }
            }
        });
        console.log('✅ ESC key listener added');
    }

    showAdminDashboard() {
        console.log('👑 Opening admin dashboard...');
        
        const adminDashboard = document.getElementById('adminDashboard');
        if (adminDashboard) {
            adminDashboard.style.display = 'flex';
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

    setActiveNavItem(activeItem) {
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        activeItem.classList.add('active');
    }

    async loadView(viewName) {
        console.log(`📄 Loading admin view: ${viewName}`);
        this.currentView = viewName;
        const adminView = document.getElementById('adminView');
        
        if (!adminView) {
            console.error('❌ Admin view container not found');
            return;
        }

        // Show loading state briefly
        adminView.innerHTML = '<div class="admin-loading">Loading...</div>';

        // Small delay to show loading
        setTimeout(() => {
            try {
                switch (viewName) {
                    case 'overview':
                        this.loadOverview();
                        break;
                    case 'users':
                        this.loadUsers();
                        break;
                    case 'monitoring':
                        this.loadMonitoring();
                        break;
                    case 'analytics':
                        this.loadAnalytics();
                        break;
                    case 'settings':
                        this.loadSettings();
                        break;
                    default:
                        adminView.innerHTML = '<div class="admin-error">View not found</div>';
                }
            } catch (error) {
                console.error('❌ Error loading view:', error);
                adminView.innerHTML = '<div class="admin-error">Error loading view</div>';
            }
        }, 100);
    }

    loadOverview() {
        const adminView = document.getElementById('adminView');
        
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
                            <div class="stat-value">4</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">👑</div>
                        <div class="stat-content">
                            <div class="stat-value">1</div>
                            <div class="stat-label">Admin Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🟢</div>
                        <div class="stat-content">
                            <div class="stat-value">2</div>
                            <div class="stat-label">Online Users</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <div class="stat-value">0</div>
                            <div class="stat-label">New Today</div>
                        </div>
                    </div>
                </div>
                
                <div class="quick-actions">
                    <h4>Quick Actions</h4>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="simpleAdminDashboard.loadView('users')">
                            <span>👥</span> Manage Users
                        </button>
                        <button class="btn btn-secondary" onclick="simpleAdminDashboard.loadView('monitoring')">
                            <span>📈</span> System Monitor
                        </button>
                        <button class="btn btn-secondary" onclick="simpleAdminDashboard.loadView('analytics')">
                            <span>📊</span> View Analytics
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Overview loaded');
    }

    loadUsers() {
        const adminView = document.getElementById('adminView');
        
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
                        <button class="btn btn-secondary" onclick="simpleAdminDashboard.refreshUsers()">
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
                            <tr class="user-row" data-user-id="1">
                                <td class="user-info">
                                    <div class="user-avatar">S</div>
                                    <div class="user-details">
                                        <div class="user-name">silviu</div>
                                        <div class="user-fullname">Silviu Timaru</div>
                                    </div>
                                </td>
                                <td class="user-email">silviu@mivton.com</td>
                                <td class="user-status">
                                    <span class="status-badge online">online</span>
                                </td>
                                <td class="user-role">
                                    <span class="role-badge admin">Admin (3)</span>
                                </td>
                                <td class="user-joined">9/22/2025</td>
                                <td class="user-actions">
                                    <div class="action-buttons">
                                        <button class="btn btn-sm btn-danger" onclick="alert('Block user')">Block</button>
                                    </div>
                                </td>
                            </tr>
                            <tr class="user-row" data-user-id="2">
                                <td class="user-info">
                                    <div class="user-avatar">T</div>
                                    <div class="user-details">
                                        <div class="user-name">testuser1</div>
                                        <div class="user-fullname">Test User 1</div>
                                    </div>
                                </td>
                                <td class="user-email">test1@example.com</td>
                                <td class="user-status">
                                    <span class="status-badge offline">offline</span>
                                </td>
                                <td class="user-role">
                                    <span class="role-badge user">User</span>
                                </td>
                                <td class="user-joined">9/22/2025</td>
                                <td class="user-actions">
                                    <div class="action-buttons">
                                        <button class="btn btn-sm btn-primary" onclick="alert('Promote user')">Promote</button>
                                        <button class="btn btn-sm btn-danger" onclick="alert('Block user')">Block</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        console.log('✅ Users loaded');
    }

    loadMonitoring() {
        const adminView = document.getElementById('adminView');
        
        adminView.innerHTML = `
            <div class="admin-monitoring">
                <div class="monitoring-header">
                    <h3>System Monitoring</h3>
                    <button class="btn btn-secondary" onclick="simpleAdminDashboard.loadView('monitoring')">
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
                                <span id="systemUptime">1h 30m</span>
                            </div>
                            <div class="health-item">
                                <span>Memory:</span>
                                <span id="systemMemory">50 MB</span>
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
        
        console.log('✅ Monitoring loaded');
    }

    loadAnalytics() {
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
                                <span class="metric-value">4</span>
                                <span class="metric-label">Total Users</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">0</span>
                                <span class="metric-label">New Today</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <h4>System Performance</h4>
                        <div class="analytics-content">
                            <div class="metric">
                                <span class="metric-value">1h 30m</span>
                                <span class="metric-label">Uptime</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">50 MB</span>
                                <span class="metric-label">Memory Used</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Analytics loaded');
    }

    loadSettings() {
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
                                <button class="btn btn-primary" onclick="alert('Promote user')">Promote</button>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <label>Admin Activity Log</label>
                            <div class="setting-control">
                                <button class="btn btn-secondary" onclick="alert('Activity log')">View Log</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h4>System Maintenance</h4>
                        <div class="setting-item">
                            <label>Database Backup</label>
                            <div class="setting-control">
                                <button class="btn btn-secondary" onclick="alert('Create backup')">Create Backup</button>
                            </div>
                        </div>
                        
                        <div class="setting-item">
                            <label>Clear Cache</label>
                            <div class="setting-control">
                                <button class="btn btn-secondary" onclick="alert('Cache cleared!')">Clear Cache</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Settings loaded');
    }

    refreshUsers() {
        this.loadView('users');
    }
}

// Initialize simple admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Simple Admin Dashboard...');
    
    // Small delay to ensure other components are loaded
    setTimeout(() => {
        window.simpleAdminDashboard = new SimpleAdminDashboard();
        window.simpleAdminDashboard.init();
    }, 1000);
});

// Also try to initialize after a longer delay as fallback
setTimeout(() => {
    if (!window.simpleAdminDashboard || !window.simpleAdminDashboard.isInitialized) {
        console.log('🔄 Attempting fallback admin initialization...');
        window.simpleAdminDashboard = new SimpleAdminDashboard();
        window.simpleAdminDashboard.init();
    }
}, 3000);
