// Simple Chat System Test & Fix
console.log('🧪 Testing chat system components...');

// Test what's available
function testChatEnvironment() {
    console.log('🔍 Testing environment:');
    console.log('- ChatManager class:', typeof ChatManager);
    console.log('- window.socket:', typeof window.socket, window.socket);
    console.log('- window.currentUserId:', typeof window.currentUserId, window.currentUserId);
    console.log('- Socket.IO:', typeof io);
    
    // Try to create ChatManager manually with error handling
    try {
        if (typeof ChatManager !== 'undefined') {
            console.log('✅ ChatManager class is available');
            
            // Create a safe version that doesn't depend on socket/userId initially
            const testManager = new ChatManager();
            console.log('✅ ChatManager instance created successfully');
            window.chatManager = testManager;
            
            // Initialize it
            testManager.initialize().then(() => {
                console.log('✅ ChatManager initialized successfully');
            }).catch(error => {
                console.error('❌ ChatManager initialization failed:', error);
            });
            
        } else {
            console.error('❌ ChatManager class not found');
        }
    } catch (error) {
        console.error('❌ Error creating ChatManager:', error);
    }
}

// Simple toggle function that works without chat manager
function simpleChatToggle() {
    const submenu = document.getElementById('chatSubmenu');
    const arrow = document.querySelector('a[data-section="chat"] .nav-arrow');
    
    if (!submenu) {
        console.log('❌ Chat submenu not found');
        return;
    }
    
    const isHidden = submenu.style.display === 'none' || !submenu.style.display;
    
    if (isHidden) {
        submenu.style.display = 'block';
        if (arrow) arrow.textContent = '▼';
        console.log('📂 Chat submenu opened');
    } else {
        submenu.style.display = 'none';
        if (arrow) arrow.textContent = '▶';
        console.log('📁 Chat submenu closed');
    }
}

// Setup basic chat functionality
function setupBasicChat() {
    console.log('🔧 Setting up basic chat functionality...');
    
    // Find and setup chat toggle
    const chatLink = document.querySelector('a[data-section="chat"]');
    if (chatLink) {
        // Remove existing listeners
        const newChatLink = chatLink.cloneNode(true);
        chatLink.parentNode.replaceChild(newChatLink, chatLink);
        
        // Add new listener
        newChatLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            simpleChatToggle();
        });
        
        console.log('✅ Chat toggle setup complete');
    } else {
        console.error('❌ Chat link not found');
    }
    
    // Add test button to submenu
    const submenu = document.getElementById('chatSubmenu');
    if (submenu) {
        submenu.innerHTML = `
            <div class="submenu-loading">No conversations yet</div>
            <div class="debug-actions" style="padding: 10px; border-top: 1px solid #eee; margin-top: 10px;">
                <button onclick="window.testCreateConversations()" 
                        style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                    🧪 Create Test Conversations
                </button>
                <div id="testResult" style="margin-top: 8px; font-size: 11px; display: none;"></div>
            </div>
        `;
        console.log('✅ Chat submenu content set');
    }
}

// Test conversation creation
async function testCreateConversations() {
    const result = document.getElementById('testResult');
    
    try {
        console.log('🔄 Creating test conversations...');
        result.style.display = 'block';
        result.innerHTML = '<span style="color: #666;">Creating...</span>';
        
        const response = await fetch('/api/admin/create-test-conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('📊 API Response:', data);
        
        if (data.success) {
            result.innerHTML = '<span style="color: #28a745;">✅ Success!</span>';
            
            // Refresh page after success
            setTimeout(() => {
                console.log('🔄 Refreshing page to show conversations...');
                location.reload();
            }, 2000);
        } else {
            result.innerHTML = `<span style="color: #dc3545;">❌ ${data.error}</span>`;
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        result.innerHTML = `<span style="color: #dc3545;">❌ ${error.message}</span>`;
    }
}

// Make functions global
window.simpleChatToggle = simpleChatToggle;
window.testCreateConversations = testCreateConversations;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing simple chat system...');
    
    setTimeout(() => {
        testChatEnvironment();
        setupBasicChat();
        console.log('✅ Simple chat system ready');
    }, 1000);
});

console.log('✅ Simple chat test loaded');