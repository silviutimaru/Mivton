// Simple Chat Manager for Step 4: Chat UI Components
class ChatManager {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.unreadCount = 0;
        this.socket = null; // Will be set during initialization
        this.currentUserId = null; // Will be set during initialization
        
        // Don't initialize events in constructor - do it in initialize()
        console.log('📱 ChatManager instance created');
    }

    async initialize() {
        console.log('🔄 Initializing Chat Manager...');
        
        // Get current user data first
        await this.getCurrentUser();
        
        // Set up socket connection
        this.socket = window.socket;
        
        // Initialize event listeners now that we have user data
        this.initializeEventListeners();
        this.initializeSocketEvents();
        
        // Join chat system
        if (this.socket && this.currentUserId) {
            this.socket.emit('chat:join', this.currentUserId);
        }
        
        // Load conversations
        await this.loadConversations();
        
        // Update UI
        this.updateChatSection();
        
        console.log('✅ Chat Manager initialized');
    }

    async getCurrentUser() {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            
            if (data.success && data.user) {
                this.currentUserId = data.user.id;
                this.currentUsername = data.user.username;
                
                // Set global variables for compatibility
                window.currentUserId = this.currentUserId;
                window.currentUsername = this.currentUsername;
                
                console.log(`👤 Current user: ${this.currentUsername} (${this.currentUserId})`);
                return true;
            } else {
                throw new Error('User not authenticated');
            }
        } catch (error) {
            console.error('❌ Error getting current user:', error);
            return false;
        }
    }

    async loadConversations() {
        try {
            console.log('📬 Loading conversations...');
            
            const response = await fetch('/api/chat/conversations', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.conversations = data.conversations || [];
                console.log(`✅ Loaded ${this.conversations.length} conversations`);
                
                // Calculate unread count
                this.unreadCount = this.conversations.filter(conv => 
                    conv.last_message_sender !== this.currentUserId && !conv.is_read
                ).length;
                
                return true;
            } else {
                throw new Error(data.error || 'Failed to load conversations');
            }

        } catch (error) {
            console.error('❌ Error loading conversations:', error);
            this.conversations = [];
            this.unreadCount = 0;
            return false;
        }
    }

    updateChatSection() {
        const chatSection = document.getElementById('chat-section');
        if (!chatSection) return;

        // Update chat section content
        chatSection.innerHTML = `
            <div class="chat-container">
                <div class="chat-header">
                    <h3>Messages</h3>
                    <div class="chat-actions">
                        <button class="btn btn-primary btn-sm" onclick="chatManager.openNewMessageModal()">
                            <i class="fas fa-plus"></i> New Message
                        </button>
                    </div>
                </div>
                
                <div class="chat-content">
                    ${this.conversations.length > 0 ? this.renderConversationsList() : this.renderEmptyState()}
                </div>
                
                <div class="chat-window" id="chat-window" style="display: none;">
                    <!-- Chat window will be populated when conversation is opened -->
                </div>
            </div>
        `;

        // Update unread badge
        this.updateUnreadBadge();
    }

    renderConversationsList() {
        return `
            <div class="conversations-list">
                ${this.conversations.map(conv => `
                    <div class="conversation-item" onclick="chatManager.openConversation(${conv.id})" data-conversation-id="${conv.id}">
                        <div class="conversation-avatar">
                            <div class="avatar-circle">
                                ${conv.other_username ? conv.other_username.charAt(0).toUpperCase() : '?'}
                            </div>
                        </div>
                        <div class="conversation-info">
                            <div class="conversation-header">
                                <span class="conversation-name">${conv.other_username || 'Unknown User'}</span>
                                <span class="conversation-time">${this.formatTime(conv.last_message_time)}</span>
                            </div>
                            <div class="conversation-preview">
                                <span class="last-message">${conv.last_message_content || 'No messages yet'}</span>
                                ${conv.last_message_sender !== this.currentUserId && !conv.is_read ? '<span class="unread-indicator"></span>' : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h4>No conversations yet</h4>
                <p>Start chatting with your friends!</p>
                <button class="btn btn-primary" onclick="chatManager.openNewMessageModal()">
                    Send Your First Message
                </button>
            </div>
        `;
    }

    async openConversation(conversationId) {
        console.log(`📖 Opening conversation ${conversationId}`);
        
        const conversation = this.conversations.find(conv => conv.id === conversationId);
        if (!conversation) {
            console.error('❌ Conversation not found');
            return;
        }

        this.currentConversation = conversation;
        
        // Load messages for this conversation
        await this.loadMessages(conversationId);
        
        // Show chat window
        this.showChatWindow();
        
        // Mark as read
        if (conversation.last_message_sender !== this.currentUserId) {
            await this.markConversationAsRead(conversationId);
        }
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/chat/messages/${conversationId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentConversation.messages = data.messages || [];
                console.log(`✅ Loaded ${this.currentConversation.messages.length} messages`);
                return true;
            } else {
                throw new Error(data.error || 'Failed to load messages');
            }

        } catch (error) {
            console.error('❌ Error loading messages:', error);
            this.currentConversation.messages = [];
            return false;
        }
    }

    showChatWindow() {
        console.log('🪟 Showing chat window...');
        const chatWindow = document.getElementById('chat-window');
        console.log('📋 Chat window element:', chatWindow);
        console.log('👤 Current conversation:', this.currentConversation);
        
        if (!chatWindow || !this.currentConversation) {
            console.error('❌ Missing chat window element or conversation');
            return;
        }

        chatWindow.style.display = 'block';
        
        // Use the same inline styling that worked in our manual command
        chatWindow.innerHTML = `
            <div style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee; background: #f8f9fa;">
                <button onclick="window.chatManager.closeChatWindow()" style="background: none; border: none; margin-right: 10px; cursor: pointer;">
                    ← Back
                </button>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                        ${this.currentConversation.other_username.charAt(0).toUpperCase()}
                    </div>
                    <span style="font-weight: 600;">${this.currentConversation.other_username}</span>
                </div>
            </div>
            
            <div style="flex: 1; padding: 20px; min-height: 300px; display: flex; align-items: center; justify-content: center; color: #666;">
                ${this.renderMessages()}
            </div>
            
            <div style="padding: 15px; border-top: 1px solid #eee; background: white;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" 
                           id="chat-message-input" 
                           placeholder="Type a message..." 
                           style="flex: 1; padding: 10px 15px; border: 1px solid #ddd; border-radius: 25px; outline: none; font-size: 14px; color: #000; background: #fff;"
                           onkeypress="if(event.key==='Enter') window.chatManager.sendMessage()">
                    <button onclick="window.chatManager.sendMessage()" 
                            style="width: 40px; height: 40px; border-radius: 50%; background: #6366f1; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        ✈
                    </button>
                </div>
            </div>
        `;
        
        // Set proper flexbox styling
        chatWindow.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
            width: 100% !important;
            height: 500px !important;
            background: white !important;
            border: 2px solid #6366f1 !important;
            border-radius: 8px !important;
            margin: 20px 0 !important;
            overflow: hidden !important;
        `;
        
        console.log('✅ Chat window built with inline styling');

        // Ensure input box is visible and accessible after rendering
        setTimeout(() => {
            const inputBox = document.getElementById('chat-message-input');
            console.log('🔍 Input box after render:', inputBox);
            if (inputBox) {
                console.log('✅ Input box is available');
                // Focus on the input box for better UX
                inputBox.focus();
            } else {
                console.error('❌ Input box not found after rendering');
            }

            // Scroll to bottom
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    }

    renderMessages() {
        if (!this.currentConversation.messages || this.currentConversation.messages.length === 0) {
            return `
                <div class="no-messages">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
        }

        // Sort messages by creation time to ensure proper threading
        const sortedMessages = [...this.currentConversation.messages].sort((a, b) => 
            new Date(a.created_at) - new Date(b.created_at)
        );

        return sortedMessages.map((message, index) => {
            const isCurrentUser = message.sender_id === this.currentUserId;
            const previousMessage = sortedMessages[index - 1];
            const nextMessage = sortedMessages[index + 1];
            
            // Check if this message is part of a group (same sender as previous)
            const isGrouped = previousMessage && 
                             previousMessage.sender_id === message.sender_id &&
                             (new Date(message.created_at) - new Date(previousMessage.created_at)) < 300000; // 5 minutes

            // Check if this is the last message in a group
            const isLastInGroup = !nextMessage || 
                                nextMessage.sender_id !== message.sender_id ||
                                (new Date(nextMessage.created_at) - new Date(message.created_at)) >= 300000; // 5 minutes

            return `
                <div class="message ${isCurrentUser ? 'message-sent' : 'message-received'} ${isGrouped ? 'message-grouped' : ''} ${isLastInGroup ? 'message-last-in-group' : ''}" data-message-id="${message.id}">
                    <div class="message-content">
                        ${message.content}
                    </div>
                    ${isLastInGroup ? `
                        <div class="message-meta">
                            <span class="message-time">${this.formatTime(message.created_at)}</span>
                            ${isCurrentUser && message.is_read ? '<span class="read-indicator">✓✓</span>' : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    closeChatWindow() {
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow) {
            chatWindow.style.display = 'none';
        }
        this.currentConversation = null;
    }

    handleMessageKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    async sendMessage(messageContent, recipientUserId) {
        // If called with parameters (from console), use them directly
        if (messageContent && recipientUserId) {
            return this.sendDirectMessage(messageContent, recipientUserId);
        }
        
        // Otherwise, use the UI input method
        // Try both possible input IDs (original and the one we added manually)
        let input = document.getElementById('chat-message-input');
        if (!input) {
            input = document.getElementById('chat-message-input-new');
        }
        if (!input || !this.currentConversation) return;

        const content = input.value.trim();
        if (!content) return;

        try {
            // If this is a new conversation (no ID), create it via API first
            if (!this.currentConversation.id) {
                const response = await fetch('/api/chat/messages', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        recipientId: this.currentConversation.other_user_id,
                        content: content
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to create conversation');
                }

                const result = await response.json();
                
                // Update conversation with the new ID
                this.currentConversation.id = result.conversationId;
                
                // Add the message to display immediately
                const newMessage = {
                    id: result.messageId,
                    conversation_id: result.conversationId,
                    sender_id: this.currentUserId,
                    content: content,
                    created_at: new Date().toISOString()
                };
                
                if (!this.currentConversation.messages) {
                    this.currentConversation.messages = [];
                }
                this.currentConversation.messages.push(newMessage);
                
                // Re-render messages
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = this.renderMessages();
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
                // Reload conversations list
                await this.loadConversations();
                this.updateChatSection();
                
            } else {
                // Send via REST API for existing conversation (for database persistence)
                const response = await fetch('/api/chat/messages', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        recipientId: this.currentConversation.other_user_id,
                        content: content
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }

                const result = await response.json();
                
                // Add the message to display immediately
                const newMessage = {
                    id: result.messageId,
                    conversation_id: this.currentConversation.id,
                    sender_id: this.currentUserId,
                    content: content,
                    created_at: new Date().toISOString()
                };
                
                if (!this.currentConversation.messages) {
                    this.currentConversation.messages = [];
                }
                this.currentConversation.messages.push(newMessage);
                
                // Re-render messages
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = this.renderMessages();
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
                // ALSO send via Socket.IO for real-time delivery
                this.socket.emit('chat:send_message', {
                    recipientId: this.currentConversation.other_user_id,
                    content: content,
                    conversationId: this.currentConversation.id
                });
            }

            // Clear input
            input.value = '';

            console.log('📤 Message sent successfully');

        } catch (error) {
            console.error('❌ Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    async sendDirectMessage(content, recipientUserId) {
        console.log(`📤 Sending direct message to user ${recipientUserId}: "${content}"`);
        
        try {
            // Send via REST API (for database persistence)
            const response = await fetch('/api/chat/messages', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientId: recipientUserId,
                    content: content
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message via API');
            }

            const result = await response.json();
            console.log('✅ Message saved to database:', result);
            
            // ALSO send via Socket.IO for real-time delivery
            this.socket.emit('chat:send_message', {
                recipientId: recipientUserId,
                content: content,
                conversationId: result.conversationId || null
            });
            console.log('✅ Message sent via Socket.IO for real-time delivery');
            
            return result;

        } catch (error) {
            console.error('❌ Error sending direct message:', error);
            throw error;
        }
    }

    // New modern chat layout functions
    async initializeModernChatLayout() {
        console.log('🎨 Initializing modern chat layout...');
        
        // Initialize chat submenu
        this.initializeChatSubmenu();
        
        // Load conversations for sidebar
        await this.updateChatSubmenu();
        
        // Set up real-time updates for the submenu
        this.setupSubmenuRealTimeUpdates();
    }

    initializeChatSubmenu() {
        const chatParent = document.querySelector('.chat-parent');
        const chatSubmenu = document.getElementById('chatSubmenu');
        
        if (chatParent && chatSubmenu) {
            // Toggle submenu on click
            chatParent.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleChatSubmenu();
            });
            
            // Initialize as expanded
            chatParent.classList.add('expanded');
            chatSubmenu.classList.add('expanded');
        }
    }

    toggleChatSubmenu() {
        const chatParent = document.querySelector('.chat-parent');
        const chatSubmenu = document.getElementById('chatSubmenu');
        
        if (chatParent && chatSubmenu) {
            chatParent.classList.toggle('expanded');
            chatSubmenu.classList.toggle('expanded');
        }
    }

    async updateChatSubmenu() {
        const submenu = document.getElementById('chatSubmenu');
        if (!submenu) return;

        try {
            // Load conversations
            await this.loadConversations();
            
            if (this.conversations.length === 0) {
                submenu.innerHTML = `
                    <div class="submenu-loading">No conversations yet</div>
                `;
                return;
            }

            // Create conversation items for sidebar
            const conversationItems = this.conversations.map(conv => {
                const otherUser = conv.other_user_username || `User ${conv.other_user_id}`;
                const lastMessage = conv.last_message_content || 'No messages yet';
                const avatar = otherUser.charAt(0).toUpperCase();
                
                return `
                    <div class="chat-conversation-item" 
                         data-conversation-id="${conv.id}" 
                         data-user-id="${conv.other_user_id}"
                         data-username="${otherUser}"
                         onclick="openChatConversation(${conv.other_user_id}, '${otherUser}', ${conv.id})">
                        <div class="conversation-avatar">${avatar}</div>
                        <div class="conversation-info">
                            <div class="conversation-name">${otherUser}</div>
                            <div class="conversation-preview">${lastMessage}</div>
                        </div>
                        <div class="conversation-meta">
                            <div class="conversation-time">${this.formatMessageTime(conv.last_message_time)}</div>
                            ${!conv.is_read ? '<div class="conversation-unread">1</div>' : ''}
                        </div>
                    </div>
                `;
            }).join('');

            submenu.innerHTML = conversationItems;

        } catch (error) {
            console.error('❌ Error updating chat submenu:', error);
            submenu.innerHTML = `
                <div class="submenu-loading">Error loading conversations</div>
            `;
        }
    }

    formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 minute
        if (diff < 60000) return 'now';
        
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m`;
        }
        
        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h`;
        }
        
        // More than 24 hours
        const days = Math.floor(diff / 86400000);
        if (days === 1) return '1d';
        if (days < 7) return `${days}d`;
        
        // Format as date
        return date.toLocaleDateString();
    }
}

    async markConversationAsRead(conversationId) {
        const conversation = this.conversations.find(conv => conv.id === conversationId);
        if (!conversation || !conversation.last_message_id) return;

        try {
            const response = await fetch(`/api/chat/messages/${conversation.last_message_id}/read`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                conversation.is_read = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateUnreadBadge();
            }

        } catch (error) {
            console.error('❌ Error marking as read:', error);
        }
    }

    async markMessageAsRead(messageId) {
        try {
            const response = await fetch(`/api/chat/messages/${messageId}/read`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log(`✅ Message ${messageId} marked as read`);
                
                // Update the message in current conversation
                if (this.currentConversation && this.currentConversation.messages) {
                    const message = this.currentConversation.messages.find(msg => msg.id === messageId);
                    if (message) {
                        message.is_read = true;
                        
                        // Re-render messages to show read receipt
                        const messagesContainer = document.getElementById('chat-messages');
                        if (messagesContainer) {
                            messagesContainer.innerHTML = this.renderMessages();
                        }
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error marking message as read:', error);
        }
    }

    updateUnreadBadge() {
        const badge = document.querySelector('[data-nav="chat"] .nav-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    async openNewMessageModal() {
        try {
            // Load friends list for selection
            const response = await fetch('/api/friends', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load friends');
            }

            const data = await response.json();
            console.log('📋 Friends API response:', data);
            
            // Extract friends array from response object
            const friends = data.friends || [];
            
            if (friends.length === 0) {
                alert('You need to add friends first to start chatting!');
                return;
            }

            // Create and show friend selector modal
            this.showFriendSelector(friends);

        } catch (error) {
            console.error('❌ Error loading friends:', error);
            alert('Error loading friends. Please try again.');
        }
    }

    showFriendSelector(friends) {
        // Create modal overlay with proper inline styles
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 99999 !important;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <h4 style="margin: 0; color: #333;">Start New Conversation</h4>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
                </div>
                
                <div class="friend-selector" style="margin-bottom: 20px;">
                    ${friends.map(friend => `
                        <div onclick="window.chatManager.startConversationWithFriend(${friend.id}, '${friend.username}'); this.closest('.modal-overlay').remove();" 
                             style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; margin-bottom: 8px; transition: background 0.2s;"
                             onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                                ${friend.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #333;">${friend.username}</div>
                                <div style="font-size: 12px; color: #22c55e;">● Online</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center;">
                    <small style="color: #666;">Click on a friend to start chatting</small>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async startConversationWithFriend(friendId, friendUsername) {
        console.log(`🚀 Starting conversation with ${friendUsername} (${friendId})`);
        
        // Close the modal
        document.querySelector('.modal-overlay')?.remove();

        // Check if conversation already exists
        const existingConv = this.conversations.find(conv => conv.other_user_id === friendId);
        
        if (existingConv) {
            // Open existing conversation
            console.log('📂 Opening existing conversation');
            this.openConversation(existingConv.id);
        } else {
            // Create new conversation object
            console.log('✨ Creating new conversation');
            this.currentConversation = {
                id: null, // Will be set when first message is sent
                other_user_id: friendId,
                other_username: friendUsername,
                messages: []
            };
            
            // Force show chat window with proper styling
            this.showChatWindow();
            
            // Additional styling to ensure visibility (like our manual command)
            const chatWindow = document.getElementById('chat-window');
            if (chatWindow) {
                chatWindow.style.cssText = `
                    display: flex !important;
                    flex-direction: column !important;
                    position: relative !important;
                    width: 100% !important;
                    height: 500px !important;
                    background: white !important;
                    border: 2px solid #6366f1 !important;
                    border-radius: 8px !important;
                    margin: 20px 0 !important;
                    overflow: hidden !important;
                `;
                console.log('✅ Chat window styled and visible');
            }
        }
    }

    initializeEventListeners() {
        // Add any additional event listeners here
        console.log('🎧 Chat event listeners initialized');
    }

    initializeSocketEvents() {
        if (!this.socket) {
            console.warn('⚠️ Socket not available for chat events');
            return;
        }

        // Listen for new messages
        this.socket.on('chat:new_message', (message) => {
            console.log('📨 New message received:', message);
            this.handleNewMessage(message);
        });

        // Listen for message sent confirmation
        this.socket.on('chat:message_sent', (message) => {
            console.log('✅ Message sent confirmation:', message);
            this.handleMessageSent(message);
        });

        // Listen for typing indicators
        this.socket.on('chat:typing_start', (data) => {
            this.handleTypingStart(data);
        });

        this.socket.on('chat:typing_stop', (data) => {
            this.handleTypingStop(data);
        });

        // Listen for read receipts
        this.socket.on('chat:message_read', (data) => {
            console.log('👁️ Message read receipt:', data);
        });

        // Listen for errors
        this.socket.on('chat:error', (error) => {
            console.error('💥 Chat error:', error);
        });

        console.log('🔗 Chat socket events initialized');
    }

    handleNewMessage(message) {
        console.log('📨 Processing new message:', message);
        console.log('👤 Current user ID:', this.currentUserId);
        console.log('👤 Message sender ID:', message.senderId);
        
        // Don't handle our own messages
        if (message.senderId === this.currentUserId) {
            console.log('🚫 Ignoring own message');
            return;
        }
        
        console.log('🔔 Showing notification for new message');
        // Show browser notification for new messages
        this.showNotification(message);
        
        // Update conversations list to show new message
        this.loadConversations();
        
        // Add to current conversation if it's open
        if (this.currentConversation && this.currentConversation.id === message.conversationId) {
            if (!this.currentConversation.messages) {
                this.currentConversation.messages = [];
            }
            
            // Check if message already exists (prevent duplicates)
            const messageExists = this.currentConversation.messages.some(msg => msg.id === message.id);
            if (!messageExists) {
                this.currentConversation.messages.push(message);
                
                // Re-render messages with smooth scrolling
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = this.renderMessages();
                    
                    // Smooth scroll to bottom
                    messagesContainer.scrollTo({
                        top: messagesContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                }
                
                // Auto-mark as read if chat window is open and focused
                if (document.hasFocus() && message.senderId !== this.currentUserId) {
                    setTimeout(() => {
                        this.markMessageAsRead(message.id);
                    }, 1000);
                }
            }
        } else {
            // Update unread count for messages not in current conversation
            if (message.senderId !== this.currentUserId) {
                this.unreadCount++;
                this.updateUnreadBadge();
            }
        }

        // Update conversations list with latest message
        this.loadConversations().then(() => {
            this.updateChatSection();
        });
    }

    showNotification(message) {
        try {
            // Request notification permission if not granted
            if (Notification.permission === 'default') {
                Notification.requestPermission();
                return;
            }

            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
                const notification = new Notification(`New message from ${message.senderName}`, {
                    body: message.content,
                    icon: '/images/logo.png', // Add your app icon
                    tag: `chat-${message.senderId}`, // Replace previous notifications from same user
                    requireInteraction: false,
                    silent: false
                });

                // Auto-close notification after 5 seconds
                setTimeout(() => {
                    notification.close();
                }, 5000);

                // Click notification to open chat
                notification.onclick = () => {
                    window.focus();
                    this.openConversation(message.conversationId || message.conversation_id);
                    notification.close();
                };
            }

            // Also show in-app notification (fallback)
            this.showInAppNotification(message);
            
        } catch (error) {
            console.error('Error showing notification:', error);
            // Fallback to in-app notification
            this.showInAppNotification(message);
        }
    }

    showInAppNotification(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #6366f1;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            cursor: pointer;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        
        toast.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px;">New message from ${message.senderName}</div>
            <div style="font-size: 14px; opacity: 0.9;">${message.content}</div>
        `;

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        if (!document.querySelector('style[data-toast]')) {
            style.setAttribute('data-toast', 'true');
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Click to open conversation
        toast.onclick = () => {
            this.openConversation(message.conversationId || message.conversation_id);
            toast.remove();
        };

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    handleMessageSent(message) {
        console.log('✅ Processing sent message confirmation:', message);
        
        // Add to current conversation if not already there
        if (this.currentConversation && this.currentConversation.id === message.conversation_id) {
            if (!this.currentConversation.messages) {
                this.currentConversation.messages = [];
            }
            
            // Check if message already exists (prevent duplicates from API + Socket)
            const messageExists = this.currentConversation.messages.some(msg => 
                msg.id === message.id || 
                (msg.content === message.content && Math.abs(new Date(msg.created_at) - new Date(message.created_at)) < 5000)
            );
            
            if (!messageExists) {
                this.currentConversation.messages.push(message);
                
                // Re-render messages with smooth scrolling
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = this.renderMessages();
                    
                    // Smooth scroll to bottom
                    messagesContainer.scrollTo({
                        top: messagesContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }
        }
        
        // Update conversations list
        this.loadConversations().then(() => {
            this.updateChatSection();
        });
    }

    handleTypingStart(data) {
        if (this.currentConversation && this.currentConversation.id === data.conversationId) {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.style.display = 'block';
                indicator.innerHTML = `<span class="typing-text">${data.username} is typing...</span>`;
            }
        }
    }

    handleTypingStop(data) {
        if (this.currentConversation && this.currentConversation.id === data.conversationId) {
            const indicator = document.getElementById('typing-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 24 * 60 * 60 * 1000) {
            // Less than 24 hours - show time
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            // More than 24 hours - show date
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
}

// Initialize chat manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for socket to be available
    setTimeout(() => {
        if (typeof window !== 'undefined') {
            window.chatManager = new ChatManager();
            window.chatManager.initialize();
        }
    }, 1000);
});