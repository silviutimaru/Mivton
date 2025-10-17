/**
 * 🔤 CHAT LANGUAGE SELECTOR
 * Allows users to select their preferred chat display language
 * Integrates with translation API to show messages in chosen language
 */

let currentChatLanguage = 'en';
let availableLanguages = [];

/**
 * Initialize the chat language selector
 */
async function initChatLanguageSelector() {
    console.log('🔤 Initializing chat language selector...');
    
    try {
        // Fetch available languages from API
        console.log('🌐 Fetching languages from /api/chat/languages...');
        const languagesResponse = await fetch('/api/chat/languages');
        const languagesData = await languagesResponse.json();
        
        console.log('🌐 Languages API Response:', languagesData);
        console.log('🌐 Languages count:', languagesData.languages?.length);
        console.log('🌐 Service available:', languagesData.serviceAvailable);
        
        if (languagesData.success && languagesData.languages && languagesData.languages.length > 1) {
            availableLanguages = languagesData.languages;
            console.log(`✅ Loaded ${availableLanguages.length} languages`);
            
            // Populate the language selector dropdown
            populateLanguageSelector();
            
            // Load user's preferred language
            await loadUserPreferredLanguage();
            
            // Set up event listener
            setupLanguageSelectorEvents();
            
            console.log('✅ Chat language selector initialized');
        } else {
            console.error('❌ No languages received or only 1 language. Response:', languagesData);
            console.error('❌ Available languages:', availableLanguages);
        }
    } catch (error) {
        console.error('❌ Error initializing language selector:', error);
    }
}

/**
 * Populate the language selector dropdown
 */
function populateLanguageSelector() {
    const selector = document.getElementById('chatLanguageSelector');
    
    console.log('🔍 Looking for chatLanguageSelector element...');
    console.log('🔍 Selector found:', !!selector);
    
    if (!selector) {
        console.log('⚠️ Language selector element not found');
        console.log('⚠️ Available elements with "chat" in ID:', 
            Array.from(document.querySelectorAll('[id*="chat"]')).map(el => el.id));
        return;
    }
    
    console.log('✅ Found chatLanguageSelector, populating with', availableLanguages.length, 'languages');
    
    // Clear existing options
    selector.innerHTML = '';
    
    // Add popular languages first
    const popularLanguages = ['en', 'ro', 'hu', 'es', 'fr', 'de', 'it', 'pt'];
    const otherLanguages = availableLanguages.filter(lang => !popularLanguages.includes(lang.code));
    
    console.log('🔍 Popular languages:', popularLanguages.length);
    console.log('🔍 Other languages:', otherLanguages.length);
    
    // Add popular languages section
    const popularGroup = document.createElement('optgroup');
    popularGroup.label = 'Popular Languages';
    
    popularLanguages.forEach(code => {
        const lang = availableLanguages.find(l => l.code === code);
        if (lang) {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.name} (${lang.code.toUpperCase()})`;
            popularGroup.appendChild(option);
            console.log(`✅ Added popular language: ${lang.name}`);
        }
    });
    
    selector.appendChild(popularGroup);
    
    // Add other languages section
    if (otherLanguages.length > 0) {
        const otherGroup = document.createElement('optgroup');
        otherGroup.label = 'Other Languages';
        
        otherLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.name} (${lang.code.toUpperCase()})`;
            otherGroup.appendChild(option);
        });
        
        selector.appendChild(otherGroup);
        console.log(`✅ Added ${otherLanguages.length} other languages`);
    }
    
    console.log('✅ Language selector populated with', selector.options.length, 'total options');
}

/**
 * Load user's preferred language from preferences
 */
async function loadUserPreferredLanguage() {
    try {
        const response = await fetch('/api/user/preferences');
        const data = await response.json();
        
        if (data.success && data.preferences) {
            // Check if user has a preferred chat language
            const preferredLang = data.preferences.preferred_chat_language || 
                                 data.preferences.language || 
                                 'en';
            
            console.log(`🔤 User's preferred language: ${preferredLang}`);
            currentChatLanguage = preferredLang;
            
            // Set the selector to this language
            const selector = document.getElementById('chatLanguageSelector');
            if (selector) {
                selector.value = preferredLang;
            }
        }
    } catch (error) {
        console.log('⚠️ Could not load user preferences, defaulting to English');
        currentChatLanguage = 'en';
    }
}

/**
 * Set up event listeners for the language selector
 */
function setupLanguageSelectorEvents() {
    const selector = document.getElementById('chatLanguageSelector');
    
    if (!selector) {
        return;
    }
    
    selector.addEventListener('change', async (e) => {
        const newLanguage = e.target.value;
        console.log(`🔄 Language changed to: ${newLanguage}`);
        
        // Update current language
        currentChatLanguage = newLanguage;
        
        // Save preference to server
        await saveChatLanguagePreference(newLanguage);
        
        // Reload current conversation with new language
        await reloadCurrentConversationWithLanguage(newLanguage);
    });
}

/**
 * Save chat language preference to server
 */
async function saveChatLanguagePreference(language) {
    try {
        const response = await fetch('/api/user/chat-language', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ language })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Chat language preference saved: ${language}`);
        } else {
            console.error('❌ Failed to save language preference:', data.error);
        }
    } catch (error) {
        console.error('❌ Error saving language preference:', error);
    }
}

/**
 * Reload current conversation with new language
 */
async function reloadCurrentConversationWithLanguage(language) {
    // Check if there's an active conversation
    const activeConversation = document.querySelector('.conversation-item.active');
    
    if (!activeConversation) {
        console.log('📝 No active conversation to reload');
        return;
    }
    
    const conversationId = activeConversation.dataset.conversationId;
    
    if (!conversationId) {
        console.log('⚠️ No conversation ID found');
        return;
    }
    
    console.log(`🔄 Reloading conversation ${conversationId} in ${language}...`);
    
    try {
        // Show loading indicator
        showChatLoadingIndicator();
        
        // Fetch messages with new language
        const response = await fetch(`/api/chat/messages/${conversationId}?language=${language}`);
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Loaded ${data.messages.length} messages in ${language}`);
            
            // Update the message display
            displayMessagesWithTranslation(data.messages, language);
        } else {
            console.error('❌ Failed to reload messages:', data.error);
        }
    } catch (error) {
        console.error('❌ Error reloading conversation:', error);
    } finally {
        // Hide loading indicator
        hideChatLoadingIndicator();
    }
}

/**
 * Display messages with translation support
 */
function displayMessagesWithTranslation(messages, displayLanguage) {
    const messagesContainer = document.getElementById('chatMessagesContainer');
    
    if (!messagesContainer) {
        console.log('⚠️ Messages container not found');
        return;
    }
    
    // Clear existing messages
    messagesContainer.innerHTML = '';
    
    messages.forEach(msg => {
        const messageElement = createMessageElement(msg, displayLanguage);
        messagesContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Create a message element with translation support
 */
function createMessageElement(message, displayLanguage) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    messageDiv.classList.add(message.sender_id === window.currentUserId ? 'sent' : 'received');
    
    // Determine which content to display
    let displayContent = message.content;
    let isTranslated = false;
    
    if (message.translation && message.translation.isTranslated) {
        displayContent = message.translation.content;
        isTranslated = true;
    }
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = displayContent;
    
    // Add language badge if translated
    if (isTranslated) {
        const badge = document.createElement('span');
        badge.classList.add('language-badge');
        badge.textContent = `Translated to ${displayLanguage.toUpperCase()}`;
        badge.title = `Original: ${message.original_language?.toUpperCase() || 'Unknown'}`;
        contentDiv.prepend(badge);
        
        // Add "Show original" button
        const toggleBtn = document.createElement('button');
        toggleBtn.classList.add('toggle-translation-btn');
        toggleBtn.textContent = 'Show original';
        toggleBtn.onclick = () => toggleMessageTranslation(messageDiv, message);
        contentDiv.appendChild(toggleBtn);
    }
    
    messageDiv.appendChild(contentDiv);
    
    // Add timestamp
    const timeDiv = document.createElement('div');
    timeDiv.classList.add('message-time');
    timeDiv.textContent = formatMessageTime(message.created_at);
    messageDiv.appendChild(timeDiv);
    
    return messageDiv;
}

/**
 * Toggle between original and translated message
 */
function toggleMessageTranslation(messageElement, messageData) {
    const contentDiv = messageElement.querySelector('.message-content');
    const toggleBtn = messageElement.querySelector('.toggle-translation-btn');
    
    if (!contentDiv || !toggleBtn) return;
    
    const currentlyShowingTranslation = toggleBtn.textContent === 'Show original';
    
    if (currentlyShowingTranslation) {
        // Show original
        contentDiv.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                node.textContent = messageData.content;
            }
        });
        toggleBtn.textContent = 'Show translation';
    } else {
        // Show translation
        if (messageData.translation && messageData.translation.content) {
            contentDiv.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent = messageData.translation.content;
                }
            });
            toggleBtn.textContent = 'Show original';
        }
    }
}

/**
 * Format message timestamp
 */
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
}

/**
 * Show loading indicator in chat
 */
function showChatLoadingIndicator() {
    const container = document.getElementById('chatMessagesContainer');
    if (container) {
        const loader = document.createElement('div');
        loader.id = 'chatLoadingIndicator';
        loader.classList.add('chat-loading');
        loader.textContent = '🔄 Loading messages...';
        container.appendChild(loader);
    }
}

/**
 * Hide loading indicator
 */
function hideChatLoadingIndicator() {
    const loader = document.getElementById('chatLoadingIndicator');
    if (loader) {
        loader.remove();
    }
}

/**
 * Get current chat language
 */
function getCurrentChatLanguage() {
    return currentChatLanguage;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatLanguageSelector);
} else {
    // DOM already loaded
    initChatLanguageSelector();
}

// Export functions for use in other scripts
window.chatLanguageSelector = {
    init: initChatLanguageSelector,
    getCurrentLanguage: getCurrentChatLanguage,
    reloadWithLanguage: reloadCurrentConversationWithLanguage
};

