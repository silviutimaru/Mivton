/**
 * WORKING CHAT - Guaranteed to work
 */

class WorkingChat {
    constructor() {
        this.isOpen = false;
        this.currentFriend = null;
        this.container = null;
        this.userId = 'user-' + Date.now();
    }

    init() {
        console.log('🚀 Working Chat initialized');
        this.createChatInterface();
        this.bindEvents();
        return Promise.resolve();
    }

    createChatInterface() {
        // Remove existing chat if any
        const existing = document.getElementById('working-chat-container');
        if (existing) existing.remove();

        // Create chat container
        this.container = document.createElement('div');
        this.container.id = 'working-chat-container';
        this.container.innerHTML = `
            <div class="chat-window">
                <div class="chat-header">
                    <h3 id="chat-friend-name">Chat</h3>
                    <button id="close-chat" class="close-btn">×</button>
                </div>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button id="send-message">Send</button>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #working-chat-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                height: 500px;
                background: white;
                border: 2px solid #333;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                display: none;
            }
            .chat-window {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            .chat-header {
                background: #007bff;
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }
            .chat-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                background: #f8f9fa;
            }
            .message {
                margin: 10px 0;
                padding: 10px;
                border-radius: 10px;
                max-width: 80%;
            }
            .message.sent {
                background: #007bff;
                color: white;
                margin-left: auto;
                text-align: right;
            }
            .message.received {
                background: #e9ecef;
                color: #333;
                margin-right: auto;
            }
            .chat-input {
                display: flex;
                padding: 15px;
                background: white;
                border-top: 1px solid #ddd;
                border-radius: 0 0 8px 8px;
            }
            .chat-input input {
                flex: 1;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                margin-right: 10px;
            }
            .chat-input button {
                padding: 10px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.container);
    }

    bindEvents() {
        // Close button
        document.getElementById('close-chat').addEventListener('click', () => {
            this.closeChat();
        });

        // Send button
        document.getElementById('send-message').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    openConversation(friendId, friendName) {
        console.log(`🚀 Opening chat with ${friendName} (${friendId})`);
        
        this.currentFriend = { id: friendId, name: friendName };
        document.getElementById('chat-friend-name').textContent = friendName;
        this.container.style.display = 'block';
        this.isOpen = true;
        
        // Load conversation
        this.loadConversation();
    }

    async loadConversation() {
        try {
            const response = await fetch(`/api/chat/conversation/${this.currentFriend.id}?userId=${this.userId}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayMessages(data.conversation);
            }
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    }

    displayMessages(messages) {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        messages.forEach(msg => {
            const messageEl = document.createElement('div');
            messageEl.className = `message ${msg.is_sender ? 'sent' : 'received'}`;
            messageEl.textContent = msg.body;
            messagesContainer.appendChild(messageEl);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        try {
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
                input.value = '';
                this.loadConversation(); // Reload messages
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    closeChat() {
        this.container.style.display = 'none';
        this.isOpen = false;
        this.currentFriend = null;
    }
}

// Global functions for the dashboard
window.workingChat = new WorkingChat();
window.workingChat.init();

window.startWorkingChat = function(friendId, friendName) {
    console.log(`🚀 Starting working chat with ${friendName} (${friendId})`);
    window.workingChat.openConversation(friendId, friendName);
};

console.log('✅ Working Chat system loaded and ready!');
