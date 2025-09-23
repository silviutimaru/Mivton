#!/usr/bin/env node

/**
 * 🚀 MIVTON FRIENDS SYSTEM COMPREHENSIVE TEST
 * 
 * This script tests all components of the Mivton Friends List Management System:
 * - Database schema and connections
 * - Friends API endpoints
 * - Friend requests workflow
 * - User blocking system
 * - Social notifications
 * - Real-time features
 * - Frontend components
 * 
 * Usage: node test-friends-system.js
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
    database: {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        database: process.env.PGDATABASE || 'mivton',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'password'
    },
    server: {
        url: process.env.SERVER_URL || 'http://localhost:3000',
        timeout: 10000
    },
    test: {
        verbose: true,
        cleanup: true
    }
};

// Test results tracking
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

// Test user data for testing
const testUsers = [
    {
        username: 'alice_test',
        email: 'alice.test@example.com',
        full_name: 'Alice Test',
        password: 'TestPass123!'
    },
    {
        username: 'bob_test',
        email: 'bob.test@example.com',
        full_name: 'Bob Test',
        password: 'TestPass123!'
    },
    {
        username: 'charlie_test',
        email: 'charlie.test@example.com',
        full_name: 'Charlie Test',
        password: 'TestPass123!'
    }
];

// Color output functions
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorLog(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function log(message) {
    if (CONFIG.test.verbose) {
        console.log(`  ${message}`);
    }
}

function success(message) {
    colorLog('green', `✅ ${message}`);
}

function error(message) {
    colorLog('red', `❌ ${message}`);
}

function info(message) {
    colorLog('blue', `ℹ️  ${message}`);
}

function warning(message) {
    colorLog('yellow', `⚠️  ${message}`);
}

// Test helper functions
function testResult(name, passed, errorMessage = null) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        success(`${name}`);
    } else {
        testResults.failed++;
        testResults.errors.push({ test: name, error: errorMessage });
        error(`${name}${errorMessage ? ': ' + errorMessage : ''}`);
    }
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Database testing functions
async function testDatabaseConnection() {
    colorLog('cyan', '\\n🔄 Testing Database Connection...');
    
    try {
        const pool = new Pool(CONFIG.database);
        const result = await pool.query('SELECT NOW() as current_time');
        await pool.end();
        
        testResult('Database Connection', true);
        log(`Connected at: ${result.rows[0].current_time}`);
        return true;
    } catch (err) {
        testResult('Database Connection', false, err.message);
        return false;
    }
}

async function testDatabaseSchema() {
    colorLog('cyan', '\\n🔧 Testing Friends Database Schema...');
    
    try {
        const pool = new Pool(CONFIG.database);
        
        // Test required tables exist
        const tables = ['friendships', 'friend_requests', 'blocked_users', 'friend_notifications', 'social_activity_log'];
        
        for (const table of tables) {
            try {
                const result = await pool.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [table]);
                
                if (result.rows.length > 0) {
                    testResult(`Table ${table} exists`, true);
                    log(`Found ${result.rows.length} columns in ${table}`);
                } else {
                    testResult(`Table ${table} exists`, false, 'Table not found');
                }
            } catch (err) {
                testResult(`Table ${table} exists`, false, err.message);
            }
        }
        
        // Test utility functions exist
        try {
            await pool.query('SELECT are_users_friends(1, 2)');
            testResult('Function are_users_friends exists', true);
        } catch (err) {
            testResult('Function are_users_friends exists', false, err.message);
        }
        
        try {
            await pool.query('SELECT is_user_blocked(1, 2)');
            testResult('Function is_user_blocked exists', true);
        } catch (err) {
            testResult('Function is_user_blocked exists', false, err.message);
        }
        
        // Test views exist
        try {
            const result = await pool.query('SELECT * FROM v_user_friends LIMIT 1');
            testResult('View v_user_friends exists', true);
        } catch (err) {
            testResult('View v_user_friends exists', false, err.message);
        }
        
        await pool.end();
        return true;
    } catch (err) {
        testResult('Database Schema Test', false, err.message);
        return false;
    }
}

// Server testing functions
async function testServerHealth() {
    colorLog('cyan', '\\n🏥 Testing Server Health...');
    
    try {
        const response = await fetch(`${CONFIG.server.url}/health`, {
            method: 'GET',
            timeout: CONFIG.server.timeout
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Server Health Check', data.status === 'healthy');
            log(`Server status: ${data.status}`);
            log(`Database: ${data.services?.database}`);
            return true;
        } else {
            testResult('Server Health Check', false, `HTTP ${response.status}`);
            return false;
        }
    } catch (err) {
        testResult('Server Health Check', false, err.message);
        return false;
    }
}

async function testApiStatus() {
    colorLog('cyan', '\\n📊 Testing API Status...');
    
    try {
        const response = await fetch(`${CONFIG.server.url}/api/status`, {
            method: 'GET',
            timeout: CONFIG.server.timeout
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('API Status', data.status === 'operational');
            log(`API version: ${data.version}`);
            log(`Total users: ${data.stats?.totalUsers}`);
            log(`Features: ${Object.keys(data.features || {}).join(', ')}`);
            return true;
        } else {
            testResult('API Status', false, `HTTP ${response.status}`);
            return false;
        }
    } catch (err) {
        testResult('API Status', false, err.message);
        return false;
    }
}

// Authentication testing functions
async function createTestUsers() {
    colorLog('cyan', '\\n👥 Creating Test Users...');
    
    const createdUsers = [];
    
    for (const user of testUsers) {
        try {
            // First check if user already exists
            const checkResponse = await fetch(`${CONFIG.server.url}/api/auth/check-username/${user.username}`, {
                method: 'GET'
            });
            
            if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (!checkData.available) {
                    testResult(`User ${user.username} already exists`, true);
                    log(`Skipping creation of existing user: ${user.username}`);
                    continue;
                }
            }
            
            const response = await fetch(`${CONFIG.server.url}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    testResult(`Create user ${user.username}`, true);
                    createdUsers.push({...user, id: data.user?.id});
                } else {
                    testResult(`Create user ${user.username}`, false, data.message);
                }
            } else {
                testResult(`Create user ${user.username}`, false, `HTTP ${response.status}`);
            }
        } catch (err) {
            testResult(`Create user ${user.username}`, false, err.message);
        }
    }
    
    return createdUsers;
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${CONFIG.server.url}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const cookies = response.headers.get('set-cookie');
                return {
                    success: true,
                    user: data.user,
                    cookies: cookies
                };
            }
        }
        
        const errorData = await response.json();
        return {
            success: false,
            error: errorData.message || 'Login failed'
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

// Friends system testing functions
async function testFriendsAPI() {
    colorLog('cyan', '\\n👥 Testing Friends API...');
    
    // Login as first test user
    const loginResult = await loginUser(testUsers[0].username, testUsers[0].password);
    if (!loginResult.success) {
        testResult('Login for friends test', false, loginResult.error);
        return false;
    }
    
    const cookies = loginResult.cookies;
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookies
    };
    
    // Test get friends list (should be empty initially)
    try {
        const response = await fetch(`${CONFIG.server.url}/api/friends`, {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Get friends list', data.success);
            log(`Friends count: ${data.friends?.length || 0}`);
            log(`Online friends: ${data.stats?.online_friends || 0}`);
        } else {
            testResult('Get friends list', false, `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Get friends list', false, err.message);
    }
    
    // Test get friends stats
    try {
        const response = await fetch(`${CONFIG.server.url}/api/friends/stats`, {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Get friends stats', data.success);
            log(`Total friends: ${data.stats?.total_friends || 0}`);
        } else {
            testResult('Get friends stats', false, `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Get friends stats', false, err.message);
    }
    
    // Test search friends (should be empty)
    try {
        const response = await fetch(`${CONFIG.server.url}/api/friends/search?q=test`, {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Search friends', data.success);
            log(`Search results: ${data.friends?.length || 0}`);
        } else {
            testResult('Search friends', false, `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Search friends', false, err.message);
    }
    
    return true;
}

async function testFriendRequestsAPI() {
    colorLog('cyan', '\\n📨 Testing Friend Requests API...');
    
    // Login as first user (sender)
    const senderLogin = await loginUser(testUsers[0].username, testUsers[0].password);
    if (!senderLogin.success) {
        testResult('Login sender for friend requests test', false, senderLogin.error);
        return false;
    }
    
    // Login as second user (receiver) 
    const receiverLogin = await loginUser(testUsers[1].username, testUsers[1].password);
    if (!receiverLogin.success) {
        testResult('Login receiver for friend requests test', false, receiverLogin.error);
        return false;
    }
    
    const senderHeaders = {
        'Content-Type': 'application/json',
        'Cookie': senderLogin.cookies
    };
    
    const receiverHeaders = {
        'Content-Type': 'application/json',
        'Cookie': receiverLogin.cookies
    };
    
    // First, get receiver's user ID by searching
    let receiverId = null;
    try {
        const searchResponse = await fetch(`${CONFIG.server.url}/api/users/search?q=${testUsers[1].username}`, {
            method: 'GET',
            headers: senderHeaders
        });
        
        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.success && searchData.users.length > 0) {
                receiverId = searchData.users[0].id;
                testResult('Find receiver user ID', true);
                log(`Receiver ID: ${receiverId}`);
            } else {
                testResult('Find receiver user ID', false, 'User not found in search');
                return false;
            }
        } else {
            testResult('Find receiver user ID', false, `HTTP ${searchResponse.status}`);
            return false;
        }
    } catch (err) {
        testResult('Find receiver user ID', false, err.message);
        return false;
    }
    
    // Send friend request
    try {
        const response = await fetch(`${CONFIG.server.url}/api/friend-requests`, {
            method: 'POST',
            headers: senderHeaders,
            body: JSON.stringify({
                receiver_id: receiverId,
                message: 'Hey! Let\\'s be friends on Mivton!'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Send friend request', data.success);
            log(`Request ID: ${data.request?.id}`);
        } else {
            const errorData = await response.json();
            testResult('Send friend request', false, errorData.message || `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Send friend request', false, err.message);
    }
    
    // Check received requests (as receiver)
    try {
        const response = await fetch(`${CONFIG.server.url}/api/friend-requests/received`, {
            method: 'GET',
            headers: receiverHeaders
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Get received friend requests', data.success);
            log(`Received requests: ${data.requests?.length || 0}`);
        } else {
            testResult('Get received friend requests', false, `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Get received friend requests', false, err.message);
    }
    
    // Check sent requests (as sender)
    try {
        const response = await fetch(`${CONFIG.server.url}/api/friend-requests/sent`, {
            method: 'GET',
            headers: senderHeaders
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Get sent friend requests', data.success);
            log(`Sent requests: ${data.requests?.length || 0}`);
        } else {
            testResult('Get sent friend requests', false, `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Get sent friend requests', false, err.message);
    }
    
    return true;
}

async function testBlockingSystem() {
    colorLog('cyan', '\\n🚫 Testing User Blocking System...');
    
    // Login as first user
    const loginResult = await loginUser(testUsers[0].username, testUsers[0].password);
    if (!loginResult.success) {
        testResult('Login for blocking test', false, loginResult.error);
        return false;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': loginResult.cookies
    };
    
    // Get blocked users list (should be empty)
    try {
        const response = await fetch(`${CONFIG.server.url}/api/blocked-users`, {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Get blocked users list', data.success);
            log(`Blocked users: ${data.blocked_users?.length || 0}`);
        } else {
            testResult('Get blocked users list', false, `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Get blocked users list', false, err.message);
    }
    
    return true;
}

async function testSocialNotifications() {
    colorLog('cyan', '\\n🔔 Testing Social Notifications...');
    
    // Login as first user
    const loginResult = await loginUser(testUsers[0].username, testUsers[0].password);
    if (!loginResult.success) {
        testResult('Login for notifications test', false, loginResult.error);
        return false;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': loginResult.cookies
    };
    
    // Get notifications
    try {
        const response = await fetch(`${CONFIG.server.url}/api/social-notifications`, {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            testResult('Get social notifications', data.success);
            log(`Notifications: ${data.notifications?.length || 0}`);
            log(`Unread: ${data.unread_count || 0}`);
        } else {
            testResult('Get social notifications', false, `HTTP ${response.status}`);
        }
    } catch (err) {
        testResult('Get social notifications', false, err.message);
    }
    
    return true;
}

// Frontend testing functions
async function testFrontendFiles() {
    colorLog('cyan', '\\n🎨 Testing Frontend Files...');
    
    const frontendFiles = [
        'public/js/friends-manager.js',
        'public/css/friends-system.css',
        'public/js/friend-requests.js',
        'public/css/friend-requests.css',
        'routes/friends.js',
        'routes/friend-requests.js',
        'utils/friends-utils.js'
    ];
    
    for (const filePath of frontendFiles) {
        const fullPath = path.join(__dirname, filePath);
        try {
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                testResult(`File ${filePath} exists`, true);
                log(`Size: ${Math.round(stats.size / 1024)}KB`);
            } else {
                testResult(`File ${filePath} exists`, false, 'File not found');
            }
        } catch (err) {
            testResult(`File ${filePath} exists`, false, err.message);
        }
    }
    
    return true;
}

async function testFrontendComponents() {
    colorLog('cyan', '\\n⚛️  Testing Frontend Components...');
    
    try {
        // Test if friends manager JavaScript is valid
        const friendsManagerPath = path.join(__dirname, 'public/js/friends-manager.js');
        if (fs.existsSync(friendsManagerPath)) {
            const content = fs.readFileSync(friendsManagerPath, 'utf8');
            
            // Check for required class and methods
            const hasMainClass = content.includes('class MivtonFriendsManager');
            const hasInitMethod = content.includes('initialize()');
            const hasLoadFriendsMethod = content.includes('loadFriends');
            const hasRenderMethod = content.includes('renderFriends');
            
            testResult('Friends Manager class structure', hasMainClass);
            testResult('Friends Manager initialize method', hasInitMethod);
            testResult('Friends Manager loadFriends method', hasLoadFriendsMethod);
            testResult('Friends Manager renderFriends method', hasRenderMethod);
            
            log(`File size: ${Math.round(content.length / 1024)}KB`);
        } else {
            testResult('Friends Manager JavaScript file', false, 'File not found');
        }
        
        // Test if CSS file has required styles
        const friendsCssPath = path.join(__dirname, 'public/css/friends-system.css');
        if (fs.existsSync(friendsCssPath)) {
            const content = fs.readFileSync(friendsCssPath, 'utf8');
            
            const hasManagerStyles = content.includes('.friends-manager');
            const hasCardStyles = content.includes('.friend-card');
            const hasStatusStyles = content.includes('.status-indicator');
            
            testResult('Friends CSS manager styles', hasManagerStyles);
            testResult('Friends CSS card styles', hasCardStyles);  
            testResult('Friends CSS status styles', hasStatusStyles);
        } else {
            testResult('Friends CSS file', false, 'File not found');
        }
        
    } catch (err) {
        testResult('Frontend Components Test', false, err.message);
    }
    
    return true;
}

// Cleanup functions
async function cleanupTestUsers() {
    if (!CONFIG.test.cleanup) {
        info('Skipping cleanup (disabled in config)');
        return;
    }
    
    colorLog('cyan', '\\n🧹 Cleaning Up Test Users...');
    
    try {
        const pool = new Pool(CONFIG.database);
        
        for (const user of testUsers) {
            try {
                // Delete user and all related data (cascading deletes should handle this)
                const result = await pool.query(
                    'DELETE FROM users WHERE username = $1 OR email = $2',
                    [user.username, user.email]
                );
                
                if (result.rowCount > 0) {
                    testResult(`Cleanup user ${user.username}`, true);
                } else {
                    log(`User ${user.username} not found (already cleaned up)`);
                }
            } catch (err) {
                warning(`Failed to cleanup user ${user.username}: ${err.message}`);
            }
        }
        
        await pool.end();
    } catch (err) {
        warning(`Cleanup failed: ${err.message}`);
    }
}

// Main test runner
async function runAllTests() {
    colorLog('magenta', '\\n' + '='.repeat(80));
    colorLog('magenta', '🚀 MIVTON FRIENDS SYSTEM COMPREHENSIVE TEST');
    colorLog('magenta', '='.repeat(80));
    
    info(`Server URL: ${CONFIG.server.url}`);
    info(`Database: ${CONFIG.database.host}:${CONFIG.database.port}/${CONFIG.database.database}`);
    info(`Verbose: ${CONFIG.test.verbose}`);
    info(`Cleanup: ${CONFIG.test.cleanup}`);
    
    const startTime = Date.now();
    
    // Run all test categories
    const testCategories = [
        { name: 'Database Connection', fn: testDatabaseConnection },
        { name: 'Database Schema', fn: testDatabaseSchema },
        { name: 'Server Health', fn: testServerHealth },
        { name: 'API Status', fn: testApiStatus },
        { name: 'Test Users Creation', fn: createTestUsers },
        { name: 'Friends API', fn: testFriendsAPI },
        { name: 'Friend Requests API', fn: testFriendRequestsAPI },
        { name: 'Blocking System', fn: testBlockingSystem },
        { name: 'Social Notifications', fn: testSocialNotifications },
        { name: 'Frontend Files', fn: testFrontendFiles },
        { name: 'Frontend Components', fn: testFrontendComponents }
    ];
    
    for (const category of testCategories) {
        try {
            await category.fn();
        } catch (err) {
            error(`Category ${category.name} failed: ${err.message}`);
            testResults.total++;
            testResults.failed++;
            testResults.errors.push({ test: category.name, error: err.message });
        }
        
        // Small delay between test categories
        await sleep(500);
    }
    
    // Cleanup
    await cleanupTestUsers();
    
    // Test summary
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    colorLog('magenta', '\\n' + '='.repeat(80));
    colorLog('magenta', '📊 TEST RESULTS SUMMARY');
    colorLog('magenta', '='.repeat(80));
    
    console.log(`\\n📋 Tests Run: ${testResults.total}`);
    
    if (testResults.passed > 0) {
        colorLog('green', `✅ Passed: ${testResults.passed}`);
    }
    
    if (testResults.failed > 0) {
        colorLog('red', `❌ Failed: ${testResults.failed}`);
        
        if (testResults.errors.length > 0) {
            colorLog('red', '\\n🔍 Error Details:');
            testResults.errors.forEach((err, index) => {
                console.log(`  ${index + 1}. ${err.test}: ${err.error}`);
            });
        }
    }
    
    const successRate = Math.round((testResults.passed / testResults.total) * 100);
    colorLog('cyan', `\\n📈 Success Rate: ${successRate}%`);
    colorLog('cyan', `⏱️  Duration: ${duration}s`);
    
    if (successRate >= 90) {
        success('\\n🎉 FRIENDS SYSTEM IS WORKING EXCELLENTLY!');
    } else if (successRate >= 75) {
        warning('\\n⚠️  FRIENDS SYSTEM IS MOSTLY WORKING - Some issues found');
    } else {
        error('\\n❌ FRIENDS SYSTEM HAS SIGNIFICANT ISSUES - Review failed tests');
    }
    
    colorLog('magenta', '\\n' + '='.repeat(80));
    
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle script termination
process.on('SIGINT', async () => {
    warning('\\n🛑 Test interrupted by user');
    await cleanupTestUsers();
    process.exit(1);
});

process.on('uncaughtException', async (err) => {
    error(`\\n💥 Uncaught exception: ${err.message}`);
    await cleanupTestUsers();
    process.exit(1);
});

// Start the tests
if (require.main === module) {
    runAllTests().catch(async (err) => {
        error(`\\n💥 Test runner failed: ${err.message}`);
        await cleanupTestUsers();
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testDatabaseConnection,
    testDatabaseSchema,
    testServerHealth,
    testFriendsAPI,
    testFriendRequestsAPI,
    CONFIG
};
