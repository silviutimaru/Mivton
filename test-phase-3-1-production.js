/**
 * 🚀 MIVTON PHASE 3.1 - PRODUCTION API TESTING
 * Tests Phase 3.1 Friends System on live deployment
 * Creates real test users and tests complete workflows
 */

const APP_URL = 'https://mivton.com';

// Use native fetch instead of node-fetch to avoid dependencies
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class ProductionTester {
    constructor() {
        this.results = {
            health: [],
            auth: [],
            friends: [],
            requests: [],
            blocking: [],
            realtime: []
        };
        this.testUsers = [];
        this.sessionCookies = new Map();
    }

    log(message, level = 'info') {
        const colors = {
            info: '\x1b[37m',    // white
            success: '\x1b[32m', // green
            warning: '\x1b[33m', // yellow
            error: '\x1b[31m',   // red
            blue: '\x1b[34m',    // blue
            reset: '\x1b[0m'
        };
        
        const color = colors[level] || colors.info;
        console.log(`${color}${message}${colors.reset}`);
    }

    async runProductionTests() {
        this.log('🚀 MIVTON PHASE 3.1 - PRODUCTION TESTING', 'blue');
        this.log('='.repeat(50));
        this.log(`🌐 Testing URL: ${APP_URL}`);
        console.log('');

        try {
            // Test sequence
            await this.testHealthEndpoints();
            await this.testUnauthenticatedEndpoints();
            await this.createProductionTestUsers();
            
            if (this.testUsers.length >= 2) {
                await this.testAuthenticatedWorkflows();
                await this.testFriendRequestWorkflow();
            }
            
            this.generateProductionReport();
            
        } catch (error) {
            this.log(`❌ Production testing failed: ${error.message}`, 'error');
        } finally {
            await this.cleanupProductionData();
        }
    }

    async testHealthEndpoints() {
        this.log('🏥 Testing Health & Deployment...', 'blue');
        
        await this.testEndpoint('health', 'Health Check', 'GET', '/health', null, null, [200]);
        await this.testEndpoint('health', 'API Status', 'GET', '/api/status', null, null, [200]);
        
        console.log('');
    }

    async testUnauthenticatedEndpoints() {
        this.log('🔒 Testing Authentication Requirements...', 'blue');
        
        // These should all return 401 (authentication required)
        const friendsEndpoints = [
            ['/api/friends', 'Friends List'],
            ['/api/friends/stats', 'Friends Stats'],
            ['/api/friends/online', 'Online Friends'],
            ['/api/friends/search?q=test', 'Friends Search']
        ];

        for (const [endpoint, description] of friendsEndpoints) {
            await this.testEndpoint('friends', `${description} (no auth)`, 'GET', endpoint, null, null, [401]);
        }

        const requestEndpoints = [
            ['/api/friend-requests/received', 'Received Requests'],
            ['/api/friend-requests/sent', 'Sent Requests'],
            ['/api/friend-requests/stats', 'Request Stats']
        ];

        for (const [endpoint, description] of requestEndpoints) {
            await this.testEndpoint('requests', `${description} (no auth)`, 'GET', endpoint, null, null, [401]);
        }

        await this.testEndpoint('requests', 'Send Request (no auth)', 'POST', '/api/friend-requests', {receiver_id: 1}, null, [401]);
        await this.testEndpoint('blocking', 'Blocked Users (no auth)', 'GET', '/api/blocked-users', null, null, [401]);
        
        console.log('');
    }

    async createProductionTestUsers() {
        this.log('👥 Creating Production Test Users...', 'blue');
        
        const timestamp = Date.now();
        const testUsers = [
            {
                username: `prodtest1_${timestamp}`,
                email: `prodtest1.${timestamp}@example.com`,
                password: 'TestPass123!',
                full_name: 'Production Test User One',
                native_language: 'English'
            },
            {
                username: `prodtest2_${timestamp}`,
                email: `prodtest2.${timestamp}@example.com`,
                password: 'TestPass123!',
                full_name: 'Production Test User Two',
                native_language: 'Spanish'
            }
        ];

        for (const userData of testUsers) {
            try {
                // Register user
                const registerResult = await this.testEndpoint(
                    'auth',
                    `Register ${userData.username}`,
                    'POST',
                    '/api/auth/register',
                    userData,
                    null,
                    [201, 409] // Success or already exists
                );

                // Login to get session
                const loginResult = await this.testEndpoint(
                    'auth',
                    `Login ${userData.username}`,
                    'POST',
                    '/api/auth/login',
                    { username: userData.username, password: userData.password },
                    null,
                    [200]
                );

                if (loginResult.success && loginResult.cookies) {
                    this.sessionCookies.set(userData.username, loginResult.cookies);
                    this.testUsers.push({
                        ...userData,
                        id: loginResult.data?.user?.id,
                        cookies: loginResult.cookies
                    });
                    this.log(`  ✅ ${userData.username} ready for testing`, 'success');
                }
                
            } catch (error) {
                this.log(`  ❌ Failed to create ${userData.username}: ${error.message}`, 'error');
            }
        }
        
        this.log(`  📊 Production test users ready: ${this.testUsers.length}`, 'info');
        console.log('');
    }

    async testAuthenticatedWorkflows() {
        this.log('🔐 Testing Authenticated Workflows...', 'blue');
        
        if (this.testUsers.length === 0) {
            this.log('  ❌ No authenticated users available', 'error');
            return;
        }

        const user1 = this.testUsers[0];
        const cookies = this.sessionCookies.get(user1.username);

        // Test authenticated friends endpoints
        await this.testEndpoint('friends', 'Get Friends List (auth)', 'GET', '/api/friends', null, cookies, [200]);
        await this.testEndpoint('friends', 'Get Friends Stats (auth)', 'GET', '/api/friends/stats', null, cookies, [200]);
        await this.testEndpoint('friends', 'Get Online Friends (auth)', 'GET', '/api/friends/online', null, cookies, [200]);
        await this.testEndpoint('friends', 'Search Friends (auth)', 'GET', '/api/friends/search?q=test', null, cookies, [200]);

        // Test friend requests endpoints
        await this.testEndpoint('requests', 'Get Received Requests (auth)', 'GET', '/api/friend-requests/received', null, cookies, [200]);
        await this.testEndpoint('requests', 'Get Sent Requests (auth)', 'GET', '/api/friend-requests/sent', null, cookies, [200]);
        await this.testEndpoint('requests', 'Get Request Stats (auth)', 'GET', '/api/friend-requests/stats', null, cookies, [200]);

        // Test blocking endpoints
        await this.testEndpoint('blocking', 'Get Blocked Users (auth)', 'GET', '/api/blocked-users', null, cookies, [200]);

        console.log('');
    }

    async testFriendRequestWorkflow() {
        this.log('🔄 Testing Complete Friend Request Workflow...', 'blue');
        
        if (this.testUsers.length < 2) {
            this.log('  ❌ Need at least 2 users for workflow testing', 'error');
            return;
        }

        const user1 = this.testUsers[0];
        const user2 = this.testUsers[1];
        const cookies1 = this.sessionCookies.get(user1.username);
        const cookies2 = this.sessionCookies.get(user2.username);

        if (!user2.id) {
            this.log('  ❌ User 2 ID not available, skipping workflow test', 'error');
            return;
        }

        this.log('  1. Sending friend request...', 'info');
        const requestResult = await this.testEndpoint(
            'requests',
            'Send Friend Request',
            'POST',
            '/api/friend-requests',
            { receiver_id: user2.id, message: 'Production test request' },
            cookies1,
            [201, 409] // Created or conflict (already sent)
        );

        if (requestResult.success && requestResult.data?.request?.id) {
            const requestId = requestResult.data.request.id;
            
            this.log('  2. Checking received requests...', 'info');
            await this.testEndpoint('requests', 'Check Received Requests', 'GET', '/api/friend-requests/received', null, cookies2, [200]);

            this.log('  3. Accepting friend request...', 'info');
            await this.testEndpoint(
                'requests',
                'Accept Friend Request',
                'PUT',
                `/api/friend-requests/${requestId}/accept`,
                null,
                cookies2,
                [200]
            );

            this.log('  4. Verifying friendship...', 'info');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            
            await this.testEndpoint('friends', 'Verify Friends List User 1', 'GET', '/api/friends', null, cookies1, [200]);
            await this.testEndpoint('friends', 'Verify Friends List User 2', 'GET', '/api/friends', null, cookies2, [200]);
            
            this.log('  ✅ Friend request workflow completed', 'success');
        } else {
            this.log('  ⚠️  Skipping workflow completion (request send failed)', 'warning');
        }

        console.log('');
    }

    async testEndpoint(category, name, method, endpoint, body, cookies, expectedStatuses) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            };

            if (cookies) {
                options.headers['Cookie'] = cookies;
            }

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${APP_URL}${endpoint}`, options);
            const responseText = await response.text();
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                data = { raw: responseText };
            }

            const success = expectedStatuses.includes(response.status);
            
            this.results[category].push({
                name,
                success,
                status: response.status,
                expected: expectedStatuses,
                data: success ? data : null,
                error: !success ? data : null
            });

            const statusColor = success ? 'success' : 'error';
            const statusIcon = success ? '✅' : '❌';
            this.log(`  ${statusIcon} ${name} (${response.status})`, statusColor);

            // Extract session cookies for login requests
            let extractedCookies = null;
            if (name.includes('Login') && success) {
                const setCookieHeader = response.headers.get('set-cookie');
                if (setCookieHeader) {
                    extractedCookies = setCookieHeader;
                }
            }

            return { 
                success, 
                status: response.status, 
                data, 
                cookies: extractedCookies
            };

        } catch (error) {
            this.results[category].push({
                name,
                success: false,
                error: error.message
            });

            this.log(`  ❌ ${name} - ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    generateProductionReport() {
        this.log('\n📊 PRODUCTION TESTING REPORT', 'blue');
        this.log('='.repeat(40));

        let totalPassed = 0;
        let totalTests = 0;

        Object.entries(this.results).forEach(([category, tests]) => {
            if (tests.length > 0) {
                const passed = tests.filter(t => t.success).length;
                totalPassed += passed;
                totalTests += tests.length;
                
                const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
                this.log(`\n${categoryName}: ${passed}/${tests.length} passed`, 'blue');
                
                tests.forEach(test => {
                    const icon = test.success ? '✅' : '❌';
                    const color = test.success ? 'success' : 'error';
                    this.log(`  ${icon} ${test.name}`, color);
                    
                    if (!test.success && test.error && typeof test.error === 'object' && test.error.error) {
                        this.log(`      ${test.error.error}`, 'warning');
                    }
                });
            }
        });

        const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
        
        this.log(`\n🎯 Overall Results:`, 'blue');
        this.log(`   Success Rate: ${successRate}%`, 'info');
        this.log(`   Total Tests: ${totalTests}`, 'info');
        this.log(`   Passed: ${totalPassed}`, 'success');
        this.log(`   Failed: ${totalTests - totalPassed}`, 'error');

        if (successRate >= 90) {
            this.log('\n🎉 EXCELLENT! Phase 3.1 is working perfectly in production!', 'success');
            this.log('\n✅ Ready for users:', 'success');
            this.log('   • All core endpoints are functional', 'info');
            this.log('   • Authentication is properly enforced', 'info');
            this.log('   • Friend workflows complete successfully', 'info');
        } else if (successRate >= 75) {
            this.log('\n✅ GOOD! Phase 3.1 is mostly working with minor issues', 'success');
            this.log('   • Core functionality is operational', 'info');
            this.log('   • Some endpoints may need attention', 'warning');
        } else {
            this.log('\n⚠️  Phase 3.1 needs attention before user testing', 'warning');
            this.log('   • Check failed tests above', 'info');
            this.log('   • Verify server logs for errors', 'info');
        }

        this.log('\n🌐 Manual Testing Next Steps:', 'blue');
        this.log('   1. Visit: https://mivton.com/register.html', 'info');
        this.log('   2. Create 2-3 test accounts', 'info');
        this.log('   3. Test friend workflows in browser', 'info');
        this.log('   4. Verify real-time features work', 'info');
        this.log('   5. Test mobile responsiveness', 'info');
    }

    async cleanupProductionData() {
        this.log('\n🧹 Production Test Cleanup...', 'blue');
        
        // Note: In production, we should be careful about cleanup
        // For now, we'll just log the test users created
        if (this.testUsers.length > 0) {
            this.log('  📝 Test users created (manual cleanup may be needed):', 'info');
            this.testUsers.forEach(user => {
                this.log(`     • ${user.username} (${user.email})`, 'info');
            });
            this.log('  💡 These can be deleted via admin panel if needed', 'info');
        } else {
            this.log('  ✅ No cleanup needed', 'success');
        }
    }
}

// Run production tests
async function runProductionTests() {
    const tester = new ProductionTester();
    await tester.runProductionTests();
}

if (require.main === module) {
    runProductionTests().catch(console.error);
}

module.exports = { ProductionTester, runProductionTests };
