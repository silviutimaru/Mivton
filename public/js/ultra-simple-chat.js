// ULTRA SIMPLE CHAT - GUARANTEED TO WORK
function showSimpleChat() {
    // Remove any existing chat
    const existing = document.getElementById('simple-chat-window');
    if (existing) {
        existing.remove();
    }
    
    // Create the simplest possible chat window
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
            background: red;
            border: 5px solid yellow;
            z-index: 999999;
            display: block;
        ">
            <div style="padding: 20px; color: white;">
                <h2>CHAT WITH SILVIU</h2>
                <p>This is a simple chat window</p>
                <button onclick="this.parentElement.parentElement.remove()" style="background: white; color: black; padding: 10px;">CLOSE</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatWindow);
    console.log('✅ SIMPLE CHAT WINDOW CREATED');
}

// Make it available globally
window.showSimpleChat = showSimpleChat;