// Comprehensive Chat System Fix
console.log('🔧 Loading comprehensive chat system fix...');

// Function to ensure chat manager is available
async function ensureChatManager() {
    if (window.chatManager) {
        return window.chatManager;
    }
    
    // Create chat manager if it doesn't exist
    if (typeof ChatManager !== 'undefined') {
        console.log('📱 Creating chat manager instance...');
        window.chatManager = new ChatManager();
        await window.chatManager.initialize();
        return window.chatManager;
    }
    
    return null;
}

// Fixed toggle function that works immediately
function toggleChatSubmenu() {
    const submenu = document.getElementById('chatSubmenu');
    const arrow = document.querySelector('.chat-parent .nav-arrow');
    
    if (!submenu) {
        console.log('❌ Chat submenu not found');
        return;
    }
    
    const isVisible = submenu.style.display !== 'none';
    
    if (isVisible) {
        submenu.style.display = 'none';
        if (arrow) arrow.textContent = '▶';
    } else {
        submenu.style.display = 'block';
        if (arrow) arrow.textContent = '▼';
    }
    
    console.log('🔄 Chat submenu toggled:', !isVisible ? 'open' : 'closed');
}

// Enhanced initialization that handles timing better
async function initializeComprehensiveChatSystem() {
    try {
        console.log('🚀 Starting comprehensive chat system initialization...');
        
        // Step 1: Setup basic navigation first (doesn't require chat manager)
        setupBasicNavigation();
        
        // Step 2: Wait for and initialize chat manager
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const manager = await ensureChatManager();
            if (manager) {
                console.log('✅ Chat manager ready!');
                break;
            }
            
            attempts++;
            console.log(`⏳ Waiting for chat manager... (${attempts}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Step 3: Load conversations and update UI
        if (window.chatManager) {
            await updateChatSubmenuContent();
        } else {
            console.warn('⚠️ Chat manager not available, using basic mode');
            setupBasicSubmenuContent();
        }
        
        console.log('🎉 Comprehensive chat system ready!');
        
    } catch (error) {
        console.error('❌ Chat system initialization error:', error);
    }
}

function setupBasicNavigation() {
    console.log('🔧 Setting up basic chat navigation...');
    
    // Find chat parent element
    const chatParent = document.querySelector('.chat-parent');
    if (!chatParent) {
        console.error('❌ Chat parent element not found');
        return;
    }
    
    // Remove any existing click listeners
    const newChatParent = chatParent.cloneNode(true);
    chatParent.parentNode.replaceChild(newChatParent, chatParent);
    
    // Add click listener
    newChatParent.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleChatSubmenu();
    });
    
    console.log('✅ Chat navigation setup complete');
}

async function updateChatSubmenuContent() {
    const submenu = document.getElementById('chatSubmenu');
    if (!submenu || !window.chatManager) return;
    
    try {
        console.log('📋 Updating chat submenu content...');
        
        await window.chatManager.loadConversations();
        const conversations = window.chatManager.conversations || [];
        
        let content = '';
        
        if (conversations.length === 0) {
            content = `<div class="submenu-loading">No conversations yet</div>`;
        } else {
            content = conversations.map(conv => {
                const otherUser = conv.other_username || `User ${conv.other_user_id}`;
                const lastMessage = conv.last_message_content || 'No messages yet';
                const avatar = otherUser.charAt(0).toUpperCase();
                
                return `
                    <div class="chat-conversation-item" 
                         data-conversation-id="${conv.id}" 
                         data-user-id="${conv.other_user_id}"
                         onclick="openConversation(${conv.id}, ${conv.other_user_id})">
                        <div class="conversation-avatar">${avatar}</div>
                        <div class="conversation-info">
                            <div class="conversation-name">${otherUser}</div>
                            <div class="conversation-preview">${lastMessage}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Add the test button
        content += `
            <div class="debug-actions" style="padding: 10px; border-top: 1px solid #eee; margin-top: 10px;">
                <button id="createTestDataBtn" onclick="createTestConversations()" 
                        style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                    🧪 Create Test Conversations
                </button>
                <div id="testResult" style="margin-top: 8px; font-size: 11px; display: none;"></div>
            </div>
        `;
        
        submenu.innerHTML = content;
        console.log('✅ Chat submenu content updated');
        
    } catch (error) {
        console.error('❌ Error updating submenu content:', error);
        setupBasicSubmenuContent();
    }
}

function setupBasicSubmenuContent() {
    const submenu = document.getElementById('chatSubmenu');
    if (!submenu) return;
    
    submenu.innerHTML = `
        <div class="submenu-loading">Loading conversations...</div>
        <div class="debug-actions" style="padding: 10px; border-top: 1px solid #eee; margin-top: 10px;">
            <button id="createTestDataBtn" onclick="createTestConversations()" 
                    style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; width: 100%;">
                🧪 Create Test Conversations
            </button>
            <div id="testResult" style="margin-top: 8px; font-size: 11px; display: none;"></div>
        </div>
    `;
}

// Test conversation creation function (enhanced)
async function createTestConversations() {
    const btn = document.getElementById('createTestDataBtn');
    const result = document.getElementById('testResult');
    
    try {
        btn.disabled = true;
        btn.textContent = '🔄 Creating...';
        result.style.display = 'block';
        result.innerHTML = '<span style="color: #666;">Creating test conversations...</span>';
        
        const response = await fetch('/api/admin/create-test-conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            result.innerHTML = `<span style="color: #28a745;">✅ Created conversations!</span>`;
            
            // Refresh submenu content after 1 second
            setTimeout(async () => {
                if (window.chatManager) {
                    await updateChatSubmenuContent();
                } else {
                    location.reload(); // Fallback: reload page
                }
            }, 1000);
            
        } else {
            result.innerHTML = `<span style="color: #dc3545;">❌ Error: ${data.error}</span>`;
        }
        
    } catch (error) {
        result.innerHTML = `<span style="color: #dc3545;">❌ Network error: ${error.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.textContent = '🧪 Create Test Conversations';
        
        // Hide result after 5 seconds
        setTimeout(() => {
            result.style.display = 'none';
        }, 5000);
    }
}

// Function to open a conversation
function openConversation(conversationId, userId) {
    console.log(`🗨️ Opening conversation ${conversationId} with user ${userId}`);
    
    if (window.chatManager) {
        window.chatManager.openConversation(conversationId, userId);
    } else {
        console.warn('⚠️ Chat manager not available for opening conversation');
    }
}

// Make functions globally available
window.toggleChatSubmenu = toggleChatSubmenu;
window.createTestConversations = createTestConversations;
window.openConversation = openConversation;
window.updateChatSubmenuContent = updateChatSubmenuContent;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM loaded, starting comprehensive chat system...');
    setTimeout(initializeComprehensiveChatSystem, 500);
});

console.log('✅ Comprehensive chat system fix loaded');