/**
 * 🔍 TRANSLATION FEATURES - STARTUP VALIDATION
 * Validates all translation features on server startup
 * Checks: OpenAI API key, translation service, database columns, endpoints
 */

const { getDb } = require('./database/connection');

/**
 * Main validation function
 */
async function validateTranslationFeatures() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TRANSLATION FEATURES - STARTUP VALIDATION');
    console.log('='.repeat(60));
    
    let allChecksPass = true;
    
    // =====================================
    // CHECK 1: OpenAI API Key
    // =====================================
    console.log('\n📝 Checking OpenAI API Key...');
    if (process.env.OPENAI_API_KEY) {
        const keyPreview = process.env.OPENAI_API_KEY.substring(0, 10) + '...';
        console.log(`✅ OpenAI API Key: Present (${keyPreview})`);
    } else {
        console.log('⚠️ OpenAI API Key: MISSING');
        console.log('   Translation features will not work without API key');
        console.log('   Set OPENAI_API_KEY in your environment variables');
        allChecksPass = false;
    }
    
    // =====================================
    // CHECK 2: Translation Service
    // =====================================
    console.log('\n📝 Checking Translation Service...');
    try {
        const translationService = require('./services/openai-translation');
        
        if (translationService.isAvailable()) {
            console.log('✅ Translation Service: Available');
            
            // Test a simple translation if API key exists
            if (process.env.OPENAI_API_KEY) {
                console.log('   Testing service status...');
                try {
                    const status = await translationService.getStatus();
                    if (status.available) {
                        console.log(`   ✅ Service Status: ${status.status}`);
                        console.log(`   ✅ Model: ${status.model}`);
                    } else {
                        console.log(`   ⚠️ Service Status: ${status.error}`);
                    }
                } catch (error) {
                    console.log(`   ⚠️ Could not test service: ${error.message}`);
                }
            }
        } else {
            console.log('⚠️ Translation Service: Unavailable (API key missing)');
            allChecksPass = false;
        }
    } catch (error) {
        console.log(`❌ Translation Service: Failed to load`);
        console.log(`   Error: ${error.message}`);
        allChecksPass = false;
    }
    
    // =====================================
    // CHECK 3: Database Columns
    // =====================================
    console.log('\n📝 Checking Database Columns...');
    try {
        const columnsExist = await checkTranslationColumns();
        
        if (columnsExist.users_preferred_chat_language) {
            console.log('✅ users.preferred_chat_language: Present');
        } else {
            console.log('❌ users.preferred_chat_language: Missing');
            allChecksPass = false;
        }
        
        if (columnsExist.users_translation_enabled) {
            console.log('✅ users.translation_enabled: Present');
        } else {
            console.log('❌ users.translation_enabled: Missing');
            allChecksPass = false;
        }
        
        if (columnsExist.messages_original_language) {
            console.log('✅ chat_messages.original_language: Present');
        } else {
            console.log('❌ chat_messages.original_language: Missing');
            allChecksPass = false;
        }
        
        if (columnsExist.messages_translated_content) {
            console.log('✅ chat_messages.translated_content: Present');
        } else {
            console.log('❌ chat_messages.translated_content: Missing');
            allChecksPass = false;
        }
        
        if (columnsExist.messages_translation_language) {
            console.log('✅ chat_messages.translation_language: Present');
        } else {
            console.log('❌ chat_messages.translation_language: Missing');
            allChecksPass = false;
        }
        
        if (columnsExist.messages_is_translated) {
            console.log('✅ chat_messages.is_translated: Present');
        } else {
            console.log('❌ chat_messages.is_translated: Missing');
            allChecksPass = false;
        }
        
    } catch (error) {
        console.log(`❌ Database Column Check: Failed`);
        console.log(`   Error: ${error.message}`);
        allChecksPass = false;
    }
    
    // =====================================
    // CHECK 4: Chat API Endpoints
    // =====================================
    console.log('\n📝 Checking Chat API Endpoints...');
    try {
        const chatApi = require('./routes/chat-api');
        console.log('✅ Chat API: Loaded');
        console.log('   Endpoints should include:');
        console.log('   - GET  /api/chat/languages');
        console.log('   - PUT  /api/chat/messages/:messageId/translate');
        console.log('   - GET  /api/chat/messages/:conversationId (enhanced)');
    } catch (error) {
        console.log(`❌ Chat API: Failed to load`);
        console.log(`   Error: ${error.message}`);
        allChecksPass = false;
    }
    
    // =====================================
    // CHECK 5: User Preferences Endpoint
    // =====================================
    console.log('\n📝 Checking User Preferences API...');
    try {
        const userPrefsApi = require('./routes/user-preferences');
        console.log('✅ User Preferences API: Loaded');
        console.log('   Endpoints should include:');
        console.log('   - PUT  /api/user/chat-language');
    } catch (error) {
        console.log(`❌ User Preferences API: Failed to load`);
        console.log(`   Error: ${error.message}`);
        allChecksPass = false;
    }
    
    // =====================================
    // CHECK 6: Frontend Resources
    // =====================================
    console.log('\n📝 Checking Frontend Resources...');
    const fs = require('fs');
    const path = require('path');
    
    const languageSelectorPath = path.join(__dirname, 'public', 'js', 'chat-language-selector.js');
    if (fs.existsSync(languageSelectorPath)) {
        console.log('✅ Frontend: chat-language-selector.js present');
    } else {
        console.log('⚠️ Frontend: chat-language-selector.js missing');
        allChecksPass = false;
    }
    
    // =====================================
    // FINAL SUMMARY
    // =====================================
    console.log('\n' + '='.repeat(60));
    if (allChecksPass) {
        console.log('✅ TRANSLATION FEATURES: ALL CHECKS PASSED');
        console.log('   Translation features are ready to use');
    } else {
        console.log('⚠️ TRANSLATION FEATURES: SOME CHECKS FAILED');
        console.log('   Review the warnings above');
        console.log('   Translation features may work with limitations');
    }
    console.log('='.repeat(60) + '\n');
    
    return allChecksPass;
}

/**
 * Check if translation columns exist in database
 */
async function checkTranslationColumns() {
    const db = getDb();
    
    const result = {
        users_preferred_chat_language: false,
        users_translation_enabled: false,
        messages_original_language: false,
        messages_translated_content: false,
        messages_translation_language: false,
        messages_is_translated: false
    };
    
    try {
        // Check users table columns
        const usersColumns = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('preferred_chat_language', 'translation_enabled')
        `);
        
        usersColumns.rows.forEach(row => {
            if (row.column_name === 'preferred_chat_language') {
                result.users_preferred_chat_language = true;
            }
            if (row.column_name === 'translation_enabled') {
                result.users_translation_enabled = true;
            }
        });
        
        // Check chat_messages table columns
        const messagesColumns = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'chat_messages' 
            AND column_name IN ('original_language', 'translated_content', 'translation_language', 'is_translated')
        `);
        
        messagesColumns.rows.forEach(row => {
            if (row.column_name === 'original_language') {
                result.messages_original_language = true;
            }
            if (row.column_name === 'translated_content') {
                result.messages_translated_content = true;
            }
            if (row.column_name === 'translation_language') {
                result.messages_translation_language = true;
            }
            if (row.column_name === 'is_translated') {
                result.messages_is_translated = true;
            }
        });
        
    } catch (error) {
        console.log('⚠️ Error checking columns:', error.message);
    }
    
    return result;
}

module.exports = {
    validateTranslationFeatures,
    checkTranslationColumns
};

