/**
 * 🚀 MIVTON PHASE 3.2 - PRESENCE MANAGER COMPONENT
 * Real-time user presence and friend status management
 * 
 * Features:
 * - Real-time presence status updates
 * - Friend presence monitoring
 * - Status change controls
 * - Presence indicators and animations
 * - Activity message management
 */

class PresenceManager {
    constructor() {
        this.currentStatus = 'offline';
        this.activityMessage = '';
        this.friendsPresence = new Map(); // friendId -> presence data
        this.presenceCache = new Map(); // Cache for quick lookups
        this.statusUpdateTimer = null;
        this.presenceUpdateInterval = 30000; // 30 seconds
        this.currentFilter = 'all';

        this.statusOptions = [
            { value: 'online', label: 'Online', icon: '🟢', description: 'Available and active' },
            { value: 'away', label: 'Away', icon: '🟡', description: 'Away from keyboard' },
            { value: 'busy', label: 'Busy', icon: '🔴', description: 'Do not disturb' },
            { value: 'invisible', label: 'Invisible', icon: '⚫', description: 'Appear offline to others' },
            { value: 'offline', label: 'Offline', icon: '⚪', description: 'Not available' }
        ];

        this.init();
    }

    /**
     * Initialize presence manager
     */
    init() {
        console.log('👁️ Initializing Presence Manager...');
        
        this.createPresenceInterface();
        this.bindEvents();
        this.setupSocketListeners();
        this.loadCurrentStatus();
        this.loadFriendsPresence();
        this.startPresenceUpdates();
        
        console.log('✅ Presence Manager initialized');
    }

    /**
     * Create presence interface HTML
     */
    createPresenceInterface() {
        const presenceHTML = `
            <!-- User Status Control -->
            <div class="user-status-control" id="userStatusControl">
                <div class="current-status" id="currentStatus">
                    <span class="status-indicator offline" id="statusIndicator">⚪</span>
                    <span class="status-text" id="statusText">Offline</span>
                    <button class="btn-status-dropdown" id="statusDropdown">▼</button>
                </div>
                
                <div class="status-dropdown" id="statusDropdownMenu" style="display: none;">
                    <div class="status-options" id="statusOptions">
                        <!-- Will be populated dynamically -->
                    </div>
                    
                    <div class="activity-message-section">
                        <input type="text" 
                               id="activityMessageInput" 
                               placeholder="What are you up to?"
                               maxlength="100"
                               class="activity-input">
                        <button class="btn-save-activity" id="saveActivity">Save</button>
                    </div>
                </div>
            </div>

            <!-- Friends Presence Panel -->
            <div class="friends-presence-panel" id="friendsPresencePanel">
                <div class="presence-header">
                    <h3>Friends</h3>
                    <div class="presence-stats" id="presenceStats">
                        <span class="online-count" id="onlineCount">0 online</span>
                    </div>
                </div>
                
                <div class="presence-filters">
                    <button class="filter-btn active" data-filter="all" id="filterAll">All</button>
                    <button class="filter-btn" data-filter="online" id="filterOnline">Online</button>
                    <button class="filter-btn" data-filter="away" id="filterAway">Away</button>
                    <button class="filter-btn" data-filter="busy" id="filterBusy">Busy</button>
                    <button class="filter-btn" data-filter="offline" id="filterOffline">Offline</button>
                </div>
                
                <div class="friends-presence-list" id="friendsPresenceList">
                    <div class="presence-loading" id="presenceLoading">
                        <div class="loading-spinner"></div>
                        <p>Loading friends...</p>
                    </div>
                </div>
            </div>

            <!-- Presence Toast Notifications -->
            <div class="presence-toasts" id="presenceToasts"></div>
        `;

        // Find or create container
        let container = document.querySelector('.presence-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'presence-container';
            
            // Try to insert in sidebar or appropriate location
            const sidebar = document.querySelector('.sidebar-nav') || document.querySelector('.dashboard-sidebar');
            if (sidebar) {
                sidebar.appendChild(container);
            } else {
                document.body.appendChild(container);
            }
        }

        container.innerHTML = presenceHTML;
        this.renderStatusOptions();
    }

    /**
     * Render status options in dropdown
     */
    renderStatusOptions() {
        const container = document.getElementById('statusOptions');
        if (!container) return;

        container.innerHTML = this.statusOptions.map(option => `
            <div class="status-option" data-status="${option.value}" onclick="presenceManager.setStatus('${option.value}')">
                <span class="status-icon">${option.icon}</span>
                <div class="status-info">
                    <span class="status-label">${option.label}</span>
                    <span class="status-description">${option.description}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Status dropdown toggle
        const dropdown = document.getElementById('statusDropdown');
        const menu = document.getElementById('statusDropdownMenu');
        
        if (dropdown && menu) {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-status-control')) {
                    menu.style.display = 'none';
                }
            });
        }

        // Activity message save
        const saveActivity = document.getElementById('saveActivity');
        const activityInput = document.getElementById('activityMessageInput');
        
        if (saveActivity && activityInput) {
            saveActivity.addEventListener('click', () => {
                this.updateActivityMessage(activityInput.value);
            });

            activityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.updateActivityMessage(activityInput.value);
                }
            });
        }

        // Presence filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderFriendsList();
            });
        });

        // Auto-away detection
        this.setupAutoAwayDetection();
    }

    /**
     * Setup socket listeners for real-time updates
     */
    setupSocketListeners() {
        if (window.socketClient) {
            // Listen for friend presence updates
            window.socketClient.on('friend:online', (data) => {
                this.handleFriendOnline(data);
            });

            window.socketClient.on('friend:offline', (data) => {
                this.handleFriendOffline(data);
            });

            window.socketClient.on('friend:presence:update', (data) => {
                this.handlePresenceUpdate(data);
            });

            // Listen for initial presence data
            window.socketClient.on('presence:initial', (friends) => {
                this.setFriendsPresence(friends);
            });

            // Connection status changes
            window.socketClient.onConnect(() => {
                this.setStatus('online');
            });

            window.socketClient.onDisconnect(() => {
                this.updateCurrentStatus('offline', '');
            });
        }
    }

    /**
     * Load current user status
     */
    async loadCurrentStatus() {
        try {
            const response = await fetch('/api/presence/status', {
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                this.updateCurrentStatus(data.presence.status, data.presence.activity_message);
            }
        } catch (error) {
            console.error('❌ Error loading current status:', error);
        }
    }

    /**
     * Load friends presence
     */
    async loadFriendsPresence() {
        try {
            this.showPresenceLoading(true);

            const response = await fetch('/api/presence/friends', {
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                this.setFriendsPresence(data.friends);
                this.updatePresenceStats(data.stats);
            }
        } catch (error) {
            console.error('❌ Error loading friends presence:', error);
            this.showPresenceError('Failed to load friends status');
        } finally {
            this.showPresenceLoading(false);
        }
    }

    /**
     * Set user status
     * @param {string} status - New status
     */
    async setStatus(status) {
        try {
            // Close dropdown
            const menu = document.getElementById('statusDropdownMenu');
            if (menu) menu.style.display = 'none';

            // Update via socket for real-time
            if (window.socketClient && window.socketClient.isConnected) {
                window.socketClient.emit('presence:update', {
                    status: status,
                    activityMessage: this.activityMessage
                }, (response) => {
                    if (response.success) {
                        this.updateCurrentStatus(status, this.activityMessage);
                    } else {
                        this.showToast('Failed to update status', 'error');
                    }
                });
            } else {
                // Fallback to API
                const response = await fetch('/api/presence/status', {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: status,
                        activity_message: this.activityMessage
                    })
                });

                const data = await response.json();
                if (data.success) {
                    this.updateCurrentStatus(status, this.activityMessage);
                } else {
                    this.showToast('Failed to update status', 'error');
                }
            }
        } catch (error) {
            console.error('❌ Error setting status:', error);
            this.showToast('Error updating status', 'error');
        }
    }

    /**
     * Update activity message
     * @param {string} message - Activity message
     */
    async updateActivityMessage(message) {
        this.activityMessage = message.trim();
        
        // Update with current status
        await this.setStatus(this.currentStatus);
        
        // Update input
        const input = document.getElementById('activityMessageInput');
        if (input) {
            input.value = this.activityMessage;
        }

        this.showToast('Activity message updated', 'success');
    }

    /**
     * Update current status display
     * @param {string} status - Status
     * @param {string} activityMessage - Activity message
     */
    updateCurrentStatus(status, activityMessage = '') {
        this.currentStatus = status;
        this.activityMessage = activityMessage || '';

        const statusOption = this.statusOptions.find(option => option.value === status);
        if (!statusOption) return;

        // Update UI
        const indicator = document.getElementById('statusIndicator');
        const text = document.getElementById('statusText');
        const input = document.getElementById('activityMessageInput');

        if (indicator) {
            indicator.textContent = statusOption.icon;
            indicator.className = `status-indicator ${status}`;
        }

        if (text) {
            text.textContent = activityMessage || statusOption.label;
        }

        if (input) {
            input.value = activityMessage;
        }

        // Update all presence indicators for current user
        this.updatePresenceIndicators();
    }

    /**
     * Set friends presence data
     * @param {Array} friends - Friends presence array
     */
    setFriendsPresence(friends) {
        this.friendsPresence.clear();
        
        friends.forEach(friend => {
            this.friendsPresence.set(friend.friend_id, {
                id: friend.friend_id,
                username: friend.friend_username,
                full_name: friend.friend_full_name,
                status: friend.presence_status,
                activity_message: friend.activity_message,
                last_seen: friend.last_seen,
                is_online: friend.is_online
            });
        });

        this.renderFriendsList();
        this.updatePresenceStats();
    }

    /**
     * Handle friend coming online
     * @param {Object} data - Friend online data
     */
    handleFriendOnline(data) {
        const friend = this.friendsPresence.get(data.friend_id);
        if (friend) {
            friend.status = 'online';
            friend.is_online = true;
            friend.last_seen = new Date().toISOString();
        }

        this.renderFriendsList();
        this.updatePresenceStats();
        this.showToast(`${data.friend.full_name} came online`, 'info');
    }

    /**
     * Handle friend going offline
     * @param {Object} data - Friend offline data
     */
    handleFriendOffline(data) {
        const friend = this.friendsPresence.get(data.friend_id);
        if (friend) {
            friend.status = 'offline';
            friend.is_online = false;
            friend.last_seen = new Date().toISOString();
        }

        this.renderFriendsList();
        this.updatePresenceStats();
        this.showToast(`${data.friend.full_name} went offline`, 'info');
    }

    /**
     * Handle presence update
     * @param {Object} data - Presence update data
     */
    handlePresenceUpdate(data) {
        const friend = this.friendsPresence.get(data.friend_id);
        if (friend) {
            friend.status = data.status;
            friend.activity_message = data.activity_message;
            friend.is_online = data.status !== 'offline';
        }

        this.renderFriendsList();
        this.updatePresenceStats();

        if (data.activity_message) {
            this.showToast(`${data.friend.full_name}: ${data.activity_message}`, 'info');
        }
    }

    /**
     * Render friends presence list
     */
    renderFriendsList() {
        const container = document.getElementById('friendsPresenceList');
        if (!container) return;

        const friends = Array.from(this.friendsPresence.values());
        const filteredFriends = this.getFilteredFriends(friends);

        if (filteredFriends.length === 0) {
            container.innerHTML = `
                <div class="presence-empty">
                    <div class="empty-icon">👥</div>
                    <p>No friends ${this.currentFilter === 'all' ? '' : this.currentFilter}</p>
                </div>
            `;
            return;
        }

        // Sort friends by status priority and name
        const sortedFriends = filteredFriends.sort((a, b) => {
            const statusPriority = { online: 1, away: 2, busy: 3, offline: 4, invisible: 5 };
            const aPriority = statusPriority[a.status] || 6;
            const bPriority = statusPriority[b.status] || 6;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            return a.full_name.localeCompare(b.full_name);
        });

        container.innerHTML = sortedFriends.map(friend => 
            this.renderFriendPresenceItem(friend)
        ).join('');
    }

    /**
     * Render individual friend presence item
     * @param {Object} friend - Friend data
     * @returns {string} HTML string
     */
    renderFriendPresenceItem(friend) {
        const statusOption = this.statusOptions.find(option => option.value === friend.status);
        const statusIcon = statusOption ? statusOption.icon : '⚪';
        const lastSeen = this.getLastSeenText(friend.last_seen, friend.status);
        
        return `
            <div class="friend-presence-item" data-friend-id="${friend.id}">
                <div class="friend-avatar">
                    <span class="presence-indicator ${friend.status}">${statusIcon}</span>
                    <div class="avatar-placeholder">
                        ${friend.full_name.charAt(0).toUpperCase()}
                    </div>
                </div>
                
                <div class="friend-info">
                    <div class="friend-name">${this.escapeHtml(friend.full_name)}</div>
                    <div class="friend-username">@${this.escapeHtml(friend.username)}</div>
                    
                    ${friend.activity_message ? `
                        <div class="activity-message">${this.escapeHtml(friend.activity_message)}</div>
                    ` : ''}
                    
                    <div class="last-seen">${lastSeen}</div>
                </div>
                
                <div class="friend-actions">
                    <button class="btn-message" onclick="presenceManager.startChat(${friend.id})" 
                            ${friend.status === 'offline' ? 'disabled' : ''}>
                        💬
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get filtered friends based on current filter
     * @param {Array} friends - Friends array
     * @returns {Array} Filtered friends
     */
    getFilteredFriends(friends) {
        if (this.currentFilter === 'all') {
            return friends;
        }
        
        return friends.filter(friend => friend.status === this.currentFilter);
    }

    /**
     * Update presence statistics
     * @param {Object} stats - Stats object (optional)
     */
    updatePresenceStats(stats = null) {
        let onlineCount = 0;
        
        if (stats) {
            onlineCount = stats.friends_online || 0;
        } else {
            // Calculate from current data
            Array.from(this.friendsPresence.values()).forEach(friend => {
                if (friend.status === 'online') {
                    onlineCount++;
                }
            });
        }

        const onlineCountElement = document.getElementById('onlineCount');
        if (onlineCountElement) {
            onlineCountElement.textContent = `${onlineCount} online`;
        }

        // Update filter badges
        this.updateFilterBadges();
    }

    /**
     * Update filter badges with counts
     */
    updateFilterBadges() {
        const friends = Array.from(this.friendsPresence.values());
        const counts = {
            all: friends.length,
            online: friends.filter(f => f.status === 'online').length,
            away: friends.filter(f => f.status === 'away').length,
            busy: friends.filter(f => f.status === 'busy').length,
            offline: friends.filter(f => f.status === 'offline').length
        };

        Object.keys(counts).forEach(filter => {
            const btn = document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`);
            if (btn && counts[filter] > 0) {
                btn.textContent = `${btn.textContent.split(' ')[0]} (${counts[filter]})`;
            }
        });
    }

    /**
     * Update all presence indicators in the UI
     */
    updatePresenceIndicators() {
        // Update user's own indicators throughout the UI
        document.querySelectorAll('[data-user-presence]').forEach(element => {
            const statusOption = this.statusOptions.find(option => option.value === this.currentStatus);
            if (statusOption) {
                element.textContent = statusOption.icon;
                element.className = `presence-indicator ${this.currentStatus}`;
            }
        });
    }

    /**
     * Setup auto-away detection
     */
    setupAutoAwayDetection() {
        let idleTimer = null;
        const idleTime = 5 * 60 * 1000; // 5 minutes
        let wasIdle = false;

        const resetIdleTimer = () => {
            if (idleTimer) clearTimeout(idleTimer);
            
            // If user was idle and now active, set back to online
            if (wasIdle && this.currentStatus === 'away') {
                this.setStatus('online');
                wasIdle = false;
            }

            idleTimer = setTimeout(() => {
                if (this.currentStatus === 'online') {
                    this.setStatus('away');
                    wasIdle = true;
                }
            }, idleTime);
        };

        // Listen for user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetIdleTimer, true);
        });

        // Start the timer
        resetIdleTimer();
    }

    /**
     * Start periodic presence updates
     */
    startPresenceUpdates() {
        // Refresh friends presence periodically
        setInterval(() => {
            if (window.socketClient && window.socketClient.isConnected) {
                window.socketClient.emit('presence:get_friends', (response) => {
                    if (response.success) {
                        this.setFriendsPresence(response.friends);
                    }
                });
            }
        }, this.presenceUpdateInterval);
    }

    /**
     * Show/hide presence loading
     * @param {boolean} show - Whether to show loading
     */
    showPresenceLoading(show) {
        const loading = document.getElementById('presenceLoading');
        const list = document.getElementById('friendsPresenceList');
        
        if (loading && list) {
            if (show) {
                loading.style.display = 'block';
                list.style.display = 'none';
            } else {
                loading.style.display = 'none';
                list.style.display = 'block';
            }
        }
    }

    /**
     * Show presence error
     * @param {string} message - Error message
     */
    showPresenceError(message) {
        const container = document.getElementById('friendsPresenceList');
        if (container) {
            container.innerHTML = `
                <div class="presence-error">
                    <div class="error-icon">⚠️</div>
                    <h4>Error Loading Friends</h4>
                    <p>${message}</p>
                    <button class="btn-retry" onclick="presenceManager.loadFriendsPresence()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    /**
     * Start chat with friend
     * @param {number} friendId - Friend ID
     */
    startChat(friendId) {
        // This would integrate with your chat system
        console.log(`Starting chat with friend ${friendId}`);
        this.showToast('Chat feature coming soon!', 'info');
    }

    /**
     * Show toast notification
     * @param {string} message - Message
     * @param {string} type - Toast type
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('presenceToasts');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `presence-toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">${this.escapeHtml(message)}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);

        // Animate in
        toast.style.animation = 'slideInRight 0.3s ease-out';
    }

    /**
     * Get last seen text
     * @param {string} lastSeen - Last seen timestamp
     * @param {string} status - Current status
     * @returns {string} Last seen text
     */
    getLastSeenText(lastSeen, status) {
        if (status === 'online') {
            return 'Online now';
        }

        if (!lastSeen) {
            return 'Unknown';
        }

        const date = new Date(lastSeen);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
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

    /**
     * Get friend presence by ID
     * @param {number} friendId - Friend ID
     * @returns {Object|null} Friend presence data
     */
    getFriendPresence(friendId) {
        return this.friendsPresence.get(friendId) || null;
    }

    /**
     * Get online friends count
     * @returns {number} Online friends count
     */
    getOnlineFriendsCount() {
        return Array.from(this.friendsPresence.values())
            .filter(friend => friend.status === 'online').length;
    }

    /**
     * Refresh presence data
     */
    refresh() {
        this.loadCurrentStatus();
        this.loadFriendsPresence();
    }
}

// Initialize presence manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.presenceManager = new PresenceManager();
});
