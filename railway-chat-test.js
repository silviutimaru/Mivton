#!/usr/bin/env node

/**
 * Test chat functionality using Railway database directly
 * This bypasses local database setup issues
 */

const fetch = require('node-fetch');

async function testRailwayChat() {
    console.log('🧪 Testing chat functionality with Railway database...');
    
    const baseUrl = 'https://www.mivton.com';
    
    try {
        // Test 1: Health check
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await fetch(`${baseUrl}/health`);
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check:', healthData.status);
        } else {
            console.log('❌ Health check failed:', healthResponse.status);
        }
        
        // Test 2: Test login
        console.log('\n2. Testing login...');
        const loginResponse = await fetch(`${baseUrl}/api/test/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Extract cookies from response
        const setCookie = loginResponse.headers.get('set-cookie');
        let cookies = '';
        if (setCookie) {
            cookies = setCookie;
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Login test:', loginData.success ? 'SUCCESS' : 'FAILED');
        
        if (!loginData.success) {
            console.log('❌ Login failed:', loginData.error);
            return;
        }
        
        // Test 3: Test chat API endpoints
        console.log('\n3. Testing chat API endpoints...');
        
        // Test conversation endpoint
        const conversationResponse = await fetch(`${baseUrl}/api/chat/conversation/12`, {
            headers: cookies ? { 'Cookie': cookies } : {}
        });
        const conversationData = await conversationResponse.json();
        console.log('✅ Conversation endpoint:', conversationResponse.ok ? 'SUCCESS' : 'FAILED');
        if (!conversationResponse.ok) {
            console.log('❌ Conversation error:', conversationData.error);
        } else {
            console.log('✅ Conversation loaded:', conversationData.conversation?.length || 0, 'messages');
        }
        
        // Test send message endpoint
        const sendResponse = await fetch(`${baseUrl}/api/chat/send`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(cookies ? { 'Cookie': cookies } : {})
            },
            body: JSON.stringify({
                recipientId: 12,
                message: 'Test message from Railway test script',
                originalText: 'Test message from Railway test script',
                originalLang: 'en',
                translatedText: 'Test message from Railway test script',
                translatedLang: 'en'
            })
        });
        const sendData = await sendResponse.json();
        console.log('✅ Send message endpoint:', sendResponse.ok ? 'SUCCESS' : 'FAILED');
        if (!sendResponse.ok) {
            console.log('❌ Send message error:', sendData.error);
        } else {
            console.log('✅ Message sent successfully:', sendData.message?.id);
        }
        
        console.log('\n🎉 Railway chat functionality test completed!');
        console.log('\n💡 You can now test the chat functionality on https://www.mivton.com');
        console.log('💡 Click the purple chat button next to "Silviu Timaru" to start chatting');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testRailwayChat();
