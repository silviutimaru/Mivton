/**
 * Ultra Simple Chat - Guaranteed to Work
 * No complex dependencies, just pure JavaScript
 */

// Global chat functions
window.openChat = function(friendId, friendName) {
    console.log('🚀 Opening chat with:', friendName, friendId);
    
    // Remove any existing chat
    const existing = document.getElementById('ultra-simple-chat');
    if (existing) {
        existing.remove();
    }
    
    // Create chat modal
    const chatModal = document.createElement('div');
    chatModal.id = 'ultra-simple-chat';
    chatModal.style.cssText = `
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
        max-width: 500px;
        height: 70vh;
        max-height: 600px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        border: 2px solid #8b5cf6;
    `;
    
    // Chat header
    const header = document.createElement('div');
    header.style.cssText = `
        background: #8b5cf6;
        color: white;
        padding: 20px;
        border-radius: 10px 10px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                ${friendName.charAt(0).toUpperCase()}
            </div>
            <div>
                <h3 style="margin: 0; font-size: 18px;">Chat with ${friendName}</h3>
                <p style="margin: 0; font-size: 12px; opacity: 0.8;">Online</p>
            </div>
        </div>
        <button onclick="window.closeChat()" style="
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
    messagesArea.id = 'chat-messages';
    messagesArea.style.cssText = `
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background: #0f0f23;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;
    
    // Welcome message
    messagesArea.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 16px;">💬</div>
            <h3 style="margin: 0 0 8px 0; color: #8b5cf6;">Start Chatting!</h3>
            <p style="margin: 0; font-size: 14px;">Type a message below to begin your conversation with ${friendName}</p>
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
            <input type="text" id="chat-input" placeholder="Type your message..." style="
                flex: 1;
                padding: 12px 16px;
                background: #0f0f23;
                border: 1px solid #333;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                outline: none;
            " onkeypress="if(event.key==='Enter') window.sendMessage()">
            <button onclick="window.sendMessage()" style="
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
            💬 Chat with ${friendName} • Press Enter to send
        </div>
    `;
    
    // Assemble chat box
    chatBox.appendChild(header);
    chatBox.appendChild(messagesArea);
    chatBox.appendChild(inputArea);
    chatModal.appendChild(chatBox);
    
    // Add to page
    document.body.appendChild(chatModal);
    
    // Store current friend info globally
    window.currentChatFriend = { id: friendId, name: friendName };
    
    console.log('✅ Chat modal opened successfully');
    
    // Focus input
    setTimeout(() => {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }, 100);
};

window.closeChat = function() {
    const chatModal = document.getElementById('ultra-simple-chat');
    if (chatModal) {
        chatModal.remove();
        window.currentChatFriend = null;
        console.log('✅ Chat closed');
    }
};

window.sendMessage = function() {
    const input = document.getElementById('chat-input');
    const messagesArea = document.getElementById('chat-messages');
    
    if (!input || !messagesArea || !window.currentChatFriend) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    console.log('📤 Sending message:', message);
    
    // Remove welcome message
    const welcomeMsg = messagesArea.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    // Add message to UI
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        display: flex;
        justify-content: flex-end;
        margin-bottom: 12px;
    `;
    
    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
        max-width: 70%;
        padding: 12px 16px;
        background: linear-gradient(135deg, #8b5cf6, #3b82f6);
        border-radius: 18px;
        color: white;
        font-size: 14px;
        word-wrap: break-word;
    `;
    
    messageBubble.textContent = message;
    messageEl.appendChild(messageBubble);
    messagesArea.appendChild(messageEl);
    
    // Clear input
    input.value = '';
    
    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    // Simulate receiving a response (for demo)
    setTimeout(() => {
        const responseEl = document.createElement('div');
        responseEl.style.cssText = `
            display: flex;
            justify-content: flex-start;
            margin-bottom: 12px;
        `;
        
        const responseBubble = document.createElement('div');
        responseBubble.style.cssText = `
            max-width: 70%;
            padding: 12px 16px;
            background: #2a2a3e;
            border-radius: 18px;
            color: white;
            font-size: 14px;
            word-wrap: break-word;
        `;
        
        responseBubble.textContent = `Hi! I received your message: "${message}". This is a demo response from ${window.currentChatFriend.name}!`;
        responseEl.appendChild(responseBubble);
        messagesArea.appendChild(responseEl);
        
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }, 1000);
    
    console.log('✅ Message sent and response simulated');
};

// Make functions globally available
console.log('✅ Ultra Simple Chat functions loaded');

// Add fallback event handler for chat buttons (safety net)
document.addEventListener('click', function(e) {
    if (e.target.closest('.chat-button')) {
        const chatBtn = e.target.closest('.chat-button');
        const friendId = chatBtn.dataset.friendId;
        const friendName = chatBtn.closest('[data-friend-id]')?.querySelector('.friend-name')?.textContent?.trim();
        
        if (friendId && friendName && window.openChat) {
            console.log('🚀 Fallback chat handler triggered for friend:', friendName);
            e.preventDefault();
            e.stopPropagation();
            window.openChat(friendId, friendName);
        } else {
            console.error('❌ Missing data for chat:', { 
                friendId, 
                friendName, 
                openChat: typeof window.openChat,
                chatBtn: chatBtn
            });
        }
    }
});

console.log('✅ Fallback chat button handler added');
