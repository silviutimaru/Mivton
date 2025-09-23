#!/usr/bin/env node

/**
 * Test the authentication middleware directly
 */

const { requireAuth } = require('./middleware/auth');
const { query } = require('./database/query-adapter');

async function testAuthMiddleware() {
    console.log('🔍 Testing authentication middleware...');
    
    try {
        // Test 1: Test database query directly
        console.log('\n1. Testing database query directly...');
        const result = await query('SELECT id, username, email, full_name FROM users LIMIT 1');
        console.log('✅ Database query result:', result.rows[0]);
        
        // Test 2: Test with a mock request
        console.log('\n2. Testing authentication middleware...');
        
        const mockReq = {
            session: {
                userId: 'test_user_id'
            }
        };
        
        const mockRes = {
            status: (code) => ({
                json: (data) => {
                    console.log(`Response ${code}:`, data);
                    return mockRes;
                }
            })
        };
        
        const mockNext = () => {
            console.log('✅ Middleware passed, calling next()');
        };
        
        // Call the middleware
        await requireAuth(mockReq, mockRes, mockNext);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack?.substring(0, 500)
        });
    }
}

// Run the test
testAuthMiddleware();
