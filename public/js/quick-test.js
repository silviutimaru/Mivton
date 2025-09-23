// Quick Test Script - Run this in browser console
console.log('🧪 TESTING ADMIN & CONTRAST FIXES');
console.log('==================================');

// Test 1: Check admin status
fetch('/api/auth/me', { credentials: 'include' })
.then(response => response.json())
.then(data => {
    console.log('👤 User data:', data.user);
    if (data.user.is_admin) {
        console.log('✅ ADMIN STATUS: CONFIRMED');
        console.log('👑 Admin Level:', data.user.admin_level);
    } else {
        console.log('❌ ADMIN STATUS: NOT ADMIN');
    }
})
.catch(error => console.error('❌ Error:', error));

// Test 2: Check CSS changes
setTimeout(() => {
    const testDiv = document.createElement('div');
    testDiv.className = 'stat-value';
    testDiv.textContent = 'TEST';
    testDiv.style.position = 'absolute';
    testDiv.style.left = '-9999px';
    document.body.appendChild(testDiv);
    
    const style = window.getComputedStyle(testDiv);
    console.log('🎨 CSS Test - stat-value color:', style.color);
    console.log('🎨 CSS Test - font-weight:', style.fontWeight);
    
    document.body.removeChild(testDiv);
}, 1000);

console.log('🔍 Tests running... Check results above.');
