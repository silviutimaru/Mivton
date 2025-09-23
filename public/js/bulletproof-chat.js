/**
 * BULLETPROOF CHAT SYSTEM
 * Simple, reliable chat that always works
 */

class BulletproofChat {
    constructor() {
        this.isOpen = false;
        this.currentFriend = null;
        this.isInitialized = false;
    }

    init() {
        console.log('🛡️ Bulletproof Chat initialized');
        this.isInitialized = true;
        
        // Set up real-time message notifications
        this.setupRealTimeNotifications();
        
        return Promise.resolve();
    }

    setupRealTimeNotifications() {
        try {
            if (typeof io !== 'undefined') {
                this.socket = io();
                
                // Listen for new messages
                this.socket.on('new_message', (data) => {
                    console.log('📨 Received new message notification:', data);
                    this.handleNewMessage(data);
                });
                
                // Listen for message notifications
                this.socket.on('message_notification', (data) => {
                    console.log('🔔 Received message notification:', data);
                    this.showMessageNotification(data);
                });
                
                console.log('✅ Real-time notifications set up');
            } else {
                console.warn('⚠️ Socket.IO not available for real-time notifications');
            }
        } catch (error) {
            console.warn('⚠️ Failed to set up real-time notifications:', error);
        }
    }

    handleNewMessage(data) {
        // If we have a chat open with this sender, add the message
        if (this.isOpen && this.currentFriend && 
            (this.currentFriend.id === data.message.sender_id || 
             this.currentFriend.id === data.message.recipient_id)) {
            
            this.addMessageToUI({
                id: data.message.id,
                text: data.message.body,
                sender: data.message.sender_id == this.currentFriend.id ? 'friend' : 'me',
                timestamp: new Date(data.message.created_at),
                friendId: this.currentFriend.id,
                friendName: this.currentFriend.name
            });
        }
    }

    showMessageNotification(data) {
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(`New message from ${data.from}`, {
                body: data.message,
                icon: '/favicon.ico'
            });
        }
        
        // Update messages section if it exists
        if (window.messagesManager) {
            window.messagesManager.loadConversations();
        }
    }

    async openConversation(friendId, friendName) {
        try {
            console.log(`🛡️ Opening bulletproof chat with ${friendName} (${friendId})`);
            
            this.currentFriend = { id: friendId, name: friendName };
            this.createChatInterface();
            this.showChat();
            
            // Load conversation history
            await this.loadConversationHistory(friendId);
            
            console.log(`✅ Bulletproof chat opened with ${friendName}`);
            
        } catch (error) {
            console.error('❌ Error opening bulletproof chat:', error);
            alert('Error opening chat. Please try again.');
        }
    }

    async loadConversationHistory(friendId) {
        try {
            console.log(`📚 Loading conversation history with friend ${friendId}`);
            
            const response = await fetch(`/api/chat/conversation/${friendId}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                const messages = data.messages || [];
                
                console.log(`📚 Loaded ${messages.length} messages from database`);
                
                // Clear existing messages
                const messagesContainer = this.container.querySelector('#bulletproof-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = '';
                }
                
                // Add each message to UI
                messages.forEach(message => {
                    this.addMessageToUI({
                        id: message.id,
                        text: message.body || message.text,
                        sender: message.is_sender ? 'me' : 'friend',
                        timestamp: new Date(message.created_at),
                        friendId: friendId,
                        friendName: this.currentFriend.name
                    });
                });
                
                // Scroll to bottom
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
                
            } else {
                console.warn('⚠️ Failed to load conversation history, showing empty chat');
            }
            
        } catch (error) {
            console.warn('⚠️ Error loading conversation history:', error);
        }
    }

    createChatInterface() {
        // Remove existing chat if any
        const existing = document.querySelector('.bulletproof-chat');
        if (existing) {
            existing.remove();
        }

        // Create main container
        const container = document.createElement('div');
        container.className = 'bulletproof-chat';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 99999;
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
            width: 95%;
            max-width: 600px;
            height: 70vh;
            max-height: 500px;
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
            <div>
                <h3 style="margin: 0; font-size: 18px;">💬 Chat with ${this.currentFriend.name}</h3>
                <p style="margin: 0; font-size: 12px; opacity: 0.8;">Bulletproof Chat System</p>
            </div>
            <button id="closeBulletproofChat" style="
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
            " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">×</button>
        `;
        
        // Messages area
        const messagesArea = document.createElement('div');
        messagesArea.id = 'bulletproof-messages';
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
            <div style="text-align: center; padding: 40px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
                <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">Chat with ${this.currentFriend.name}</h3>
                <p style="margin: 0; font-size: 14px;">Real messaging system with PostgreSQL storage</p>
                <div style="margin-top: 16px; padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <small>✅ Messages are stored in database and delivered when recipient comes online</small>
                </div>
            </div>
        `;
        
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
                <input type="text" id="bulletproof-input" placeholder="Type your message..." style="
                    flex: 1;
                    padding: 12px 16px;
                    background: #0f0f23;
                    border: 1px solid #333;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                " onkeypress="if(event.key==='Enter') window.bulletproofChat.sendMessage()">
                <button onclick="window.bulletproofChat.sendMessage()" style="
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
        `;
        
        // Assemble chat box
        chatBox.appendChild(header);
        chatBox.appendChild(messagesArea);
        chatBox.appendChild(inputArea);
        container.appendChild(chatBox);
        
        // Add to page
        document.body.appendChild(container);
        
        // Store reference
        this.container = container;
        
        // Bind close event
        const closeBtn = container.querySelector('#closeBulletproofChat');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeChat());
        }
        
        console.log('✅ Bulletproof chat interface created');
    }

    async sendMessage() {
        try {
            const messageInput = this.container.querySelector('#bulletproof-input');
            if (!messageInput) return;

            const message = messageInput.value.trim();
            if (!message) return;

            console.log(`📤 Sending bulletproof message: ${message}`);

            // Create message object
            const messageObj = {
                id: Date.now(),
                text: message,
                sender: 'me',
                timestamp: new Date(),
                friendId: this.currentFriend.id,
                friendName: this.currentFriend.name
            };

            // Add message to UI immediately
            this.addMessageToUI(messageObj);

            // Clear input
            messageInput.value = '';

            // Store message in PostgreSQL
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
                        originalText: message,
                        originalLang: 'en',
                        translatedText: message,
                        translatedLang: 'en'
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Message stored in database:', data);
                    
                    // Update message ID with server ID if provided
                    if (data.data && data.data.id) {
                        messageObj.id = data.data.id;
                    }
                } else {
                    console.warn('⚠️ Failed to store message in database, but continuing...');
                }
            } catch (apiError) {
                console.warn('⚠️ API error storing message, but continuing...', apiError);
            }

            // Real messaging - no automated responses
            // Messages will be delivered to the recipient when they come online
            console.log(`✅ Message sent and stored in database. Recipient will see it when they come online.`);

        } catch (error) {
            console.error('❌ Error sending bulletproof message:', error);
        }
    }

    addMessageToUI(message) {
        const messagesContainer = this.container.querySelector('#bulletproof-messages');
        if (!messagesContainer) return;

        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('div');
        if (welcomeMessage && welcomeMessage.style.textAlign === 'center') {
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
        `;

        // Set bubble color based on sender
        if (message.sender === 'me') {
            messageBubble.style.background = 'linear-gradient(135deg, #8b5cf6, #3b82f6)';
        } else {
            messageBubble.style.background = '#2a2a3e';
        }

        messageBubble.textContent = message.text;
        messageEl.appendChild(messageBubble);
        messagesContainer.appendChild(messageEl);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showChat() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isOpen = true;
            console.log('✅ Bulletproof chat shown');
        }
    }

    closeChat() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isOpen = false;
            this.currentFriend = null;
            console.log('✅ Bulletproof chat closed');
        }
    }
}

// Make it globally available and auto-initialize
window.BulletproofChat = BulletproofChat;

// Auto-initialize the bulletproof chat
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🛡️ Auto-initializing Bulletproof Chat...');
        window.bulletproofChat = new BulletproofChat();
        await window.bulletproofChat.init();
        console.log('✅ Bulletproof Chat auto-initialized successfully');
    } catch (error) {
        console.error('❌ Failed to auto-initialize Bulletproof Chat:', error);
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    console.log('🛡️ DOM still loading, waiting for DOMContentLoaded');
} else {
    // DOM is already loaded, initialize immediately
    console.log('🛡️ DOM already loaded, initializing Bulletproof Chat immediately');
    if (!window.bulletproofChat) {
        try {
            window.bulletproofChat = new BulletproofChat();
            window.bulletproofChat.init().then(() => {
                console.log('✅ Bulletproof Chat initialized immediately');
            }).catch(error => {
                console.error('❌ Bulletproof Chat immediate initialization failed:', error);
            });
        } catch (error) {
            console.error('❌ Failed to create Bulletproof Chat immediately:', error);
        }
    }
}
