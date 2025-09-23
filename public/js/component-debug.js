/**
 * 🚀 MIVTON - COMPONENT INITIALIZATION DEBUG
 * Comprehensive debugging and initialization system
 */

// Component loading status tracker
window.MivtonDebug = {
    componentsLoaded: {},
    loadingErrors: [],
    
    log: function(component, status, message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 🔧 ${component}: ${status} - ${message}`);
        
        this.componentsLoaded[component] = {
            status: status,
            message: message,
            timestamp: timestamp
        };
    },
    
    error: function(component, error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ❌ ${component}: ERROR - ${error.message}`);
        
        this.loadingErrors.push({
            component: component,
            error: error.message,
            stack: error.stack,
            timestamp: timestamp
        });
    },
    
    getStatus: function() {
        return {
            components: this.componentsLoaded,
            errors: this.loadingErrors,
            summary: {
                totalComponents: Object.keys(this.componentsLoaded).length,
                successfulComponents: Object.values(this.componentsLoaded).filter(c => c.status === 'SUCCESS').length,
                errorCount: this.loadingErrors.length
            }
        };
    }
};

// Initialize MivtonComponents namespace
window.MivtonComponents = window.MivtonComponents || {};

// Enhanced component registration
window.MivtonComponents.register = function(name, componentClass) {
    try {
        this[name] = componentClass;
        window.MivtonDebug.log('ComponentRegistry', 'SUCCESS', `${name} registered successfully`);
        
        // Trigger initialization event
        document.dispatchEvent(new CustomEvent(`mivton:component:${name}:registered`, {
            detail: { name, componentClass }
        }));
        
        return true;
    } catch (error) {
        window.MivtonDebug.error('ComponentRegistry', error);
        return false;
    }
};

// Component auto-initialization with retry logic
window.MivtonComponents.initializeAll = function() {
    try {
        window.MivtonDebug.log('AutoInit', 'START', 'Starting component initialization');
        
        // Initialize Friends Manager
        const friendsElements = document.querySelectorAll('[data-component="friends-manager"]');
        friendsElements.forEach(element => {
            if (!element.mivtonComponent && this.FriendsManager) {
                try {
                    element.mivtonComponent = new this.FriendsManager(element);
                    window.MivtonDebug.log('FriendsManager', 'SUCCESS', 'Initialized successfully');
                } catch (error) {
                    window.MivtonDebug.error('FriendsManager', error);
                }
            }
        });
        
        // Initialize Profile Modal
        const profileElements = document.querySelectorAll('[data-component="profile-modal"]');
        profileElements.forEach(element => {
            if (!element.mivtonComponent && this.ProfileModal) {
                try {
                    element.mivtonComponent = new this.ProfileModal(element);
                    window.MivtonDebug.log('ProfileModal', 'SUCCESS', 'Initialized successfully');
                } catch (error) {
                    window.MivtonDebug.error('ProfileModal', error);
                }
            }
        });
        
        window.MivtonDebug.log('AutoInit', 'COMPLETE', 'Component initialization complete');
        
    } catch (error) {
        window.MivtonDebug.error('AutoInit', error);
    }
};

// Retry failed initializations
window.MivtonComponents.retryInitialization = function() {
    const maxRetries = 3;
    let retryCount = 0;
    
    const retry = () => {
        retryCount++;
        window.MivtonDebug.log('RetryInit', 'ATTEMPT', `Retry attempt ${retryCount}/${maxRetries}`);
        
        this.initializeAll();
        
        const status = window.MivtonDebug.getStatus();
        if (status.errors.length > 0 && retryCount < maxRetries) {
            setTimeout(retry, 1000 * retryCount); // Exponential backoff
        } else {
            window.MivtonDebug.log('RetryInit', 'COMPLETE', `Finished after ${retryCount} attempts`);
        }
    };
    
    retry();
};

// Debug dashboard
window.MivtonComponents.showDebugInfo = function() {
    const status = window.MivtonDebug.getStatus();
    console.group('🔧 Mivton Components Debug Info');
    console.log('📊 Summary:', status.summary);
    console.log('✅ Components:', status.components);
    console.log('❌ Errors:', status.errors);
    console.log('🌐 Window Components:', Object.keys(window.MivtonComponents));
    console.groupEnd();
    return status;
};

// Profile modal force initialization function
window.MivtonComponents.forceInitProfileModal = function() {
    try {
        window.MivtonDebug.log('ForceInit', 'START', 'Force initializing profile modal');
        
        let profileModal = document.getElementById('profileModal');
        
        if (!profileModal) {
            window.MivtonDebug.log('ForceInit', 'CREATE', 'Creating profile modal container');
            profileModal = document.createElement('div');
            profileModal.setAttribute('data-component', 'profile-modal');
            profileModal.id = 'profileModal';
            document.body.appendChild(profileModal);
        }
        
        if (!this.ProfileModal) {
            window.MivtonDebug.log('ForceInit', 'ERROR', 'ProfileModal class not available');
            return false;
        }
        
        if (!profileModal.mivtonComponent) {
            window.MivtonDebug.log('ForceInit', 'INIT', 'Initializing ProfileModal component');
            profileModal.mivtonComponent = new this.ProfileModal(profileModal);
        }
        
        window.MivtonDebug.log('ForceInit', 'SUCCESS', 'Profile modal force initialized');
        return profileModal.mivtonComponent;
        
    } catch (error) {
        window.MivtonDebug.error('ForceInit', error);
        return false;
    }
};

// Enhanced DOM ready handler
document.addEventListener('DOMContentLoaded', function() {
    window.MivtonDebug.log('DOM', 'READY', 'DOM content loaded');
    
    // Wait a bit for all scripts to load
    setTimeout(() => {
        window.MivtonComponents.initializeAll();
        
        // Show debug info in console
        setTimeout(() => {
            window.MivtonComponents.showDebugInfo();
        }, 1000);
        
    }, 500);
});

// Window load handler as fallback
window.addEventListener('load', function() {
    window.MivtonDebug.log('Window', 'LOADED', 'Window fully loaded');
    
    // Retry initialization if some components failed
    setTimeout(() => {
        const status = window.MivtonDebug.getStatus();
        if (status.errors.length > 0) {
            window.MivtonComponents.retryInitialization();
        }
    }, 1000);
});

// Expose debug functions globally for console access
window.showMivtonDebug = () => window.MivtonComponents.showDebugInfo();
window.initProfileModal = () => window.MivtonComponents.forceInitProfileModal();
window.retryMivtonInit = () => window.MivtonComponents.retryInitialization();

console.log('🚀 Mivton Component Debug System Loaded');
