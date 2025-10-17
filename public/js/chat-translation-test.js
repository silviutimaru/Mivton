/**
 * 🧪 CHAT TRANSLATION TESTING SCRIPT
 * Run this in browser console to test the translation feature
 */

async function testChatTranslation() {
    console.log('🧪 Starting Chat Translation Tests...');
    console.log('='.repeat(60));
    
    let testsPassed = 0;
    let totalTests = 0;
    
    // Test 1: Languages API
    totalTests++;
    console.log('\n📋 Test 1: Languages API');
    try {
        const response = await fetch('/api/chat/languages');
        const data = await response.json();
        
        if (data.success && data.languages && data.languages.length > 50) {
            console.log(`✅ Languages API: ${data.languages.length} languages available`);
            console.log(`✅ Service Available: ${data.serviceAvailable}`);
            testsPassed++;
        } else {
            console.log(`❌ Languages API: Only ${data.languages?.length || 0} languages`);
        }
    } catch (error) {
        console.log(`❌ Languages API Error: ${error.message}`);
    }
    
    // Test 2: Language Selector Element
    totalTests++;
    console.log('\n🔍 Test 2: Language Selector Element');
    const selector = document.getElementById('chatLanguageSelector');
    if (selector) {
        console.log(`✅ Language Selector: Found`);
        console.log(`✅ Options Count: ${selector.options.length}`);
        if (selector.options.length > 10) {
            console.log(`✅ Multiple Languages: Available`);
            testsPassed++;
        } else {
            console.log(`❌ Only ${selector.options.length} options (should be 67+)`);
        }
    } else {
        console.log(`❌ Language Selector: Not found`);
        console.log(`💡 Make sure you're in a chat conversation`);
    }
    
    // Test 3: User Preferences API
    totalTests++;
    console.log('\n👤 Test 3: User Preferences API');
    try {
        const response = await fetch('/api/user/preferences');
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ User Preferences: Loaded`);
            console.log(`✅ Current Language: ${data.preferences?.language || 'not set'}`);
            testsPassed++;
        } else {
            console.log(`❌ User Preferences: Failed to load`);
        }
    } catch (error) {
        console.log(`❌ User Preferences Error: ${error.message}`);
    }
    
    // Test 4: Socket.IO Connection
    totalTests++;
    console.log('\n🔌 Test 4: Socket.IO Connection');
    if (typeof io !== 'undefined') {
        console.log(`✅ Socket.IO: Library loaded`);
        if (window.friendChat && window.friendChat.socket) {
            console.log(`✅ Socket Connection: Active`);
            testsPassed++;
        } else {
            console.log(`⚠️ Socket Connection: Not active (may need to open chat)`);
        }
    } else {
        console.log(`❌ Socket.IO: Library not loaded`);
    }
    
    // Test 5: Translation Service Status
    totalTests++;
    console.log('\n🌐 Test 5: Translation Service Status');
    try {
        const response = await fetch('/api/chat/languages');
        const data = await response.json();
        
        if (data.serviceAvailable) {
            console.log(`✅ Translation Service: Available`);
            testsPassed++;
        } else {
            console.log(`❌ Translation Service: Not available`);
        }
    } catch (error) {
        console.log(`❌ Translation Service Error: ${error.message}`);
    }
    
    // Test 6: Chat Window Elements
    totalTests++;
    console.log('\n💬 Test 6: Chat Window Elements');
    const chatWindow = document.querySelector('.chat-window');
    const messagesContainer = document.getElementById('chatMessagesContainer');
    
    if (chatWindow && messagesContainer) {
        console.log(`✅ Chat Window: Found`);
        console.log(`✅ Messages Container: Found`);
        testsPassed++;
    } else {
        console.log(`❌ Chat Window: Not found`);
        console.log(`💡 Open a chat conversation to test this`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`🧪 TEST RESULTS: ${testsPassed}/${totalTests} tests passed`);
    
    if (testsPassed === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Translation feature is ready to use.');
        console.log('\n📝 Next Steps:');
        console.log('1. Open a chat conversation');
        console.log('2. Look for language dropdown (🌍 EN)');
        console.log('3. Select a different language (e.g., Romanian)');
        console.log('4. Send/receive messages to test translation');
    } else {
        console.log('⚠️ Some tests failed. Check the errors above.');
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure you\'re logged in');
        console.log('2. Open a chat conversation');
        console.log('3. Check browser console for errors');
        console.log('4. Verify OpenAI API key is set in Railway');
    }
    
    return { passed: testsPassed, total: totalTests };
}

// Test language selector initialization
async function testLanguageSelectorInit() {
    console.log('\n🔤 Testing Language Selector Initialization...');
    
    if (typeof initChatLanguageSelector === 'function') {
        console.log('✅ initChatLanguageSelector function found');
        try {
            await initChatLanguageSelector();
            console.log('✅ Language selector initialization completed');
        } catch (error) {
            console.log(`❌ Language selector init error: ${error.message}`);
        }
    } else {
        console.log('❌ initChatLanguageSelector function not found');
    }
}

// Test message translation (requires two users)
async function testMessageTranslation() {
    console.log('\n💬 Testing Message Translation...');
    console.log('💡 This test requires two browser windows with different users');
    console.log('💡 Instructions:');
    console.log('1. Open two browser windows');
    console.log('2. Login as different users');
    console.log('3. Set different language preferences');
    console.log('4. Send messages between users');
    console.log('5. Check if messages appear translated');
}

// Run all tests
async function runAllTests() {
    await testChatTranslation();
    await testLanguageSelectorInit();
    await testMessageTranslation();
}

// Export functions for manual testing
window.testChatTranslation = testChatTranslation;
window.testLanguageSelectorInit = testLanguageSelectorInit;
window.testMessageTranslation = testMessageTranslation;
window.runAllTests = runAllTests;

console.log('🧪 Chat Translation Testing Script Loaded');
console.log('📝 Available functions:');
console.log('  - testChatTranslation()');
console.log('  - testLanguageSelectorInit()');
console.log('  - testMessageTranslation()');
console.log('  - runAllTests()');
console.log('\n🚀 Run: testChatTranslation() to start testing');
