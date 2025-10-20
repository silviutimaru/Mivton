/**
 * 🔍 OpenAI API Key Test Script
 * Quick test to verify OpenAI API key is working
 */

const OpenAI = require('openai');

async function testOpenAIKey() {
    console.log('🔍 Testing OpenAI API Key...');
    console.log('='.repeat(50));
    
    // Check if API key exists
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log('❌ OPENAI_API_KEY not found in environment variables');
        console.log('   Set it with: export OPENAI_API_KEY=sk-your-key-here');
        return false;
    }
    
    console.log(`✅ API Key found: ${apiKey.substring(0, 10)}...`);
    
    try {
        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: apiKey,
            timeout: 10000
        });
        
        console.log('🔄 Testing API connection...');
        
        // Test 1: List models (simple API call)
        const models = await openai.models.list();
        console.log(`✅ API Connection: Working`);
        console.log(`✅ Available models: ${models.data.length}`);
        
        // Test 2: Simple translation
        console.log('🔄 Testing translation...');
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'You are a translator. Translate the given text accurately. Return only the translation.'
                },
                {
                    role: 'user',
                    content: 'Translate "Hello" to Romanian'
                }
            ],
            max_tokens: 50,
            temperature: 0.3
        });
        
        const translation = response.choices[0]?.message?.content?.trim();
        console.log(`✅ Translation test: "Hello" → "${translation}"`);
        
        // Test 3: Language detection
        console.log('🔄 Testing language detection...');
        const detectionResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'Detect the language of the given text. Respond with only the ISO 639-1 language code (e.g., "en", "ro", "es").'
                },
                {
                    role: 'user',
                    content: 'Detect language: "Salut, cum ești?"'
                }
            ],
            max_tokens: 10,
            temperature: 0.1
        });
        
        const detectedLang = detectionResponse.choices[0]?.message?.content?.trim();
        console.log(`✅ Language detection: "Salut, cum ești?" → "${detectedLang}"`);
        
        console.log('='.repeat(50));
        console.log('🎉 ALL TESTS PASSED! OpenAI API key is working perfectly.');
        console.log('✅ Your chat translation feature should work correctly.');
        
        return true;
        
    } catch (error) {
        console.log('❌ OpenAI API Error:');
        console.log(`   Error: ${error.message}`);
        
        if (error.status === 401) {
            console.log('   🔑 This usually means the API key is invalid or expired');
        } else if (error.status === 429) {
            console.log('   💳 This usually means you\'ve hit your usage limit');
        } else if (error.code === 'ENOTFOUND') {
            console.log('   🌐 This usually means a network connectivity issue');
        }
        
        console.log('='.repeat(50));
        console.log('⚠️ OpenAI API key test failed. Check your key and try again.');
        
        return false;
    }
}

// Run the test
testOpenAIKey().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
});
