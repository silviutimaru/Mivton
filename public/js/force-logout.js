// Force update admin session - Run this in browser console
console.log('🔧 FORCING ADMIN SESSION UPDATE');
console.log('================================');

// Method 1: Force logout and redirect to login
console.log('🚪 Logging out to refresh session...');
fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
})
.then(response => response.json())
.then(data => {
    console.log('✅ Logout successful:', data);
    console.log('🔄 Redirecting to login page...');
    window.location.href = '/login.html';
})
.catch(error => {
    console.error('❌ Logout error:', error);
    // Fallback: direct redirect
    console.log('🔄 Fallback: Direct redirect to login...');
    window.location.href = '/login.html';
});

console.log('💡 After login, you should see admin features!');
