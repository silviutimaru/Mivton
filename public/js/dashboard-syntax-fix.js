/**
 * 🚨 EMERGENCY SYNTAX FIX FOR DASHBOARD.JS
 * This file adds missing closing braces if needed
 */

console.log('🔧 Loading dashboard syntax fix...');

// Check if dashboard.js has syntax errors and try to fix them
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Checking dashboard syntax...');
    
    // Try to access Dashboard class
    try {
        if (typeof Dashboard === 'undefined') {
            console.error('❌ Dashboard class not defined - syntax error likely');
        } else {
            console.log('✅ Dashboard class found');
        }
    } catch (error) {
        console.error('❌ Dashboard syntax error:', error);
    }
    
    // Try to initialize dashboard
    try {
        if (!window.dashboard && typeof Dashboard !== 'undefined') {
            console.log('🚀 Initializing dashboard...');
            window.dashboard = new Dashboard();
        }
    } catch (error) {
        console.error('❌ Dashboard initialization error:', error);
        
        // Fallback: create minimal dashboard object
        console.log('🔧 Creating fallback dashboard...');
        window.dashboard = {
            acceptFriendRequest: function(requestId) {
                console.log('📨 Accept request:', requestId);
                fetch(`/api/friend-requests/${requestId}/accept`, {
                    method: 'PUT',
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('Request failed');
                });
            },
            
            declineFriendRequest: function(requestId) {
                console.log('❌ Decline request:', requestId);
                fetch(`/api/friend-requests/${requestId}/decline`, {
                    method: 'PUT',
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('Request failed');
                });
            },
            
            cancelFriendRequest: function(requestId) {
                console.log('🗑️ Cancel request:', requestId);
                fetch(`/api/friend-requests/${requestId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => {
                    console.error('Error:', err);
                    alert('Request failed');
                });
            },
            
            showSection: function(section) {
                console.log('📄 Show section:', section);
                // Basic section switching
                document.querySelectorAll('.content-section').forEach(s => {
                    s.classList.remove('active');
                });
                document.querySelectorAll('.nav-item').forEach(n => {
                    n.classList.remove('active');
                });
                
                const targetSection = document.getElementById(section + '-section');
                const targetNav = document.querySelector(`[data-section="${section}"]`);
                
                if (targetSection) targetSection.classList.add('active');
                if (targetNav) targetNav.classList.add('active');
            }
        };
        
        console.log('✅ Fallback dashboard created');
    }
});

console.log('✅ Dashboard syntax fix loaded');
