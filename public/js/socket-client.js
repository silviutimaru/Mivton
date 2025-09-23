/**
 * 🔧 ENHANCED SOCKET CLIENT - Real-time dashboard synchronization
 * Fixes friend removal synchronization issues
 */

class SocketClient {
    constructor() {
        this.socket = null;
        this.userId = null;
        this.tempUserId = null;
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
            }
            
            // Connect with either real userId or tempUserId
            if (typeof io !== 'undefined') {
                this.connect();
            }
        } catch (error) {
            console.error('❌ Socket client init failed:', error);
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
            this.socket = io({ auth: { userId: connectionUserId } });

            this.socket.on('connect', () => {
                console.log('🔌 Socket connected for real-time updates');
                
                // Task 4.2: Emit join event with userId (temporary or real)
                this.socket.emit('join', connectionUserId);
                console.log('🚀 Joined room for user:', connectionUserId);
                
                // Task 4.2: Expose socket globally for console testing
                window.socket = this.socket;
                console.log('🆔 Socket exposed globally as window.socket for testing');
            });

            // Task 4.2: Listen for notify events
            this.socket.on('notify', (payload) => {
                console.log('🔔 Received notify event:', payload);
                // You can add custom notification handling here
                if (payload.msg) {
                    console.log('📧 Message received:', payload.msg);
                }
            });

            // 🔧 ENHANCED: Listen for friend removal events
            this.socket.on('friend_removed', (data) => {
                console.log('🗑️ Friend removed event received:', data);
                this.handleFriendRemoved(data);
            });

            this.socket.on('dashboard_refresh_stats', (data) => {
                console.log('🔄 Dashboard refresh requested:', data.reason);
                this.refreshDashboard();
            });

            this.socket.on('friends_count_update', (data) => {
                console.log('👥 Friends count update:', data.action);
                this.updateFriendsCount();
            });

            this.socket.on('clear_friend_notifications', (data) => {
                console.log('🔔 Clearing notifications for friend:', data.friend_id);
                this.clearNotificationsForFriend(data.friend_id);
            });

            console.log('✅ Enhanced socket events registered');

        } catch (error) {
            console.error('❌ Socket connection failed:', error);
        }
    }

    // 🔧 NEW: Handle friend removal with complete UI cleanup
    handleFriendRemoved(data) {
        try {
            console.log('🔧 Processing friend removal event:', data);
            
            // Clear popup notifications for removed friend
            this.clearNotificationsForFriend(data.removed_user_id);
            
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

    // 🔧 NEW: Refresh entire dashboard
    async refreshDashboard() {
        try {
            console.log('🔄 Refreshing dashboard...');
            
            if (window.dashboard) {
                await window.dashboard.loadDashboardStats();
                console.log('✅ Dashboard stats refreshed');
            }
        } catch (error) {
            console.error('❌ Error refreshing dashboard:', error);
        }
    }

    // 🔧 NEW: Update friends count across all UI elements
    async updateFriendsCount() {
        try {
            console.log('👥 Updating friends count...');
            
            const response = await fetch('/api/friends/stats', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const friendsCount = data.stats?.total_friends || 0;
                
                // Update all friends count displays
                ['friendsCount', 'totalFriends', 'statFriends'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = friendsCount;
                        console.log(`✅ Updated ${id} to ${friendsCount}`);
                    }
                });
                
                console.log(`✅ Friends count updated to ${friendsCount}`);
            }
        } catch (error) {
            console.error('❌ Error updating friends count:', error);
        }
    }

    // 🔧 NEW: Clear all notifications for a specific friend
    clearNotificationsForFriend(friendId) {
        try {
            console.log(`🔔 Clearing notifications for friend ${friendId}...`);
            
            // Remove all popup notifications for this friend
            const selectors = [
                `.friend-notification[data-friend-id="${friendId}"]`,
                `.popup-notification[data-friend-id="${friendId}"]`,
                `.friend-online-popup[data-friend-id="${friendId}"]`,
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

    // Utility method to emit events (for future use)
    emit(eventName, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(eventName, data);
        }
    }

    // Cleanup method
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('🔌 Socket disconnected');
        }
    }
}

// Initialize when page loads
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.socketClient = new SocketClient();
        console.log('✅ Enhanced socket client initialized');
    });
}

console.log('✅ Enhanced socket client loaded');