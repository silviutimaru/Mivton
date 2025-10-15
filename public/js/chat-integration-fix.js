// Chat Integration Fix - Connects all chat systems
console.log('🔧 Loading chat integration fix...');

// Wait for DOM and all scripts to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM loaded, initializing chat integration...');
    
    // Wait for chat manager to be available
    setTimeout(initializeChatIntegration, 2000);
});

async function initializeChatIntegration() {
    try {
        console.log('🔗 Connecting all chat systems...');
        
        // Ensure chat manager is available
        if (!window.chatManager) {
            console.log('⏳ Chat manager not ready, retrying...');
            setTimeout(initializeChatIntegration, 1000);
            return;
        }
        
        // Initialize modern chat layout
        await initializeModernLayout();
        
        // Connect real-time updates
        setupRealTimeIntegration();
        
        // Fix navigation
        fixChatNavigation();
        
        console.log('✅ Chat integration complete!');
        
    } catch (error) {
        console.error('❌ Chat integration error:', error);
    }
}

async function initializeModernLayout() {
    console.log('🎨 Setting up modern chat layout...');
    
    // Initialize chat submenu
    const chatParent = document.querySelector('.chat-parent');
    const chatSubmenu = document.getElementById('chatSubmenu');
    
    if (chatParent && chatSubmenu) {
        // Make submenu toggleable
        chatParent.addEventListener('click', (e) => {
            e.preventDefault();
            toggleChatSubmenu();
        });
        
        // Start expanded
        chatParent.classList.add('expanded');
        chatSubmenu.classList.add('expanded');
        
        // Load conversations
        await updateChatSubmenu();
    }
}

function toggleChatSubmenu() {
    const chatParent = document.querySelector('.chat-parent');
    const chatSubmenu = document.getElementById('chatSubmenu');
    
    if (chatParent && chatSubmenu) {
        chatParent.classList.toggle('expanded');
        chatSubmenu.classList.toggle('expanded');
    }
}

async function updateChatSubmenu() {
    const submenu = document.getElementById('chatSubmenu');
    if (!submenu) return;
    
    try {
        console.log('📋 Loading conversations for submenu...');
        
        // Load conversations using the chat manager
        await window.chatManager.loadConversations();
        const conversations = window.chatManager.conversations || [];
        
        if (conversations.length === 0) {
            submenu.innerHTML = `
                <div class="submenu-loading">No conversations yet</div>
            `;
            return;
        }
        
        // Create conversation items
        const conversationItems = conversations.map(conv => {
            const otherUser = conv.other_user_username || `User ${conv.other_user_id}`;
            const lastMessage = conv.last_message_content || 'No messages yet';
            const avatar = otherUser.charAt(0).toUpperCase();
            const isUnread = !conv.is_read;
            
            return `
                <div class="chat-conversation-item" 
                     data-conversation-id="${conv.id}" 
                     data-user-id="${conv.other_user_id}"
                     data-username="${otherUser}"
                     onclick="openChatConversation(${conv.other_user_id}, '${otherUser}', ${conv.id})">
                    <div class="conversation-avatar">${avatar}</div>
                    <div class="conversation-info">
                        <div class="conversation-name">${otherUser}</div>
                        <div class="conversation-preview">${lastMessage.substring(0, 30)}${lastMessage.length > 30 ? '...' : ''}</div>
                    </div>
                    <div class="conversation-meta">
                        <div class="conversation-time">${formatMessageTime(conv.last_message_time)}</div>
                        ${isUnread ? '<div class="conversation-unread">1</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        submenu.innerHTML = conversationItems;
        console.log('✅ Chat submenu updated with', conversations.length, 'conversations');
        
    } catch (error) {
        console.error('❌ Error updating chat submenu:', error);
        submenu.innerHTML = `<div class="submenu-loading">Error loading conversations</div>`;
    }
}

function setupRealTimeIntegration() {
    console.log('⚡ Setting up real-time integration...');
    
    // Listen for new messages to update submenu
    if (window.chatManager && window.chatManager.socket) {
        window.chatManager.socket.on('chat:new_message', (message) => {
            console.log('📨 New message received, updating submenu...');
            setTimeout(updateChatSubmenu, 500); // Small delay to ensure message is processed
        });
        
        // Listen for message sent confirmations
        window.chatManager.socket.on('chat:message_sent', () => {
            console.log('📤 Message sent, updating submenu...');
            setTimeout(updateChatSubmenu, 500);
        });
    }
}

function fixChatNavigation() {
    console.log('🧭 Fixing chat navigation...');
    
    // Ensure clicking "Chat" in the main nav shows the chat section
    const chatNavItem = document.querySelector('[data-section="chat"]');
    if (chatNavItem) {
        chatNavItem.addEventListener('click', (e) => {
            // Let the normal navigation happen first
            setTimeout(() => {
                // Make sure chat section is visible
                const chatSection = document.getElementById('chat-section');
                if (chatSection) {
                    chatSection.style.display = 'block';
                }
            }, 100);
        });
    }
}

function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'now';
    
    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h`;
    }
    
    // More than 24 hours
    const days = Math.floor(diff / 86400000);
    if (days === 1) return '1d';
    if (days < 7) return `${days}d`;
    
    // Format as date
    return date.toLocaleDateString();
}

// Make functions globally available
window.toggleChatSubmenu = toggleChatSubmenu;
window.updateChatSubmenu = updateChatSubmenu;
window.formatMessageTime = formatMessageTime;

console.log('🔧 Chat integration fix loaded successfully');