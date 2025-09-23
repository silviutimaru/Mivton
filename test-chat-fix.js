#!/usr/bin/env node

/**
 * Test script to verify chat functionality is working
 */

const fetch = require('node-fetch');

async function testChatFunctionality() {
    console.log('🧪 Testing chat functionality...');
    
    // Store cookies for session persistence
    let cookies = '';
    
    try {
        // Test 1: Health check
        console.log('\n1. Testing health endpoint...');
        const healthResponse = await fetch('http://localhost:3000/health');
        const healthData = await healthResponse.json();
        console.log('✅ Health check:', healthData.status);
        
        // Test 2: Test login
        console.log('\n2. Testing login...');
        const loginResponse = await fetch('http://localhost:3000/api/test/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Extract cookies from response
        const setCookie = loginResponse.headers.get('set-cookie');
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
        const conversationResponse = await fetch('http://localhost:3000/api/chat/conversation/12', {
            headers: cookies ? { 'Cookie': cookies } : {}
        });
        const conversationData = await conversationResponse.json();
        console.log('✅ Conversation endpoint:', conversationResponse.ok ? 'SUCCESS' : 'FAILED');
        if (!conversationResponse.ok) {
            console.log('❌ Conversation error:', conversationData.error);
        }
        
        // Test send message endpoint
        const sendResponse = await fetch('http://localhost:3000/api/chat/send', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(cookies ? { 'Cookie': cookies } : {})
            },
            body: JSON.stringify({
                recipientId: 12,
                message: 'Test message from script',
                originalText: 'Test message from script',
                originalLang: 'en',
                translatedText: 'Test message from script',
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
        
        console.log('\n🎉 Chat functionality test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testChatFunctionality();
