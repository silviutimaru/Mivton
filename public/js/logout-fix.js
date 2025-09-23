// Emergency logout fix - add this to any page to fix logout functionality
(function() {
    console.log('🔧 Loading emergency logout fix...');
    
    // Function to create a working logout handler
    const createLogoutHandler = () => {
        return async function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            console.log('🚪 Logout initiated...');
            
            try {
                // Show confirmation (optional)
                const confirmed = confirm('Are you sure you want to logout?');
                if (!confirmed) {
                    console.log('❌ Logout cancelled by user');
                    return;
                }
                
                console.log('📡 Making logout API call...');
                
                // Make logout API call
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('📡 Logout response status:', response.status);
                
                if (response.ok) {
                    console.log('✅ Logout successful, redirecting...');
                    window.location.href = '/';
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('❌ Logout failed:', errorData);
                    alert('Logout failed. Please refresh the page and try again.');
                }
                
            } catch (error) {
                console.error('❌ Logout error:', error);
                alert('Logout failed. Please refresh the page and try again.');
            }
        };
    };
    
    // Function to fix logout button
    const fixLogoutButton = () => {
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (!logoutBtn) {
            console.warn('⚠️ Logout button not found');
            return false;
        }
        
        console.log('🔧 Fixing logout button...');
        
        // Remove any existing event listeners by cloning the node
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        // Create the logout handler
        const logoutHandler = createLogoutHandler();
        
        // Add multiple ways to trigger logout (belt and suspenders approach)
        newLogoutBtn.addEventListener('click', logoutHandler);
        newLogoutBtn.onclick = logoutHandler;
        
        // Also add to any other logout buttons that might exist
        const allLogoutButtons = document.querySelectorAll('button, a, .logout-btn, .logout, [onclick*="logout"], [onclick*="Logout"]');
        allLogoutButtons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes('logout') || 
                btn.innerHTML.toLowerCase().includes('logout') ||
                btn.className.includes('logout')) {
                
                console.log('🔧 Adding logout handler to button:', btn);
                btn.addEventListener('click', logoutHandler);
                btn.onclick = logoutHandler;
            }
        });
        
        console.log('✅ Logout button fixed!');
        return true;
    };
    
    // Try to fix immediately
    let fixed = false;
    
    // Try multiple times with delays to handle different loading states
    const attemptFix = () => {
        if (!fixed) {
            fixed = fixLogoutButton();
        }
    };
    
    // Try immediately
    attemptFix();
    
    // Try after DOM content loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attemptFix);
    }
    
    // Try after full page load
    if (document.readyState !== 'complete') {
        window.addEventListener('load', attemptFix);
    }
    
    // Try with delays
    setTimeout(attemptFix, 100);
    setTimeout(attemptFix, 500);
    setTimeout(attemptFix, 1000);
    
    // Expose globally for testing
    window.emergencyLogout = createLogoutHandler();
    window.fixLogoutButton = fixLogoutButton;
    
    console.log('✅ Emergency logout fix loaded');
    console.log('💡 If logout still doesn\'t work, try: window.emergencyLogout()');
    
})();
