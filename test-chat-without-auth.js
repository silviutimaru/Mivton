#!/usr/bin/env node

/**
 * Test chat endpoints without authentication to isolate the issue
 */

const fetch = require('node-fetch');

async function testChatWithoutAuth() {
    console.log('🧪 Testing chat endpoints without authentication...');
    
    const baseUrl = 'https://www.mivton.com';
    
    try {
        // Test 1: Try conversation endpoint without auth
        console.log('\n1. Testing conversation endpoint without auth...');
        const conversationResponse = await fetch(`${baseUrl}/api/chat/conversation/12`, {
            method: 'GET'
        });
        
        console.log('📊 Response status:', conversationResponse.status);
        const conversationData = await conversationResponse.json();
        console.log('📊 Response data:', conversationData);
        
        // Test 2: Try send message endpoint without auth
        console.log('\n2. Testing send message endpoint without auth...');
        const sendResponse = await fetch(`${baseUrl}/api/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipientId: 12,
                message: 'Test message without auth'
            })
        });
        
        console.log('📊 Response status:', sendResponse.status);
        const sendData = await sendResponse.json();
        console.log('📊 Response data:', sendData);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testChatWithoutAuth();
