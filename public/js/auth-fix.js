/**
 * 🔧 AUTHENTICATION FIX FOR MIVTON DASHBOARD
 * This fixes authentication-related errors and properly handles 401 responses
 */

console.log('🔧 Loading authentication fix...');

// Enhanced authentication utilities
window.MivtonAuth = {
    // Check if user is authenticated
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include'
            });
            
            console.log('🔍 Auth check response:', response.status);
            
            if (response.status === 401) {
                console.log('❌ User not authenticated - redirecting to login');
                this.redirectToLogin();
                return false;
            }
            
            if (!response.ok) {
                console.warn('⚠️ Auth check failed:', response.status);
                return false;
            }
            
            const data = await response.json();
            console.log('✅ User authenticated:', data.user?.username);
            return data;
            
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    },
    
    // Redirect to login page
    redirectToLogin() {
        console.log('🔄 Redirecting to login...');
        
        // Add a small delay to prevent redirect loops
        setTimeout(() => {
            const currentPath = window.location.pathname;
            
            // Don't redirect if already on login page
            if (currentPath.includes('login')) {
                console.log('Already on login page');
                return;
            }
            
            // Redirect to login
            window.location.href = '/login.html';
        }, 500);
    },
    
    // Handle authentication errors
    handleAuthError(error, context = '') {
        console.error(`❌ Auth error ${context}:`, error);
        
        if (error.message && error.message.includes('401')) {
            this.redirectToLogin();
            return;
        }
        
        // Show user-friendly error
        if (window.toast) {
            window.toast.error('Authentication error. Please try logging in again.');
        }
    },
    
    // Enhanced fetch with auth handling
    async authenticatedFetch(url, options = {}) {
        try {
            // Ensure credentials are included
            const fetchOptions = {
                ...options,
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };
            
            console.log(`🌐 Making authenticated request to: ${url}`);
            
            const response = await fetch(url, fetchOptions);
            
            // Handle 401 responses
            if (response.status === 401) {
                console.log('❌ 401 Unauthorized - redirecting to login');
                this.redirectToLogin();
                throw new Error('Authentication required');
            }
            
            console.log(`📡 Response from ${url}:`, response.status, response.statusText);
            
            return response;
            
        } catch (error) {
            console.error(`❌ Fetch error for ${url}:`, error);
            throw error;
        }
    }
};

// Apply authentication fix to dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Applying authentication fix...');
    
    // Check authentication status on page load
    setTimeout(async () => {
        try {
            const authResult = await window.MivtonAuth.checkAuth();
            
            if (!authResult) {
                console.log('⚠️ Authentication check failed');
                return;
            }
            
            console.log('✅ Authentication verified');
            
            // Store user data globally for debugging
            window.currentUser = authResult.user || authResult;
            
        } catch (error) {
            console.error('❌ Auth check failed:', error);
            window.MivtonAuth.handleAuthError(error, 'on page load');
        }
    }, 100);
});

// Replace the default fetch for friend requests
if (window.dashboard) {
    console.log('🔧 Patching dashboard authentication...');
    
    const originalLoadFriendRequests = window.dashboard.loadFriendRequests;
    if (originalLoadFriendRequests) {
        window.dashboard.loadFriendRequests = async function() {
            try {
                console.log('📨 Loading friend requests with auth fix...');
                
                // Use authenticated fetch
                const response = await window.MivtonAuth.authenticatedFetch('/api/friend-requests/received');
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Friend requests loaded:', data);
                    this.displayReceivedRequests(data.requests || []);
                } else {
                    throw new Error(`API Error: ${response.status}`);
                }
                
            } catch (error) {
                console.error('❌ Error loading friend requests:', error);
                window.MivtonAuth.handleAuthError(error, 'loading friend requests');
            }
        };
    }
}

// Enhanced error handling for API calls
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Check if it's an auth-related error
    if (event.reason && (
        event.reason.message?.includes('401') ||
        event.reason.message?.includes('Authentication') ||
        event.reason.message?.includes('Unauthorized')
    )) {
        console.log('🔄 Handling authentication error from unhandled rejection');
        window.MivtonAuth.handleAuthError(event.reason, 'unhandled rejection');
        event.preventDefault(); // Prevent console spam
    }
});

console.log('✅ Authentication fix loaded successfully');
