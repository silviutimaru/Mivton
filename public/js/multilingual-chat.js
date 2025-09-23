/**
 * Multilingual Chat Interface
 * Real-time chat with automatic translation using OpenAI
 */

class MultilingualChat {
    constructor() {
        this.currentConversationId = null;
        this.currentFriend = null;
        this.messages = [];
        this.socket = null;
        this.userLanguage = 'en';
        this.isTyping = false;
        this.typingTimeout = null;
        this.container = null;
    }

    async init() {
        try {
            await this.initializeSocket();
            await this.loadUserLanguage();
            this.createHTML();
            this.bindEvents();
            this.render();
            console.log('✅ Multilingual Chat initialized');
        } catch (error) {
            console.error('❌ Failed to initialize multilingual chat:', error);
            this.showError('Failed to initialize chat system');
        }
    }

    createHTML() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'multilingual-chat';
        }
        this.container.innerHTML = `
            <div class="chat-container">
                <!-- Chat Header -->
                <div class="chat-header">
                    <div class="chat-info">
                        <div class="friend-avatar">
                            <i class="icon-user"></i>
                        </div>
                        <div class="friend-details">
                            <h3 class="friend-name" id="friendName">Select a conversation</h3>
                            <p class="friend-status" id="friendStatus">Choose a friend to start chatting</p>
                        </div>
                    </div>
                    <div class="chat-actions">
                        <button class="btn btn-secondary" id="toggleTranslation">
                            <i class="icon-globe"></i>
                            <span id="translationToggleText">Show Original</span>
                        </button>
                        <button class="btn btn-secondary" id="chatSettings">
                            <i class="icon-settings"></i>
                        </button>
                        <button class="btn btn-secondary" id="closeChat">
                            <i class="icon-x"></i>
                        </button>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-welcome">
                        <div class="welcome-content">
                            <i class="icon-message-circle"></i>
                            <h3>Start a Conversation</h3>
                            <p>Select a friend from your friends list to begin chatting with automatic translation.</p>
                            <div class="language-info">
                                <span class="language-badge">Your language: <strong id="userLanguageDisplay">${this.userLanguage}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Typing Indicator -->
                <div class="typing-indicator" id="typingIndicator" style="display: none;">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span class="typing-text" id="typingText">Someone is typing...</span>
                </div>

                <!-- Chat Input -->
                <div class="chat-input-container" id="chatInputContainer" style="display: none;">
                    <div class="input-wrapper">
                        <div class="message-input-container">
                            <textarea 
                                id="messageInput" 
                                class="message-input" 
                                placeholder="Type your message... (will be automatically translated)"
                                rows="1"
                                maxlength="2000"
                            ></textarea>
                            <div class="input-actions">
                                <button class="btn btn-icon" id="toggleOriginal" title="Toggle original/translated view">
                                    <i class="icon-eye"></i>
                                </button>
                                <button class="btn btn-primary" id="sendMessage" disabled>
                                    <i class="icon-send"></i>
                                </button>
                            </div>
                        </div>
                        <div class="translation-preview" id="translationPreview" style="display: none;">
                            <div class="preview-label">Translation preview:</div>
                            <div class="preview-text" id="previewText"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat Settings Modal -->
            <div class="modal chat-settings-modal" id="chatSettingsModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Chat Settings</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="settings-section">
                            <h4>Translation Settings</h4>
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="autoTranslate" checked>
                                    <span class="checkbox-custom"></span>
                                    Enable automatic translation
                                </label>
                            </div>
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="showOriginal">
                                    <span class="checkbox-custom"></span>
                                    Always show original text
                                </label>
                            </div>
                            <div class="setting-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="translationPreview">
                                    <span class="checkbox-custom"></span>
                                    Show translation preview while typing
                                </label>
                            </div>
                        </div>
                        
                        <div class="settings-section">
                            <h4>Display Settings</h4>
                            <div class="setting-item">
                                <label for="messagesPerPage">Messages per page:</label>
                                <select id="messagesPerPage">
                                    <option value="20">20</option>
                                    <option value="50" selected>50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
                        <button type="button" class="btn btn-primary save-settings-btn">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    render() {
        // Render method for compatibility
        if (this.container) {
            this.bindEvents();
        }
    }

    async initializeSocket() {
        // Initialize socket connection for real-time chat
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 Chat socket connected');
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Chat socket disconnected');
            });

            // Listen for new messages
            this.socket.on('chat:message', (data) => {
                this.handleNewMessage(data);
            });

            // Listen for typing indicators
            this.socket.on('chat:typing', (data) => {
                this.handleTypingIndicator(data);
            });

            // Listen for message status updates
            this.socket.on('chat:status', (data) => {
                this.handleMessageStatus(data);
            });
        }
    }

    async loadUserLanguage() {
        try {
            const response = await fetch('/api/user/preferences', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.userLanguage = data.language || 'en';
                console.log('✅ User language loaded:', this.userLanguage);
            } else {
                console.warn('⚠️ Failed to load user language, using default: en');
                this.userLanguage = 'en';
            }
        } catch (error) {
            console.warn('⚠️ Error loading user language:', error);
            this.userLanguage = 'en';
        }
    }

    bindEvents() {
        // Send message
        const sendBtn = this.container.querySelector('#sendMessage');
        const messageInput = this.container.querySelector('#messageInput');
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        messageInput.addEventListener('input', (e) => {
            this.autoResizeTextarea(e.target);
            this.handleTyping();
            
            // Show translation preview if enabled
            if (this.container.querySelector('#translationPreview').checked) {
                this.showTranslationPreview(e.target.value);
            }
        });

        // Toggle translation view
        this.container.querySelector('#toggleTranslation').addEventListener('click', () => {
            this.toggleTranslationView();
        });

        // Close chat
        this.container.querySelector('#closeChat').addEventListener('click', () => {
            this.closeChat();
        });

        // Chat settings
        this.container.querySelector('#chatSettings').addEventListener('click', () => {
            this.openSettings();
        });

        // Modal events
        this.bindModalEvents();
    }

    bindModalEvents() {
        const modal = this.container.querySelector('#chatSettingsModal');
        
        // Close modal
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });
        
        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            this.closeModal();
        });

        // Save settings
        modal.querySelector('.save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    async openConversation(friendId, friendName) {
        try {
            this.currentConversationId = friendId;
            this.currentFriend = { id: friendId, name: friendName };
            
            // Update UI
            this.container.querySelector('#friendName').textContent = friendName;
            this.container.querySelector('#friendStatus').textContent = 'Online';
            this.container.querySelector('#chatInputContainer').style.display = 'block';
            this.container.querySelector('#chatMessages').innerHTML = '';

            // Load conversation
            await this.loadConversation();

            // Join socket room for real-time updates
            if (this.socket) {
                this.socket.emit('join:chat', friendId);
            }

            console.log(`💬 Opened conversation with ${friendName} (${friendId})`);

        } catch (error) {
            console.error('❌ Error opening conversation:', error);
            this.showError('Failed to open conversation');
        }
    }

    async loadConversation() {
        try {
            const response = await fetch(`/api/chat/conversation/${this.currentConversationId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to load conversation');
            }

            const data = await response.json();
            this.messages = data.conversation || [];

            this.renderMessages();
            this.scrollToBottom();

        } catch (error) {
            console.error('❌ Error loading conversation:', error);
            this.showError('Failed to load conversation');
        }
    }

    renderMessages() {
        const messagesContainer = this.container.querySelector('#chatMessages');
        messagesContainer.innerHTML = '';

        if (this.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="chat-empty">
                    <i class="icon-message-circle"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
    }

    createMessageElement(message) {
        const isFromMe = message.senderId === this.getCurrentUserId().toString();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isFromMe ? 'message-sent' : 'message-received'}`;
        
        const displayText = this.shouldShowOriginal(message) ? message.originalText : message.translatedText;
        const originalText = message.originalText;
        const translatedText = message.translatedText;
        const isTranslated = originalText !== translatedText;

        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text" data-message-id="${message.id}">
                    ${this.escapeHtml(displayText)}
                </div>
                ${isTranslated ? `
                    <div class="message-translation-info">
                        <button class="translation-toggle" onclick="this.parentElement.parentElement.parentElement.querySelector('.translation-details').classList.toggle('show')">
                            <i class="icon-globe"></i>
                            <span>${isFromMe ? 'Translated to' : 'Translated from'} ${message.translatedLang}</span>
                        </button>
                        <div class="translation-details">
                            <div class="translation-original">
                                <strong>Original:</strong> ${this.escapeHtml(originalText)}
                            </div>
                            <div class="translation-translated">
                                <strong>Translated:</strong> ${this.escapeHtml(translatedText)}
                            </div>
                        </div>
                    </div>
                ` : ''}
                <div class="message-meta">
                    <span class="message-time">${this.formatTime(message.createdAt)}</span>
                    ${isTranslated ? `<span class="translation-indicator" title="This message was translated">🌐</span>` : ''}
                </div>
            </div>
        `;

        return messageDiv;
    }

    async sendMessage() {
        const messageInput = this.container.querySelector('#messageInput');
        const messageText = messageInput.value.trim();

        if (!messageText || !this.currentConversationId) {
            return;
        }

        // Disable input while sending
        messageInput.disabled = true;
        this.container.querySelector('#sendMessage').disabled = true;

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    recipientId: this.currentConversationId,
                    message: messageText
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const data = await response.json();
            
            // Add message to local messages array
            this.messages.push(data.message);
            this.renderMessages();
            this.scrollToBottom();

            // Clear input
            messageInput.value = '';
            this.autoResizeTextarea(messageInput);

            // Emit socket event for real-time updates
            if (this.socket) {
                this.socket.emit('chat:message', {
                    recipientId: this.currentConversationId,
                    message: data.message
                });
            }

        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.showError('Failed to send message');
        } finally {
            // Re-enable input
            messageInput.disabled = false;
            this.container.querySelector('#sendMessage').disabled = false;
            messageInput.focus();
        }
    }

    handleNewMessage(data) {
        // Add new message to messages array
        this.messages.push(data.message);
        this.renderMessages();
        this.scrollToBottom();

        // Show notification if not in focus
        if (document.hidden) {
            this.showNotification(data.message);
        }
    }

    handleTypingIndicator(data) {
        const typingIndicator = this.container.querySelector('#typingIndicator');
        const typingText = this.container.querySelector('#typingText');

        if (data.isTyping) {
            typingText.textContent = `${data.friendName} is typing...`;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }

    handleTyping() {
        if (!this.socket || !this.currentConversationId) return;

        this.isTyping = true;

        // Emit typing event
        this.socket.emit('chat:typing', {
            recipientId: this.currentConversationId,
            isTyping: true
        });

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Stop typing after 3 seconds
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('chat:typing', {
                recipientId: this.currentConversationId,
                isTyping: false
            });
            this.isTyping = false;
        }, 3000);
    }

    async showTranslationPreview(text) {
        if (!text.trim()) {
            this.container.querySelector('#translationPreview').style.display = 'none';
            return;
        }

        try {
            const response = await fetch('/api/chat/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    text: text,
                    fromLang: this.userLanguage,
                    toLang: 'auto' // Will be detected based on recipient
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.container.querySelector('#previewText').textContent = data.translatedText;
                this.container.querySelector('#translationPreview').style.display = 'block';
            }
        } catch (error) {
            console.warn('Translation preview failed:', error);
        }
    }

    // Utility methods
    shouldShowOriginal(message) {
        // Show original if it's the same as translated, or if user preference is set
        return message.originalText === message.translatedText || 
               this.container.querySelector('#showOriginal')?.checked;
    }

    toggleTranslationView() {
        // Toggle between original and translated text
        this.renderMessages();
        this.scrollToBottom();
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        const messagesContainer = this.container.querySelector('#chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCurrentUserId() {
        // Get current user ID from session or global variable
        return window.currentUserId || 1;
    }

    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${this.currentFriend?.name}`, {
                body: message.translatedText || message.originalText,
                icon: '/favicon.ico'
            });
        }
    }

    showError(message) {
        // Show error message to user
        console.error(message);
        // You can implement a toast notification system here
    }

    closeChat() {
        this.currentConversationId = null;
        this.currentFriend = null;
        this.messages = [];
        
        // Hide the chat container
        this.container.style.display = 'none';
        
        // Reset UI
        this.container.querySelector('#friendName').textContent = 'Select a conversation';
        this.container.querySelector('#friendStatus').textContent = 'Choose a friend to start chatting';
        this.container.querySelector('#chatInputContainer').style.display = 'none';
        this.container.querySelector('#chatMessages').innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-content">
                    <i class="icon-message-circle"></i>
                    <h3>Start a Conversation</h3>
                    <p>Select a friend from your friends list to begin chatting with automatic translation.</p>
                    <div class="language-info">
                        <span class="language-badge">Your language: <strong>${this.userLanguage}</strong></span>
                    </div>
                </div>
            </div>
        `;

        // Leave socket room
        if (this.socket) {
            this.socket.emit('leave:chat');
        }
    }

    openSettings() {
        this.container.querySelector('#chatSettingsModal').style.display = 'flex';
    }

    closeModal() {
        this.container.querySelector('#chatSettingsModal').style.display = 'none';
    }

    saveSettings() {
        // Save chat settings to localStorage
        const settings = {
            autoTranslate: this.container.querySelector('#autoTranslate').checked,
            showOriginal: this.container.querySelector('#showOriginal').checked,
            translationPreview: this.container.querySelector('#translationPreview').checked,
            messagesPerPage: this.container.querySelector('#messagesPerPage').value
        };

        localStorage.setItem('chatSettings', JSON.stringify(settings));
        this.closeModal();
        this.showSuccess('Settings saved successfully');
    }

    showSuccess(message) {
        console.log('✅', message);
        // You can implement a toast notification system here
    }
}

// Export for use in other modules
window.MultilingualChat = MultilingualChat;
