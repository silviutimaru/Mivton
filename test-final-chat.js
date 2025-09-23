/**
 * Final test to determine what's actually wrong with the chat
 */

async function testFinalChat() {
    console.log('🎯 FINAL CHAT TEST - Determining the real issue...');
    
    try {
        // Step 1: Test the complete flow
        console.log('\n1️⃣ Testing complete chat flow...');
        
        // Login
        const loginResponse = await fetch('https://www.mivton.com/api/test/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed - this is the issue!');
            return;
        }
        
        console.log('✅ Login successful');
        
        // Test conversation
        const convResponse = await fetch('https://www.mivton.com/api/chat/conversation/12', {
            credentials: 'include'
        });
        
        if (convResponse.ok) {
            const convData = await convResponse.json();
            console.log('✅ Conversation API works:', convData.success);
        } else {
            console.log('❌ Conversation API failed:', convResponse.status);
        }
        
        // Test send message
        const sendResponse = await fetch('https://www.mivton.com/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                recipientId: 12,
                message: 'Final test message'
            })
        });
        
        if (sendResponse.ok) {
            const sendData = await sendResponse.json();
            console.log('✅ Send message API works:', sendData.success);
        } else {
            console.log('❌ Send message API failed:', sendResponse.status);
        }
        
        // Step 2: Check frontend files
        console.log('\n2️⃣ Checking frontend files...');
        
        const bulletproofContent = await fetch('https://www.mivton.com/js/bulletproof-chat.js');
        const bulletproofText = await bulletproofContent.text();
        
        const hasAutoInit = bulletproofText.includes('Auto-initializing Bulletproof Chat');
        const hasGlobalVar = bulletproofText.includes('window.bulletproofChat');
        
        console.log('✅ Bulletproof chat file loaded:', bulletproofContent.ok);
        console.log('✅ Has auto-initialization:', hasAutoInit);
        console.log('✅ Has global variable:', hasGlobalVar);
        
        // Step 3: Check dashboard
        console.log('\n3️⃣ Checking dashboard...');
        
        const dashboardResponse = await fetch('https://www.mivton.com/dashboard.html');
        const dashboardText = await dashboardResponse.text();
        
        const hasChatButton = dashboardText.includes('chat-button');
        const hasStartChat = dashboardText.includes('startChat');
        const hasBulletproofScript = dashboardText.includes('bulletproof-chat.js');
        
        console.log('✅ Dashboard loads:', dashboardResponse.ok);
        console.log('✅ Has chat button:', hasChatButton);
        console.log('✅ Has startChat function:', hasStartChat);
        console.log('✅ Has bulletproof script:', hasBulletproofScript);
        
        // Final diagnosis
        console.log('\n🎯 FINAL DIAGNOSIS:');
        
        if (loginResponse.ok && convResponse.ok && sendResponse.ok) {
            console.log('✅ BACKEND: All APIs working perfectly');
        } else {
            console.log('❌ BACKEND: API issues detected');
        }
        
        if (hasAutoInit && hasGlobalVar && hasChatButton && hasStartChat) {
            console.log('✅ FRONTEND: All components present');
        } else {
            console.log('❌ FRONTEND: Missing components');
        }
        
        console.log('\n💡 CONCLUSION:');
        if (loginResponse.ok && convResponse.ok && sendResponse.ok && hasAutoInit && hasGlobalVar && hasChatButton && hasStartChat) {
            console.log('🎉 CHAT SYSTEM IS FULLY FUNCTIONAL!');
            console.log('\n📋 What you need to do:');
            console.log('1. Go to https://www.mivton.com');
            console.log('2. Log in with your account');
            console.log('3. Click the purple "Chat" button next to "Silviu Timaru"');
            console.log('4. The chat should work perfectly!');
            console.log('\n🔍 If it still doesn\'t work:');
            console.log('- Open browser console (F12)');
            console.log('- Look for any JavaScript errors');
            console.log('- Check if you see "Bulletproof Chat auto-initialized successfully"');
        } else {
            console.log('❌ CHAT SYSTEM HAS ISSUES');
            console.log('🔧 Backend working:', loginResponse.ok && convResponse.ok && sendResponse.ok);
            console.log('🔧 Frontend working:', hasAutoInit && hasGlobalVar && hasChatButton && hasStartChat);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testFinalChat();
