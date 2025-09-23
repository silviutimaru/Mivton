/**
 * Service Worker Cleanup Script
 * Run this in browser console to clear any service worker issues
 */

(async function clearServiceWorkers() {
    console.log('🧹 Clearing service workers...');
    
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            
            if (registrations.length === 0) {
                console.log('✅ No service workers found to clear');
                return;
            }
            
            console.log(`🔄 Found ${registrations.length} service worker(s) to unregister`);
            
            for (let registration of registrations) {
                await registration.unregister();
                console.log('✅ Service worker unregistered:', registration.scope);
            }
            
            console.log('🎉 All service workers cleared!');
            console.log('🔄 Please refresh the page to complete cleanup');
            
        } catch (error) {
            console.error('❌ Error clearing service workers:', error);
        }
    } else {
        console.log('ℹ️ Service workers not supported in this browser');
    }
})();

// Also clear caches
(async function clearCaches() {
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            if (cacheNames.length > 0) {
                console.log('🧹 Clearing caches...');
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ All caches cleared!');
            }
        } catch (error) {
            console.error('❌ Error clearing caches:', error);
        }
    }
})();

console.log('🎯 Service worker cleanup complete! Refresh the page to see the demo.');
