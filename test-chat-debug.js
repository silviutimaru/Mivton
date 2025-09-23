/**
 * Debug chat system on live site
 */

async function debugChatSystem() {
    console.log('🔍 Debugging chat system on live site...');
    
    try {
        // Test 1: Check if dashboard loads
        const response = await fetch('https://www.mivton.com/dashboard.html');
        const content = await response.text();
        
        console.log('📊 Dashboard Status:', response.status);
        
        // Check for chat initialization
        const hasChatInit = content.includes('new BulletproofChat');
        const hasChatScript = content.includes('bulletproof-chat.js');
        const hasChatButton = content.includes('chat-button');
        
        console.log('🔍 Chat System Check:');
        console.log('  - Has BulletproofChat initialization:', hasChatInit);
        console.log('  - Has bulletproof-chat.js script:', hasChatScript);
        console.log('  - Has chat-button elements:', hasChatButton);
        
        // Check for chat functions
        const hasStartChat = content.includes('startChat');
        const hasStartDirectChat = content.includes('startDirectChat');
        
        console.log('🔍 Chat Functions:');
        console.log('  - Has startChat function:', hasStartChat);
        console.log('  - Has startDirectChat function:', hasStartDirectChat);
        
        // Check JavaScript files
        console.log('\n📁 JavaScript Files:');
        const jsFiles = [
            '/js/bulletproof-chat.js',
            '/js/complete-chat-system.js',
            '/js/multilingual-chat.js'
        ];
        
        for (const jsFile of jsFiles) {
            const jsResponse = await fetch(`https://www.mivton.com${jsFile}`);
            console.log(`  - ${jsFile}: ${jsResponse.status} ${jsResponse.ok ? '✅' : '❌'}`);
        }
        
        // Test API endpoints
        console.log('\n🔌 API Endpoints:');
        
        // Login
        const loginResponse = await fetch('https://www.mivton.com/api/test/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        console.log(`  - Test login: ${loginResponse.status} ${loginResponse.ok ? '✅' : '❌'}`);
        
        if (loginResponse.ok) {
            // Test conversation
            const convResponse = await fetch('https://www.mivton.com/api/chat/conversation/12', {
                credentials: 'include'
            });
            console.log(`  - Conversation API: ${convResponse.status} ${convResponse.ok ? '✅' : '❌'}`);
            
            // Test send message
            const sendResponse = await fetch('https://www.mivton.com/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    recipientId: 12,
                    message: 'Debug test message'
                })
            });
            console.log(`  - Send message API: ${sendResponse.status} ${sendResponse.ok ? '✅' : '❌'}`);
        }
        
        console.log('\n🎯 Summary:');
        if (hasChatInit && hasChatScript && hasStartChat) {
            console.log('✅ Chat system appears to be properly deployed');
            console.log('💡 If chat is not working in browser:');
            console.log('   1. Check browser console for JavaScript errors');
            console.log('   2. Make sure you are logged in');
            console.log('   3. Try refreshing the page');
        } else {
            console.log('❌ Chat system deployment issues detected');
            console.log('🔧 Missing components:');
            if (!hasChatInit) console.log('   - BulletproofChat initialization');
            if (!hasChatScript) console.log('   - bulletproof-chat.js script');
            if (!hasStartChat) console.log('   - startChat function');
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    }
}

debugChatSystem();
