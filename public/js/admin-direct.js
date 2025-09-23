/**
 * 🚀 DIRECT ADMIN DASHBOARD FUNCTIONALITY
 * Simple, direct admin dashboard that works immediately
 */

// Admin tab switching function
function showAdminTab(tabName) {
    console.log(`👑 Switching to admin tab: ${tabName}`);
    
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.admin-tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(`admin-${tabName}`);
    if (selectedContent) {
        selectedContent.classList.add('active');
        console.log(`✅ Admin tab ${tabName} activated`);
    }
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

// Initialize admin dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Direct Admin Dashboard...');
    
    // Set up admin tab click handlers
    const adminTabs = document.querySelectorAll('.admin-tab');
    adminTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showAdminTab(tabName);
        });
    });
    
    console.log('✅ Admin dashboard functionality initialized');
});

// Make functions globally available
window.showAdminTab = showAdminTab;
