// Force logout and redirect to login
console.log('🚪 FORCING LOGOUT TO REFRESH ADMIN SESSION');
console.log('==========================================');

fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
})
.then(response => response.json())
.then(data => {
    console.log('✅ Logout successful:', data);
    console.log('🔄 Redirecting to login page...');
    console.log('💡 After login, you should see admin features!');
    window.location.href = '/login.html';
})
.catch(error => {
    console.error('❌ Logout error:', error);
    console.log('🔄 Fallback: Direct redirect to login...');
    window.location.href = '/login.html';
});

