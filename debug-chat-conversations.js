// Debug script to test chat conversations API
console.log('🔍 Testing chat conversations API...');

async function testChatAPI() {
    try {
        console.log('📡 Calling /api/chat/conversations...');
        
        const response = await fetch('/api/chat/conversations', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('📝 Response status:', response.status);
        console.log('📝 Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            console.error('❌ Response not OK:', response.status, response.statusText);
            const text = await response.text();
            console.error('❌ Error response body:', text);
            return;
        }

        const data = await response.json();
        console.log('✅ API response:', data);
        
        if (data.success) {
            console.log(`📊 Found ${data.conversations.length} conversations`);
            data.conversations.forEach((conv, index) => {
                console.log(`  ${index + 1}. ID: ${conv.id}, Other user: ${conv.other_username} (${conv.other_user_id})`);
                console.log(`     Last message: "${conv.last_message_content}"`);
            });
        } else {
            console.error('❌ API returned error:', data.error);
        }

    } catch (error) {
        console.error('❌ Fetch error:', error);
    }
}

// Test immediately when loaded
testChatAPI();

// Also expose for manual testing
window.testChatAPI = testChatAPI;