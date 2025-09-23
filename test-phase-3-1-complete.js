/**
 * 🚀 MIVTON PHASE 3.1 - COMPREHENSIVE TESTING SCRIPT
 * Complete test suite for Friends System & Social Features
 * 
 * Tests:
 * 1. Database Schema Validation
 * 2. API Endpoints Testing
 * 3. Friends Management Operations
 * 4. Friend Requests Workflow
 * 5. User Blocking System
 * 6. Real-time Socket Events
 * 7. Frontend Component Integration
 */

const { pool } = require('./database/connection');
const fetch = require('node-fetch');

class Phase31Tester {
    constructor() {
        this.baseUrl = process.env.APP_URL || 'http://localhost:3000';
        this.testResults = {
            database: [],
            api: [],
            realtime: [],
            frontend: []
        };
        this.testUsers = [];
        this.sessionCookies = new Map();
    }

    async runAllTests() {
        console.log('🚀 Starting Phase 3.1 Friends System Testing...\n');
        
        try {
            // 1. Database Tests
            await this.testDatabaseSchema();
            
            // 2. Create Test Users
            await this.createTestUsers();
            
            // 3. API Tests
            await this.testFriendsAPI();
            await this.testFriendRequestsAPI();
            await this.testBlockingAPI();
            
            // 4. Integration Tests
            await this.testFriendWorkflow();
            
            // 5. Real-time Tests
            await this.testSocketEvents();
            
            // 6. Generate Report
            this.generateTestReport();
            
        } catch (error) {
            console.error('❌ Testing failed:', error);
        } finally {
            // Cleanup
            await this.cleanup();
        }
    }

    // ================================
    // DATABASE SCHEMA TESTS
    // ================================
    
    async testDatabaseSchema() {
        console.log('📊 Testing Database Schema...');
        
        const tests = [
            {
                name: 'friendships table exists',
                query: "SELECT table_name FROM information_schema.tables WHERE table_name = 'friendships'"
            },
            {
                name: 'friend_requests table exists',
                query: "SELECT table_name FROM information_schema.tables WHERE table_name = 'friend_requests'"
            },
            {
                name: 'blocked_users table exists',
                query: "SELECT table_name FROM information_schema.tables WHERE table_name = 'blocked_users'"
            },
            {
                name: 'friend_notifications table exists',
                query: "SELECT table_name FROM information_schema.tables WHERE table_name = 'friend_notifications'"
            },
            {
                name: 'social_activity_log table exists',
                query: "SELECT table_name FROM information_schema.tables WHERE table_name = 'social_activity_log'"
            },
            {
                name: 'friendships indexes exist',
                query: "SELECT indexname FROM pg_indexes WHERE tablename = 'friendships'"
            },
            {
                name: 'utility functions exist',
                query: "SELECT routine_name FROM information_schema.routines WHERE routine_name = 'are_users_friends'"
            }
        ];

        for (const test of tests) {
            try {
                const result = await pool.query(test.query);
                const passed = result.rows.length > 0;
                
                this.testResults.database.push({
                    name: test.name,
                    passed,
                    details: passed ? `Found ${result.rows.length} items` : 'Not found'
                });
                
                console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
                
            } catch (error) {
                this.testResults.database.push({
                    name: test.name,
                    passed: false,
                    details: error.message
                });
                console.log(`  ❌ ${test.name} - ${error.message}`);
            }
        }

        // Test utility functions
        await this.testUtilityFunctions();
        
        console.log('');
    }

    async testUtilityFunctions() {
        console.log('  🔧 Testing utility functions...');
        
        try {
            // Test are_users_friends function
            const result = await pool.query('SELECT are_users_friends(1, 2) as result');
            console.log('    ✅ are_users_friends function works');
            
            // Test is_user_blocked function
            const blockResult = await pool.query('SELECT is_user_blocked(1, 2) as result');
            console.log('    ✅ is_user_blocked function works');
            
        } catch (error) {
            console.log(`    ❌ Utility functions error: ${error.message}`);
        }
    }

    // ================================
    // TEST USER CREATION
    // ================================
    
    async createTestUsers() {
        console.log('👥 Creating test users...');
        
        const testUserData = [
            {
                username: 'testuser1_phase31',
                email: 'testuser1.phase31@example.com',
                password: 'TestPass123!',
                full_name: 'Test User One',
                native_language: 'English'
            },
            {
                username: 'testuser2_phase31',
                email: 'testuser2.phase31@example.com',
                password: 'TestPass123!',
                full_name: 'Test User Two',
                native_language: 'Spanish'
            },
            {
                username: 'testuser3_phase31',
                email: 'testuser3.phase31@example.com',
                password: 'TestPass123!',
                full_name: 'Test User Three',
                native_language: 'French'
            }
        ];

        for (const userData of testUserData) {
            try {
                // Register user
                const response = await fetch(`${this.baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Login to get session
                    const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: userData.username,
                            password: userData.password
                        })
                    });

                    if (loginResponse.ok) {
                        const loginData = await loginResponse.json();
                        const cookies = loginResponse.headers.get('set-cookie');
                        
                        this.testUsers.push({
                            ...userData,
                            id: loginData.user.id,
                            cookies
                        });
                        
                        this.sessionCookies.set(loginData.user.id, cookies);
                        
                        console.log(`  ✅ Created and logged in: ${userData.username} (ID: ${loginData.user.id})`);
                    }
                } else {
                    // User might already exist, try to login
                    const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: userData.username,
                            password: userData.password
                        })
                    });

                    if (loginResponse.ok) {
                        const loginData = await loginResponse.json();
                        const cookies = loginResponse.headers.get('set-cookie');
                        
                        this.testUsers.push({
                            ...userData,
                            id: loginData.user.id,
                            cookies
                        });
                        
                        this.sessionCookies.set(loginData.user.id, cookies);
                        
                        console.log(`  ✅ Logged in existing user: ${userData.username} (ID: ${loginData.user.id})`);
                    }
                }
                
            } catch (error) {
                console.log(`  ❌ Failed to create user ${userData.username}: ${error.message}`);
            }
        }
        
        console.log(`  📊 Total test users ready: ${this.testUsers.length}\n`);
    }

    // ================================
    // FRIENDS API TESTS
    // ================================
    
    async testFriendsAPI() {
        console.log('👥 Testing Friends API...');
        
        if (this.testUsers.length < 2) {
            console.log('  ❌ Need at least 2 test users');
            return;
        }

        const user1 = this.testUsers[0];
        const user2 = this.testUsers[1];

        // Test 1: Get empty friends list
        await this.testAPIEndpoint(
            'GET friends list (empty)',
            'GET',
            '/api/friends',
            null,
            user1.cookies,
            (data) => Array.isArray(data.friends) && data.friends.length === 0
        );

        // Test 2: Get friends stats
        await this.testAPIEndpoint(
            'GET friends stats',
            'GET',
            '/api/friends/stats',
            null,
            user1.cookies,
            (data) => data.stats && typeof data.stats.total_friends === 'number'
        );

        // Test 3: Search friends (empty)
        await this.testAPIEndpoint(
            'Search friends',
            'GET',
            '/api/friends/search?q=test',
            null,
            user1.cookies,
            (data) => Array.isArray(data.friends)
        );

        // Test 4: Get online friends
        await this.testAPIEndpoint(
            'GET online friends',
            'GET',
            '/api/friends/online',
            null,
            user1.cookies,
            (data) => Array.isArray(data.online_friends)
        );

        console.log('');
    }

    // ================================
    // FRIEND REQUESTS API TESTS
    // ================================
    
    async testFriendRequestsAPI() {
        console.log('📤 Testing Friend Requests API...');
        
        if (this.testUsers.length < 2) {
            console.log('  ❌ Need at least 2 test users');
            return;
        }

        const user1 = this.testUsers[0];
        const user2 = this.testUsers[1];

        // Test 1: Send friend request
        const requestResult = await this.testAPIEndpoint(
            'Send friend request',
            'POST',
            '/api/friend-requests',
            { receiver_id: user2.id, message: 'Test friend request' },
            user1.cookies,
            (data) => data.success && data.request
        );

        let requestId = null;
        if (requestResult.passed && requestResult.data.request) {
            requestId = requestResult.data.request.id;
        }

        // Test 2: Get sent requests
        await this.testAPIEndpoint(
            'GET sent friend requests',
            'GET',
            '/api/friend-requests/sent',
            null,
            user1.cookies,
            (data) => Array.isArray(data.requests)
        );

        // Test 3: Get received requests
        await this.testAPIEndpoint(
            'GET received friend requests',
            'GET',
            '/api/friend-requests/received',
            null,
            user2.cookies,
            (data) => Array.isArray(data.requests) && data.requests.length > 0
        );

        // Test 4: Accept friend request (if we have one)
        if (requestId) {
            await this.testAPIEndpoint(
                'Accept friend request',
                'PUT',
                `/api/friend-requests/${requestId}/accept`,
                null,
                user2.cookies,
                (data) => data.success
            );
        }

        // Test 5: Verify friendship was created
        await this.testAPIEndpoint(
            'Verify friendship created',
            'GET',
            '/api/friends',
            null,
            user1.cookies,
            (data) => Array.isArray(data.friends) && data.friends.length > 0
        );

        console.log('');
    }

    // ================================
    // BLOCKING API TESTS
    // ================================
    
    async testBlockingAPI() {
        console.log('🚫 Testing User Blocking API...');
        
        if (this.testUsers.length < 3) {
            console.log('  ❌ Need at least 3 test users');
            return;
        }

        const user1 = this.testUsers[0];
        const user3 = this.testUsers[2];

        // Test 1: Block user
        await this.testAPIEndpoint(
            'Block user',
            'POST',
            '/api/blocked-users',
            { user_id: user3.id, reason: 'Test blocking' },
            user1.cookies,
            (data) => data.success
        );

        // Test 2: Get blocked users list
        await this.testAPIEndpoint(
            'GET blocked users',
            'GET',
            '/api/blocked-users',
            null,
            user1.cookies,
            (data) => Array.isArray(data.blocked_users)
        );

        // Test 3: Unblock user
        await this.testAPIEndpoint(
            'Unblock user',
            'DELETE',
            `/api/blocked-users/${user3.id}`,
            null,
            user1.cookies,
            (data) => data.success
        );

        console.log('');
    }

    // ================================
    // INTEGRATION WORKFLOW TESTS
    // ================================
    
    async testFriendWorkflow() {
        console.log('🔄 Testing Complete Friend Workflow...');
        
        if (this.testUsers.length < 2) {
            console.log('  ❌ Need at least 2 test users');
            return;
        }

        const user1 = this.testUsers[0];
        const user2 = this.testUsers[1];

        console.log('  🔄 Testing complete friend workflow...');
        
        // Step 1: Remove existing friendship (if any)
        try {
            await fetch(`${this.baseUrl}/api/friends/${user2.id}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cookie': user1.cookies 
                }
            });
        } catch (error) {
            // Ignore errors - friendship might not exist
        }

        // Step 2: Send friend request
        console.log('    1. Sending friend request...');
        const requestResponse = await fetch(`${this.baseUrl}/api/friend-requests`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': user1.cookies 
            },
            body: JSON.stringify({ 
                receiver_id: user2.id, 
                message: 'Workflow test request' 
            })
        });

        if (!requestResponse.ok) {
            console.log('    ❌ Failed to send friend request');
            return;
        }

        const requestData = await requestResponse.json();
        const requestId = requestData.request?.id;

        if (!requestId) {
            console.log('    ❌ No request ID returned');
            return;
        }

        console.log(`    ✅ Friend request sent (ID: ${requestId})`);

        // Step 3: Check received requests
        console.log('    2. Checking received requests...');
        const receivedResponse = await fetch(`${this.baseUrl}/api/friend-requests/received`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': user2.cookies 
            }
        });

        if (receivedResponse.ok) {
            const receivedData = await receivedResponse.json();
            const hasRequest = receivedData.requests?.some(req => req.id === requestId);
            console.log(`    ${hasRequest ? '✅' : '❌'} Request found in received list`);
        }

        // Step 4: Accept friend request
        console.log('    3. Accepting friend request...');
        const acceptResponse = await fetch(`${this.baseUrl}/api/friend-requests/${requestId}/accept`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': user2.cookies 
            }
        });

        if (acceptResponse.ok) {
            console.log('    ✅ Friend request accepted');
        } else {
            console.log('    ❌ Failed to accept friend request');
            return;
        }

        // Step 5: Verify friendship
        console.log('    4. Verifying friendship...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const friendsResponse = await fetch(`${this.baseUrl}/api/friends`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': user1.cookies 
            }
        });

        if (friendsResponse.ok) {
            const friendsData = await friendsResponse.json();
            const isFriend = friendsData.friends?.some(friend => friend.id === user2.id);
            console.log(`    ${isFriend ? '✅' : '❌'} Friendship verified in friends list`);
        }

        // Step 6: Test friend removal
        console.log('    5. Testing friend removal...');
        const removeResponse = await fetch(`${this.baseUrl}/api/friends/${user2.id}`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': user1.cookies 
            }
        });

        if (removeResponse.ok) {
            console.log('    ✅ Friend removed successfully');
        } else {
            console.log('    ❌ Failed to remove friend');
        }

        console.log('  ✅ Complete workflow test finished\n');
    }

    // ================================
    // SOCKET.IO TESTS
    // ================================
    
    async testSocketEvents() {
        console.log('⚡ Testing Socket.IO Events...');
        
        try {
            // Test basic socket connection
            const io = require('socket.io-client');
            const socket = io(this.baseUrl, {
                transports: ['websocket'],
                timeout: 5000
            });

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('  ❌ Socket connection timeout');
                    socket.disconnect();
                    resolve();
                }, 5000);

                socket.on('connect', () => {
                    console.log('  ✅ Socket.IO connection established');
                    clearTimeout(timeout);
                    socket.disconnect();
                    resolve();
                });

                socket.on('connect_error', (error) => {
                    console.log(`  ❌ Socket connection error: ${error.message}`);
                    clearTimeout(timeout);
                    resolve();
                });
            });

        } catch (error) {
            console.log(`  ❌ Socket.IO test failed: ${error.message}`);
        }
        
        console.log('');
    }

    // ================================
    // UTILITY METHODS
    // ================================
    
    async testAPIEndpoint(name, method, endpoint, body, cookies, validator) {
        try {
            const options = {
                method,
                headers: { 
                    'Content-Type': 'application/json'
                }
            };

            if (cookies) {
                options.headers['Cookie'] = cookies;
            }

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            const data = await response.json();

            const passed = response.ok && (!validator || validator(data));
            
            this.testResults.api.push({
                name,
                passed,
                status: response.status,
                data: passed ? data : null,
                error: !passed ? data : null
            });

            console.log(`  ${passed ? '✅' : '❌'} ${name} (${response.status})`);
            
            return { passed, data, status: response.status };

        } catch (error) {
            this.testResults.api.push({
                name,
                passed: false,
                error: error.message
            });

            console.log(`  ❌ ${name} - ${error.message}`);
            return { passed: false, error: error.message };
        }
    }

    // ================================
    // REPORTING
    // ================================
    
    generateTestReport() {
        console.log('📊 PHASE 3.1 TESTING REPORT');
        console.log('='.repeat(50));
        
        const dbPassed = this.testResults.database.filter(t => t.passed).length;
        const dbTotal = this.testResults.database.length;
        console.log(`\n📊 Database Tests: ${dbPassed}/${dbTotal} passed`);
        
        const apiPassed = this.testResults.api.filter(t => t.passed).length;
        const apiTotal = this.testResults.api.length;
        console.log(`🔗 API Tests: ${apiPassed}/${apiTotal} passed`);
        
        const allPassed = dbPassed + apiPassed;
        const allTotal = dbTotal + apiTotal;
        const successRate = ((allPassed / allTotal) * 100).toFixed(1);
        
        console.log(`\n🎯 Overall Success Rate: ${successRate}%`);
        console.log(`📈 Total Tests: ${allTotal}`);
        console.log(`✅ Passed: ${allPassed}`);
        console.log(`❌ Failed: ${allTotal - allPassed}`);
        
        if (successRate >= 90) {
            console.log('\n🎉 PHASE 3.1 IMPLEMENTATION: EXCELLENT!');
        } else if (successRate >= 80) {
            console.log('\n👍 PHASE 3.1 IMPLEMENTATION: GOOD');
        } else {
            console.log('\n⚠️  PHASE 3.1 IMPLEMENTATION: NEEDS ATTENTION');
        }
        
        // Detailed results
        console.log('\n📋 DETAILED RESULTS:');
        console.log('-'.repeat(30));
        
        if (this.testResults.database.length > 0) {
            console.log('\n📊 Database Tests:');
            this.testResults.database.forEach(test => {
                console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
                if (!test.passed && test.details) {
                    console.log(`      ${test.details}`);
                }
            });
        }
        
        if (this.testResults.api.length > 0) {
            console.log('\n🔗 API Tests:');
            this.testResults.api.forEach(test => {
                console.log(`  ${test.passed ? '✅' : '❌'} ${test.name} ${test.status ? `(${test.status})` : ''}`);
                if (!test.passed && test.error) {
                    console.log(`      ${JSON.stringify(test.error)}`);
                }
            });
        }
        
        console.log('\n' + '='.repeat(50));
    }

    // ================================
    // CLEANUP
    // ================================
    
    async cleanup() {
        console.log('\n🧹 Cleaning up test data...');
        
        try {
            // Delete test users and related data
            for (const user of this.testUsers) {
                // Delete friendships
                await pool.query('DELETE FROM friendships WHERE user1_id = $1 OR user2_id = $1', [user.id]);
                
                // Delete friend requests
                await pool.query('DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1', [user.id]);
                
                // Delete blocked users
                await pool.query('DELETE FROM blocked_users WHERE blocker_id = $1 OR blocked_id = $1', [user.id]);
                
                // Delete notifications
                await pool.query('DELETE FROM friend_notifications WHERE user_id = $1 OR sender_id = $1', [user.id]);
                
                // Delete activity log
                await pool.query('DELETE FROM social_activity_log WHERE user_id = $1 OR target_user_id = $1', [user.id]);
                
                // Delete user
                await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
                
                console.log(`  ✅ Cleaned up user: ${user.username}`);
            }
            
            console.log('  ✅ Cleanup completed');
            
        } catch (error) {
            console.log(`  ⚠️  Cleanup error: ${error.message}`);
        }
    }
}

// ================================
// RUN TESTS
// ================================

async function runPhase31Tests() {
    const tester = new Phase31Tester();
    await tester.runAllTests();
}

// Run if called directly
if (require.main === module) {
    runPhase31Tests().catch(console.error);
}

module.exports = { Phase31Tester, runPhase31Tests };
