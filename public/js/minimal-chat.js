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
        // Create chat container
        this.container = document.createElement('div');
        this.container.id = 'minimal-chat-container';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 500px;
            background: #1a1a2e;
            border: 1px solid #333;
            border-radius: 12px;
            display: none;
            flex-direction: column;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
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
        
        this.currentFriend = { id: friendId, name: friendName };
        document.getElementById('minimal-friend-name').textContent = friendName;
        
        this.loadMessages();
        this.container.style.display = 'flex';
        this.isOpen = true;
        
        // Focus input
        setTimeout(() => {
            document.getElementById('minimal-message-input').focus();
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
            
            if (data.success) {
                this.displayMessages(data.conversation || []);
            } else {
                console.error('❌ Failed to load messages:', data.error);
            }
        } catch (error) {
            console.error('❌ Error loading messages:', error);
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
            
            if (data.success) {
                console.log('✅ MINIMAL CHAT: Message sent successfully');
            } else {
                console.error('❌ Failed to send message:', data.error);
            }
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
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
    window.minimalChat.openChat(friendId, friendName);
};

console.log('✅ MINIMAL CHAT system loaded and ready!');
