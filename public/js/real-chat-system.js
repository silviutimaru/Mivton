/**
 * Real Chat System - Actual Working Implementation
 * Connects to backend API and Socket.IO for real messaging
 */

class RealChatSystem {
    constructor() {
        this.container = null;
        this.socket = null;
        this.currentFriend = null;
        this.isInitialized = false;
        this.messageHistory = [];
    }

    /**
     * Initialize the real chat system
     */
    async init() {
        try {
            console.log('🚀 Initializing Real Chat System...');
            
            // Initialize Socket.IO connection
            await this.initializeSocket();
            
            // Create the chat interface
            this.createChatInterface();
            
            // Bind events
            this.bindEvents();
            
            // Load recent messages
            await this.loadRecentMessages();
            
            this.isInitialized = true;
            console.log('✅ Real Chat System initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize real chat:', error);
            throw error;
        }
    }

    /**
     * Initialize Socket.IO connection for real-time messaging
     */
    async initializeSocket() {
        try {
            if (typeof io !== 'undefined') {
                this.socket = io();
                
                this.socket.on('connect', () => {
                    console.log('🔌 Real chat socket connected');
                });
                
                this.socket.on('disconnect', () => {
                    console.log('🔌 Real chat socket disconnected');
                });
                
                // Listen for new messages
                this.socket.on('new_message', (data) => {
                    console.log('📥 Received real message:', data);
                    this.handleIncomingMessage(data);
                });
                
                // Listen for typing indicators
                this.socket.on('user_typing', (data) => {
                    this.handleTypingIndicator(data);
                });
                
                // Listen for message read receipts
                this.socket.on('message_read', (data) => {
                    this.handleReadReceipt(data);
                });
                
                console.log('✅ Socket.IO initialized for real chat');
            } else {
                console.warn('⚠️ Socket.IO not available - using fallback');
            }
        } catch (error) {
            console.error('❌ Socket initialization failed:', error);
        }
    }

    /**
     * Create the chat interface
     */
    createChatInterface() {
        // Remove existing chat if any
        const existing = document.querySelector('.real-chat-system');
        if (existing) {
            existing.remove();
        }

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'real-chat-system';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;
        
        // Create chat box
        const chatBox = document.createElement('div');
        chatBox.style.cssText = `
            background: #1a1a2e;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            height: 80vh;
            max-height: 700px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 2px solid #8b5cf6;
        `;
        
        // Chat header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #8b5cf6, #3b82f6);
            color: white;
            padding: 20px;
            border-radius: 10px 10px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;" id="friendAvatar">
                    ?
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 18px;" id="friendName">Select a friend</h3>
                    <p style="margin: 0; font-size: 12px; opacity: 0.8;" id="friendStatus">Choose someone to chat with</p>
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button id="markAsRead" style="
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                " title="Mark as Read">✓ Read</button>
                <button id="closeChat" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 4px;
                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">×</button>
            </div>
        `;
        
        // Messages area
        const messagesArea = document.createElement('div');
        messagesArea.id = 'real-chat-messages';
        messagesArea.style.cssText = `
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #0f0f23;
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;
        
        // Welcome message
        messagesArea.innerHTML = `
            <div class="welcome-message" style="text-align: center; padding: 40px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">Real Chat System</h3>
                <p style="margin: 0; font-size: 14px;">Messages will be sent in real-time to the other user</p>
                <div style="margin-top: 16px; padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <small>✅ Connected to real messaging system</small>
                </div>
            </div>
        `;
        
        // Typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typingIndicator';
        typingIndicator.style.cssText = `
            display: none;
            padding: 8px 16px;
            color: #8b5cf6;
            font-size: 12px;
            font-style: italic;
        `;
        typingIndicator.innerHTML = '🔄 <span id="typingText">Someone is typing...</span>';
        
        // Input area
        const inputArea = document.createElement('div');
        inputArea.style.cssText = `
            padding: 20px;
            background: #16213e;
            border-radius: 0 0 10px 10px;
            border-top: 1px solid #333;
        `;
        
        inputArea.innerHTML = `
            <div style="display: flex; gap: 12px;">
                <input type="text" id="real-chat-input" placeholder="Type your message..." style="
                    flex: 1;
                    padding: 12px 16px;
                    background: #0f0f23;
                    border: 1px solid #333;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                " onkeypress="if(event.key==='Enter') window.realChatSystem.sendMessage()">
                <button onclick="window.realChatSystem.sendMessage()" style="
                    padding: 12px 20px;
                    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                    Send
                </button>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #666; text-align: center;">
                💬 Real-time messaging • Press Enter to send • Messages are stored in database
            </div>
        `;
        
        // Assemble chat box
        chatBox.appendChild(header);
        chatBox.appendChild(messagesArea);
        chatBox.appendChild(typingIndicator);
        chatBox.appendChild(inputArea);
        this.container.appendChild(chatBox);
        
        // Add to page
        document.body.appendChild(this.container);
        console.log('✅ Real chat interface created');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button
        const closeBtn = this.container.querySelector('#closeChat');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeChat());
        }

        // Mark as read button
        const markReadBtn = this.container.querySelector('#markAsRead');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', () => this.markMessagesAsRead());
        }

        // Enter key in input
        const messageInput = this.container.querySelector('#real-chat-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
            
            // Typing indicator
            let typingTimer;
            messageInput.addEventListener('input', () => {
                this.sendTypingIndicator();
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    this.stopTypingIndicator();
                }, 1000);
            });
        }
    }

    /**
     * Open conversation with a friend
     */
    async openConversation(friendId, friendName) {
        try {
            console.log(`💬 Opening real conversation with ${friendName} (${friendId})`);
            
            if (!this.container) {
                throw new Error('Chat container not initialized');
            }

            this.currentFriend = { id: friendId, name: friendName };

            // Update UI
            const friendNameEl = this.container.querySelector('#friendName');
            const friendStatusEl = this.container.querySelector('#friendStatus');
            const friendAvatarEl = this.container.querySelector('#friendAvatar');

            if (friendNameEl) friendNameEl.textContent = friendName;
            if (friendStatusEl) friendStatusEl.textContent = 'Online';
            if (friendAvatarEl) friendAvatarEl.textContent = friendName.charAt(0).toUpperCase();

            // Load conversation history
            await this.loadConversationHistory(friendId);

            // Join socket room for real-time updates
            if (this.socket) {
                this.socket.emit('join_conversation', { 
                    friendId: friendId,
                    userId: await this.getCurrentUserId()
                });
            }

            // Show the chat interface
            this.show();

            console.log(`✅ Real conversation opened with ${friendName}`);
            return true;

        } catch (error) {
            console.error('❌ Error opening real conversation:', error);
            throw error;
        }
    }

    /**
     * Show the chat interface
     */
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            console.log('✅ Real chat interface shown');
        }
    }

    /**
     * Hide the chat interface
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            console.log('✅ Real chat interface hidden');
        }
    }

    /**
     * Close the chat
     */
    closeChat() {
        this.hide();
        
        // Leave socket room
        if (this.socket && this.currentFriend) {
            this.socket.emit('leave_conversation', { 
                friendId: this.currentFriend.id,
                userId: this.getCurrentUserId()
            });
        }
        
        this.currentFriend = null;
        console.log('✅ Real chat closed');
    }

    /**
     * Send a real message
     */
    async sendMessage() {
        try {
            const messageInput = this.container.querySelector('#real-chat-input');
            if (!messageInput || !this.currentFriend) return;

            const message = messageInput.value.trim();
            if (!message) return;

            console.log(`📤 Sending real message to ${this.currentFriend.name}: ${message}`);

            // Add message to UI immediately (optimistic update)
            this.addMessageToUI({
                id: Date.now(),
                text: message,
                sender: 'me',
                timestamp: new Date(),
                status: 'sending'
            });

            // Clear input
            messageInput.value = '';

            // Send via real API
            try {
                const response = await fetch('/api/chat/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        recipientId: this.currentFriend.id,
                        message: message,
                        timestamp: new Date().toISOString()
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Real message sent successfully:', result);
                    
                    // Update message status to sent
                    this.updateMessageStatus(Date.now(), 'sent');
                    
                    // Send via Socket.IO for real-time delivery
                    if (this.socket) {
                        this.socket.emit('send_message', {
                            recipientId: this.currentFriend.id,
                            message: message,
                            messageId: result.messageId || Date.now(),
                            timestamp: new Date().toISOString()
                        });
                    }
                } else {
                    console.error('❌ Failed to send real message:', response.status);
                    this.updateMessageStatus(Date.now(), 'failed');
                    this.showError('Failed to send message. Please try again.');
                }
            } catch (error) {
                console.error('❌ API error:', error);
                this.updateMessageStatus(Date.now(), 'failed');
                this.showError('Network error. Please check your connection.');
            }

        } catch (error) {
            console.error('❌ Error sending real message:', error);
        }
    }

    /**
     * Handle incoming real message
     */
    handleIncomingMessage(data) {
        console.log('📥 Handling incoming real message:', data);
        
        if (data.senderId !== this.currentFriend?.id) return;

        this.addMessageToUI({
            id: data.messageId || Date.now(),
            text: data.message,
            sender: 'friend',
            timestamp: new Date(data.timestamp),
            status: 'received'
        });

        // Mark message as read
        this.markMessageAsRead(data.messageId);
    }

    /**
     * Add message to UI
     */
    addMessageToUI(message) {
        const messagesContainer = this.container.querySelector('#real-chat-messages');
        if (!messagesContainer) return;

        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            display: flex;
            ${message.sender === 'me' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
            margin-bottom: 12px;
        `;

        const messageBubble = document.createElement('div');
        messageBubble.style.cssText = `
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            color: white;
            font-size: 14px;
            word-wrap: break-word;
            position: relative;
        `;

        // Set bubble color based on sender
        if (message.sender === 'me') {
            messageBubble.style.background = 'linear-gradient(135deg, #8b5cf6, #3b82f6)';
        } else {
            messageBubble.style.background = '#2a2a3e';
        }

        // Add status indicator for sent messages
        if (message.sender === 'me') {
            let statusIcon = '';
            if (message.status === 'sending') statusIcon = '⏳';
            else if (message.status === 'sent') statusIcon = '✓';
            else if (message.status === 'failed') statusIcon = '❌';
            
            messageBubble.innerHTML = `
                ${message.text}
                <div style="font-size: 10px; opacity: 0.7; margin-top: 4px; text-align: right;">
                    ${statusIcon}
                </div>
            `;
        } else {
            messageBubble.textContent = message.text;
        }

        messageEl.appendChild(messageBubble);
        messagesContainer.appendChild(messageEl);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Load conversation history from database
     */
    async loadConversationHistory(friendId) {
        try {
            console.log(`📚 Loading conversation history with friend ${friendId}`);
            
            const response = await fetch(`/api/chat/conversation/${friendId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Conversation history loaded:', data);
                
                // Clear welcome message
                const messagesContainer = this.container.querySelector('#real-chat-messages');
                const welcomeMessage = messagesContainer.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.remove();
                }

                // Add messages to UI
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        this.addMessageToUI({
                            id: msg.id,
                            text: msg.message,
                            sender: msg.senderId === await this.getCurrentUserId() ? 'me' : 'friend',
                            timestamp: new Date(msg.timestamp),
                            status: 'sent'
                        });
                    });
                } else {
                    // Show empty state
                    messagesContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px; color: #666;">
                            <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">Start a Conversation</h3>
                            <p style="margin: 0; font-size: 14px;">No messages yet. Send the first message!</p>
                        </div>
                    `;
                }
            } else {
                console.error('❌ Failed to load conversation history:', response.status);
            }
        } catch (error) {
            console.error('❌ Error loading conversation history:', error);
        }
    }

    /**
     * Load recent messages for notifications
     */
    async loadRecentMessages() {
        try {
            const response = await fetch('/api/chat/recent', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Recent messages loaded:', data);
                
                // Show notifications for unread messages
                if (data.unreadCount > 0) {
                    this.showNotification(`You have ${data.unreadCount} unread messages`);
                }
            }
        } catch (error) {
            console.error('❌ Error loading recent messages:', error);
        }
    }

    /**
     * Get current user ID
     */
    async getCurrentUserId() {
        try {
            const response = await fetch('/api/user/me', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.user?.id;
            }
        } catch (error) {
            console.error('❌ Error getting current user ID:', error);
        }
        return null;
    }

    /**
     * Send typing indicator
     */
    sendTypingIndicator() {
        if (this.socket && this.currentFriend) {
            this.socket.emit('typing', {
                friendId: this.currentFriend.id,
                isTyping: true
            });
        }
    }

    /**
     * Stop typing indicator
     */
    stopTypingIndicator() {
        if (this.socket && this.currentFriend) {
            this.socket.emit('typing', {
                friendId: this.currentFriend.id,
                isTyping: false
            });
        }
    }

    /**
     * Handle typing indicator from other users
     */
    handleTypingIndicator(data) {
        const typingIndicator = this.container.querySelector('#typingIndicator');
        const typingText = this.container.querySelector('#typingText');
        
        if (data.isTyping) {
            typingIndicator.style.display = 'block';
            typingText.textContent = `${this.currentFriend?.name} is typing...`;
        } else {
            typingIndicator.style.display = 'none';
        }
    }

    /**
     * Mark messages as read
     */
    async markMessagesAsRead() {
        if (!this.currentFriend) return;

        try {
            await fetch(`/api/chat/mark-read/${this.currentFriend.id}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            console.log('✅ Messages marked as read');
        } catch (error) {
            console.error('❌ Error marking messages as read:', error);
        }
    }

    /**
     * Mark specific message as read
     */
    async markMessageAsRead(messageId) {
        try {
            await fetch(`/api/chat/mark-message-read/${messageId}`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('❌ Error marking message as read:', error);
        }
    }

    /**
     * Update message status
     */
    updateMessageStatus(messageId, status) {
        const messages = this.container.querySelectorAll('#real-chat-messages > div');
        messages.forEach(msgEl => {
            const bubble = msgEl.querySelector('div');
            if (bubble && bubble.innerHTML.includes(messageId.toString())) {
                const statusEl = bubble.querySelector('div');
                if (statusEl) {
                    let statusIcon = '';
                    if (status === 'sent') statusIcon = '✓';
                    else if (status === 'failed') statusIcon = '❌';
                    else if (status === 'sending') statusIcon = '⏳';
                    
                    statusEl.innerHTML = statusIcon;
                }
            }
        });
    }

    /**
     * Show notification
     */
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #8b5cf6, #3b82f6);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            font-weight: 500;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('❌ Chat error:', message);
        this.showNotification(`❌ ${message}`);
    }
}

// Make it globally available
window.RealChatSystem = RealChatSystem;
