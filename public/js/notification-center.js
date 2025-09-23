/**
 * 🚀 MIVTON PHASE 3.2 - NOTIFICATION CENTER COMPONENT
 * Real-time notification management interface
 * 
 * Features:
 * - Real-time notification display
 * - Mark as read/unread functionality
 * - Notification filtering and grouping
 * - Sound and desktop notification controls
 * - Responsive design with animations
 */

class NotificationCenter {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isOpen = false;
        this.currentFilter = 'all';
        this.soundEnabled = true;
        this.desktopEnabled = true;
        this.autoMarkRead = false;
        
        this.init();
    }

    /**
     * Initialize notification center
     */
    init() {
        console.log('🔔 Initializing Notification Center...');
        
        this.createNotificationCenter();
        this.bindEvents();
        this.loadNotifications();
        this.setupSocketListeners();
        
        console.log('✅ Notification Center initialized');
    }

    /**
     * Create notification center HTML structure
     */
    createNotificationCenter() {
        const notificationHTML = `
            <!-- Notification Bell -->
            <div class="notification-bell" id="notificationBell">
                <svg class="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span class="notification-badge" id="notificationBadge" style="display: none;">0</span>
            </div>

            <!-- Notification Panel -->
            <div class="notification-panel" id="notificationPanel">
                <div class="notification-header">
                    <h3>Notifications</h3>
                    <div class="notification-controls">
                        <select class="notification-filter" id="notificationFilter">
                            <option value="all">All</option>
                            <option value="friend_request">Friend Requests</option>
                            <option value="friend_accepted">Friend Accepted</option>
                            <option value="friend_online">Friends Online</option>
                            <option value="friend_message">Messages</option>
                        </select>
                        <button class="btn-mark-all-read" id="markAllRead">Mark All Read</button>
                        <button class="btn-settings" id="notificationSettings">⚙️</button>
                        <button class="btn-close" id="closeNotifications">×</button>
                    </div>
                </div>

                <div class="notification-stats" id="notificationStats">
                    <div class="stat-item">
                        <span class="stat-value" id="unreadCount">0</span>
                        <span class="stat-label">Unread</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="totalCount">0</span>
                        <span class="stat-label">Total</span>
                    </div>
                </div>

                <div class="notification-content">
                    <div class="notification-loading" id="notificationLoading">
                        <div class="loading-spinner"></div>
                        <p>Loading notifications...</p>
                    </div>

                    <div class="notification-empty" id="notificationEmpty" style="display: none;">
                        <div class="empty-icon">🔔</div>
                        <h4>No notifications</h4>
                        <p>All caught up! You'll see new notifications here.</p>
                    </div>

                    <div class="notifications-list" id="notificationsList"></div>
                </div>

                <div class="notification-footer">
                    <button class="btn-load-more" id="loadMoreNotifications" style="display: none;">
                        Load More
                    </button>
                </div>
            </div>

            <!-- Notification Settings Modal -->
            <div class="notification-settings-modal" id="notificationSettingsModal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Notification Settings</h3>
                        <button class="btn-close" id="closeSettings">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="setting-group">
                            <h4>Sound Notifications</h4>
                            <label class="toggle-switch">
                                <input type="checkbox" id="soundToggle" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-group">
                            <h4>Desktop Notifications</h4>
                            <label class="toggle-switch">
                                <input type="checkbox" id="desktopToggle" checked>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-group">
                            <h4>Auto Mark as Read</h4>
                            <label class="toggle-switch">
                                <input type="checkbox" id="autoMarkToggle">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-group">
                            <h4>Notification Types</h4>
                            <div class="notification-types" id="notificationTypes">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="resetSettings">Reset to Default</button>
                        <button class="btn-primary" id="saveSettings">Save Settings</button>
                    </div>
                </div>
            </div>
        `;

        // Find a container to append to or create one
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.innerHTML = notificationHTML;
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Notification bell click
        document.getElementById('notificationBell').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notificationPanel');
            const bell = document.getElementById('notificationBell');
            
            if (this.isOpen && !panel.contains(e.target) && !bell.contains(e.target)) {
                this.closePanel();
            }
        });

        // Filter change
        document.getElementById('notificationFilter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterNotifications();
        });

        // Mark all as read
        document.getElementById('markAllRead').addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Close panel
        document.getElementById('closeNotifications').addEventListener('click', () => {
            this.closePanel();
        });

        // Load more
        document.getElementById('loadMoreNotifications').addEventListener('click', () => {
            this.loadMoreNotifications();
        });

        // Settings
        document.getElementById('notificationSettings').addEventListener('click', () => {
            this.openSettings();
        });

        // Settings modal events
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('resetSettings').addEventListener('click', () => {
            this.resetSettings();
        });

        // Toggle switches
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
        });

        document.getElementById('desktopToggle').addEventListener('change', (e) => {
            this.desktopEnabled = e.target.checked;
        });

        document.getElementById('autoMarkToggle').addEventListener('change', (e) => {
            this.autoMarkRead = e.target.checked;
        });
    }

    /**
     * Setup socket listeners
     */
    setupSocketListeners() {
        if (window.socketClient) {
            // Listen for new notifications
            window.socketClient.on('notification', (notification) => {
                this.addNotification(notification);
            });

            // Listen for initial notifications
            window.socketClient.on('notifications:initial', (notifications) => {
                this.setNotifications(notifications);
            });

            // Listen for notification read updates
            window.socketClient.on('notification:read', (data) => {
                this.markNotificationAsRead(data.id);
            });

            // Listen for all read update
            window.socketClient.on('notifications:all_read', (data) => {
                this.markAllNotificationsAsRead();
            });
        }
    }

    /**
     * Toggle notification panel
     */
    togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    /**
     * Open notification panel
     */
    openPanel() {
        const panel = document.getElementById('notificationPanel');
        const bell = document.getElementById('notificationBell');
        
        panel.classList.add('open');
        bell.classList.add('active');
        this.isOpen = true;

        // Auto-mark notifications as read if enabled
        if (this.autoMarkRead) {
            setTimeout(() => this.markVisibleAsRead(), 1000);
        }

        // Animate in
        panel.style.animation = 'slideInRight 0.3s ease-out';
    }

    /**
     * Close notification panel
     */
    closePanel() {
        const panel = document.getElementById('notificationPanel');
        const bell = document.getElementById('notificationBell');
        
        panel.style.animation = 'slideOutRight 0.3s ease-in';
        
        setTimeout(() => {
            panel.classList.remove('open');
            bell.classList.remove('active');
            this.isOpen = false;
        }, 300);
    }

    /**
     * Load notifications from API
     */
    async loadNotifications() {
        try {
            this.showLoading(true);
            console.log('📋 Loading notifications from Phase 3.2 API...');

            const response = await fetch('/api/notifications?limit=50', {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            console.log('📋 Notifications API response:', data);

            if (data.success) {
                this.setNotifications(data.notifications);
                this.updateStats(data.stats);
                console.log('✅ Notifications loaded successfully');
            } else {
                console.error('❌ Failed to load notifications:', data.error);
                this.showError('Failed to load notifications');
            }

        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            this.showError('Error loading notifications');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Load more notifications
     */
    async loadMoreNotifications() {
        try {
            const currentCount = this.notifications.length;
            
            const response = await fetch(`/api/notifications?limit=25&offset=${currentCount}`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                data.notifications.forEach(notification => {
                    this.notifications.push(notification);
                });
                this.renderNotifications();
            }

        } catch (error) {
            console.error('❌ Error loading more notifications:', error);
        }
    }

    /**
     * Set notifications
     * @param {Array} notifications - Array of notification objects
     */
    setNotifications(notifications) {
        this.notifications = notifications || [];
        this.updateUnreadCount();
        this.renderNotifications();
    }

    /**
     * Add new notification
     * @param {Object} notification - Notification object
     */
    addNotification(notification) {
        // Add to beginning of array
        this.notifications.unshift(notification);
        
        // Update counters
        this.updateUnreadCount();
        
        // Re-render if panel is open
        if (this.isOpen) {
            this.renderNotifications();
        }

        // Show badge animation
        this.animateBadge();

        // Play sound if enabled
        if (this.soundEnabled && notification.preferences?.sound) {
            this.playNotificationSound();
        }
    }

    /**
     * Render notifications list
     */
    renderNotifications() {
        const container = document.getElementById('notificationsList');
        const emptyState = document.getElementById('notificationEmpty');
        
        // Filter notifications
        const filteredNotifications = this.getFilteredNotifications();

        if (filteredNotifications.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        // Render notifications
        container.innerHTML = filteredNotifications.map(notification => 
            this.renderNotificationItem(notification)
        ).join('');

        // Update stats
        this.updateDisplayStats();
    }

    /**
     * Render individual notification item
     * @param {Object} notification - Notification object
     * @returns {string} HTML string
     */
    renderNotificationItem(notification) {
        const isUnread = !notification.is_read;
        const timeAgo = this.getTimeAgo(notification.created_at);
        const iconClass = this.getNotificationIcon(notification.type);
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : 'read'}" 
                 data-notification-id="${notification.id}"
                 ${isUnread ? 'onclick="notificationCenter.markAsRead(' + notification.id + ')"' : ''}>
                
                <div class="notification-icon ${notification.type}">
                    <i class="${iconClass}"></i>
                </div>
                
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(notification.message)}</div>
                    
                    ${notification.sender_full_name ? `
                        <div class="notification-sender">
                            <span class="sender-name">${this.escapeHtml(notification.sender_full_name)}</span>
                            ${notification.sender_verified ? '<i class="verified-badge">✓</i>' : ''}
                        </div>
                    ` : ''}
                    
                    <div class="notification-time">${timeAgo}</div>
                    
                    ${notification.data && notification.data.actions ? `
                        <div class="notification-actions">
                            ${notification.data.actions.map(action => `
                                <button class="btn-action btn-${action.type}" 
                                        onclick="notificationCenter.handleAction('${action.type}', ${notification.id}, ${notification.data.sender_id || 'null'})">
                                    ${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="notification-menu">
                    <button class="btn-menu" onclick="notificationCenter.showNotificationMenu(${notification.id}, event)">⋮</button>
                </div>
            </div>
        `;
    }

    /**
     * Get filtered notifications based on current filter
     * @returns {Array} Filtered notifications
     */
    getFilteredNotifications() {
        if (this.currentFilter === 'all') {
            return this.notifications;
        }
        
        return this.notifications.filter(notification => 
            notification.type === this.currentFilter
        );
    }

    /**
     * Filter notifications
     */
    filterNotifications() {
        this.renderNotifications();
    }

    /**
     * Mark notification as read
     * @param {number} notificationId - Notification ID
     */
    async markAsRead(notificationId) {
        try {
            console.log(`📋 Marking notification ${notificationId} as read via Phase 3.2 API...`);
            
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                credentials: 'include'
            });

            const data = await response.json();
            console.log(`📋 Mark read response for ${notificationId}:`, data);

            if (data.success) {
                this.markNotificationAsRead(notificationId);
                console.log(`✅ Notification ${notificationId} marked as read successfully`);
                
                // Update dashboard badge count
                if (window.dashboard) {
                    window.dashboard.stats.unreadNotifications = Math.max(0, window.dashboard.stats.unreadNotifications - 1);
                    window.dashboard.updateBadgeCounts();
                }
            } else {
                console.error(`❌ Failed to mark notification ${notificationId} as read:`, data.error);
            }

        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    /**
     * Mark notification as read in UI
     * @param {number} notificationId - Notification ID
     */
    markNotificationAsRead(notificationId) {
        // Update in notifications array
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.is_read = true;
            notification.read_at = new Date().toISOString();
        }

        // Update UI
        const element = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (element) {
            element.classList.remove('unread');
            element.classList.add('read');
        }

        this.updateUnreadCount();
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            console.log('📋 Marking all notifications as read via Phase 3.2 API...');
            
            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: this.currentFilter === 'all' ? null : this.currentFilter
                })
            });

            const data = await response.json();
            console.log('📋 Mark all read response:', data);

            if (data.success) {
                this.markAllNotificationsAsRead();
                console.log('✅ All notifications marked as read successfully');
                
                // Trigger dashboard badge update
                if (window.dashboard) {
                    window.dashboard.stats.unreadNotifications = 0;
                    window.dashboard.updateBadgeCounts();
                }
            } else {
                console.error('❌ Failed to mark all notifications as read:', data.error);
            }

        } catch (error) {
            console.error('❌ Error marking all as read:', error);
        }
    }

    /**
     * Mark all notifications as read in UI
     */
    markAllNotificationsAsRead() {
        // Update notifications array
        this.notifications.forEach(notification => {
            if (!notification.is_read) {
                notification.is_read = true;
                notification.read_at = new Date().toISOString();
            }
        });

        // Update UI
        document.querySelectorAll('.notification-item.unread').forEach(element => {
            element.classList.remove('unread');
            element.classList.add('read');
        });

        this.updateUnreadCount();
    }

    /**
     * Handle notification action
     * @param {string} action - Action type
     * @param {number} notificationId - Notification ID
     * @param {number} senderId - Sender ID
     */
    async handleAction(action, notificationId, senderId) {
        if (action === 'accept') {
            // Accept friend request
            if (window.socketClient) {
                window.socketClient.emit('friend:request:accept', {
                    senderId: senderId,
                    requestId: notificationId
                }, (response) => {
                    if (response.success) {
                        this.markAsRead(notificationId);
                        this.showToast('Friend request accepted!', 'success');
                    } else {
                        this.showToast('Failed to accept friend request', 'error');
                    }
                });
            }
        } else if (action === 'decline') {
            // Decline friend request
            if (window.socketClient) {
                window.socketClient.emit('friend:request:decline', {
                    senderId: senderId,
                    requestId: notificationId
                }, (response) => {
                    if (response.success) {
                        this.markAsRead(notificationId);
                        this.showToast('Friend request declined', 'info');
                    } else {
                        this.showToast('Failed to decline friend request', 'error');
                    }
                });
            }
        }
    }

    /**
     * Update unread count
     */
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.is_read).length;
        
        const badge = document.getElementById('notificationBadge');
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }

        // Update stats
        document.getElementById('unreadCount').textContent = this.unreadCount;
    }

    /**
     * Update display stats
     */
    updateDisplayStats() {
        const filtered = this.getFilteredNotifications();
        const unreadFiltered = filtered.filter(n => !n.is_read).length;
        
        document.getElementById('unreadCount').textContent = unreadFiltered;
        document.getElementById('totalCount').textContent = filtered.length;
    }

    /**
     * Update stats from API response
     * @param {Object} stats - Stats object
     */
    updateStats(stats) {
        if (stats) {
            this.unreadCount = stats.unread_count || 0;
            document.getElementById('unreadCount').textContent = this.unreadCount;
            document.getElementById('totalCount').textContent = stats.total_count || 0;
        }
    }

    /**
     * Show loading state
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        const loading = document.getElementById('notificationLoading');
        const list = document.getElementById('notificationsList');
        
        if (show) {
            loading.style.display = 'block';
            list.style.display = 'none';
        } else {
            loading.style.display = 'none';
            list.style.display = 'block';
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const container = document.getElementById('notificationsList');
        container.innerHTML = `
            <div class="notification-error">
                <div class="error-icon">⚠️</div>
                <h4>Error Loading Notifications</h4>
                <p>${message}</p>
                <button class="btn-retry" onclick="notificationCenter.loadNotifications()">
                    Try Again
                </button>
            </div>
        `;
    }

    /**
     * Animate badge
     */
    animateBadge() {
        const badge = document.getElementById('notificationBadge');
        badge.style.animation = 'bounce 0.5s ease-out';
        
        setTimeout(() => {
            badge.style.animation = '';
        }, 500);
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Ignore audio play errors
            });
        } catch (error) {
            // Ignore audio creation errors
        }
    }

    /**
     * Show toast message
     * @param {string} message - Message to show
     * @param {string} type - Toast type (success, error, info)
     */
    showToast(message, type = 'info') {
        // This would integrate with your existing toast system
        console.log(`Toast [${type}]: ${message}`);
    }

    // ================================
    // SETTINGS METHODS
    // ================================

    openSettings() {
        document.getElementById('notificationSettingsModal').style.display = 'block';
        this.loadNotificationTypes();
    }

    closeSettings() {
        document.getElementById('notificationSettingsModal').style.display = 'none';
    }

    async loadNotificationTypes() {
        // Load notification preferences from API
        try {
            const response = await fetch('/api/notifications/preferences', {
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                this.renderNotificationTypes(data.preferences);
            }
        } catch (error) {
            console.error('❌ Error loading notification preferences:', error);
        }
    }

    renderNotificationTypes(preferences) {
        const container = document.getElementById('notificationTypes');
        container.innerHTML = preferences.map(pref => `
            <div class="notification-type-setting">
                <label>
                    <input type="checkbox" 
                           data-type="${pref.notification_type}"
                           ${pref.enabled ? 'checked' : ''}>
                    <span class="notification-type-label">
                        ${this.formatNotificationType(pref.notification_type)}
                    </span>
                </label>
            </div>
        `).join('');
    }

    saveSettings() {
        // Collect settings and save
        const preferences = [];
        document.querySelectorAll('#notificationTypes input[type="checkbox"]').forEach(checkbox => {
            preferences.push({
                notification_type: checkbox.dataset.type,
                enabled: checkbox.checked,
                sound_enabled: this.soundEnabled,
                desktop_enabled: this.desktopEnabled
            });
        });

        // Save to API
        this.saveNotificationPreferences(preferences);
        this.closeSettings();
    }

    async saveNotificationPreferences(preferences) {
        try {
            const response = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ preferences })
            });

            const data = await response.json();
            if (data.success) {
                this.showToast('Settings saved!', 'success');
            }
        } catch (error) {
            console.error('❌ Error saving preferences:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    resetSettings() {
        // Reset to defaults
        document.getElementById('soundToggle').checked = true;
        document.getElementById('desktopToggle').checked = true;
        document.getElementById('autoMarkToggle').checked = false;
        
        this.soundEnabled = true;
        this.desktopEnabled = true;
        this.autoMarkRead = false;
    }

    // ================================
    // UTILITY METHODS
    // ================================

    /**
     * Get time ago string
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Time ago string
     */
    getTimeAgo(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Get notification icon class
     * @param {string} type - Notification type
     * @returns {string} Icon class
     */
    getNotificationIcon(type) {
        const icons = {
            friend_request: 'fas fa-user-plus',
            friend_accepted: 'fas fa-user-check',
            friend_online: 'fas fa-circle text-green',
            friend_offline: 'fas fa-circle text-gray',
            friend_message: 'fas fa-comment',
            friend_removed: 'fas fa-user-minus'
        };
        
        return icons[type] || 'fas fa-bell';
    }

    /**
     * Format notification type for display
     * @param {string} type - Notification type
     * @returns {string} Formatted type
     */
    formatNotificationType(type) {
        const labels = {
            friend_request: 'Friend Requests',
            friend_accepted: 'Friend Accepted',
            friend_online: 'Friends Coming Online',
            friend_offline: 'Friends Going Offline',
            friend_message: 'Messages',
            friend_removed: 'Friend Removals'
        };
        
        return labels[type] || type.replace('_', ' ').toUpperCase();
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize notification center when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.notificationCenter = new NotificationCenter();
});
