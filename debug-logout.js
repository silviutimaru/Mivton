// Debug script to test logout functionality
console.log('🔍 Starting logout debug script...');

// Test the logout button existence and functionality
const testLogoutButton = () => {
    console.log('=== LOGOUT BUTTON DEBUG ===');
    
    const logoutBtn = document.getElementById('logoutBtn');
    console.log('1. Logout button element:', logoutBtn);
    
    if (logoutBtn) {
        console.log('2. Button innerHTML:', logoutBtn.innerHTML);
        console.log('3. Button disabled:', logoutBtn.disabled);
        console.log('4. Button onclick:', logoutBtn.onclick);
        console.log('5. Button event listeners:', getEventListeners ? getEventListeners(logoutBtn) : 'DevTools required to see listeners');
        
        // Test click manually
        console.log('6. Testing manual click...');
        logoutBtn.click();
        
    } else {
        console.error('❌ Logout button not found!');
        
        // Search for alternative logout buttons
        const allButtons = document.querySelectorAll('button');
        console.log('🔍 All buttons on page:', allButtons);
        
        const logoutButtons = Array.from(allButtons).filter(btn => 
            btn.textContent.toLowerCase().includes('logout') || 
            btn.innerHTML.toLowerCase().includes('logout')
        );
        console.log('🚪 Found logout-related buttons:', logoutButtons);
    }
};

// Test the API call directly
const testLogoutAPI = async () => {
    console.log('=== LOGOUT API DEBUG ===');
    
    try {
        console.log('1. Testing logout API call...');
        
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('2. Response status:', response.status);
        console.log('3. Response ok:', response.ok);
        
        const data = await response.json();
        console.log('4. Response data:', data);
        
        if (response.ok && data.success) {
            console.log('✅ Logout API works correctly');
        } else {
            console.error('❌ Logout API failed:', data);
        }
        
    } catch (error) {
        console.error('❌ Logout API error:', error);
    }
};

// Test dashboard instance
const testDashboardInstance = () => {
    console.log('=== DASHBOARD INSTANCE DEBUG ===');
    
    console.log('1. window.dashboard:', window.dashboard);
    console.log('2. window.dashboardInstance:', window.dashboardInstance);
    
    if (window.dashboard) {
        console.log('3. dashboard.handleLogout exists:', typeof window.dashboard.handleLogout);
        
        if (typeof window.dashboard.handleLogout === 'function') {
            console.log('4. Testing dashboard.handleLogout() directly...');
            window.dashboard.handleLogout();
        }
    } else {
        console.error('❌ Dashboard instance not found');
    }
};

// Test if there are any JavaScript errors
const testJSErrors = () => {
    console.log('=== JAVASCRIPT ERRORS DEBUG ===');
    
    // Override console.error to catch errors
    const originalError = console.error;
    const errors = [];
    
    console.error = function(...args) {
        errors.push(args);
        originalError.apply(console, args);
    };
    
    setTimeout(() => {
        console.log('Captured errors in last 2 seconds:', errors);
        console.error = originalError; // Restore original
    }, 2000);
};

// Run all tests
const runAllTests = () => {
    console.log('🚀 Running all logout debug tests...');
    
    testJSErrors();
    
    setTimeout(() => {
        testLogoutButton();
        testDashboardInstance();
        testLogoutAPI();
    }, 1000);
};

// Export for console testing
window.logoutDebug = {
    testLogoutButton,
    testLogoutAPI,
    testDashboardInstance,
    testJSErrors,
    runAllTests
};

console.log('✅ Logout debug script loaded. Use window.logoutDebug.runAllTests() to run tests.');
