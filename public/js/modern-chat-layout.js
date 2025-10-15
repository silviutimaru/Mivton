// Modern Chat Layout Global Functions

// Open a chat conversation in the main area
function openChatConversation(userId, username, conversationId) {
    console.log(`🎯 Opening chat with ${username} (${userId})`);
    
    // Hide welcome screen, show conversation view
    const welcome = document.getElementById('chatWelcome');
    const conversationView = document.getElementById('chatConversationView');
    
    if (welcome) welcome.style.display = 'none';
    if (conversationView) conversationView.style.display = 'flex';
    
    // Update chat header
    const chatUsername = document.getElementById('chatUsername');
    const chatAvatar = document.getElementById('chatAvatar');
    const chatStatus = document.getElementById('chatStatus');
    
    if (chatUsername) chatUsername.textContent = username;
    if (chatAvatar) chatAvatar.textContent = username.charAt(0).toUpperCase();
    if (chatStatus) chatStatus.textContent = 'online'; // TODO: Real presence status
    
    // Update active conversation in sidebar
    updateActiveConversation(conversationId);
    
    // Load and display messages for this conversation
    loadConversationMessages(conversationId, userId);
    
    // Store current conversation info globally
    window.currentChatConversation = {
        userId: userId,
        username: username,
        conversationId: conversationId
    };
}

// Update which conversation is active in the sidebar
function updateActiveConversation(conversationId) {
    // Remove active class from all conversation items
    document.querySelectorAll('.chat-conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected conversation
    const activeItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Load messages for a specific conversation
async function loadConversationMessages(conversationId, userId) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    try {
        // Show loading state
        messagesContainer.innerHTML = '<div class="loading-messages">Loading messages...</div>';
        
        // Fetch messages from API
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        const data = await response.json();
        const messages = data.messages || [];
        
        // Render messages
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-messages">
                    <div style="text-align: center; color: #888; padding: 40px;">
                        <div style="font-size: 2em; margin-bottom: 10px;">💬</div>
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                </div>
            `;
        } else {
            const messagesHTML = messages.map(message => {
                const isOwn = message.sender_id === window.chatManager.currentUserId;
                const time = new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                return `
                    <div class="message ${isOwn ? 'own' : ''}">
                        <div class="message-content">
                            ${escapeHtml(message.content)}
                        </div>
                        <div class="message-time">${time}</div>
                    </div>
                `;
            }).join('');
            
            messagesContainer.innerHTML = messagesHTML;
        }
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('❌ Error loading messages:', error);
        messagesContainer.innerHTML = `
            <div class="error-messages">
                <div style="text-align: center; color: #e74c3c; padding: 40px;">
                    <div style="font-size: 2em; margin-bottom: 10px;">⚠️</div>
                    <p>Failed to load messages</p>
                </div>
            </div>
        `;
    }
}

// Send a message from the main chat input
function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    if (!input || !window.currentChatConversation) return;
    
    const content = input.value.trim();
    if (!content) return;
    
    // Send via chat manager
    const { userId, conversationId } = window.currentChatConversation;
    window.chatManager.sendDirectMessage(content, userId)
        .then(() => {
            // Clear input
            input.value = '';
            
            // Reload messages to show the new message
            if (conversationId) {
                loadConversationMessages(conversationId, userId);
            }
            
            // Update sidebar to reflect new message
            window.chatManager.updateChatSubmenu();
        })
        .catch(error => {
            console.error('❌ Error sending message:', error);
        });
}

// Close the chat view and return to welcome screen
function closeChatView() {
    const welcome = document.getElementById('chatWelcome');
    const conversationView = document.getElementById('chatConversationView');
    
    if (welcome) welcome.style.display = 'flex';
    if (conversationView) conversationView.style.display = 'none';
    
    // Clear current conversation
    window.currentChatConversation = null;
    
    // Remove active state from sidebar items
    document.querySelectorAll('.chat-conversation-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start new chat from welcome screen
function startNewChatFromWelcome() {
    if (window.chatManager && window.chatManager.openFriendSelector) {
        window.chatManager.openFriendSelector();
    } else if (window.chatManager && window.chatManager.showFriendSelector) {
        // Try alternative method
        fetch('/api/friends')
            .then(response => response.json())
            .then(data => {
                if (data.friends) {
                    window.chatManager.showFriendSelector(data.friends);
                }
            })
            .catch(console.error);
    } else {
        console.log('Chat manager not ready yet');
    }
}

// Make function globally available
window.startNewChatFromWelcome = startNewChatFromWelcome;