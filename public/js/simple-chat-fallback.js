/**
 * Simple Chat Fallback System
 * Basic chat functionality that works even when the full system fails
 */

class SimpleChatFallback {
    constructor() {
        this.container = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🔄 Initializing Simple Chat Fallback...');
            this.createChatInterface();
            this.isInitialized = true;
            console.log('✅ Simple Chat Fallback initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Simple Chat Fallback:', error);
        }
    }

    createChatInterface() {
        // Remove existing chat if any
        const existing = document.querySelector('.simple-chat-fallback');
        if (existing) {
            existing.remove();
        }

        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'simple-chat-fallback';
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
                <h3 style="margin: 0; font-size: 18px;" id="friendName">Chat with Friend</h3>
                <p style="margin: 0; font-size: 12px; opacity: 0.8;">Simple chat system</p>
            </div>
            <button id="closeSimpleChat" style="
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
        messagesArea.id = 'simple-chat-messages';
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
                <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">Simple Chat System</h3>
                <p style="margin: 0; font-size: 14px;">Basic messaging functionality</p>
                <div style="margin-top: 16px; padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 8px; border-left: 3px solid #8b5cf6;">
                    <small>✅ Chat system is ready to use</small>
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
                <input type="text" id="simple-chat-input" placeholder="Type your message..." style="
                    flex: 1;
                    padding: 12px 16px;
                    background: #0f0f23;
                    border: 1px solid #333;
                    border-radius: 8px;
                    color: white;
                    font-size: 14px;
                    outline: none;
                " onkeypress="if(event.key==='Enter') window.simpleChatFallback.sendMessage()">
                <button onclick="window.simpleChatFallback.sendMessage()" style="
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
        this.container.appendChild(chatBox);
        
        // Add to page
        document.body.appendChild(this.container);
        console.log('✅ Simple chat interface created');
    }

    openConversation(friendId, friendName) {
        try {
            console.log(`💬 Opening simple chat with ${friendName} (${friendId})`);
            
            // Update friend name
            const friendNameEl = this.container.querySelector('#friendName');
            if (friendNameEl) {
                friendNameEl.textContent = `Chat with ${friendName}`;
            }

            // Show the chat interface
            this.show();

            // Bind close event
            const closeBtn = this.container.querySelector('#closeSimpleChat');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeChat());
            }

            console.log(`✅ Simple chat opened with ${friendName}`);
            return true;

        } catch (error) {
            console.error('❌ Error opening simple chat:', error);
            throw error;
        }
    }

    sendMessage() {
        try {
            const messageInput = this.container.querySelector('#simple-chat-input');
            if (!messageInput) return;

            const message = messageInput.value.trim();
            if (!message) return;

            console.log(`📤 Sending simple message: ${message}`);

            // Add message to UI
            this.addMessageToUI({
                id: Date.now(),
                text: message,
                sender: 'me',
                timestamp: new Date()
            });

            // Clear input
            messageInput.value = '';

            // Simulate response after 1 second
            setTimeout(() => {
                this.addMessageToUI({
                    id: Date.now() + 1,
                    text: `This is a demo response to: "${message}"`,
                    sender: 'friend',
                    timestamp: new Date()
                });
            }, 1000);

        } catch (error) {
            console.error('❌ Error sending simple message:', error);
        }
    }

    addMessageToUI(message) {
        const messagesContainer = this.container.querySelector('#simple-chat-messages');
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

    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            console.log('✅ Simple chat interface shown');
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            console.log('✅ Simple chat interface hidden');
        }
    }

    closeChat() {
        this.hide();
        console.log('✅ Simple chat closed');
    }
}

// Make it globally available and auto-initialize
window.SimpleChatFallback = SimpleChatFallback;

// Auto-initialize the simple chat fallback
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🔄 Auto-initializing Simple Chat Fallback...');
        window.simpleChatFallback = new SimpleChatFallback();
        await window.simpleChatFallback.init();
        console.log('✅ Simple Chat Fallback auto-initialized successfully');
    } catch (error) {
        console.error('❌ Failed to auto-initialize Simple Chat Fallback:', error);
    }
});
