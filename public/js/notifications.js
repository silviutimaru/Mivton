/**
 * ==============================================
 * MIVTON REAL-TIME NOTIFICATIONS SYSTEM
 * Complete notification handling with sound
 * ==============================================
 */

class NotificationManager {
    constructor() {
        console.log('🔔 Initializing Notification Manager...');
        
        this.socket = null;
        this.sounds = {
            friend_request: null,
            friend_accepted: null,
            message: null
        };
        
        this.notifications = [];
        this.isInitialized = false;
        
        // Add notification throttling to prevent spam
        this.notificationThrottle = new Map(); // Track recent notifications
        this.THROTTLE_DURATION = 5000; // 5 seconds between similar notifications
        
        this.init();
    }

    async init() {
        try {
            // Initialize sounds
            await this.initializeSounds();
            
            // Setup Socket.IO connection
            this.setupSocketConnection();
            
            // Setup notification UI handlers
            this.setupUIHandlers();
            
            // Load offline notifications
            await this.loadOfflineNotifications();
            
            this.isInitialized = true;
            console.log('✅ Notification Manager initialized');
            
        } catch (error) {
            console.error('❌ Error initializing Notification Manager:', error);
        }
    }

    async initializeSounds() {
        console.log('🎵 Initializing notification sounds...');
        
        try {
            // Create notification sounds
            this.sounds = {
                friend_request: this.createNotificationSound('friend_request'),
                friend_accepted: this.createNotificationSound('friend_accepted'),
                message: this.createNotificationSound('message')
            };
            
            console.log('✅ Notification sounds initialized');
        } catch (error) {
            console.error('❌ Error initializing sounds:', error);
        }
    }

    createNotificationSound(type) {
        // Create different tones for different notification types
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const playSound = () => {
            try {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                // Different frequencies for different notification types
                const frequencies = {
                    friend_request: [800, 1000, 1200], // Rising tone
                    friend_accepted: [1200, 1000, 800], // Falling tone
                    message: [600, 800] // Simple double beep
                };
                
                const freq = frequencies[type] || [800];
                let timeOffset = 0;
                
                freq.forEach((frequency, index) => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    
                    osc.frequency.value = frequency;
                    osc.type = 'sine';
                    
                    // Set gain (volume)\n                    gain.gain.setValueAtTime(0, audioContext.currentTime + timeOffset);
                    gain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + timeOffset + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + timeOffset + 0.2);
                    
                    osc.start(audioContext.currentTime + timeOffset);
                    osc.stop(audioContext.currentTime + timeOffset + 0.2);
                    
                    timeOffset += 0.25;
                });
                
            } catch (error) {
                console.error('❌ Error playing notification sound:', error);
            }
        };
        
        return playSound;
    }

    setupSocketConnection() {
        console.log('🔌 Setting up Socket.IO connection for notifications...');
        
        try {
            // Initialize Socket.IO connection with authentication
            this.socket = io({
                transports: ['websocket', 'polling'],
                timeout: 20000,
                forceNew: false,
                autoConnect: true,
                auth: {
                    // Try to get session data for authentication
                    timestamp: Date.now()
                }
            });

            // Connection events
            this.socket.on('connect', () => {
                console.log('✅ Notification socket connected:', this.socket.id);
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Notification socket disconnected');
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error);
                // Continue without socket - offline notifications will still work
                console.log('📱 Continuing with offline-only notifications');
            });

            // Friend request notifications
            this.socket.on('friend_request_received', (data) => {
                console.log('📨 Friend request received:', data);
                this.handleFriendRequestNotification(data);
            });

            // Friend accepted notifications
            this.socket.on('friend_request_accepted', (data) => {
                console.log('✅ Friend request accepted:', data);
                this.handleFriendAcceptedNotification(data);
            });

            // Generic notifications
            this.socket.on('notification', (data) => {
                console.log('🔔 General notification received:', data);
                this.handleGeneralNotification(data);
            });

        } catch (error) {
            console.error('❌ Error setting up socket connection:', error);
            console.log('📱 Continuing with offline-only notifications');
        }
    }

    async loadOfflineNotifications() {
        try {
            console.log('📱 Loading offline notifications...');
            
            // COMPLETELY DISABLE OFFLINE NOTIFICATIONS FOR OLD DATA
            // Only load notifications from the last 15 minutes to prevent all old notification issues
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            
            console.log(`📅 Only fetching notifications newer than: ${fifteenMinutesAgo}`);
            
            const response = await fetch(`/api/notifications/unread?limit=3&since=${encodeURIComponent(fifteenMinutesAgo)}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                let notifications = data.notifications || [];
                
                console.log(`📬 Raw notifications received: ${notifications.length}`);
                
                // TRIPLE CHECK: Filter out anything older than 15 minutes
                const now = Date.now();
                const FIFTEEN_MINUTES = 15 * 60 * 1000;
                
                notifications = notifications.filter(notification => {
                    const age = now - new Date(notification.created_at).getTime();
                    const isRecent = age <= FIFTEEN_MINUTES;
                    
                    if (!isRecent) {
                        console.log(`⚠️ BLOCKING old notification ${notification.id} (${Math.round(age / 1000 / 60)}min old)`);
                        // Immediately mark as read without processing
                        this.markNotificationAsRead(notification.id).catch(() => {});
                    }
                    
                    return isRecent;
                });
                
                console.log(`📦 After age filter: ${notifications.length} notifications`);
                
                // Additional filtering for specific types
                notifications = notifications.filter(notification => {
                    // Block friend_accepted notifications older than 5 minutes
                    if (notification.type === 'friend_accepted') {
                        const age = now - new Date(notification.created_at).getTime();
                        const FIVE_MINUTES = 5 * 60 * 1000;
                        
                        if (age > FIVE_MINUTES) {
                            console.log(`⚠️ BLOCKING old friend_accepted notification ${notification.id} (${Math.round(age / 1000 / 60)}min old)`);
                            this.markNotificationAsRead(notification.id).catch(() => {});
                            return false;
                        }
                    }
                    
                    // Block friend_online notifications older than 3 minutes
                    if (notification.type === 'friend_online') {
                        const age = now - new Date(notification.created_at).getTime();
                        const THREE_MINUTES = 3 * 60 * 1000;
                        
                        if (age > THREE_MINUTES) {
                            console.log(`⚠️ BLOCKING old friend_online notification ${notification.id} (${Math.round(age / 1000 / 60)}min old)`);
                            this.markNotificationAsRead(notification.id).catch(() => {});
                            return false;
                        }
                    }
                    
                    return true;
                });
                
                console.log(`🔍 Final notifications to show: ${notifications.length}`);
                
                // Only process if we have very recent notifications
                if (notifications.length > 0) {
                    // Take only the most recent notification to prevent spam
                    const mostRecent = notifications[0];
                    console.log(`📦 Processing single most recent notification:`, mostRecent.id, mostRecent.type);
                    
                    // Final safety check before processing
                    const finalAge = now - new Date(mostRecent.created_at).getTime();
                    if (finalAge <= 5 * 60 * 1000) { // 5 minutes max
                        this.processOfflineNotification(mostRecent);
                    } else {
                        console.log(`⚠️ FINAL BLOCK: Notification ${mostRecent.id} too old (${Math.round(finalAge / 1000 / 60)}min)`);
                        this.markNotificationAsRead(mostRecent.id).catch(() => {});
                    }
                } else {
                    console.log('✅ No recent notifications to process');
                }
                
                // Update notification counts
                this.updateNotificationCounts();
                
            } else {
                console.error('❌ Failed to load offline notifications:', response.status);
            }
            
        } catch (error) {
            console.error('❌ Error loading offline notifications:', error);
        }
    }

    processOfflineNotification(notification) {
        console.log('📦 Processing offline notification:', notification);
        
        // ABSOLUTELY FINAL AGE CHECK - This should never trigger due to filtering above, but just in case
        const now = Date.now();
        const notificationAge = now - new Date(notification.created_at).getTime();
        
        // HARD STOP for anything older than 5 minutes
        if (notificationAge > 5 * 60 * 1000) {
            const ageMinutes = Math.round(notificationAge / 1000 / 60);
            console.log(`❌ HARD STOP: Notification ${notification.id} is ${ageMinutes} minutes old - BLOCKING`);
            this.markNotificationAsRead(notification.id).catch(() => {});
            return;
        }
        
        // HARD STOP for specific old types
        if (notification.type === 'friend_accepted' && notificationAge > 3 * 60 * 1000) {
            console.log(`❌ HARD STOP: friend_accepted notification ${notification.id} is too old - BLOCKING`);
            this.markNotificationAsRead(notification.id).catch(() => {});
            return;
        }
        
        if (notification.type === 'friend_online' && notificationAge > 2 * 60 * 1000) {
            console.log(`❌ HARD STOP: friend_online notification ${notification.id} is too old - BLOCKING`);
            this.markNotificationAsRead(notification.id).catch(() => {});
            return;
        }
        
        // Check for any existing popups for this notification or sender
        const existingPopups = document.querySelectorAll(
            `.notification-popup[data-friend-id="${notification.sender_id}"], 
             .notification-popup[data-notification-id="${notification.id}"]`
        );
        
        if (existingPopups.length > 0) {
            console.log(`⚠️ Popup already exists for notification ${notification.id} - BLOCKING`);
            this.markNotificationAsRead(notification.id).catch(() => {});
            return;
        }
        
        console.log(`✅ Notification ${notification.id} passed all checks - showing popup`);
        
        // Create minimal notification data
        const notificationData = {
            type: notification.type,
            title: this.getNotificationTitle(notification.type),
            message: notification.message,
            sender: {
                id: notification.sender_id,
                username: notification.sender_username,
                full_name: notification.sender_full_name
            },
            notificationId: notification.id,
            actions: ['dismiss'],
            offline: true
        };
        
        // Show the notification
        this.showNotificationPopup(notificationData);
        
        // Auto-mark as read very quickly for all types
        setTimeout(() => {
            console.log(`🗑️ Auto-marking notification ${notification.id} as read`);
            this.markNotificationAsRead(notification.id).catch(() => {});
        }, 2000); // 2 seconds for all types
    }

    getNotificationTitle(type) {
        const titles = {
            friend_request: 'Friend Request',
            friend_accepted: 'Friend Request Accepted',
            friend_online: 'Friend Online',
            friend_offline: 'Friend Offline'
        };
        
        return titles[type] || 'Notification';
    }

    setupUIHandlers() {
        console.log('🎨 Setting up UI handlers...');
        
        // Request notification permissions
        this.requestNotificationPermissions();
        
        // Setup click handlers for notification elements
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('notification-accept-btn')) {
                const requestId = e.target.dataset.requestId;
                const notificationId = e.target.dataset.notificationId;
                this.acceptFriendRequest(requestId, notificationId);
            }
            
            if (e.target.classList.contains('notification-decline-btn')) {
                const requestId = e.target.dataset.requestId;
                const notificationId = e.target.dataset.notificationId;
                this.declineFriendRequest(requestId, notificationId);
            }
            
            if (e.target.classList.contains('notification-close')) {
                const notificationId = e.target.dataset.notificationId;
                const popup = e.target.closest('.notification-popup');
                
                // Only mark as read if we have a valid notification ID
                if (notificationId && notificationId !== 'undefined' && notificationId !== undefined) {
                    this.markNotificationAsRead(notificationId);
                }
                
                // Always remove the popup regardless of notification ID
                if (popup) {
                    this.removeNotificationPopup(popup);
                }
            }
        });
    }

    async requestNotificationPermissions() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('🔔 Notification permission:', permission);
            }
        }
    }

    handleFriendRequestNotification(data) {
        console.log('📨 Handling friend request notification:', data);
        
        // Play sound
        if (data.sound && this.sounds.friend_request) {
            this.sounds.friend_request();
        }
        
        // Show notification popup
        this.showNotificationPopup({
            type: 'friend_request',
            title: data.title || 'New Friend Request',
            message: data.message,
            sender: data.sender,
            requestId: data.request_id,
            actions: ['accept', 'decline']
        });
        
        // Show browser notification if permission granted
        this.showBrowserNotification(data.title, data.message, 'friend_request');
        
        // Update friend requests count
        this.updateNotificationCounts();
    }

    handleFriendAcceptedNotification(data) {
        console.log('✅ Handling friend accepted notification:', data);
        
        // Play sound
        if (data.sound && this.sounds.friend_accepted) {
            this.sounds.friend_accepted();
        }
        
        // Show notification popup
        this.showNotificationPopup({
            type: 'friend_accepted',
            title: data.title || 'Friend Request Accepted',
            message: data.message,
            friend: data.friend,
            actions: ['dismiss']
        });
        
        // Show browser notification
        this.showBrowserNotification(data.title, data.message, 'friend_accepted');
        
        // Update counts
        this.updateNotificationCounts();
        
        // Refresh friends list if on friends page
        if (window.dashboard && window.dashboard.currentSection === 'friends') {
            window.dashboard.loadFriendsData();
        }
    }

    handleGeneralNotification(data) {
        console.log('🔔 Handling general notification:', data);
        
        // Check for duplicate friend_online notifications
        if (data.type === 'friend_online') {
            // Check if we already have a notification popup for this friend
            const existingPopup = document.querySelector(
                `.notification-popup[data-friend-id="${data.data?.friend?.id}"]`
            );
            
            if (existingPopup) {
                console.log(`⚠️ Duplicate friend_online notification for friend ${data.data?.friend?.id}, skipping`);
                return;
            }
        }
        
        this.showNotificationPopup({
            type: 'general',
            title: data.title || 'Notification',
            message: data.message,
            actions: ['dismiss']
        });
    }

    /**
     * Check if a notification should be throttled to prevent spam
     */
    shouldThrottleNotification(type, identifier) {
        const key = `${type}_${identifier}`;
        const now = Date.now();
        const lastShown = this.notificationThrottle.get(key);
        
        if (lastShown && (now - lastShown) < this.THROTTLE_DURATION) {
            console.log(`⏱️ Throttling notification: ${key} (shown ${now - lastShown}ms ago)`);
            return true;
        }
        
        this.notificationThrottle.set(key, now);
        return false;
    }

    showNotificationPopup(notification) {
        console.log('📱 Showing notification popup:', notification);
        
        // Enhanced deduplication checks
        const friendId = notification.friend?.id || notification.sender?.id;
        
        if (friendId) {
            // Check for existing popups from this friend
            const existingPopups = document.querySelectorAll(
                `.notification-popup[data-friend-id="${friendId}"]`
            );
            
            if (existingPopups.length > 0) {
                console.log(`⚠️ Skipping duplicate notification popup for friend ${friendId}`);
                return;
            }
            
            // Check throttling for friend-related notifications
            if (notification.type === 'general') {
                if (this.shouldThrottleNotification('friend_online', friendId)) {
                    return; // Skip this notification
                }
            }
        }
        
        // For notifications with IDs, check if we already have one with the same ID
        if (notification.notificationId) {
            const existingById = document.querySelector(
                `.notification-popup[data-notification-id="${notification.notificationId}"]`
            );
            
            if (existingById) {
                console.log(`⚠️ Skipping duplicate notification popup with ID ${notification.notificationId}`);
                return;
            }
        }
        
        const container = this.getOrCreateNotificationContainer();
        
        const popup = document.createElement('div');
        popup.className = `notification-popup notification-${notification.type}`;
        
        // Add tracking attributes
        if (friendId) {
            popup.setAttribute('data-friend-id', friendId);
        }
        
        if (notification.notificationId) {
            popup.setAttribute('data-notification-id', notification.notificationId);
        }
        
        popup.innerHTML = this.createNotificationHTML(notification);
        
        // Add animation class
        popup.style.transform = 'translateX(100%)';
        container.appendChild(popup);
        
        // Animate in
        setTimeout(() => {
            popup.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remove after 8 seconds for friend_online, 10 seconds for others
        const autoRemoveTime = (notification.type === 'general' && friendId) ? 8000 : 10000;
        
        if (!notification.actions || notification.actions.includes('dismiss')) {
            setTimeout(() => {
                if (popup.parentElement) {
                    this.removeNotificationPopup(popup);
                }
            }, autoRemoveTime);
        }
    }

    createNotificationHTML(notification) {
        const { type, title, message, sender, friend, requestId, notificationId, actions, offline } = notification;
        
        let avatarSection = '';
        if (sender) {
            const initials = this.getUserInitials(sender.full_name || sender.username);
            avatarSection = `
                <div class="notification-avatar">${initials}</div>
            `;
        } else if (friend) {
            const initials = this.getUserInitials(friend.full_name || friend.username);
            avatarSection = `
                <div class="notification-avatar">${initials}</div>
            `;
        }
        
        let actionsSection = '';
        if (actions && actions.length > 0) {
            const actionButtons = actions.map(action => {
                switch (action) {
                    case 'accept':
                        return `<button class="notification-btn accept notification-accept-btn" data-request-id="${requestId}" data-notification-id="${notificationId}">✅ Accept</button>`;
                    case 'decline':
                        return `<button class="notification-btn decline notification-decline-btn" data-request-id="${requestId}" data-notification-id="${notificationId}">❌ Decline</button>`;
                    case 'dismiss':
                        return `<button class="notification-btn dismiss notification-close" data-notification-id="${notificationId}">✓ OK</button>`;
                    default:
                        return '';
                }
            }).join('');
            
            actionsSection = `<div class="notification-actions">${actionButtons}</div>`;
        }
        
        // Add offline indicator if this is an offline notification
        const offlineIndicator = offline ? '<div class="notification-offline-indicator">📋 Offline</div>' : '';
        
        return `
            <div class="notification-content">
                <div class="notification-header">
                    ${avatarSection}
                    <div class="notification-info">
                        <div class="notification-title">${title}</div>
                        <div class="notification-message">${message}</div>
                        ${offlineIndicator}
                    </div>
                    <button class="notification-close" data-notification-id="${notificationId || ''}">×</button>
                </div>
                ${actionsSection}
            </div>
        `;
    }

    getOrCreateNotificationContainer() {
        let container = document.getElementById('notification-popup-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-popup-container';
            container.className = 'notification-popup-container';
            document.body.appendChild(container);
        }
        return container;
    }

    removeNotificationPopup(popup) {
        popup.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 300);
    }

    showBrowserNotification(title, message, type) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: message,
                icon: '/favicon.ico',
                tag: type
            });
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            // Validate notification ID
            if (!notificationId || notificationId === 'undefined' || notificationId === undefined) {
                console.warn('⚠️ Cannot mark notification as read: invalid notification ID:', notificationId);
                return false;
            }
            
            console.log(`✅ Marking notification ${notificationId} as read`);
            
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (response.ok) {
                console.log(`✅ Notification ${notificationId} marked as read`);
                this.updateNotificationCounts();
                return true;
            } else if (response.status === 404) {
                console.log(`ℹ️ Notification ${notificationId} not found (already cleaned up)`);
                // Don't update counts on 404 - notification was already handled
                return true; // Treat as success since the goal was achieved
            } else {
                console.warn(`⚠️ Failed to mark notification ${notificationId} as read - Status: ${response.status}`);
                return false;
            }
            
        } catch (error) {
            // Don't log this as an error - it's often just cleanup happening
            console.log(`ℹ️ Notification ${notificationId} marking as read failed (likely already cleaned up):`, error.message);
            return false;
        }
    }

    async acceptFriendRequest(requestId, notificationId) {
        try {
            console.log('✅ Accepting friend request:', requestId);
            
            const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove the notification popup
                const popup = document.querySelector(`[data-request-id="${requestId}"]`)?.closest('.notification-popup');
                if (popup) {
                    this.removeNotificationPopup(popup);
                }
                
                // Only mark notification as read if we have a valid notification ID
                if (notificationId && notificationId !== 'undefined' && notificationId !== undefined) {
                    console.log(`🔔 Marking notification ${notificationId} as read after accepting request`);
                    await this.markNotificationAsRead(notificationId);
                } else {
                    console.log('ℹ️ No notification ID provided, skipping mark as read (real-time notification)');
                }
                
                // Show success toast
                if (window.dashboard) {
                    window.dashboard.showToast('Friend request accepted!', 'success');
                }
                
                // Refresh requests and friends data
                this.updateNotificationCounts();
                
            } else {
                throw new Error(data.error || 'Failed to accept request');
            }
            
        } catch (error) {
            console.error('❌ Error accepting friend request:', error);
            if (window.dashboard) {
                window.dashboard.showToast('Failed to accept friend request', 'error');
            }
        }
    }

    async declineFriendRequest(requestId, notificationId) {
        try {
            console.log('❌ Declining friend request:', requestId);
            
            const response = await fetch(`/api/friend-requests/${requestId}/decline`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Remove the notification popup
                const popup = document.querySelector(`[data-request-id="${requestId}"]`)?.closest('.notification-popup');
                if (popup) {
                    this.removeNotificationPopup(popup);
                }
                
                // Only mark notification as read if we have a valid notification ID
                if (notificationId && notificationId !== 'undefined' && notificationId !== undefined) {
                    console.log(`🔔 Marking notification ${notificationId} as read after declining request`);
                    await this.markNotificationAsRead(notificationId);
                } else {
                    console.log('ℹ️ No notification ID provided, skipping mark as read (real-time notification)');
                }
                
                // Show success toast
                if (window.dashboard) {
                    window.dashboard.showToast('Friend request declined', 'success');
                }
                
                // Refresh requests count
                this.updateNotificationCounts();
                
            } else {
                throw new Error(data.error || 'Failed to decline request');
            }
            
        } catch (error) {
            console.error('❌ Error declining friend request:', error);
            if (window.dashboard) {
                window.dashboard.showToast('Failed to decline friend request', 'error');
            }
        }
    }

    async updateNotificationCounts() {
        try {
            // Use more efficient real-time updates where possible
            if (window.dashboard) {
                // Just reload stats for now - the dashboard will handle the updates
                await window.dashboard.loadDashboardStats();
                
                // If on requests page, reload the requests
                if (window.dashboard.currentSection === 'requests') {
                    await window.dashboard.loadRequestsData();
                }
            }
            
        } catch (error) {
            console.error('❌ Error updating notification counts:', error);
        }
    }

    getUserInitials(name) {
        if (!name) return '?';
        return name.split(' ')
                  .map(word => word.charAt(0).toUpperCase())
                  .join('')
                  .substring(0, 2);
    }

    /**
     * Auto-mark old friend_online notifications as read
     */
    async autoMarkOldFriendNotifications() {
        try {
            const response = await fetch('/api/notifications/mark-old-friend-online-read', {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Auto-marked ${data.marked_count || 0} old friend_online notifications as read`);
            }
        } catch (error) {
            console.error('❌ Error auto-marking old notifications:', error);
        }
    }

    // Public methods for manual notification sending
    sendTestNotification() {
        this.showNotificationPopup({
            type: 'general',
            title: 'Test Notification',
            message: 'This is a test notification to verify the system is working.',
            actions: ['dismiss']
        });
    }

    // Cleanup method to remove duplicate notifications
    async cleanupDuplicateNotifications() {
        try {
            const response = await fetch('/api/notifications/cleanup-duplicates', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Cleaned up ${data.deleted_count || 0} duplicate notifications`);
                return data;
            }
        } catch (error) {
            console.error('❌ Error cleaning up notifications:', error);
        }
    }

    destroy() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        const container = document.getElementById('notification-popup-container');
        if (container) {
            container.remove();
        }
    }
}

// Initialize notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔔 Initializing notifications...');
    
    // Wait for other scripts to load
    setTimeout(() => {
        if (!window.notificationManager) {
            try {
                window.notificationManager = new NotificationManager();
                console.log('✅ Notification Manager initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Notification Manager:', error);
            }
        }
    }, 500);
});

console.log('✅ Notifications.js loaded successfully');
