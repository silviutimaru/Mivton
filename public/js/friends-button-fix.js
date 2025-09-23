/**
 * 🚨 EMERGENCY FIX FOR FRIEND REQUEST BUTTONS
 * This file ensures friend request buttons work correctly
 */

console.log('🔧 Loading friend request button fix...');

// Global function to handle friend request actions
window.handleFriendRequestAction = function(action, requestId) {
    console.log('🚀 Friend request action triggered:', action, requestId);
    
    if (!window.dashboard) {
        console.error('❌ Dashboard not available!');
        return;
    }
    
    switch (action) {
        case 'accept':
            window.dashboard.acceptFriendRequest(requestId);
            break;
        case 'decline':
            window.dashboard.declineFriendRequest(requestId);
            break;
        case 'cancel':
            window.dashboard.cancelFriendRequest(requestId);
            break;
        default:
            console.error('❌ Unknown action:', action);
    }
};

// Function to attach event listeners to request buttons
function attachRequestButtonListeners() {
    console.log('🔗 Attaching request button listeners...');
    
    // Find all action buttons with data-action attribute
    const actionButtons = document.querySelectorAll('[data-action][data-request-id]');
    console.log('🔍 Found', actionButtons.length, 'action buttons');
    
    actionButtons.forEach((button, index) => {
        const action = button.dataset.action;
        const requestId = button.dataset.requestId;
        
        console.log(`🔗 Attaching listener ${index + 1}:`, {
            button: button,
            action: action,
            requestId: requestId
        });
        
        // Remove any existing listeners
        button.onclick = null;
        
        // Add new listener
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Button clicked:', action, requestId);
            window.handleFriendRequestAction(action, requestId);
        });
        
        // Also set onclick as backup
        button.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Button onclick:', action, requestId);
            window.handleFriendRequestAction(action, requestId);
        };
    });
    
    console.log('✅ Button listeners attached');
}

// Add to dashboard object if it exists
if (window.dashboard) {
    window.dashboard.attachRequestButtonListeners = attachRequestButtonListeners;
    console.log('✅ Added attachRequestButtonListeners to dashboard');
}

// Global function for easy access
window.attachRequestButtonListeners = attachRequestButtonListeners;

// Auto-attach listeners when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(attachRequestButtonListeners, 500);
    });
} else {
    setTimeout(attachRequestButtonListeners, 500);
}

// Attach listeners whenever new content is added
const observer = new MutationObserver(function(mutations) {
    let shouldAttach = false;
    
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.querySelector && node.querySelector('[data-action][data-request-id]')) {
                        shouldAttach = true;
                    }
                }
            });
        }
    });
    
    if (shouldAttach) {
        console.log('🔄 New request buttons detected, reattaching listeners...');
        setTimeout(attachRequestButtonListeners, 100);
    }
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('✅ Friend request button fix loaded');
