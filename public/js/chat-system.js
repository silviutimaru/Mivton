/**
 * 💬 MIVTON REAL-TIME CHAT SYSTEM
 * Memory-based real-time messaging with Socket.IO
 * Integrates with existing friends system and authentication
 */

class ChatSystem {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.activeChatUserId = null;
        this.activeChatModal = null;
        this.conversations = new Map();
        this.typingIndicators = new Map();
        this.unreadCounts = new Map();
        
        this.initializeSocket();
        this.createChatModal();
    }
    
    initializeSocket() {
        try {
            // Initialize Socket.IO connection
            this.socket = io({
                transports: ['polling', 'websocket'],
                upgrade: true,
                rememberUpgrade: true
            });
            
            // Connection events
            this.socket.on('connect', () => {
                console.log('💬 Chat system connected to server');
                this.joinChatSystem();
            });
            
            this.socket.on('disconnect', () => {
                console.log('💬 Chat system disconnected');
            });
            
            // Chat events
            this.socket.on('chat_joined', (data) => {
                console.log('💬 Successfully joined chat system:', data);
                this.currentUser = data;
            });
            
            this.socket.on('receive_message', (message) => {
                this.handleIncomingMessage(message);
            });
            
            this.socket.on('messages_loaded', (data) => {
                this.displayMessages(data.messages, data.conversationId);
            });
            
            this.socket.on('user_typing', (data) => {
                this.showTypingIndicator(data);
            });
            
            this.socket.on('user_stopped_typing', (data) => {
                this.hideTypingIndicator(data);
            });
            
            this.socket.on('message_sent', (data) => {
                console.log('✅ Message confirmed sent:', data);
            });
            
            this.socket.on('message_error', (data) => {
                console.error('❌ Message error:', data);
                this.showNotification('Error sending message: ' + data.error, 'error');
            });
            
            this.socket.on('user_online', (data) => {
                this.updateUserOnlineStatus(data.userId, true);
            });
            
            this.socket.on('user_offline', (data) => {
                this.updateUserOnlineStatus(data.userId, false);
            });
            
        } catch (error) {
            console.error('❌ Error initializing chat socket:', error);
        }
    }
    
    async joinChatSystem() {
        try {
            // Get current user data from session
            const response = await fetch('/debug/friends', {
                credentials: 'include'
            });
            
            const debugData = await response.json();
            
            if (debugData.authentication?.isAuthenticated && debugData.authentication?.userId) {
                const userId = debugData.authentication.userId;
                
                // Get user details (we'll use a simple pattern for now)
                this.socket.emit('join_chat', {
                    userId: userId,
                    userName: `User ${userId}` // This will be enhanced with real user data
                });
                
                console.log('💬 Joining chat system as user:', userId);
            } else {
                console.log('💬 Not authenticated, cannot join chat');
            }
        } catch (error) {
            console.error('❌ Error joining chat system:', error);
        }
    }
    
    createChatModal() {
        // Create chat modal HTML - using simple overlay instead of Bootstrap modal
        const modalHTML = `
            <div id="chatModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 999999;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 600px; height: 500px; background: white; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    
                    <!-- Chat Header -->
                    <div style="padding: 15px; background-color: #007bff; color: white; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <i class="fas fa-comments"></i>
                            <span id="chatUserName" style="margin-left: 10px; font-weight: bold;">Chat</span>
                            <span id="chatOnlineStatus" style="margin-left: 10px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 12px;">Offline</span>
                        </div>
                        <button onclick="closeChat()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; width: 30px; height: 30px;">×</button>
                    </div>
                    
                    <!-- Chat Messages Area -->
                    <div id="chatMessages" class="chat-messages-container" style="
                        position: relative; 
                        width: 100%; 
                        height: 350px; 
                        min-height: 350px;
                        max-height: 350px;
                        overflow-y: auto; 
                        padding: 15px; 
                        background-color: #f8f9fa;
                        border: 1px solid #dee2e6;
                        box-sizing: border-box;
                        display: block;
                    ">
                        <!-- Messages will be loaded here -->
                    </div>
                    
                    <!-- Typing Indicator -->
                    <div id="typingIndicator" class="typing-indicator" style="display: none; padding: 10px 15px; background-color: #f8f9fa; border-top: 1px solid #dee2e6;">
                        <span class="typing-text"></span>
                        <div class="typing-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>
                    
                    <!-- Chat Input Area -->
                    <div style="padding: 15px; background-color: white; border-radius: 0 0 8px 8px; border-top: 1px solid #dee2e6;">
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="messageInput" placeholder="Type your message..." maxlength="1000" style="flex: 1; padding: 10px; border: 1px solid #dee2e6; border-radius: 20px; outline: none;">
                            <button id="sendMessageBtn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-paper-plane"></i>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        this.setupChatModalEvents();
        // Styles are now inline in the modal HTML
        
        // Setup modal close handlers
        this.setupModalCloseHandlers();
    }
    
    setupChatModalEvents() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendMessageBtn');
        
        // Send message on button click
        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Send message on Enter key
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Typing indicators
        let typingTimer;
        messageInput.addEventListener('input', () => {
            if (this.activeChatUserId) {
                // Send typing start
                this.socket.emit('typing_start', {
                    receiverId: this.activeChatUserId
                });
                
                // Clear previous timer
                clearTimeout(typingTimer);
                
                // Set timer to send typing stop
                typingTimer = setTimeout(() => {
                    this.socket.emit('typing_stop', {
                        receiverId: this.activeChatUserId
                    });
                }, 1000);
            }
        });
        
        // Stop typing when focus is lost
        messageInput.addEventListener('blur', () => {
            if (this.activeChatUserId) {
                this.socket.emit('typing_stop', {
                    receiverId: this.activeChatUserId
                });
            }
        });
    }
    
    openChat(userId, userName) {
        this.activeChatUserId = userId;
        
        // Update modal title
        document.getElementById('chatUserName').textContent = userName;
        
        // Clear previous messages
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '<div class="text-center text-muted">Loading messages...</div>';
            console.log('📦 Messages container found and cleared:', messagesContainer);
            console.log('📦 Container dimensions:', messagesContainer.offsetWidth, 'x', messagesContainer.offsetHeight);
            console.log('📦 Container visible?', messagesContainer.offsetParent !== null);
            console.log('📦 Container computed style:', {
                display: getComputedStyle(messagesContainer).display,
                visibility: getComputedStyle(messagesContainer).visibility,
                opacity: getComputedStyle(messagesContainer).opacity,
                overflow: getComputedStyle(messagesContainer).overflow,
                position: getComputedStyle(messagesContainer).position,
                zIndex: getComputedStyle(messagesContainer).zIndex
            });
            
            // Container is already properly styled in the HTML structure above
        } else {
            console.error('❌ Messages container not found when opening chat');
        }
        
        // Show the simple overlay modal
        const modal = document.getElementById('chatModal');
        modal.style.display = 'block';
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('messageInput').focus();
            
            // Add a test message immediately to verify the UI works
            this.addMessageToUI({
                senderId: 'test',
                senderName: 'System',
                message: 'Chat opened successfully - this is a test message',
                timestamp: new Date().toISOString(),
                isOwn: false
            });
        }, 100);
        
        // Load conversation history
        this.socket.emit('get_messages', {
            otherUserId: userId
        });
        
        console.log(`💬 Opening chat with ${userName} (${userId})`);
    }
    
    closeChat() {
        const modal = document.getElementById('chatModal');
        modal.style.display = 'none';
        
        // Restore body scrolling
        document.body.style.overflow = '';
        
        this.activeChatUserId = null;
        
        // Clear message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
        }
    }
    
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message || !this.activeChatUserId) return;
        
        // Send via socket
        this.socket.emit('send_message', {
            receiverId: this.activeChatUserId,
            message: message
        });
        
        // Clear input
        messageInput.value = '';
        
        // Add message to UI immediately (optimistic update)
        console.log('📤 Adding sent message to UI optimistically');
        this.addMessageToUI({
            senderId: this.currentUser?.userId,
            senderName: this.currentUser?.userName || 'You',
            message: message,
            timestamp: new Date().toISOString(),
            isOwn: true
        });
        
        console.log('✅ Message sent and displayed:', message);
    }
    
    handleIncomingMessage(messageData) {
        console.log('💬 Received message:', messageData);
        console.log('🔍 Active chat user ID:', this.activeChatUserId);
        console.log('🔍 Message sender ID:', messageData.senderId);
        
        // Add to UI if chat is open with this user OR if we're the sender
        const isForActiveChat = this.activeChatUserId && 
            (this.activeChatUserId == messageData.senderId || 
             this.currentUser?.userId == messageData.senderId);
        
        console.log('🔍 Is for active chat?', isForActiveChat);
        console.log('🔍 Current user ID:', this.currentUser?.userId);
        
        if (isForActiveChat) {
            console.log('✅ Adding message to UI');
            this.addMessageToUI({
                senderId: messageData.senderId,
                senderName: messageData.senderName,
                message: messageData.message,
                timestamp: messageData.timestamp,
                isOwn: messageData.senderId == this.currentUser?.userId
            });
        } else {
            console.log('📪 Chat not open with this user, showing notification');
            // Update unread count
            const currentCount = this.unreadCounts.get(messageData.senderId) || 0;
            this.unreadCounts.set(messageData.senderId, currentCount + 1);
            
            // Update UI badge
            this.updateUnreadBadge(messageData.senderId);
            
            // Show notification
            this.showNotification(`New message from ${messageData.senderName}`, 'info');
        }
    }
    
    displayMessages(messages, conversationId) {
        const container = document.getElementById('chatMessages');
        
        if (!container) {
            console.error('❌ Messages container not found in displayMessages');
            return;
        }
        
        container.innerHTML = '';
        
        console.log('📚 Displaying', messages.length, 'messages');
        
        if (messages.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No messages yet. Start the conversation!</div>';
            return;
        }
        
        messages.forEach(message => {
            console.log('📝 Displaying message:', message);
            this.addMessageToUI({
                senderId: message.senderId,
                senderName: message.senderName,
                message: message.messageText,
                timestamp: message.timestamp,
                isOwn: message.senderId == this.currentUser?.userId
            });
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    addMessageToUI(messageData) {
        console.log('🎯 addMessageToUI called with:', messageData);
        
        const container = document.getElementById('chatMessages');
        
        if (!container) {
            console.error('❌ Chat messages container not found');
            return;
        }
        
        console.log('📦 Container found:', container);
        console.log('📦 Container innerHTML before:', container.innerHTML.length, 'characters');
        
        const time = new Date(messageData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const messageHTML = `
            <div class="message ${messageData.isOwn ? 'message-own' : 'message-other'}" style="
                position: static !important; 
                display: block !important; 
                width: calc(100% - 20px) !important; 
                min-height: 50px !important;
                margin: 10px 0 !important; 
                padding: 15px !important; 
                background-color: ${messageData.isOwn ? '#007bff' : '#e9ecef'} !important;
                color: ${messageData.isOwn ? 'white' : 'black'} !important;
                border-radius: 12px !important;
                border: 1px solid #dee2e6 !important;
                box-sizing: border-box !important;
                font-size: 14px !important;
                line-height: 1.4 !important;
                word-wrap: break-word !important;
            ">
                <div style="font-weight: 500; margin-bottom: 4px; font-size: 14px;">${this.escapeHtml(messageData.message)}</div>
                <div style="font-size: 11px; opacity: 0.7; text-align: ${messageData.isOwn ? 'right' : 'left'};">${time}</div>
            </div>
        `;
        
        console.log('📝 Message HTML:', messageHTML);
        
        container.insertAdjacentHTML('beforeend', messageHTML);
        
        console.log('📦 Container innerHTML after:', container.innerHTML.length, 'characters');
        console.log('📦 Container children count:', container.children.length);
        console.log('📏 Container scroll info:', {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight,
            clientHeight: container.clientHeight,
            offsetHeight: container.offsetHeight
        });
        
        // Force container to be visible and scrollable
        container.style.overflow = 'auto !important';
        container.style.display = 'block !important';
        container.style.visibility = 'visible !important';
        container.style.opacity = '1 !important';
        container.style.maxHeight = '400px !important';
        
        container.scrollTop = container.scrollHeight;
        
        console.log('📏 After scroll - Container scroll info:', {
            scrollTop: container.scrollTop,
            scrollHeight: container.scrollHeight
        });
        
        console.log('✅ Message added to UI with debug styling:', messageData.message);
    }
    
    showTypingIndicator(data) {
        if (this.activeChatUserId == data.senderId) {
            const indicator = document.getElementById('typingIndicator');
            const text = indicator?.querySelector('.typing-text');
            
            if (indicator && text) {
                text.textContent = `${data.senderName} is typing...`;
                indicator.style.display = 'block';
            }
        }
    }
    
    hideTypingIndicator(data) {
        if (this.activeChatUserId == data.senderId) {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }
    
    updateUnreadBadge(userId) {
        const count = this.unreadCounts.get(userId) || 0;
        const badge = document.querySelector(`[data-friend-id="${userId}"] .unread-badge`);
        
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    updateUserOnlineStatus(userId, isOnline) {
        // Update online status indicators
        const statusIndicators = document.querySelectorAll(`[data-friend-id="${userId}"] .status-indicator`);
        statusIndicators.forEach(indicator => {
            indicator.className = `status-indicator ${isOnline ? 'status-online' : 'status-offline'}`;
        });
        
        // Update chat modal status if it's the current chat
        if (this.activeChatUserId == userId) {
            const statusBadge = document.getElementById('chatOnlineStatus');
            statusBadge.textContent = isOnline ? 'Online' : 'Offline';
            statusBadge.className = `badge ${isOnline ? 'badge-success' : 'badge-secondary'} ms-2`;
        }
    }
    
    addChatStyles() {
        const styles = `
            <style>
                #chatModal {
                    z-index: 999999 !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    background: rgba(0, 0, 0, 0.5) !important;
                }
                
                #chatModal .modal-dialog {
                    z-index: 999999 !important;
                    position: relative !important;
                    margin: 50px auto !important;
                }
                
                .modal.show {
                    z-index: 999999 !important;
                    display: block !important;
                }
                
                .chat-messages-container {
                    height: 400px;
                    overflow-y: auto;
                    border: 3px solid #ff0000 !important;
                    border-radius: 0.375rem;
                    padding: 1rem;
                    background-color: #ffff00 !important;
                    margin-bottom: 1rem;
                    position: relative !important;
                    display: block !important;
                }
                
                #chatMessages {
                    background-color: #00ff00 !important;
                    min-height: 350px !important;
                    max-height: 400px !important;
                    border: 5px solid #ff0000 !important;
                    overflow-y: auto !important;
                    display: block !important;
                    position: relative !important;
                    z-index: 999999 !important;
                    padding: 10px !important;
                }
                
                .message {
                    margin-bottom: 1rem;
                    display: flex;
                }
                
                .message-own {
                    justify-content: flex-end;
                }
                
                .message-other {
                    justify-content: flex-start;
                }
                
                .message-content {
                    max-width: 70%;
                    padding: 0.75rem 1rem;
                    border-radius: 1rem;
                    word-wrap: break-word;
                }
                
                .message-own .message-content {
                    background-color: #007bff;
                    color: white;
                    border-bottom-right-radius: 0.25rem;
                }
                
                .message-other .message-content {
                    background-color: white;
                    border: 1px solid #dee2e6;
                    border-bottom-left-radius: 0.25rem;
                }
                
                .message-text {
                    margin-bottom: 0.25rem;
                }
                
                .message-time {
                    font-size: 0.75rem;
                    opacity: 0.7;
                }
                
                .typing-indicator {
                    padding: 0.5rem 1rem;
                    font-style: italic;
                    color: #6c757d;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .typing-dots {
                    display: flex;
                    gap: 0.2rem;
                }
                
                .typing-dots .dot {
                    width: 4px;
                    height: 4px;
                    background-color: #6c757d;
                    border-radius: 50%;
                    animation: typing 1.4s infinite ease-in-out;
                }
                
                .typing-dots .dot:nth-child(2) {
                    animation-delay: 0.2s;
                }
                
                .typing-dots .dot:nth-child(3) {
                    animation-delay: 0.4s;
                }
                
                @keyframes typing {
                    0%, 60%, 100% {
                        transform: translateY(0);
                    }
                    30% {
                        transform: translateY(-10px);
                    }
                }
                
                .unread-badge {
                    display: none;
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background-color: #dc3545;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 0.75rem;
                    text-align: center;
                    line-height: 20px;
                }
                
                .chat-button {
                    position: relative;
                }
                
                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    margin-left: 0.5rem;
                }
                
                .status-online {
                    background-color: #28a745;
                }
                
                .status-offline {
                    background-color: #6c757d;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    showNotification(message, type = 'info') {
        // Use existing notification system if available, otherwise console
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
        }
    }
    
    setupModalCloseHandlers() {
        // Close modal when clicking close button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-close') || 
                e.target.closest('.btn-close')) {
                this.closeChat();
            }
        });
        
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('chatModal');
            if (e.target === modal) {
                this.closeChat();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeChatUserId) {
                this.closeChat();
            }
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chat system when page loads
let chatSystem = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize chat system after a short delay to ensure other systems are ready
    setTimeout(() => {
        chatSystem = new ChatSystem();
        
        // Make it globally available
        window.chatSystem = chatSystem;
        
        console.log('💬 Chat system initialized');
    }, 1000);
});

// Global function to open chat (called from friends list)
function openChat(userId, userName) {
    if (window.chatSystem) {
        window.chatSystem.openChat(userId, userName);
    } else {
        console.error('❌ Chat system not initialized');
    }
}

// Global function to close chat modal
function closeChat() {
    if (window.chatSystem) {
        window.chatSystem.closeChat();
    }
}