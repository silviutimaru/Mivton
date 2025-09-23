// Quick test in browser console
// Open your dashboard, press F12, and paste this:

console.log('🔍 Testing dashboard stats...');

fetch('/api/dashboard/stats', {
    method: 'GET',
    credentials: 'include'
})
.then(response => response.json())
.then(data => {
    console.log('📊 Dashboard stats response:', data);
    
    if (data.success && data.stats) {
        console.log('👥 Friends count:', data.stats.friends);
        console.log('📨 Requests count:', data.stats.requests);
        console.log('🔔 Notifications count:', data.stats.unread_notifications);
        
        // Force update the UI
        const friendsCountElement = document.getElementById('friendsCount');
        if (friendsCountElement) {
            friendsCountElement.textContent = data.stats.friends;
            console.log('✅ Manually updated friends count in UI');
        }
    } else {
        console.log('❌ Stats response format issue:', data);
    }
})
.catch(error => {
    console.error('❌ Error fetching stats:', error);
});
