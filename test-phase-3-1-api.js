/**
 * 🚀 MIVTON PHASE 3.1 - CURL API TESTING SCRIPT
 * Command-line testing of all Friends System API endpoints
 * Run this script to test APIs without browser interface
 */

// Set your app URL here
const APP_URL = process.env.APP_URL || 'https://mivton.com';

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',  
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

class APITester {
    constructor() {
        this.sessionCookies = new Map();
        this.testUsers = [];
        this.results = [];
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async runTests() {
        this.log('🚀 MIVTON PHASE 3.1 - API TESTING WITH CURL', 'blue');
        this.log('='.repeat(50));
        console.log('');

        try {
            // 1. Health checks
            await this.testHealthChecks();
            
            // 2. Create test users
            await this.createTestUsers();
            
            // 3. Test Friends APIs
            await this.testFriendsAPIs();
            
            // 4. Test Friend Requests
            await this.testFriendRequests();
            
            // 5. Test Blocking
            await this.testBlocking();
            
            // 6. Generate report
            this.generateReport();
            
        } catch (error) {
            this.log(`❌ Testing failed: ${error.message}`, 'red');
        }
    }

    async testHealthChecks() {
        this.log('🏥 Testing Health Endpoints...', 'yellow');
        
        // Health check
        await this.curlTest('Health Check', 'GET', '/health', null, null, 200);
        
        // API Status
        await this.curlTest('API Status', 'GET', '/api/status', null, null, 200);
        
        console.log('');
    }

    async createTestUsers() {
        this.log('👥 Creating Test Users...', 'yellow');
        
        const users = [
            {
                username: 'api_tester_1',
                email: 'api.tester.1@example.com',
                password: 'TestPass123!',
                full_name: 'API Tester One',
                native_language: 'English'
            },
            {
                username: 'api_tester_2', 
                email: 'api.tester.2@example.com',
                password: 'TestPass123!',
                full_name: 'API Tester Two',
                native_language: 'Spanish'
            }
        ];

        for (const user of users) {
            // Try to register
            const registerResult = await this.curlTest(
                `Register ${user.username}`,
                'POST',
                '/api/auth/register',
                user,
                null,
                [201, 409] // 201 = created, 409 = already exists
            );

            // Login to get session
            const loginResult = await this.curlTest(
                `Login ${user.username}`,
                'POST', 
                '/api/auth/login',
                { username: user.username, password: user.password },
                null,
                200
            );

            if (loginResult.success && loginResult.headers) {
                const cookies = this.extractCookies(loginResult.headers);
                this.sessionCookies.set(user.username, cookies);
                this.testUsers.push({...user, cookies});
                this.log(`  ✅ ${user.username} ready with session`, 'green');
            }
        }
        
        console.log('');
    }

    async testFriendsAPIs() {
        this.log('👥 Testing Friends APIs...', 'yellow');
        
        if (this.testUsers.length === 0) {
            this.log('  ❌ No authenticated users available', 'red');
            return;
        }

        const user1 = this.testUsers[0];
        const cookies = this.sessionCookies.get(user1.username);

        // Test friends list (should be empty)
        await this.curlTest('Get Friends List', 'GET', '/api/friends', null, cookies, 200);
        
        // Test friends stats
        await this.curlTest('Get Friends Stats', 'GET', '/api/friends/stats', null, cookies, 200);
        
        // Test online friends
        await this.curlTest('Get Online Friends', 'GET', '/api/friends/online', null, cookies, 200);
        
        // Test friends search
        await this.curlTest('Search Friends', 'GET', '/api/friends/search?q=test', null, cookies, 200);
        
        console.log('');
    }

    async testFriendRequests() {
        this.log('📤 Testing Friend Requests...', 'yellow');
        
        if (this.testUsers.length < 2) {
            this.log('  ❌ Need at least 2 users for friend request tests', 'red');
            return;
        }

        const user1 = this.testUsers[0];
        const user2 = this.testUsers[1];
        const cookies1 = this.sessionCookies.get(user1.username);
        const cookies2 = this.sessionCookies.get(user2.username);

        // Get user2 ID first (would need to implement user search or get from login)
        // For now, we'll use a placeholder approach
        
        // Test getting received requests (should be empty initially)
        await this.curlTest('Get Received Requests', 'GET', '/api/friend-requests/received', null, cookies2, 200);
        
        // Test getting sent requests (should be empty initially)  
        await this.curlTest('Get Sent Requests', 'GET', '/api/friend-requests/sent', null, cookies1, 200);
        
        // Test request stats
        await this.curlTest('Get Request Stats', 'GET', '/api/friend-requests/stats', null, cookies1, 200);
        
        console.log('');
    }

    async testBlocking() {
        this.log('🚫 Testing User Blocking...', 'yellow');
        
        if (this.testUsers.length === 0) {
            this.log('  ❌ No authenticated users available', 'red');
            return;
        }

        const user1 = this.testUsers[0];
        const cookies = this.sessionCookies.get(user1.username);

        // Test getting blocked users list (should be empty)
        await this.curlTest('Get Blocked Users', 'GET', '/api/blocked-users', null, cookies, 200);
        
        console.log('');
    }

    async curlTest(name, method, endpoint, body, cookies, expectedStatus) {
        try {
            const { exec } = require('child_process');
            
            let curlCommand = `curl -s -w "\\n%{http_code}" -X ${method}`;
            
            // Add headers
            curlCommand += ` -H "Content-Type: application/json"`;
            
            if (cookies) {
                curlCommand += ` -H "Cookie: ${cookies}"`;
            }
            
            // Add body for POST/PUT requests
            if (body) {
                const bodyStr = JSON.stringify(body).replace(/"/g, '\\"');
                curlCommand += ` -d "${bodyStr}"`;
            }
            
            // Add URL
            curlCommand += ` "${APP_URL}${endpoint}"`;
            
            // Execute curl command
            const result = await new Promise((resolve, reject) => {
                exec(curlCommand, (error, stdout, stderr) => {
                    if (error && !stdout) {
                        reject(error);
                        return;
                    }
                    resolve({ stdout, stderr });
                });
            });

            const lines = result.stdout.trim().split('\n');
            const httpCode = parseInt(lines[lines.length - 1]);
            const responseBody = lines.slice(0, -1).join('\n');

            const expectedCodes = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
            const success = expectedCodes.includes(httpCode);

            this.results.push({
                name,
                success,
                httpCode,
                expected: expectedStatus,
                method,
                endpoint
            });

            const statusColor = success ? 'green' : 'red';
            const statusIcon = success ? '✅' : '❌';
            this.log(`  ${statusIcon} ${name} (${httpCode})`, statusColor);

            if (!success && responseBody) {
                try {
                    const parsed = JSON.parse(responseBody);
                    if (parsed.error) {
                        this.log(`      Error: ${parsed.error}`, 'red');
                    }
                } catch (e) {
                    // Response might not be JSON
                    if (responseBody.length < 100) {
                        this.log(`      Response: ${responseBody}`, 'red');
                    }
                }
            }

            return { success, httpCode, responseBody };

        } catch (error) {
            this.results.push({
                name,
                success: false,
                error: error.message,
                method,
                endpoint
            });

            this.log(`  ❌ ${name} - ${error.message}`, 'red');
            return { success: false, error: error.message };
        }
    }

    extractCookies(headers) {
        // Simple cookie extraction - in real implementation would be more robust
        return headers || '';
    }

    generateReport() {
        this.log('\n📊 API TESTING REPORT', 'blue');
        this.log('='.repeat(30));

        const passed = this.results.filter(r => r.success).length;
        const total = this.results.length;
        const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

        this.log(`\n✅ Passed: ${passed}/${total} (${percentage}%)`, 'green');
        this.log(`❌ Failed: ${total - passed}`, 'red');

        // Group results by category
        const categories = {
            'Health': this.results.filter(r => r.endpoint.includes('/health') || r.endpoint.includes('/api/status')),
            'Auth': this.results.filter(r => r.endpoint.includes('/auth')),
            'Friends': this.results.filter(r => r.endpoint.includes('/friends')),
            'Requests': this.results.filter(r => r.endpoint.includes('/friend-requests')),
            'Blocking': this.results.filter(r => r.endpoint.includes('/blocked-users'))
        };

        Object.entries(categories).forEach(([category, results]) => {
            if (results.length > 0) {
                const categoryPassed = results.filter(r => r.success).length;
                this.log(`\n${category}: ${categoryPassed}/${results.length}`, 'yellow');
                
                results.forEach(result => {
                    const icon = result.success ? '✅' : '❌';
                    const color = result.success ? 'green' : 'red';
                    this.log(`  ${icon} ${result.name}`, color);
                });
            }
        });

        this.log('\n🎯 NEXT STEPS:', 'blue');
        if (percentage >= 90) {
            this.log('• APIs are working correctly!', 'green');
            this.log('• Ready for browser testing', 'green');
            this.log('• Run: node test-phase-3-1-complete.js for full tests', 'green');
        } else if (percentage >= 70) {
            this.log('• Some endpoints need attention', 'yellow');
            this.log('• Check failed tests above', 'yellow');
            this.log('• Verify authentication and database setup', 'yellow');
        } else {
            this.log('• Major issues detected', 'red');
            this.log('• Check server logs and database connection', 'red');
            this.log('• Ensure Phase 3.1 is properly deployed', 'red');
        }

        console.log('');
    }
}

// Run tests if called directly
async function runAPITests() {
    const tester = new APITester();
    await tester.runTests();
}

if (require.main === module) {
    runAPITests().catch(console.error);
}

module.exports = { APITester, runAPITests };
