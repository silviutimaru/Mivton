/**
 * 🧪 ENHANCED PRESENCE CONTROL TEST
 * Quick test to verify all components are working
 */

console.log('🧪 Testing Enhanced Presence Control Components...');

// Test 1: Check if files exist
const requiredFiles = [
    '/js/enhanced-presence-control.js',
    '/css/enhanced-presence.css',
    '/demo-enhanced-presence.html'
];

console.log('📂 Checking required files...');
requiredFiles.forEach(file => {
    fetch(file, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                console.log(`✅ ${file} - Found`);
            } else {
                console.log(`❌ ${file} - Not found (${response.status})`);
            }
        })
        .catch(error => {
            console.log(`❌ ${file} - Error: ${error.message}`);
        });
});

// Test 2: Check API endpoints
const apiEndpoints = [
    '/api/presence/advanced/status',
    '/api/presence/advanced/options'
];

console.log('🔌 Checking API endpoints...');
apiEndpoints.forEach(endpoint => {
    fetch(endpoint, { 
        method: 'GET',
        credentials: 'include'
    })
        .then(response => {
            if (response.status === 401) {
                console.log(`✅ ${endpoint} - Available (auth required)`);
            } else if (response.ok) {
                console.log(`✅ ${endpoint} - Available`);
            } else {
                console.log(`⚠️ ${endpoint} - Status: ${response.status}`);
            }
        })
        .catch(error => {
            console.log(`❌ ${endpoint} - Error: ${error.message}`);
        });
});

// Test 3: Check if component can initialize
try {
    if (typeof MivtonEnhancedPresenceControl !== 'undefined') {
        console.log('✅ MivtonEnhancedPresenceControl class available');
    } else {
        console.log('⚠️ MivtonEnhancedPresenceControl class not loaded yet');
        console.log('   This is normal if the script hasn\'t loaded');
    }
} catch (error) {
    console.log('❌ Error checking component class:', error.message);
}

console.log('');
console.log('🎯 Test Summary:');
console.log('   • Files should all show as "Found"');
console.log('   • API endpoints should show as "Available" or "Available (auth required)"');
console.log('   • Component class will be available after script loads');
console.log('');
console.log('🚀 To deploy: run "./deploy.sh" or "railway up"');
console.log('🌐 Demo will be at: https://mivton.com/demo-presence');
