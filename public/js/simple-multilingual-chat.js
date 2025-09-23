/**
 * Simple Multilingual Chat Implementation
 * A robust, simple chat system that actually works
 */

class SimpleMultilingualChat {
    constructor() {
        this.container = null;
        this.socket = null;
        this.currentFriend = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the chat system
     */
    async init() {
        try {
            console.log('🚀 Initializing Simple Multilingual Chat...');
            
            // Initialize Socket.IO connection
            await this.initializeSocket();
            
            // Create the chat interface
            this.createChatInterface();
            
            // Bind events
            this.bindEvents();
            
            this.isInitialized = true;
            console.log('✅ Simple Multilingual Chat initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize chat:', error);
            throw error;
        }
    }

    /**
     * Initialize Socket.IO connection
     */
    async initializeSocket() {
        try {
            if (typeof io !== 'undefined') {
                this.socket = io();
                
                this.socket.on('connect', () => {
                    console.log('🔌 Chat socket connected');
                });
                
                this.socket.on('disconnect', () => {
                    console.log('🔌 Chat socket disconnected');
                });
                
                this.socket.on('message', (data) => {
                    this.handleIncomingMessage(data);
                });
                
                console.log('✅ Socket.IO initialized for chat');
            } else {
                console.warn('⚠️ Socket.IO not available');
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
        const existing = document.querySelector('.simple-multilingual-chat');
        if (existing) {
            existing.remove();
        }

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'simple-multilingual-chat';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 600px;
            height: 80vh;
            max-height: 600px;
            background: #1a1a2e;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid #333;
            z-index: 1000;
            display: none;
            flex-direction: column;
            color: white;
            font-family: 'Inter', sans-serif;
        `;

        this.container.innerHTML = `
            <!-- Chat Header -->
            <div class="chat-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: #16213e;
                border-bottom: 1px solid #333;
                border-radius: 12px 12px 0 0;
            ">
                <div class="friend-info" style="display: flex; align-items: center; gap: 12px;">
                    <div class="friend-avatar" style="
                        width: 40px;
                        height: 40px;
                        background: #8b5cf6;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                    " id="friendAvatar">?</div>
                    <div>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 600;" id="friendName">Select a friend</h3>
                        <p style="margin: 0; font-size: 12px; color: #10b981;" id="friendStatus">Choose someone to chat with</p>
                    </div>
                </div>
                <button id="closeChat" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 4px;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#333'" onmouseout="this.style.background='none'">×</button>
            </div>

            <!-- Chat Messages -->
            <div class="chat-messages" id="chatMessages" style="
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                background: #0f0f23;
                display: flex;
                flex-direction: column;
                gap: 12px;
            ">
                <div class="welcome-message" style="
                    text-align: center;
                    padding: 40px 20px;
                    color: #666;
                ">
                    <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                    <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">Start Chatting</h3>
                    <p style="margin: 0; font-size: 14px;">Type a message below to begin your conversation</p>
                </div>
            </div>

            <!-- Chat Input -->
            <div class="chat-input-container" style="
                padding: 16px 20px;
                background: #16213e;
                border-top: 1px solid #333;
                border-radius: 0 0 12px 12px;
            ">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <input type="text" id="messageInput" placeholder="Type your message..." style="
                        flex: 1;
                        padding: 12px 16px;
                        background: #0f0f23;
                        border: 1px solid #333;
                        border-radius: 8px;
                        color: white;
                        font-size: 14px;
                        outline: none;
                    " onkeypress="if(event.key==='Enter') window.simpleChat.sendMessage()">
                    <button id="sendButton" onclick="window.simpleChat.sendMessage()" style="
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #8b5cf6, #3b82f6);
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">
                        Send
                    </button>
                </div>
                <div style="margin-top: 8px; font-size: 12px; color: #666; text-align: center;">
                    Messages will automatically translate between languages
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(this.container);
        console.log('✅ Chat interface created');
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

        // Enter key in input
        const messageInput = this.container.querySelector('#messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }

    /**
     * Open conversation with a friend
     */
    async openConversation(friendId, friendName) {
        try {
            console.log(`💬 Opening conversation with ${friendName} (${friendId})`);
            
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

            // Clear messages and show welcome
            const messagesContainer = this.container.querySelector('#chatMessages');
            if (messagesContainer) {
                messagesContainer.innerHTML = `
                    <div class="welcome-message" style="
                        text-align: center;
                        padding: 40px 20px;
                        color: #666;
                    ">
                        <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                        <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">Chat with ${friendName}</h3>
                        <p style="margin: 0; font-size: 14px;">Type a message below to begin your conversation</p>
                    </div>
                `;
            }

            // Join socket room
            if (this.socket) {
                this.socket.emit('join:chat', friendId);
            }

            console.log(`✅ Conversation opened with ${friendName}`);
            return true;

        } catch (error) {
            console.error('❌ Error opening conversation:', error);
            throw error;
        }
    }

    /**
     * Show the chat interface
     */
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            console.log('✅ Chat interface shown');
        }
    }

    /**
     * Hide the chat interface
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            console.log('✅ Chat interface hidden');
        }
    }

    /**
     * Close the chat
     */
    closeChat() {
        this.hide();
        this.currentFriend = null;
        
        // Leave socket room
        if (this.socket && this.currentFriend) {
            this.socket.emit('leave:chat', this.currentFriend.id);
        }
        
        console.log('✅ Chat closed');
    }

    /**
     * Send a message
     */
    async sendMessage() {
        try {
            const messageInput = this.container.querySelector('#messageInput');
            if (!messageInput || !this.currentFriend) return;

            const message = messageInput.value.trim();
            if (!message) return;

            console.log(`📤 Sending message to ${this.currentFriend.name}: ${message}`);

            // Add message to UI immediately
            this.addMessageToUI({
                id: Date.now(),
                text: message,
                sender: 'me',
                timestamp: new Date(),
                originalText: message,
                translatedText: message,
                fromLang: 'en',
                toLang: 'ro'
            });

            // Clear input
            messageInput.value = '';

            // Send via API (simplified - no translation for now)
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
                        language: 'en'
                    })
                });

                if (response.ok) {
                    console.log('✅ Message sent successfully');
                } else {
                    console.error('❌ Failed to send message:', response.status);
                }
            } catch (error) {
                console.error('❌ API error:', error);
            }

        } catch (error) {
            console.error('❌ Error sending message:', error);
        }
    }

    /**
     * Add message to UI
     */
    addMessageToUI(message) {
        const messagesContainer = this.container.querySelector('#chatMessages');
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
            background: ${message.sender === 'me' ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : '#2a2a3e'};
            color: white;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        `;

        messageBubble.textContent = message.text;
        messageEl.appendChild(messageBubble);
        messagesContainer.appendChild(messageEl);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * Handle incoming message
     */
    handleIncomingMessage(data) {
        console.log('📥 Received message:', data);
        
        if (data.senderId !== this.currentFriend?.id) return;

        this.addMessageToUI({
            id: data.id,
            text: data.translatedText || data.originalText,
            sender: 'friend',
            timestamp: new Date(data.timestamp),
            originalText: data.originalText,
            translatedText: data.translatedText,
            fromLang: data.fromLang,
            toLang: data.toLang
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('❌ Chat error:', message);
        if (window.toast) {
            window.toast.show(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Make it globally available
window.SimpleMultilingualChat = SimpleMultilingualChat;
