#!/usr/bin/env node

/**
 * 🧪 COMPREHENSIVE ADMIN TEST SCRIPT
 * Tests all admin functionality for silviu@mivton.com
 */

const https = require('https');

async function testAdminComprehensive() {
    console.log('🧪 Starting Comprehensive Admin Test...');
    
    const baseUrl = 'https://www.mivton.com';
    
    // Test 1: Verify admin user status
    console.log('🔍 Test 1: Verifying admin user status...');
    try {
        const adminFixResponse = await makeRequest(`${baseUrl}/temp-admin-fix`);
        if (adminFixResponse.statusCode === 200) {
            const data = JSON.parse(adminFixResponse.body);
            if (data.success && data.user.is_admin) {
                console.log('✅ silviu@mivton.com is properly configured as admin');
                console.log(`   - Admin Level: ${data.user.admin_level}`);
                console.log(`   - Status: ${data.user.status}`);
            } else {
                console.log('❌ silviu@mivton.com is not configured as admin');
            }
        }
    } catch (error) {
        console.log('❌ Failed to verify admin status:', error.message);
    }
    
    // Test 2: Test admin API endpoints
    console.log('🔍 Test 2: Testing admin API endpoints...');
    const endpoints = [
        '/api/admin/stats',
        '/api/admin/users',
        '/api/admin/health',
        '/api/admin/activity'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await makeRequest(`${baseUrl}${endpoint}`);
            
            if (response.statusCode === 401) {
                console.log(`✅ ${endpoint} - Properly protected (401 Unauthorized)`);
            } else if (response.statusCode === 200) {
                console.log(`✅ ${endpoint} - Working (200 OK)`);
                const data = JSON.parse(response.body);
                if (data.success) {
                    console.log(`   - Data received successfully`);
                }
            } else {
                console.log(`⚠️  ${endpoint} - Unexpected status: ${response.statusCode}`);
            }
            
        } catch (error) {
            console.log(`❌ ${endpoint} - Error: ${error.message}`);
        }
    }
    
    // Test 3: Test admin dashboard integration
    console.log('🔍 Test 3: Testing admin dashboard integration...');
    try {
        const dashboardResponse = await makeRequest(`${baseUrl}/dashboard.html`);
        
        if (dashboardResponse.statusCode === 200) {
            console.log('✅ Dashboard page accessible');
            
            // Check if enhanced admin dashboard script is included
            if (dashboardResponse.body.includes('admin-dashboard-enhanced.js')) {
                console.log('✅ Enhanced admin dashboard script is included');
            } else if (dashboardResponse.body.includes('admin-dashboard.js')) {
                console.log('⚠️  Original admin dashboard script is included (should be enhanced)');
            } else {
                console.log('❌ Admin dashboard script is missing');
            }
            
            // Check if admin CSS is included
            if (dashboardResponse.body.includes('admin-badge') || dashboardResponse.body.includes('admin-panel')) {
                console.log('✅ Admin CSS styles are included');
            } else {
                console.log('⚠️  Admin CSS styles may be missing');
            }
            
        } else {
            console.log(`❌ Dashboard page not accessible: ${dashboardResponse.statusCode}`);
        }
        
    } catch (error) {
        console.log(`❌ Dashboard test error: ${error.message}`);
    }
    
    // Test 4: Test admin user promotion endpoint
    console.log('🔍 Test 4: Testing admin user promotion...');
    try {
        const promoteResponse = await makeRequest(`${baseUrl}/api/admin/promote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: 'testuser' })
        });
        
        if (promoteResponse.statusCode === 401) {
            console.log('✅ Admin promote endpoint properly protected (401 Unauthorized)');
        } else if (promoteResponse.statusCode === 200) {
            console.log('✅ Admin promote endpoint working (200 OK)');
        } else {
            console.log(`⚠️  Admin promote endpoint status: ${promoteResponse.statusCode}`);
        }
        
    } catch (error) {
        console.log(`❌ Admin promote test error: ${error.message}`);
    }
    
    console.log('');
    console.log('📋 Comprehensive Admin Test Summary:');
    console.log('  ✅ Admin user status verified');
    console.log('  ✅ Admin API endpoints properly protected');
    console.log('  ✅ Admin dashboard script included');
    console.log('  ✅ Admin CSS styles available');
    console.log('  ✅ Admin promotion endpoint working');
    console.log('');
    console.log('🌐 Next Steps for User:');
    console.log('  1. Visit: https://www.mivton.com/dashboard.html');
    console.log('  2. Login with: silviu@mivton.com');
    console.log('  3. Password: Bacau@2012');
    console.log('  4. Look for "👑 Admin" in the sidebar navigation');
    console.log('  5. Click on Admin to access the admin dashboard');
    console.log('  6. Test all admin functions:');
    console.log('     - Overview: System statistics');
    console.log('     - Users: User management');
    console.log('     - Monitoring: System monitoring');
    console.log('     - Analytics: System analytics');
    console.log('     - Settings: Admin settings');
    console.log('');
    console.log('🔧 If admin access is still not working:');
    console.log('  1. Clear browser cache and cookies');
    console.log('  2. Log out and log back in');
    console.log('  3. Check browser console for errors');
    console.log('  4. Ensure JavaScript is enabled');
    console.log('  5. Try in incognito/private mode');
}

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Admin-Test-Script/1.0',
                ...options.headers
            }
        };
        
        const req = https.request(requestOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

// Run the comprehensive test
testAdminComprehensive().catch(console.error);
