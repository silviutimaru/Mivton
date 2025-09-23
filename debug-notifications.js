/**
 * Notification System Bug Fix - Test Script
 * This script will help diagnose and fix the notification badge issue
 */

console.log('🔧 NOTIFICATION SYSTEM DEBUG SCRIPT');
console.log('====================================');

// Test function to debug notification system
async function debugNotificationSystem() {
    console.log('📋 Testing notification system...');
    
    try {
        // Test 1: Check Phase 3.2 API unread count
        console.log('\n1. Testing Phase 3.2 unread count API...');
        const unreadResponse = await fetch('/api/notifications/unread/count', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (unreadResponse.ok) {
            const unreadData = await unreadResponse.json();
            console.log('✅ Phase 3.2 unread count:', unreadData);
        } else {
            console.error('❌ Phase 3.2 unread count failed:', unreadResponse.status);
        }
        
        // Test 2: Check Phase 3.1 API unread count (fallback)
        console.log('\n2. Testing Phase 3.1 unread count API...');
        const legacyResponse = await fetch('/api/social-notifications/unread-count', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (legacyResponse.ok) {
            const legacyData = await legacyResponse.json();
            console.log('✅ Phase 3.1 unread count:', legacyData);
        } else {
            console.error('❌ Phase 3.1 unread count failed:', legacyResponse.status);
        }
        
        // Test 3: Load actual notifications
        console.log('\n3. Testing notification loading...');
        const notificationsResponse = await fetch('/api/notifications?limit=10', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (notificationsResponse.ok) {
            const notificationsData = await notificationsResponse.json();
            console.log('✅ Notifications loaded:', notificationsData);
            
            if (notificationsData.notifications) {
                console.log(`📄 Found ${notificationsData.notifications.length} notifications`);
                notificationsData.notifications.forEach((notif, index) => {
                    console.log(`  ${index + 1}. ID: ${notif.id}, Read: ${notif.is_read}, Type: ${notif.type}, Message: ${notif.message}`);
                });
            }
        } else {
            console.error('❌ Notifications loading failed:', notificationsResponse.status);
        }
        
        // Test 4: Try marking all as read
        console.log('\n4. Testing mark all as read...');
        const markReadResponse = await fetch('/api/notifications/read-all', {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (markReadResponse.ok) {
            const markReadData = await markReadResponse.json();
            console.log('✅ Mark all read result:', markReadData);
        } else {
            console.error('❌ Mark all read failed:', markReadResponse.status);
        }
        
        // Test 5: Check unread count after marking as read
        console.log('\n5. Testing unread count after marking as read...');
        const finalUnreadResponse = await fetch('/api/notifications/unread/count', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (finalUnreadResponse.ok) {
            const finalUnreadData = await finalUnreadResponse.json();
            console.log('✅ Final unread count:', finalUnreadData);
            
            if (finalUnreadData.counts.total_unread > 0) {
                console.warn('⚠️ ISSUE: Notifications still showing as unread after marking all as read!');
                console.warn('   This indicates the database is not being updated properly.');
            } else {
                console.log('✅ SUCCESS: All notifications properly marked as read!');
            }
        } else {
            console.error('❌ Final unread count check failed:', finalUnreadResponse.status);
        }
        
    } catch (error) {
        console.error('❌ Debug script error:', error);
    }
    
    console.log('\n====================================');
    console.log('🔧 Debug script completed');
}

// Check if we're in the dashboard context
if (typeof window !== 'undefined' && window.dashboard) {
    // Add debug function to dashboard
    window.dashboard.debugNotifications = debugNotificationSystem;
    console.log('✅ Debug function added to dashboard. Call: dashboard.debugNotifications()');
} else {
    // Run immediately if not in dashboard context
    console.log('🚀 Running debug script immediately...');
    debugNotificationSystem();
}
