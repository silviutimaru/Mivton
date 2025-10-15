/**
 * 🔧 ENHANCED SOCKET CLIENT - Real-time friend status synchronization
 * Automatically updates friend status when they come online/offline
 */

class EnhancedSocketClient {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.tempUserId = null;
        this.friendsManager = null;
        this.init();
    }

    async init() {
        try {
            // Task 4.2: Get or generate temporary userId
            this.tempUserId = this.getOrGenerateTempUserId();
            console.log('🆔 Temporary userId:', this.tempUserId);
            
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            if (response.ok) {
                const userData = await response.json();
                this.userId = userData.user?.id || userData.id;
                
                // Set global currentUserId for video call system
                if (this.userId) {
                    window.currentUserId = this.userId;
                    console.log('🔧 Set window.currentUserId from enhanced socket client:', this.userId);
                }
            }
            
            // Connect with either real userId or tempUserId
            if (typeof io !== 'undefined') {
                this.connect();
            }
        } catch (error) {
            console.error('❌ Enhanced socket client init failed:', error);
            // Still connect with temp userId even if auth fails
            if (typeof io !== 'undefined') {
                this.connect();
            }
        }
    }

    /**
     * Task 4.2: Get or generate temporary userId from localStorage
     */
    getOrGenerateTempUserId() {
        let tempUserId = localStorage.getItem('userId');
        if (!tempUserId) {
            // Generate a simple random temporary ID
            tempUserId = 'temp_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', tempUserId);
            console.log('🆔 Generated new temporary userId:', tempUserId);
        } else {
            console.log('🆔 Using existing temporary userId:', tempUserId);
        }
        return tempUserId;
    }

    connect() {
        try {
            // Task 4.2: Use tempUserId for connection
            const connectionUserId = this.userId || this.tempUserId;
            this.socket = io({
                auth: { userId: connectionUserId },
                withCredentials: true,  // CRITICAL: Send session cookies for authentication
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log('🔌 Enhanced socket connected for real-time friend updates');
                
                // Task 4.2: Emit join event with userId (temporary or real)
                this.socket.emit('join', connectionUserId);
                console.log('🚀 Joined room for user:', connectionUserId);
                
                // Task 4.2: Expose socket globally for console testing
                window.socket = this.socket;
                console.log('🆔 Socket exposed globally as window.socket for testing');
                
                // Only request friends presence if we have a real userId
                if (this.userId) {
                    this.requestInitialFriendsPresence();
                }
            });

            // Task 4.2: Listen for notify events
            this.socket.on('notify', (payload) => {
                console.log('🔔 Received notify event:', payload);
                // You can add custom notification handling here
                if (payload.msg) {
                    console.log('📧 Message received:', payload.msg);
                }
            });

            // ========================================
            // 🎯 KEY FIX: Listen for friend presence updates
            // ========================================
            
            this.socket.on('initial:friends_presence', (friendsPresence) => {
                console.log('📥 Initial friends presence received:', friendsPresence);
                this.updateAllFriendsPresence(friendsPresence);
            });

            this.socket.on('friend:presence:update', (data) => {
                console.log('🔄 Friend presence update received:', data);
                this.updateFriendPresence(data.user_id, data.status, data.activity_message);
            });

            this.socket.on('friend:came_online', (data) => {
                console.log('🟢 Friend came online:', data);
                this.handleFriendCameOnline(data);
            });

            this.socket.on('friend:went_offline', (data) => {
                console.log('⚫ Friend went offline:', data);
                this.handleFriendWentOffline(data);
            });

            this.socket.on('friend:status:changed', (data) => {
                console.log('🔄 Friend status changed:', data);
                this.updateFriendPresence(data.user_id, data.new_status, data.activity_message);
            });

            // ========================================
            // 🔔 Enhanced notification handling
            // ========================================

            this.socket.on('notification:friend_online', (data) => {
                console.log('🔔 Friend online notification:', data);
                
                // Show popup notification
                this.showFriendOnlineNotification(data);
                
                // Update friend status in UI immediately
                this.updateFriendPresence(data.friend.id, 'online', data.activity_message);
            });

            this.socket.on('notification:friend_came_online', (data) => {
                console.log('🔔 Friend came online notification:', data);
                
                // Show popup notification
                this.showFriendOnlineNotification(data);
                
                // Update friend status in UI immediately
                this.updateFriendPresence(data.friend.id, 'online', data.activity_message);
            });

            this.socket.on('friend_removed', (data) => {
                console.log('🗑️ Friend removed event received:', data);
                this.handleFriendRemoved(data);
            });

            this.socket.on('friends:list:update', (data) => {
                console.log('👥 Friends list update:', data);
                this.handleFriendsListUpdate(data);
            });

            // ========================================
            // 🔄 Dashboard sync events
            // ========================================

            this.socket.on('dashboard_refresh_stats', (data) => {
                console.log('🔄 Dashboard refresh requested:', data.reason);
                this.refreshDashboard();
            });

            this.socket.on('friends_count_update', (data) => {
                console.log('👥 Friends count update:', data.action);
                this.updateFriendsCount();
            });

            // ========================================
            // 🧹 Cleanup events
            // ========================================

            this.socket.on('clear_friend_notifications', (data) => {
                console.log('🔔 Clearing notifications for friend:', data.friend_id);
                this.clearNotificationsForFriend(data.friend_id);
            });

            console.log('✅ Enhanced socket events registered');

        } catch (error) {
            console.error('❌ Enhanced socket connection failed:', error);
        }
    }

    // ========================================
    // 🎯 FRIEND PRESENCE UPDATE METHODS
    // ========================================

    /**
     * Update a specific friend's presence status in the UI
     */
    updateFriendPresence(friendId, status, activityMessage = null) {
        try {
            console.log(`🔄 Updating friend ${friendId} status to ${status}`);

            // Find friend cards in the DOM
            const friendCards = document.querySelectorAll(`[data-friend-id="${friendId}"]`);
            
            friendCards.forEach(card => {
                // Update status indicator
                const statusIndicator = card.querySelector('.status-indicator');
                if (statusIndicator) {
                    statusIndicator.className = `status-indicator ${status}`;
                }

                // Update status text
                const statusText = card.querySelector('.friend-status');
                if (statusText) {
                    statusText.className = `friend-status ${status}`;
                    statusText.innerHTML = `<i class="fas fa-circle"></i> ${status}`;
                }

                // Update card class for styling
                card.className = card.className.replace(/friend-(online|away|offline)/g, '');
                card.classList.add(`friend-${status}`);

                // Update activity message if provided
                if (activityMessage) {
                    const activityElement = card.querySelector('.friend-activity');
                    if (activityElement) {
                        activityElement.textContent = activityMessage;
                    }
                }
            });

            // Update friends manager if available
            if (this.friendsManager && this.friendsManager.updateFriendStatus) {
                this.friendsManager.updateFriendStatus(friendId, status, activityMessage);
            }

            // Update stats counters
            this.updatePresenceStats();

            console.log(`✅ Updated friend ${friendId} status to ${status}`);

        } catch (error) {
            console.error('❌ Error updating friend presence:', error);
        }
    }

    /**
     * Update all friends presence (bulk update)
     */
    updateAllFriendsPresence(friendsPresence) {
        try {
            console.log('🔄 Updating all friends presence:', friendsPresence);

            if (Array.isArray(friendsPresence)) {
                friendsPresence.forEach(friend => {
                    this.updateFriendPresence(friend.id, friend.status, friend.activity_message);
                });
            }

        } catch (error) {
            console.error('❌ Error updating all friends presence:', error);
        }
    }

    /**
     * Handle friend coming online with notification
     */
    handleFriendCameOnline(data) {
        try {
            const { friend, activity_message } = data;
            
            // Update status first
            this.updateFriendPresence(friend.id, 'online', activity_message);
            
            // Show notification
            this.showFriendOnlineNotification(data);
            
            // Update stats
            this.updatePresenceStats();

        } catch (error) {
            console.error('❌ Error handling friend came online:', error);
        }
    }

    /**
     * Handle friend going offline
     */
    handleFriendWentOffline(data) {
        try {
            const { friend } = data;
            
            // Update status
            this.updateFriendPresence(friend.id, 'offline');
            
            // Update stats
            this.updatePresenceStats();

        } catch (error) {
            console.error('❌ Error handling friend went offline:', error);
        }
    }

    /**
     * Show friend online notification popup (with duplicate prevention)
     */
    showFriendOnlineNotification(data) {
        try {
            const { friend, activity_message } = data;
            
            // Check if we already have a notification for this friend
            const existingNotification = document.querySelector(
                `.friend-online-notification[data-friend-id="${friend.id}"]`
            );
            
            if (existingNotification) {
                console.log(`⚠️ Notification for friend ${friend.id} already exists, skipping duplicate`);
                return;
            }
            
            // Create notification element
            const notification = document.createElement('div');
            notification.className = 'friend-online-notification';
            notification.setAttribute('data-friend-id', friend.id);
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon">🟢</div>
                    <div class="notification-text">
                        <strong>${friend.full_name || friend.username}</strong> is now online
                        ${activity_message ? `<br><small>${activity_message}</small>` : ''}
                    </div>
                    <button class="notification-close">&times;</button>
                </div>
            `;

            // Add styles
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: var(--card-bg, #2a2a3a);
                border: 1px solid var(--border-color, #444);
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                z-index: 10000;
                min-width: 280px;
                max-width: 400px;
                animation: slideIn 0.3s ease-out;
            `;

            // Add to DOM
            document.body.appendChild(notification);

            // Auto-remove after 4 seconds
            const autoRemove = setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 4000);

            // Manual close button
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn?.addEventListener('click', () => {
                clearTimeout(autoRemove);
                notification.remove();
            });

            console.log(`🔔 Showed online notification for ${friend.full_name || friend.username}`);

        } catch (error) {
            console.error('❌ Error showing friend online notification:', error);
        }
    }

    /**
     * Update presence statistics in the UI
     */
    updatePresenceStats() {
        try {
            // Count current friend statuses in the DOM
            const onlineFriends = document.querySelectorAll('.friend-card.friend-online').length;
            const awayFriends = document.querySelectorAll('.friend-card.friend-away').length;
            const offlineFriends = document.querySelectorAll('.friend-card.friend-offline').length;

            // Update online count displays
            const onlineCountElements = document.querySelectorAll('[data-online-count]');
            onlineCountElements.forEach(element => {
                element.innerHTML = `<i class="fas fa-circle"></i> ${onlineFriends} online`;
            });

            // Update total friends count
            const totalFriends = onlineFriends + awayFriends + offlineFriends;
            const friendsCountElements = document.querySelectorAll('[data-friends-count]');
            friendsCountElements.forEach(element => {
                element.textContent = totalFriends;
            });

            console.log(`📊 Updated presence stats: ${onlineFriends} online, ${awayFriends} away, ${offlineFriends} offline`);

        } catch (error) {
            console.error('❌ Error updating presence stats:', error);
        }
    }

    // ========================================
    // 🔄 DASHBOARD SYNC METHODS
    // ========================================

    /**
     * Request initial friends presence data
     */
    requestInitialFriendsPresence() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('presence:get_friends', (response) => {
                if (response.success) {
                    console.log('📥 Received initial friends presence:', response.friends);
                    this.updateAllFriendsPresence(response.friends);
                }
            });
        }
    }

    /**
     * Handle friends list updates
     */
    handleFriendsListUpdate(data) {
        try {
            console.log('👥 Processing friends list update:', data);
            
            // Refresh friends list if manager is available
            if (this.friendsManager && this.friendsManager.loadFriends) {
                this.friendsManager.loadFriends();
            }
            
            // Update stats
            this.updateFriendsCount();

        } catch (error) {
            console.error('❌ Error handling friends list update:', error);
        }
    }

    /**
     * Handle friend removal
     */
    handleFriendRemoved(data) {
        try {
            console.log('🗑️ Processing friend removal event:', data);
            
            // Clear popup notifications for removed friend
            this.clearNotificationsForFriend(data.removed_user_id);
            
            // Remove friend from DOM
            const friendCards = document.querySelectorAll(`[data-friend-id="${data.removed_user_id}"]`);
            friendCards.forEach(card => card.remove());
            
            // Refresh dashboard stats immediately
            this.refreshDashboard();
            
            // Show success message
            if (window.dashboard) {
                window.dashboard.showToast('Friend removed successfully', 'success');
            }
            
            console.log('✅ Friend removal handled successfully');
            
        } catch (error) {
            console.error('❌ Error handling friend removal:', error);
        }
    }

    /**
     * Refresh entire dashboard
     */
    async refreshDashboard() {
        try {
            console.log('🔄 Refreshing dashboard...');
            
            if (window.dashboard) {
                await window.dashboard.loadDashboardStats();
                console.log('✅ Dashboard stats refreshed');
            }

            // Refresh friends manager if available
            if (this.friendsManager && this.friendsManager.loadFriends) {
                await this.friendsManager.loadFriends();
                console.log('✅ Friends list refreshed');
            }

        } catch (error) {
            console.error('❌ Error refreshing dashboard:', error);
        }
    }

    /**
     * Update friends count across all UI elements
     */
    async updateFriendsCount() {
        try {
            console.log('👥 Updating friends count...');
            
            const response = await fetch('/api/friends/stats', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const friendsCount = data.stats?.total_friends || 0;
                const onlineCount = data.stats?.online_friends || 0;
                
                // Use dashboard's real-time update method if available
                if (window.dashboard && window.dashboard.updateFriendsCount) {
                    window.dashboard.updateFriendsCount(friendsCount);
                } else {
                    // Fallback to direct DOM updates
                    ['friendsCount', 'totalFriends', 'statFriends'].forEach(id => {
                        const element = document.getElementById(id);
                        if (element) {
                            element.textContent = friendsCount;
                            console.log(`✅ Updated ${id} to ${friendsCount}`);
                        }
                    });
                }

                // Update online count displays
                const onlineCountElements = document.querySelectorAll('[data-online-count]');
                onlineCountElements.forEach(element => {
                    element.innerHTML = `<i class="fas fa-circle"></i> ${onlineCount} online`;
                });
                
                console.log(`✅ Friends count updated to ${friendsCount} (${onlineCount} online)`);
            }
        } catch (error) {
            console.error('❌ Error updating friends count:', error);
        }
    }

    /**
     * Clear all notifications for a specific friend
     */
    clearNotificationsForFriend(friendId) {
        try {
            console.log(`🔔 Clearing notifications for friend ${friendId}...`);
            
            // Remove all popup notifications for this friend
            const selectors = [
                `.friend-notification[data-friend-id="${friendId}"]`,
                `.popup-notification[data-friend-id="${friendId}"]`,
                `.friend-online-popup[data-friend-id="${friendId}"]`,
                `.friend-online-notification[data-friend-id="${friendId}"]`,
                `.notification-popup[data-friend-id="${friendId}"]`,
                `.toast[data-friend-id="${friendId}"]`,
                `.friend-status-notification[data-friend-id="${friendId}"]`
            ];
            
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.remove();
                    console.log(`🗑️ Removed notification: ${selector}`);
                });
            });
            
            console.log(`✅ Cleared all notifications for friend ${friendId}`);
        } catch (error) {
            console.error('❌ Error clearing notifications:', error);
        }
    }

    // ========================================
    // 🔧 INTEGRATION METHODS
    // ========================================

    /**
     * Register friends manager for updates
     */
    registerFriendsManager(friendsManager) {
        this.friendsManager = friendsManager;
        console.log('✅ Friends manager registered with socket client');
    }

    /**
     * Utility method to emit events
     */
    emit(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        }
    }

    /**
     * Task 4.2: Send notify event to another user
     * Usage: socket.emit('server:notify', { to: 'user:bob', msg: 'hi bob' })
     */
    sendNotifyToUser(targetUserId, message) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('server:notify', {
                to: targetUserId.startsWith('user:') ? targetUserId : `user:${targetUserId}`,
                msg: message
            });
            console.log(`🚀 Sent notify to ${targetUserId}:`, message);
        } else {
            console.error('❌ Socket not connected, cannot send notify');
        }
    }

    /**
     * Cleanup method
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('🔌 Enhanced socket disconnected');
        }
    }
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    .friend-online-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #ffffff;
        cursor: pointer;
    }

    .friend-online-notification .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .friend-online-notification .notification-icon {
        font-size: 18px;
        flex-shrink: 0;
    }

    .friend-online-notification .notification-text {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
    }

    .friend-online-notification .notification-close {
        background: none;
        border: none;
        color: #999;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 8px;
        flex-shrink: 0;
    }

    .friend-online-notification .notification-close:hover {
        color: #fff;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);

// Initialize when page loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.enhancedSocketClient = new EnhancedSocketClient();
        console.log('✅ Enhanced socket client initialized');
        
        // Task 4.2: Expose socket for console testing
        window.socket = window.enhancedSocketClient.socket;
        
        // Dispatch ready event for components waiting for the socket client
        document.dispatchEvent(new CustomEvent('socketClientReady'));
    });
}

console.log('✅ Enhanced socket client loaded');
