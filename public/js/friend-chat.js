/**
 * 💬 FRIEND CHAT SYSTEM
 * Direct messaging between friends with real-time updates
 */

class FriendChat {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;
        this.currentFriendId = null;
        this.currentFriendUsername = null;
        this.socket = null;
        this.unreadCounts = new Map();
        this.hasShownUnreadNotification = false;

        this.init();
    }

    init() {
        // Request notification permission on init
        this.requestNotificationPermission();

        // Initialize Socket.IO for real-time messaging
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.setupSocketEvents();
        }

        // Load conversations when chat section is shown
        this.setupEventListeners();
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();
                console.log('🔔 Notification permission:', permission);
            } catch (error) {
                console.log('⚠️ Could not request notification permission:', error);
            }
        } else if ('Notification' in window) {
            console.log('🔔 Notification permission:', Notification.permission);
        }
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('💬 Connected to chat server');
            this.registerUser();
        });

        // Listen for incoming messages (SIMPLE!)
        this.socket.on('chat:receive', (messageData) => {
            console.log('📨 Received message:', messageData);
            console.log('🔍 Current state:', {
                currentFriendId: this.currentFriendId,
                messageSenderId: messageData.sender_id,
                isSameFriend: this.currentFriendId === messageData.sender_id
            });

            // If chat window is open with this friend, add to UI
            if (this.currentFriendId === messageData.sender_id) {
                console.log('✅ Adding to current chat (already viewing)');
                this.addMessageToUI(messageData);
                // Mark as read immediately since we're viewing it
                if (this.currentConversationId) {
                    this.markConversationAsRead(this.currentConversationId);
                }
            } else {
                // Message from different conversation
                console.log('📬 New message from different conversation - TRIGGERING NOTIFICATIONS');

                // Play notification sound
                console.log('🔔 Playing sound...');
                this.playNotificationSound();

                // Show toast notification
                console.log('📬 Showing toast...');
                this.showNewMessageToast(messageData);

                // Reload conversations to update unread count and badge
                console.log('🔄 Reloading conversations...');
                this.loadConversations();
            }
        });

        // Typing indicators
        this.socket.on('chat:typing_start', (userId) => {
            if (userId === this.currentFriendId) {
                this.showTypingIndicator();
            }
        });

        this.socket.on('chat:typing_stop', (userId) => {
            if (userId === this.currentFriendId) {
                this.hideTypingIndicator();
            }
        });
    }

    registerUser() {
        // Try to register immediately
        if (window.currentUser?.id) {
            console.log('📝 Registering for chat:', window.currentUser.id);
            this.socket.emit('chat:register', window.currentUser.id);
            return;
        }

        // If not available, wait for it
        console.log('⏳ Waiting for currentUser to be set...');
        const checkInterval = setInterval(() => {
            if (window.currentUser?.id) {
                console.log('📝 Registering for chat (delayed):', window.currentUser.id);
                this.socket.emit('chat:register', window.currentUser.id);
                clearInterval(checkInterval);
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    setupEventListeners() {
        // Listen for section changes to load conversations
        document.addEventListener('sectionChanged', (e) => {
            if (e.detail === 'chat') {
                this.loadConversations();
            } else {
                // When leaving chat section, reset current chat state
                console.log(`📤 Leaving chat section, resetting state`);
                this.currentFriendId = null;
                this.currentConversationId = null;
                this.currentFriendUsername = null;
            }
        });
    }

    async loadConversations() {
        try {
            console.log('📥 Loading conversations...');

            const response = await fetch('/api/chat/conversations', {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('❌ Failed to load conversations:', response.status);
                throw new Error('Failed to load conversations');
            }

            const data = await response.json();
            this.conversations = data.conversations || [];

            console.log(`✅ Loaded ${this.conversations.length} conversations:`, this.conversations);

            this.renderConversationsList();
            this.updateConversationsCount();
            this.updateUnreadBadge();

            // Show notification for unread messages on first load
            this.showUnreadNotification();

        } catch (error) {
            console.error('❌ Error loading conversations:', error);
            this.showError('Failed to load conversations');
        }
    }

    renderConversationsList() {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <h3>No conversations yet</h3>
                    <p>Start chatting with your friends to see conversations here.</p>
                    <button class="empty-action-btn" onclick="showSection('friends')">
                        View Friends
                    </button>
                </div>
            `;
            return;
        }

        const conversationsHTML = this.conversations.map(conv => {
            const unreadCount = parseInt(conv.unread_count) || 0;
            const lastMessagePreview = conv.last_message_content
                ? this.truncateText(conv.last_message_content, 50)
                : 'No messages yet';

            const timeAgo = conv.last_message_time
                ? this.formatTimeAgo(new Date(conv.last_message_time))
                : this.formatTimeAgo(new Date(conv.created_at));

            const isUnread = unreadCount > 0;

            return `
                <div class="conversation-item ${isUnread ? 'unread' : ''}"
                     onclick="friendChat.openConversation(${conv.id}, ${conv.other_user_id}, '${conv.other_username}')">
                    <div class="conversation-avatar">
                        <div class="avatar-circle">${conv.other_username.charAt(0).toUpperCase()}</div>
                        ${isUnread ? '<div class="unread-dot"></div>' : ''}
                    </div>
                    <div class="conversation-content">
                        <div class="conversation-header">
                            <span class="conversation-name">${conv.other_username}</span>
                            <span class="conversation-time">${timeAgo}</span>
                        </div>
                        <div class="conversation-preview">
                            ${lastMessagePreview}
                        </div>
                    </div>
                    ${isUnread ? `<div class="unread-badge">${unreadCount > 99 ? '99+' : unreadCount}</div>` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = conversationsHTML;
    }

    async openConversation(conversationId, friendId, friendUsername) {
        console.log(`🔓 Opening conversation ${conversationId} with ${friendUsername}`);

        this.currentConversationId = conversationId;
        this.currentFriendId = friendId;
        this.currentFriendUsername = friendUsername;

        // Show chat window
        this.showChatWindow();

        // Load messages
        await this.loadMessages(conversationId);

        // Mark messages as read
        console.log(`🏷️ About to mark conversation ${conversationId} as read`);
        await this.markConversationAsRead(conversationId);

        // Clear unread count
        this.unreadCounts.set(conversationId, 0);
        this.updateUnreadBadge();

        console.log(`✅ Conversation ${conversationId} fully opened and marked as read`);
    }

    showChatWindow() {
        const chatSection = document.getElementById('chat-section');
        if (!chatSection) return;

        const chatHTML = `
            <div class="chat-window">
                <div class="chat-header">
                    <button class="back-btn" onclick="friendChat.closeChatWindow()">
                        ← Back
                    </button>
                    <div class="chat-partner-info">
                        <div class="partner-avatar">${this.currentFriendUsername.charAt(0).toUpperCase()}</div>
                        <div class="partner-details">
                            <div class="partner-name">${this.currentFriendUsername}</div>
                            <div class="partner-status">Online</div>
                        </div>
                    </div>
                </div>

                <div class="chat-messages-container" id="chatMessagesContainer">
                    <div class="messages-loading">
                        <div class="spinner"></div>
                        Loading messages...
                    </div>
                </div>

                <div class="typing-indicator hidden" id="typingIndicator">
                    <span>${this.currentFriendUsername} is typing</span>
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>

                <div class="chat-input-container">
                    <input
                        type="text"
                        id="chatMessageInput"
                        placeholder="Type a message..."
                        maxlength="1000"
                        onkeypress="friendChat.handleMessageKeyPress(event)"
                        oninput="friendChat.handleTyping()"
                    />
                    <button class="send-btn" onclick="friendChat.sendMessage()">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10l16-8-8 16-2-6-6-2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        chatSection.innerHTML = chatHTML;

        // Focus on input
        setTimeout(() => {
            document.getElementById('chatMessageInput')?.focus();
        }, 100);
    }

    closeChatWindow() {
        this.currentConversationId = null;
        this.currentFriendId = null;
        this.currentFriendUsername = null;

        // Reload conversations list
        this.loadConversations();
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/chat/messages/${conversationId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            const messages = data.messages || [];

            this.renderMessages(messages);

        } catch (error) {
            console.error('❌ Error loading messages:', error);
            this.showError('Failed to load messages');
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('chatMessagesContainer');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="no-messages">
                    <div class="no-messages-icon">💬</div>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        const currentUserId = window.currentUser?.id;

        const messagesHTML = messages.map(msg => {
            const isOwn = msg.sender_id === currentUserId;
            const time = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="message ${isOwn ? 'message-own' : 'message-other'}">
                    <div class="message-bubble">
                        <div class="message-text">${this.escapeHtml(msg.content)}</div>
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = messagesHTML;

        // Scroll to bottom
        this.scrollToBottom();
    }

    async sendMessage() {
        const input = document.getElementById('chatMessageInput');
        if (!input || !input.value.trim()) return;

        const content = input.value.trim();
        input.value = '';

        // Stop typing indicator
        this.stopTyping();

        try {
            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    recipientId: this.currentFriendId,
                    content: content
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();

            // Update conversation ID if it was newly created
            if (!this.currentConversationId && data.message.conversation_id) {
                this.currentConversationId = data.message.conversation_id;
            }

            // Add message to UI immediately
            this.addMessageToUI({
                sender_id: window.currentUser?.id,
                content: content,
                created_at: data.message.created_at
            });

            // Emit socket event for real-time delivery
            if (this.socket) {
                this.socket.emit('chat:message', {
                    recipientId: this.currentFriendId,
                    messageData: {
                        sender_id: window.currentUser?.id,
                        content: content,
                        created_at: data.message.created_at
                    }
                });
            }

        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    handleNewMessage(data) {
        // Update unread count if not in current conversation
        if (data.conversationId !== this.currentConversationId) {
            const currentCount = this.unreadCounts.get(data.conversationId) || 0;
            this.unreadCounts.set(data.conversationId, currentCount + 1);
            this.updateUnreadBadge();

            // Reload conversations to show new message
            if (document.getElementById('conversationsList')) {
                this.loadConversations();
            }
        } else {
            // Add message to current chat
            this.addMessageToUI(data);

            // Mark as read
            this.markMessageAsRead(data.id);
        }
    }

    addMessageToUI(messageData) {
        const container = document.getElementById('chatMessagesContainer');
        if (!container) return;

        // Remove "no messages" state if present
        const noMessages = container.querySelector('.no-messages');
        if (noMessages) {
            container.innerHTML = '';
        }

        const isOwn = messageData.sender_id === window.currentUser?.id;
        const timestamp = this.formatMessageTime(messageData.created_at);

        const messageHTML = `
            <div class="message ${isOwn ? 'message-own' : 'message-other'}">
                <div class="message-bubble">
                    <div class="message-text">${this.escapeHtml(messageData.content)}</div>
                    <div class="message-time">${timestamp}</div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    async markMessageAsRead(messageId) {
        try {
            await fetch(`/api/chat/messages/${messageId}/read`, {
                method: 'PUT',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    async markConversationAsRead(conversationId) {
        if (!conversationId) {
            console.log('⚠️ No conversation ID to mark as read');
            return;
        }

        try {
            console.log(`📖 Marking conversation ${conversationId} as read...`);

            const response = await fetch(`/api/chat/conversations/${conversationId}/read`, {
                method: 'PUT',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Marked ${data.markedCount} messages as read`);

                // Reload conversations to update unread counts
                await this.loadConversations();
            } else {
                console.error('❌ Failed to mark as read:', response.status);
            }
        } catch (error) {
            console.error('❌ Error marking as read:', error);
        }
    }

    handleTyping() {
        if (this.socket && this.currentFriendId) {
            this.socket.emit('chat:typing', this.currentFriendId);

            // Auto-stop after 3 seconds
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.stopTyping();
            }, 3000);
        }
    }

    stopTyping() {
        if (this.socket && this.currentFriendId) {
            this.socket.emit('chat:stop_typing', this.currentFriendId);
        }
        clearTimeout(this.typingTimeout);
    }

    handleMessageKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.sendMessage();
        }
    }

    showTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            this.scrollToBottom();
        }
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        // Just now (< 1 min)
        if (diffMins < 1) return 'Just now';

        // Minutes ago (< 1 hour)
        if (diffMins < 60) return `${diffMins}m ago`;

        // Today - show time
        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Yesterday
        if (diffDays === 1) {
            return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // This week (< 7 days) - show day name
        if (diffDays < 7) {
            const dayName = date.toLocaleDateString([], { weekday: 'short' });
            return `${dayName} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        // Older - show full date
        return date.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessagesContainer');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    updateConversationsCount() {
        const countEl = document.getElementById('conversationsCount');
        if (countEl) {
            const count = this.conversations.length;
            countEl.textContent = `${count} conversation${count !== 1 ? 's' : ''}`;
        }
    }

    updateUnreadBadge() {
        // Calculate from conversations (server data is source of truth)
        const totalUnread = this.conversations.reduce((sum, conv) => {
            return sum + (parseInt(conv.unread_count) || 0);
        }, 0);

        const badge = document.getElementById('chatUnreadCount');

        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'flex';
                badge.classList.add('notification');
            } else {
                badge.style.display = 'none';
                badge.classList.remove('notification');
            }
        }
    }

    showUnreadNotification() {
        // Only show once per session
        if (this.hasShownUnreadNotification) return;

        const totalUnread = this.conversations.reduce((sum, conv) => {
            return sum + (parseInt(conv.unread_count) || 0);
        }, 0);

        if (totalUnread > 0) {
            this.hasShownUnreadNotification = true;

            // Show toast notification
            if (typeof showNotification === 'function') {
                showNotification(
                    `You have ${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`,
                    'info'
                );
            } else if (typeof window.showNotification === 'function') {
                window.showNotification(
                    `You have ${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`,
                    'info'
                );
            }
        }
    }

    playNotificationSound() {
        try {
            // Create audio element for notification sound
            const audio = new Audio('data:audio/wav;base64,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');
            audio.volume = 0.3; // 30% volume
            audio.play().catch(e => console.log('🔇 Sound play failed:', e));
            console.log('🔔 Notification sound played');
        } catch (error) {
            console.log('🔇 Could not play notification sound:', error);
        }
    }

    showNewMessageToast(messageData) {
        try {
            // Get sender username from conversations
            const conv = this.conversations.find(c =>
                c.other_user_id === messageData.sender_id
            );
            const senderName = conv ? conv.other_username : 'Someone';
            const messagePreview = messageData.content.substring(0, 100);

            console.log(`📬 Showing notifications for message from ${senderName}`);

            // Show native browser notification (works on all browsers)
            this.showBrowserNotification(senderName, messagePreview);

            // Also show in-page toast notification as fallback
            this.createToastNotification(`💬 New message from ${senderName}`, 'info');

            console.log(`✅ Notifications displayed`);
        } catch (error) {
            console.error('❌ Could not show notifications:', error);
        }
    }

    showBrowserNotification(senderName, message) {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.log('⚠️ Browser does not support notifications');
            return;
        }

        // Check permission
        if (Notification.permission === 'granted') {
            const notification = new Notification(`New message from ${senderName}`, {
                body: message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'chat-message',
                requireInteraction: false,
                silent: false
            });

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);

            // Click to open chat
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            console.log('🔔 Browser notification shown');
        } else if (Notification.permission === 'default') {
            // Request permission
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showBrowserNotification(senderName, message);
                }
            });
        } else {
            console.log('⚠️ Notification permission denied');
        }
    }

    createToastNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'info' ? '#3b82f6' : '#10b981'};
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // Helper: Start a new chat with a friend
    async startChatWithFriend(friendId, friendUsername) {
        try {
            // Check if conversation already exists
            await this.loadConversations();

            const existingConv = this.conversations.find(c => c.other_user_id === friendId);

            if (existingConv) {
                // Open existing conversation
                await this.openConversation(existingConv.id, friendId, friendUsername);
            } else {
                // Create new conversation by sending first message
                this.currentFriendId = friendId;
                this.currentFriendUsername = friendUsername;
                this.currentConversationId = null; // Will be created on first message
                this.showChatWindow();

                // Show empty state
                const container = document.getElementById('chatMessagesContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="no-messages">
                            <div class="no-messages-icon">💬</div>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    `;
                }
            }

            // Switch to chat section
            if (typeof showSection === 'function') {
                showSection('chat');
            }

        } catch (error) {
            console.error('Error starting chat:', error);
            this.showError('Failed to start chat');
        }
    }

    // Utility functions
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    handleMessageRead(data) {
        // Update UI to show message as read
        console.log('Message read:', data);
    }

    showError(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else {
            console.error(message);
        }
    }
}

// Initialize friend chat system
let friendChat = null;

document.addEventListener('DOMContentLoaded', () => {
    friendChat = new FriendChat();
    window.friendChat = friendChat;
    console.log('💬 Friend chat system initialized');

    // Add debugging tools to window
    window.chatDebug = {
        // Test notification sound
        testSound: () => {
            console.log('🔔 Testing notification sound...');
            friendChat.playNotificationSound();
        },

        // Test toast notification
        testToast: (username = 'TestUser') => {
            console.log('📬 Testing toast notification...');
            friendChat.showNewMessageToast({ sender_id: 999 });
        },

        // Check unread counts
        checkUnread: async () => {
            await friendChat.loadConversations();
            const total = friendChat.conversations.reduce((sum, conv) =>
                sum + (parseInt(conv.unread_count) || 0), 0
            );
            console.log('📊 Unread counts:', {
                total,
                byConversation: friendChat.conversations.map(c => ({
                    id: c.id,
                    friend: c.other_username,
                    unread: c.unread_count
                }))
            });
            return total;
        },

        // Force mark conversation as read
        markRead: async (conversationId) => {
            console.log(`📖 Forcing conversation ${conversationId} as read...`);
            await friendChat.markConversationAsRead(conversationId);
        },

        // Simulate incoming message
        simulateMessage: (fromUserId, content = 'Test message') => {
            console.log('📨 Simulating incoming message...');
            friendChat.socket.emit('chat:receive', {
                sender_id: fromUserId,
                content: content,
                created_at: new Date().toISOString()
            });
        },

        // Show current state
        status: () => {
            console.log('💬 Chat System Status:', {
                socketConnected: friendChat.socket?.connected,
                currentUser: window.currentUser,
                currentConversation: friendChat.currentConversationId,
                currentFriend: friendChat.currentFriendId,
                conversations: friendChat.conversations.length,
                totalUnread: friendChat.conversations.reduce((sum, conv) =>
                    sum + (parseInt(conv.unread_count) || 0), 0
                )
            });
        }
    };

    console.log('🛠️ Debugging tools available: window.chatDebug');
    console.log('   chatDebug.testSound()  - Test notification sound');
    console.log('   chatDebug.testToast()  - Test toast notification');
    console.log('   chatDebug.checkUnread() - Check unread counts');
    console.log('   chatDebug.markRead(id) - Force mark as read');
    console.log('   chatDebug.status()     - Show current state');
});
