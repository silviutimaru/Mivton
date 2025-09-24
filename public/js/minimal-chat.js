/**
 * MINIMAL CHAT SYSTEM - BYPASSES ALL OTHER SYSTEMS
 * This is a completely isolated chat system that should work
 */

class MinimalChat {
    constructor() {
        this.isOpen = false;
        this.currentFriend = null;
        this.container = null;
        this.userId = 'user-' + Date.now();
    }

    async init() {
        console.log('🚀 Minimal Chat initialized');
        this.createChatInterface();
        return Promise.resolve();
    }

    createChatInterface() {
        // Check if container already exists
        if (document.getElementById('minimal-chat-container')) {
            this.container = document.getElementById('minimal-chat-container');
            console.log('✅ Chat container already exists');
            return;
        }

        // Create chat container
        this.container = document.createElement('div');
        this.container.id = 'minimal-chat-container';
        this.container.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 400px !important;
            height: 500px !important;
            background: #1a1a2e !important;
            border: 2px solid #ff0000 !important;
            border-radius: 12px !important;
            display: none !important;
            flex-direction: column !important;
            z-index: 99999 !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8) !important;
        `;

        this.container.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; background: #16213e;">
                <h3 style="margin: 0; color: white;">Chat with <span id="minimal-friend-name">Friend</span></h3>
                <button id="minimal-close-chat" style="background: #ff4757; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">✕</button>
            </div>
            <div id="minimal-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: #1a1a2e;">
                <div style="text-align: center; color: #666; padding: 20px;">
                    No messages yet. Start the conversation!
                </div>
            </div>
            <div style="padding: 16px; border-top: 1px solid #333; background: #16213e;">
                <div style="display: flex; gap: 8px;">
                    <input id="minimal-message-input" type="text" placeholder="Type your message..." 
                           style="flex: 1; padding: 12px; border: 1px solid #333; border-radius: 6px; background: #2a2a3e; color: white; outline: none;">
                    <button id="minimal-send-btn" style="padding: 12px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">Send</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.container);

        // Bind events
        document.getElementById('minimal-close-chat').onclick = () => this.closeChat();
        document.getElementById('minimal-send-btn').onclick = () => this.sendMessage();
        document.getElementById('minimal-message-input').onkeypress = (e) => {
            if (e.key === 'Enter') this.sendMessage();
        };
    }

    openChat(friendId, friendName) {
        console.log(`🚀 MINIMAL CHAT: Opening chat with ${friendName} (${friendId})`);
        
        // Validate friend ID
        if (!friendId || friendId === 'unknown' || friendId === 'null' || friendId === 'undefined') {
            console.error('❌ MINIMAL CHAT: Invalid friend ID:', friendId);
            alert('Error: Cannot start chat - invalid friend ID');
            return;
        }
        
        // Validate friend name
        if (!friendName || friendName.trim() === '') {
            friendName = 'Friend';
        }
        
        // Ensure container exists
        if (!this.container) {
            console.error('❌ MINIMAL CHAT: Container not initialized');
            this.createChatInterface();
        }
        
        // Ensure container is in DOM
        if (!document.getElementById('minimal-chat-container')) {
            console.error('❌ MINIMAL CHAT: Container not in DOM, adding it');
            document.body.appendChild(this.container);
        }
        
        this.currentFriend = { id: friendId, name: friendName };
        
        // Update friend name in UI
        const friendNameEl = document.getElementById('minimal-friend-name');
        if (friendNameEl) {
            friendNameEl.textContent = friendName;
        }
        
        console.log('✅ MINIMAL CHAT: Loading messages and showing chat');
        this.loadMessages();
        
        // Force the chat to be visible with multiple approaches
        this.container.style.display = 'flex !important';
        this.container.style.visibility = 'visible';
        this.container.style.opacity = '1';
        this.isOpen = true;
        
        console.log('✅ MINIMAL CHAT: Chat should now be visible');
        console.log('🔍 MINIMAL CHAT: Container display:', this.container.style.display);
        console.log('🔍 MINIMAL CHAT: Container visibility:', this.container.style.visibility);
        console.log('🔍 MINIMAL CHAT: Container z-index:', this.container.style.zIndex);
        console.log('🔍 MINIMAL CHAT: Container position:', this.container.style.position);
        
        // Also try to make it visible after a short delay
        setTimeout(() => {
            this.container.style.display = 'flex !important';
            console.log('🔍 MINIMAL CHAT: Forced display after timeout');
        }, 100);
        
        // Focus input
        setTimeout(() => {
            const input = document.getElementById('minimal-message-input');
            if (input) {
                input.focus();
            }
        }, 100);
    }

    closeChat() {
        this.container.style.display = 'none';
        this.isOpen = false;
        this.currentFriend = null;
    }

    async loadMessages() {
        try {
            console.log(`📚 MINIMAL CHAT: Loading messages for ${this.currentFriend.id}`);
            
            // Use the working API endpoint
            const response = await fetch(`/api/chat/conversation/${this.currentFriend.id}?userId=${this.userId}`);
            const data = await response.json();
            
            console.log('📚 MINIMAL CHAT: API response:', { status: response.status, data });
            
            if (data.success) {
                console.log('✅ MINIMAL CHAT: Messages loaded successfully', { count: (data.conversation || []).length });
                this.displayMessages(data.conversation || []);
            } else {
                console.error('❌ MINIMAL CHAT: Failed to load messages:', data.error);
            }
        } catch (error) {
            console.error('❌ MINIMAL CHAT: Error loading messages:', error);
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('minimal-messages');
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; color: #666; padding: 20px;">
                    No messages yet. Start the conversation!
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = messages.map(msg => `
            <div style="margin-bottom: 12px; display: flex; ${msg.is_sender ? 'justify-content: flex-end' : 'justify-content: flex-start'}">
                <div style="max-width: 70%; padding: 8px 12px; border-radius: 12px; background: ${msg.is_sender ? '#667eea' : '#2a2a3e'}; color: white;">
                    ${msg.body}
                </div>
            </div>
        `).join('');

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('minimal-message-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        try {
            console.log(`📤 MINIMAL CHAT: Sending message: ${message}`);
            
            // Add message to UI immediately
            const messagesContainer = document.getElementById('minimal-messages');
            messagesContainer.innerHTML += `
                <div style="margin-bottom: 12px; display: flex; justify-content: flex-end">
                    <div style="max-width: 70%; padding: 8px 12px; border-radius: 12px; background: #667eea; color: white;">
                        ${message}
                    </div>
                </div>
            `;
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Clear input
            input.value = '';
            
            // Send to API
            console.log('📤 MINIMAL CHAT: Sending to API:', {
                recipientId: this.currentFriend.id,
                message: message,
                userId: this.userId
            });
            
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipientId: this.currentFriend.id,
                    message: message,
                    userId: this.userId
                })
            });
            
            const data = await response.json();
            console.log('📤 MINIMAL CHAT: API response:', { status: response.status, data });
            
            if (data.success) {
                console.log('✅ MINIMAL CHAT: Message sent successfully');
            } else {
                console.error('❌ MINIMAL CHAT: Failed to send message:', data.error);
            }
            
        } catch (error) {
            console.error('❌ MINIMAL CHAT: Error sending message:', error);
        }
    }
}

// Create global instance
window.minimalChat = new MinimalChat();

// Initialize immediately
window.minimalChat.init();

// Global function for opening chat
window.startMinimalChat = function(friendId, friendName) {
    console.log(`🚀 MINIMAL CHAT: Global function called with ${friendName} (${friendId})`);
    
    // Additional validation at global level
    if (!window.minimalChat) {
        console.error('❌ MINIMAL CHAT: System not initialized');
        alert('Error: Chat system not ready. Please refresh the page.');
        return;
    }
    
    window.minimalChat.openChat(friendId, friendName);
};

console.log('✅ MINIMAL CHAT system loaded and ready!');
