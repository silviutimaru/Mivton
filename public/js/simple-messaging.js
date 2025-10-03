/**
 * 🚀 SIMPLE REAL-TIME MESSAGING 
 * Pure Socket.IO implementation - no database, no persistence
 * Messages are lost on disconnect/refresh - perfect for ephemeral chat
 */

class SimpleMessaging {
    constructor() {
        this.socket = null;
        this.currentUserId = null;
        this.currentUserName = null;
        this.activeChatUserId = null;
        this.activeChatUserName = null;
        this.messages = []; // In-memory only, cleared on refresh
        
        this.initializeSocket();
        this.setupEventListeners();
    }
    
    initializeSocket() {
        // Use existing global socket if available
        if (window.socket) {
            this.socket = window.socket;
        } else {
            this.socket = io();
            window.socket = this.socket;
        }
        
        this.setupSocketEvents();
    }
    
    setupSocketEvents() {
        // Receive messages
        this.socket.on('receive_message', (message) => {
            console.log('📨 Received message:', message);
            this.handleIncomingMessage(message);
        });
        
        // Message sent confirmation
        this.socket.on('message_sent', (data) => {
            console.log('✅ Message sent:', data);
            this.handleMessageSent(data);
        });
        
        // Message errors
        this.socket.on('message_error', (error) => {
            console.error('❌ Message error:', error);
            this.showError(error.error);
        });
    }
    
    setupEventListeners() {
        // Send message on Enter key
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.id === 'messageInput') {
                e.preventDefault();
                this.sendCurrentMessage();
            }
        });
    }
    
    // Open chat with a specific user
    openChat(userId, userName) {
        this.activeChatUserId = userId;
        this.activeChatUserName = userName;
        this.messages = []; // Clear previous messages (no history)
        
        // Update UI
        this.updateChatHeader();
        this.clearMessagesDisplay();
        this.showChatInterface();
        
        console.log(`💬 Opened chat with ${userName} (${userId})`);
    }
    
    // Send message to active chat
    sendCurrentMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput || !this.activeChatUserId) return;
        
        const messageText = messageInput.value.trim();
        if (messageText.length === 0) return;
        
        this.sendMessage(this.activeChatUserId, messageText);
        messageInput.value = '';
    }
    
    // Send message via Socket.IO
    sendMessage(recipientId, messageText) {
        if (!this.socket || !recipientId || !messageText) return;
        
        // Add to local messages immediately (optimistic UI)
        const message = {
            id: Date.now(),
            sender_id: this.currentUserId,
            sender_name: this.currentUserName,
            message_text: messageText,
            sent_at: new Date().toISOString(),
            is_own: true
        };
        
        this.addMessage(message);
        
        // Send via Socket.IO
        this.socket.emit('send_message', {
            recipient_id: recipientId,
            message_text: messageText
        });
    }
    
    // Handle incoming messages
    handleIncomingMessage(message) {
        // Only show if it's from current active chat
        if (message.sender_id == this.activeChatUserId) {
            message.is_own = false;
            this.addMessage(message);
        } else {
            // Show notification for other messages
            this.showNotification(`New message from ${message.sender_name}: ${message.message_text.substring(0, 50)}...`);
        }
    }
    
    // Handle message sent confirmation
    handleMessageSent(data) {
        // Find the optimistic message and mark as confirmed
        const messageElements = document.querySelectorAll('.message.own .message-status');
        if (messageElements.length > 0) {
            const lastStatus = messageElements[messageElements.length - 1];
            lastStatus.textContent = '✓';
            lastStatus.classList.add('sent');
        }
    }
    
    // Add message to display
    addMessage(message) {
        this.messages.push(message);
        this.displayMessage(message);
        this.scrollToBottom();
    }
    
    // Display single message in UI
    displayMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.is_own ? 'own' : 'other'}`;
        
        const time = new Date(message.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageEl.innerHTML = `
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message.message_text)}</div>
                <div class="message-time">
                    ${time}
                    ${message.is_own ? '<span class="message-status">⏳</span>' : ''}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageEl);
    }
    
    // UI Helper Functions
    updateChatHeader() {
        const chatHeader = document.getElementById('chatHeader');
        if (chatHeader && this.activeChatUserName) {
            chatHeader.innerHTML = `
                <div class="chat-user-info">
                    <div class="chat-user-name">${this.escapeHtml(this.activeChatUserName)}</div>
                    <div class="chat-user-status">Online</div>
                </div>
                <button onclick="closeChat()" class="close-chat-btn">✕</button>
            `;
        }
    }
    
    clearMessagesDisplay() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
    }
    
    showChatInterface() {
        const chatModal = document.getElementById('chatModal');
        if (chatModal) {
            chatModal.style.display = 'block';
        }
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    showNotification(message) {
        // Simple notification (you can enhance this)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Message', { body: message });
        } else {
            console.log('🔔 Notification:', message);
        }
    }
    
    showError(errorMessage) {
        // Simple error display
        const errorEl = document.getElementById('messageError');
        if (errorEl) {
            errorEl.textContent = errorMessage;
            errorEl.style.display = 'block';
            setTimeout(() => errorEl.style.display = 'none', 3000);
        } else {
            alert('Error: ' + errorMessage);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Set current user info
    setCurrentUser(userId, userName) {
        this.currentUserId = userId;
        this.currentUserName = userName;
        
        // Join user room for receiving messages
        this.socket.emit('join', userId);
    }
}

// Global functions for easy access
window.SimpleMessaging = SimpleMessaging;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.messaging = new SimpleMessaging();
    
    // Set user info if available from global context
    if (window.currentUser) {
        window.messaging.setCurrentUser(window.currentUser.id, window.currentUser.fullName);
    }
});

// Helper functions
function openChat(userId, userName) {
    if (window.messaging) {
        window.messaging.openChat(userId, userName);
    }
}

function closeChat() {
    const chatModal = document.getElementById('chatModal');
    if (chatModal) {
        chatModal.style.display = 'none';
    }
    
    if (window.messaging) {
        window.messaging.activeChatUserId = null;
        window.messaging.activeChatUserName = null;
        window.messaging.messages = [];
    }
}

function sendMessage() {
    if (window.messaging) {
        window.messaging.sendCurrentMessage();
    }
}