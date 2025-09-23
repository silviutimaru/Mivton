#!/usr/bin/env node

/**
 * Comprehensive test for Railway chat functionality
 * This properly handles session management and cookies
 */

const fetch = require('node-fetch');

class RailwayChatTester {
    constructor() {
        this.baseUrl = 'https://www.mivton.com';
        this.cookies = '';
        this.sessionId = '';
    }

    async testLogin() {
        console.log('🔐 Testing login...');
        
        try {
            const response = await fetch(`${this.baseUrl}/api/test/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            // Extract cookies
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) {
                this.cookies = setCookie;
                console.log('✅ Login cookies received:', setCookie.substring(0, 50) + '...');
            }
            
            const data = await response.json();
            console.log('✅ Login response:', data.success ? 'SUCCESS' : 'FAILED');
            
            if (data.success) {
                console.log('👤 Logged in as:', data.user.fullName);
                return true;
            } else {
                console.log('❌ Login failed:', data.error);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Login error:', error.message);
            return false;
        }
    }

    async testConversationEndpoint() {
        console.log('\n📨 Testing conversation endpoint...');
        
        try {
            const response = await fetch(`${this.baseUrl}/api/chat/conversation/12`, {
                method: 'GET',
                headers: {
                    'Cookie': this.cookies,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            console.log('📊 Response status:', response.status);
            console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Conversation endpoint: SUCCESS');
                console.log('📝 Messages found:', data.conversation?.length || 0);
                return true;
            } else {
                console.log('❌ Conversation endpoint: FAILED');
                console.log('❌ Error:', data.error || data.message);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Conversation endpoint error:', error.message);
            return false;
        }
    }

    async testSendMessage() {
        console.log('\n📤 Testing send message endpoint...');
        
        try {
            const response = await fetch(`${this.baseUrl}/api/chat/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this.cookies,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                body: JSON.stringify({
                    recipientId: 12,
                    message: 'Test message from comprehensive test script',
                    originalText: 'Test message from comprehensive test script',
                    originalLang: 'en',
                    translatedText: 'Test message from comprehensive test script',
                    translatedLang: 'en'
                })
            });
            
            console.log('📊 Response status:', response.status);
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ Send message endpoint: SUCCESS');
                console.log('📝 Message ID:', data.message?.id);
                return true;
            } else {
                console.log('❌ Send message endpoint: FAILED');
                console.log('❌ Error:', data.error || data.message);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Send message error:', error.message);
            return false;
        }
    }

    async testUserInfo() {
        console.log('\n👤 Testing user info endpoint...');
        
        try {
            const response = await fetch(`${this.baseUrl}/api/user/me`, {
                method: 'GET',
                headers: {
                    'Cookie': this.cookies,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            console.log('📊 Response status:', response.status);
            
            const data = await response.json();
            
            if (response.ok) {
                console.log('✅ User info endpoint: SUCCESS');
                console.log('👤 User ID:', data.user?.id);
                console.log('👤 User name:', data.user?.fullName);
                return true;
            } else {
                console.log('❌ User info endpoint: FAILED');
                console.log('❌ Error:', data.error || data.message);
                return false;
            }
            
        } catch (error) {
            console.error('❌ User info error:', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Running comprehensive Railway chat tests...\n');
        
        const loginSuccess = await this.testLogin();
        if (!loginSuccess) {
            console.log('\n❌ Cannot continue without successful login');
            return;
        }
        
        await this.testUserInfo();
        await this.testConversationEndpoint();
        await this.testSendMessage();
        
        console.log('\n🎉 Comprehensive test completed!');
    }
}

// Run the comprehensive test
const tester = new RailwayChatTester();
tester.runAllTests();
