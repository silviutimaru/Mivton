#!/usr/bin/env node

/**
 * 🔍 ADMIN ACCESS AUDIT - PRODUCTION
 * Audits which users will see the Admin button by testing API endpoints
 */

const https = require('https');

async function auditAdminAccessProduction() {
    console.log('🔍 ADMIN ACCESS AUDIT - PRODUCTION');
    console.log('=================================');
    console.log('');
    
    const baseUrl = 'https://www.mivton.com';
    
    try {
        // Test admin API endpoints to see who has access
        console.log('🔍 TESTING ADMIN API ACCESS:');
        console.log('-----------------------------');
        console.log('');
        
        // Test admin stats endpoint (requires admin access)
        console.log('📊 Testing /api/admin/stats endpoint...');
        try {
            const statsResponse = await makeRequest(`${baseUrl}/api/admin/stats`);
            console.log(`   Status: ${statsResponse.statusCode}`);
            if (statsResponse.statusCode === 200) {
                console.log('   ✅ Admin stats accessible (user has admin access)');
                const statsData = JSON.parse(statsResponse.body);
                console.log(`   📊 Stats data: ${JSON.stringify(statsData, null, 2)}`);
            } else if (statsResponse.statusCode === 401) {
                console.log('   ❌ Unauthorized (not logged in)');
            } else if (statsResponse.statusCode === 403) {
                console.log('   ❌ Forbidden (not admin)');
            } else {
                console.log(`   ⚠️ Unexpected status: ${statsResponse.statusCode}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        console.log('');
        
        // Test admin users endpoint
        console.log('👥 Testing /api/admin/users endpoint...');
        try {
            const usersResponse = await makeRequest(`${baseUrl}/api/admin/users`);
            console.log(`   Status: ${usersResponse.statusCode}`);
            if (usersResponse.statusCode === 200) {
                console.log('   ✅ Admin users accessible (user has admin access)');
                const usersData = JSON.parse(usersResponse.body);
                console.log(`   👥 Users data: ${JSON.stringify(usersData, null, 2)}`);
            } else if (usersResponse.statusCode === 401) {
                console.log('   ❌ Unauthorized (not logged in)');
            } else if (usersResponse.statusCode === 403) {
                console.log('   ❌ Forbidden (not admin)');
            } else {
                console.log(`   ⚠️ Unexpected status: ${usersResponse.statusCode}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        console.log('');
        
        // Test admin health endpoint
        console.log('🏥 Testing /api/admin/health endpoint...');
        try {
            const healthResponse = await makeRequest(`${baseUrl}/api/admin/health`);
            console.log(`   Status: ${healthResponse.statusCode}`);
            if (healthResponse.statusCode === 200) {
                console.log('   ✅ Admin health accessible (user has admin access)');
                const healthData = JSON.parse(healthResponse.body);
                console.log(`   🏥 Health data: ${JSON.stringify(healthData, null, 2)}`);
            } else if (healthResponse.statusCode === 401) {
                console.log('   ❌ Unauthorized (not logged in)');
            } else if (healthResponse.statusCode === 403) {
                console.log('   ❌ Forbidden (not admin)');
            } else {
                console.log(`   ⚠️ Unexpected status: ${healthResponse.statusCode}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        console.log('');
        
        // Test regular auth endpoint to see current user
        console.log('👤 Testing /api/auth/me endpoint...');
        try {
            const authResponse = await makeRequest(`${baseUrl}/api/auth/me`);
            console.log(`   Status: ${authResponse.statusCode}`);
            if (authResponse.statusCode === 200) {
                console.log('   ✅ Auth endpoint accessible');
                const authData = JSON.parse(authResponse.body);
                console.log(`   👤 User data: ${JSON.stringify(authData, null, 2)}`);
                
                if (authData.user) {
                    console.log(`   📧 Email: ${authData.user.email}`);
                    console.log(`   👑 Admin Status: ${authData.user.is_admin}`);
                    console.log(`   🎯 Admin Level: ${authData.user.admin_level}`);
                }
            } else if (authResponse.statusCode === 401) {
                console.log('   ❌ Unauthorized (not logged in)');
            } else {
                console.log(`   ⚠️ Unexpected status: ${authResponse.statusCode}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        console.log('');
        
    } catch (error) {
        console.error('❌ Audit failed:', error.message);
    }
    
    console.log('📋 ADMIN ACCESS ANALYSIS:');
    console.log('=========================');
    console.log('');
    console.log('Based on the API tests above:');
    console.log('');
    console.log('🔍 FRONTEND ADMIN LOGIC ANALYSIS:');
    console.log('----------------------------------');
    console.log('');
    console.log('The Admin button visibility is controlled by:');
    console.log('');
    console.log('1. DATABASE CHECK (Primary):');
    console.log('   - JavaScript calls /api/auth/me');
    console.log('   - Checks user.is_admin === true');
    console.log('   - If true, shows Admin button');
    console.log('');
    console.log('2. HARDCODED CHECK (Fallback):');
    console.log('   - Special case for silviu@mivton.com');
    console.log('   - Forces admin mode even if database says false');
    console.log('   - Also checks if username contains "silviu"');
    console.log('   - Also checks if page contains "silviu@mivton.com" text');
    console.log('');
    console.log('3. HTML STRUCTURE:');
    console.log('   - Admin button is in dashboard.html with style="display: block;"');
    console.log('   - JavaScript can hide it with adminNavItem.style.display = "none"');
    console.log('');
    console.log('🎯 WHO WILL SEE THE ADMIN BUTTON:');
    console.log('=================================');
    console.log('');
    console.log('✅ Users who will see Admin button:');
    console.log('   1. Any user with is_admin = true in database');
    console.log('   2. silviu@mivton.com (hardcoded fallback)');
    console.log('   3. Any user with username containing "silviu"');
    console.log('');
    console.log('❌ Users who will NOT see Admin button:');
    console.log('   1. Regular users with is_admin = false');
    console.log('   2. Users not logged in');
    console.log('');
    console.log('🔒 SECURITY CONCERNS:');
    console.log('======================');
    console.log('');
    console.log('⚠️ The hardcoded admin checks are security risks:');
    console.log('   1. silviu@mivton.com hardcoded check');
    console.log('   2. Username "silviu" check');
    console.log('   3. Page text "silviu@mivton.com" check');
    console.log('');
    console.log('✅ RECOMMENDED SECURITY:');
    console.log('   1. Remove all hardcoded admin checks');
    console.log('   2. Only use database is_admin field');
    console.log('   3. Ensure silviu@mivton.com has is_admin = true in database');
    console.log('');
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
                'User-Agent': 'Admin-Access-Audit-Script/1.0',
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

// Run the audit
auditAdminAccessProduction().catch(console.error);
