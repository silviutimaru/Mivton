/**
 * ==============================================
 * MIVTON FRIEND REQUEST SYSTEM - QUICK HOTFIX
 * Disables problematic Socket.IO temporarily
 * ==============================================
 */

class NotificationManagerHotfix {
    constructor() {
        console.log('🔔 Initializing Notification Manager (Hotfix Version)...');
        
        this.notifications = [];
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        try {
            // Initialize sounds
            await this.initializeSounds();
            
            // Setup notification UI handlers
            this.setupUIHandlers();
            
            // Load offline notifications (this is the main feature we need)
            await this.loadOfflineNotifications();
            
            this.isInitialized = true;
            console.log('✅ Notification Manager initialized (offline mode)');
            
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
        try {
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
                        
                        // Set gain (volume)
                        gain.gain.setValueAtTime(0, audioContext.currentTime + timeOffset);
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
        } catch (error) {
            console.error('❌ Error creating sound:', error);
            return () => {}; // Return empty function if sound creation fails
        }
    }

    // Copy all the other methods from the original notifications.js
    // but remove Socket.IO related code...

    async loadOfflineNotifications() {
        try {
            console.log('📱 Loading offline notifications...');
            
            const response = await fetch('/api/notifications/unread', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const notifications = data.notifications || [];
                
                console.log(`📬 Found ${notifications.length} offline notifications`);
                
                // Process each offline notification
                for (const notification of notifications) {
                    this.processOfflineNotification(notification);
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

    // Include all other methods from notifications.js here...
    // For brevity, I'll just include the essential ones

    showNotificationPopup(notification) {
        console.log('📱 Showing notification popup:', notification);
        
        const container = this.getOrCreateNotificationContainer();
        
        const popup = document.createElement('div');
        popup.className = `notification-popup notification-${notification.type}`;
        popup.innerHTML = this.createNotificationHTML(notification);
        
        // Add animation class
        popup.style.transform = 'translateX(100%)';
        container.appendChild(popup);
        
        // Animate in
        setTimeout(() => {
            popup.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-remove after 10 seconds if no actions
        if (!notification.actions || notification.actions.includes('dismiss')) {
            setTimeout(() => {
                if (popup.parentElement) {
                    this.removeNotificationPopup(popup);
                }
            }, 10000);
        }
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
                
                // Mark offline notification as read if it has an ID
                if (notificationId) {
                    this.markNotificationAsRead(notificationId);
                }
                
                if (popup) {
                    this.removeNotificationPopup(popup);
                }
            }
        });
    }

    // Essential methods - copy the rest from notifications.js
    processOfflineNotification(notification) {
        console.log('📦 Processing offline notification:', notification);
        
        // Create notification data structure
        const notificationData = {
            id: notification.id,
            type: notification.type,
            title: this.getNotificationTitle(notification.type),
            message: notification.message,
            sender: {
                id: notification.sender_id,
                username: notification.sender_username,
                full_name: notification.sender_full_name
            },
            data: notification.data,
            timestamp: notification.created_at,
            offline: true // Mark as offline notification
        };
        
        // Show notification popup based on type
        if (notification.type === 'friend_request') {
            this.showOfflineFriendRequestNotification(notificationData);
        } else if (notification.type === 'friend_accepted') {
            this.showOfflineFriendAcceptedNotification(notificationData);
        } else {
            this.showOfflineGeneralNotification(notificationData);
        }
    }

    showOfflineFriendRequestNotification(data) {
        // Extract friend request ID from data
        const requestId = data.data?.request_id;
        
        this.showNotificationPopup({
            type: 'friend_request',
            title: data.title,
            message: data.message,
            sender: data.sender,
            requestId: requestId,
            notificationId: data.id,
            actions: ['accept', 'decline'],
            offline: true
        });
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

    createNotificationHTML(notification) {
        const { type, title, message, sender, friend, requestId, notificationId, actions, offline } = notification;
        
        let avatarSection = '';
        if (sender) {
            const initials = this.getUserInitials(sender.full_name || sender.username);
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

    // Add other essential methods...
    getUserInitials(name) {
        if (!name) return '?';
        return name.split(' ')
                  .map(word => word.charAt(0).toUpperCase())
                  .join('')
                  .substring(0, 2);
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

    async requestNotificationPermissions() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('🔔 Notification permission:', permission);
            }
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            console.log(`✅ Marking notification ${notificationId} as read`);
            
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                credentials: 'include'
            });
            
            if (response.ok) {
                console.log(`✅ Notification ${notificationId} marked as read`);
                this.updateNotificationCounts();
            } else {
                console.error(`❌ Failed to mark notification ${notificationId} as read`);
            }
            
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
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
                
                // Mark notification as read if it's an offline notification
                if (notificationId) {
                    await this.markNotificationAsRead(notificationId);
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
                
                // Mark notification as read if it's an offline notification
                if (notificationId) {
                    await this.markNotificationAsRead(notificationId);
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
            // Refresh dashboard stats to update counts
            if (window.dashboard && window.dashboard.loadDashboardStats) {
                await window.dashboard.loadDashboardStats();
            }
            
            // If on requests page, reload the requests
            if (window.dashboard && window.dashboard.currentSection === 'requests') {
                await window.dashboard.loadRequestsData();
            }
            
        } catch (error) {
            console.error('❌ Error updating notification counts:', error);
        }
    }

    showOfflineFriendAcceptedNotification(data) {
        this.showNotificationPopup({
            type: 'friend_accepted',
            title: data.title,
            message: data.message,
            friend: data.sender,
            notificationId: data.id,
            actions: ['dismiss'],
            offline: true
        });
    }

    showOfflineGeneralNotification(data) {
        this.showNotificationPopup({
            type: 'general',
            title: data.title,
            message: data.message,
            notificationId: data.id,
            actions: ['dismiss'],
            offline: true
        });
    }
}

// Replace the original notification manager
console.log('🔄 Loading notification hotfix...');

// Initialize notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔔 Initializing notifications (hotfix version)...');
    
    // Wait for other scripts to load
    setTimeout(() => {
        if (!window.notificationManager) {
            try {
                window.notificationManager = new NotificationManagerHotfix();
                console.log('✅ Notification Manager (hotfix) initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Notification Manager (hotfix):', error);
            }
        }
    }, 500);
});

console.log('✅ Notification hotfix loaded successfully');
