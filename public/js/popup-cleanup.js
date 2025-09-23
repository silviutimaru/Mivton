/**
 * 🔧 IMMEDIATE POPUP CLEANUP SCRIPT
 * Run this in your browser console on the dashboard page to remove all friend popups
 */

(function() {
    console.log('🧹 Starting immediate popup cleanup...');
    
    // Function to remove all friend-related popup notifications
    function cleanupAllFriendPopups() {
        const selectors = [
            // Generic popup selectors
            '.popup-notification',
            '.friend-notification', 
            '.friend-online-popup',
            '.notification-popup',
            '.toast',
            '.friend-status-notification',
            '.notification-toast',
            '.popup-toast',
            
            // ID-based selectors
            '[id*="friend-online"]',
            '[id*="notification"]',
            '[id*="popup"]',
            '[id*="toast"]',
            
            // Class-based selectors
            '[class*="friend-popup"]',
            '[class*="popup"]',
            '[class*="notification"]',
            '[class*="toast"]',
            
            // Content-based selectors (look for text)
            '[class*="online"]',
            '[class*="offline"]'
        ];
        
        let removedCount = 0;
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                const text = el.textContent.toLowerCase();
                const hasOnlineText = text.includes('online') || text.includes('offline');
                const hasFriendText = text.includes('friend') || text.includes('irinel') || text.includes('silviu');
                const isPopupLike = el.style.position === 'fixed' || el.style.position === 'absolute';
                const hasPopupClass = el.className.toLowerCase().includes('popup') || 
                                    el.className.toLowerCase().includes('notification') ||
                                    el.className.toLowerCase().includes('toast');
                
                // Remove if it looks like a friend notification popup
                if ((hasOnlineText || hasFriendText || isPopupLike || hasPopupClass) && 
                    el.style.display !== 'none') {
                    
                    console.log(`🗑️ Removing popup: ${selector} - "${text.substring(0, 50)}..."`);
                    el.remove();
                    removedCount++;
                }
            });
        });
        
        // Also try to find elements by their text content directly
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const text = el.textContent;
            if (text && (
                text.includes('Silviu Irinel Timaru is now online') ||
                text.includes('Friend Online') ||
                text.includes('is now online') ||
                text.includes('is now offline')
            )) {
                // Check if this looks like a popup (positioned element)
                const style = window.getComputedStyle(el);
                if (style.position === 'fixed' || 
                    style.position === 'absolute' || 
                    style.zIndex > 1000 ||
                    el.className.includes('popup') ||
                    el.className.includes('notification') ||
                    el.className.includes('toast')) {
                    
                    console.log(`🗑️ Removing by content: "${text.substring(0, 50)}..."`);
                    el.remove();
                    removedCount++;
                }
            }
        });
        
        return removedCount;
    }
    
    // Function to prevent new popups from appearing
    function preventNewPopups() {
        console.log('🚫 Setting up popup prevention...');
        
        // Override common popup methods
        const originalAlert = window.alert;
        const originalShow = Element.prototype.show;
        
        // Intercept any calls that might show friend notifications
        window.addEventListener('DOMNodeInserted', function(e) {
            const element = e.target;
            if (element.nodeType === 1) { // Element node
                const text = element.textContent;
                if (text && (
                    text.includes('is now online') ||
                    text.includes('Friend Online') ||
                    text.includes('Irinel')
                )) {
                    console.log('🚫 Preventing new popup:', text.substring(0, 50));
                    element.remove();
                }
            }
        });
        
        // Override socket event handlers if they exist
        if (window.socket) {
            const originalEmit = window.socket.emit;
            const originalOn = window.socket.on;
            
            window.socket.on = function(event, callback) {
                if (event.includes('friend') || event.includes('online')) {
                    console.log('🚫 Blocking friend-related socket event:', event);
                    return;
                }
                return originalOn.call(this, event, callback);
            };
        }
    }
    
    // Run cleanup immediately
    let totalRemoved = cleanupAllFriendPopups();
    console.log(`✅ Initial cleanup complete. Removed ${totalRemoved} popups.`);
    
    // Set up prevention
    preventNewPopups();
    
    // Continue cleaning every 2 seconds for 30 seconds
    let cleanupCount = 0;
    const cleanupInterval = setInterval(() => {
        const removed = cleanupAllFriendPopups();
        if (removed > 0) {
            totalRemoved += removed;
            console.log(`🧹 Cleanup round ${cleanupCount + 1}: Removed ${removed} more popups`);
        }
        
        cleanupCount++;
        if (cleanupCount >= 15) { // 30 seconds
            clearInterval(cleanupInterval);
            console.log(`✅ Popup cleanup completed! Total removed: ${totalRemoved}`);
        }
    }, 2000);
    
    // Also add CSS to hide any remaining popups
    const style = document.createElement('style');
    style.textContent = `
        /* Hide any remaining friend notification popups */
        .popup-notification,
        .friend-notification,
        .friend-online-popup,
        .notification-popup,
        [class*="friend-popup"],
        [id*="friend-online"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
        }
        
        /* Hide popups containing specific text */
        *:contains("is now online"),
        *:contains("Friend Online"),
        *:contains("Silviu Irinel Timaru") {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Added CSS to prevent future popups');
    
    // Return cleanup stats
    return {
        removed: totalRemoved,
        message: 'Popup cleanup active! Check console for details.'
    };
})();