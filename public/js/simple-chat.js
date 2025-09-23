// Simple Chat Implementation - No Dependencies
function createSimpleChat(friendName) {
    // Remove any existing chat
    const existing = document.querySelector('.simple-chat');
    if (existing) {
        existing.remove();
    }

    // Create chat container
    const chat = document.createElement('div');
    chat.className = 'simple-chat';
    chat.style.cssText = `
        position: fixed;
        top: 50px;
        right: 50px;
        width: 300px;
        height: 400px;
        background: white;
        border: 2px solid #007bff;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
        background: #007bff;
        color: white;
        padding: 15px;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <strong>Chat with ${friendName}</strong>
        <button onclick="this.closest('.simple-chat').remove()" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
    `;

    // Create messages area
    const messages = document.createElement('div');
    messages.style.cssText = `
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        background: #f8f9fa;
    `;
    messages.innerHTML = `
        <div style="background: #e9ecef; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
            Hello! This is a test message from ${friendName}.
        </div>
    `;

    // Create input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
        padding: 15px;
        border-top: 1px solid #ddd;
        display: flex;
        gap: 10px;
    `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type your message...';
    input.style.cssText = `
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 5px;
        outline: none;
    `;
    
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.style.cssText = `
        background: #007bff;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
    `;
    
    // Add send functionality
    sendBtn.onclick = function() {
        if (input.value.trim()) {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                background: #007bff;
                color: white;
                padding: 10px;
                border-radius: 10px;
                margin-bottom: 10px;
                text-align: right;
            `;
            messageDiv.textContent = input.value;
            messages.appendChild(messageDiv);
            input.value = '';
            messages.scrollTop = messages.scrollHeight;
        }
    };
    
    // Enter key to send
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    };

    // Assemble chat
    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    chat.appendChild(header);
    chat.appendChild(messages);
    chat.appendChild(inputArea);

    // Add to page
    document.body.appendChild(chat);
    
    // Focus input
    input.focus();
    
    console.log('✅ Simple chat created and displayed');
    return chat;
}

// Make it globally available
window.createSimpleChat = createSimpleChat;
