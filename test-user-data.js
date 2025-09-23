// Quick test to check user data structure
console.log('🔍 Testing user data structure...');

// Test the /api/auth/me endpoint
async function testUserData() {
    try {
        console.log('📡 Fetching user data...');
        
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Raw API response:', data);
        
        if (data.user) {
            console.log('👤 User object:', data.user);
            console.log('🌐 Available language fields:', {
                'native_language (snake_case)': data.user.native_language,
                'nativeLanguage (camelCase)': data.user.nativeLanguage,
                'all_user_keys': Object.keys(data.user)
            });
            
            // Test language mapping
            const languageMap = {
                'en': { name: 'English', flag: '🇺🇸' },
                'es': { name: 'Spanish', flag: '🇪🇸' },
                'fr': { name: 'French', flag: '🇫🇷' },
                'de': { name: 'German', flag: '🇩🇪' },
                'it': { name: 'Italian', flag: '🇮🇹' },
                'pt': { name: 'Portuguese', flag: '🇵🇹' },
                'ru': { name: 'Russian', flag: '🇷🇺' },
                'ja': { name: 'Japanese', flag: '🇯🇵' },
                'ko': { name: 'Korean', flag: '🇰🇷' },
                'zh': { name: 'Chinese', flag: '🇨🇳' }
            };
            
            const userLang1 = data.user.native_language;
            const userLang2 = data.user.nativeLanguage;
            
            console.log('🧪 Language test results:', {
                'Method 1 (snake_case)': userLang1,
                'Method 1 mapped': languageMap[userLang1],
                'Method 2 (camelCase)': userLang2,
                'Method 2 mapped': languageMap[userLang2],
                'Fallback to en': userLang1 || userLang2 || 'en'
            });
            
        } else {
            console.error('❌ No user object in response');
        }
        
    } catch (error) {
        console.error('❌ Error testing user data:', error);
    }
}

// Run the test
testUserData();

// Export for manual testing
window.testUserData = testUserData;
console.log('💡 You can also run: window.testUserData()');
