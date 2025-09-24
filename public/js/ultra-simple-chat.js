// ULTRA SIMPLE CHAT - GUARANTEED TO WORK
function showSimpleChat() {
    // Remove any existing chat
    const existing = document.getElementById('simple-chat-window');
    if (existing) {
        existing.remove();
    }
    
    // Create a working chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'simple-chat-window';
    chatWindow.innerHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 500px;
            background: #1a1a2e;
            border: 3px solid #667eea;
            z-index: 999999;
            display: block;
            border-radius: 12px;
        ">
            <div style="padding: 20px; color: white; height: 100%; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                    <h2 style="margin: 0;">Chat with Silviu</h2>
                    <button onclick="this.closest('#simple-chat-window').remove()" style="background: #ff4757; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">✕</button>
                </div>
                
                <div id="simple-messages" style="flex: 1; overflow-y: auto; margin-bottom: 20px; padding: 10px; background: #16213e; border-radius: 8px;">
                    <div id="no-messages" style="text-align: center; color: #666;">No messages yet. Start the conversation!</div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <input id="simple-message-input" type="text" placeholder="Type your message..." style="flex: 1; padding: 12px; border: 1px solid #333; border-radius: 6px; background: #2a2a3e; color: white; outline: none;">
                    <button id="simple-send-btn" style="background: #667eea; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer;">Send</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatWindow);
    
    // Add functionality
    const sendBtn = document.getElementById('simple-send-btn');
    const input = document.getElementById('simple-message-input');
    const messagesDiv = document.getElementById('simple-messages');
    
    function sendMessage() {
        const message = input.value.trim();
        if (!message) return;
        
        // Hide "no messages" text if it exists
        const noMessages = document.getElementById('no-messages');
        if (noMessages) {
            noMessages.style.display = 'none';
        }
        
        // Add message to chat
        messagesDiv.innerHTML += `
            <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
                <div style="max-width: 70%; padding: 8px 12px; background: #667eea; color: white; border-radius: 12px;">
                    ${message}
                </div>
            </div>
        `;
        
        input.value = '';
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        console.log('✅ MESSAGE SENT:', message);
        
        // Simulate receiving a response (for testing)
        setTimeout(() => {
            messagesDiv.innerHTML += `
                <div style="margin-bottom: 10px; display: flex; justify-content: flex-start;">
                    <div style="max-width: 70%; padding: 8px 12px; background: #2a2a3e; color: white; border-radius: 12px;">
                        Thanks for your message: "${message}"
                    </div>
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 1000);
    }
    
    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    
    // Focus input
    setTimeout(() => input.focus(), 100);
    
    console.log('✅ SIMPLE CHAT WINDOW CREATED AND FUNCTIONAL');
}

// Make it available globally
window.showSimpleChat = showSimpleChat;