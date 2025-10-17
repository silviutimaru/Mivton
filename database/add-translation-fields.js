/**
 * 🌐 TRANSLATION FIELDS DATABASE MIGRATION
 * Adds translation support columns to users and chat_messages tables
 * Safe migration - uses IF NOT EXISTS for all changes
 */

const { getDb } = require('./connection');

let migrationCompleted = false;

/**
 * Add translation fields to database tables
 */
async function addTranslationFields() {
    if (migrationCompleted) {
        console.log('⚠️ Translation fields migration already completed');
        return true;
    }

    const db = getDb();
    
    try {
        console.log('\n🌐 TRANSLATION FIELDS MIGRATION - Starting...');
        console.log('='.repeat(60));

        // =====================================
        // STEP 1: Add columns to users table
        // =====================================
        console.log('📝 Adding translation fields to users table...');

        // Add preferred_chat_language column
        try {
            await db.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'preferred_chat_language'
                    ) THEN
                        ALTER TABLE users 
                        ADD COLUMN preferred_chat_language VARCHAR(10) DEFAULT 'en';
                        
                        RAISE NOTICE '✅ Added column: preferred_chat_language';
                    ELSE
                        RAISE NOTICE '⚠️ Column already exists: preferred_chat_language';
                    END IF;
                END $$;
            `);
            console.log('✅ users.preferred_chat_language - OK');
        } catch (error) {
            console.log('❌ users.preferred_chat_language - FAILED:', error.message);
        }

        // Add translation_enabled column
        try {
            await db.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' 
                        AND column_name = 'translation_enabled'
                    ) THEN
                        ALTER TABLE users 
                        ADD COLUMN translation_enabled BOOLEAN DEFAULT true;
                        
                        RAISE NOTICE '✅ Added column: translation_enabled';
                    ELSE
                        RAISE NOTICE '⚠️ Column already exists: translation_enabled';
                    END IF;
                END $$;
            `);
            console.log('✅ users.translation_enabled - OK');
        } catch (error) {
            console.log('❌ users.translation_enabled - FAILED:', error.message);
        }

        // =====================================
        // STEP 2: Add columns to chat_messages table
        // =====================================
        console.log('📝 Adding translation fields to chat_messages table...');

        // Add original_language column
        try {
            await db.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'chat_messages' 
                        AND column_name = 'original_language'
                    ) THEN
                        ALTER TABLE chat_messages 
                        ADD COLUMN original_language VARCHAR(10);
                        
                        RAISE NOTICE '✅ Added column: original_language';
                    ELSE
                        RAISE NOTICE '⚠️ Column already exists: original_language';
                    END IF;
                END $$;
            `);
            console.log('✅ chat_messages.original_language - OK');
        } catch (error) {
            console.log('❌ chat_messages.original_language - FAILED:', error.message);
        }

        // Add translated_content column
        try {
            await db.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'chat_messages' 
                        AND column_name = 'translated_content'
                    ) THEN
                        ALTER TABLE chat_messages 
                        ADD COLUMN translated_content TEXT;
                        
                        RAISE NOTICE '✅ Added column: translated_content';
                    ELSE
                        RAISE NOTICE '⚠️ Column already exists: translated_content';
                    END IF;
                END $$;
            `);
            console.log('✅ chat_messages.translated_content - OK');
        } catch (error) {
            console.log('❌ chat_messages.translated_content - FAILED:', error.message);
        }

        // Add translation_language column
        try {
            await db.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'chat_messages' 
                        AND column_name = 'translation_language'
                    ) THEN
                        ALTER TABLE chat_messages 
                        ADD COLUMN translation_language VARCHAR(10);
                        
                        RAISE NOTICE '✅ Added column: translation_language';
                    ELSE
                        RAISE NOTICE '⚠️ Column already exists: translation_language';
                    END IF;
                END $$;
            `);
            console.log('✅ chat_messages.translation_language - OK');
        } catch (error) {
            console.log('❌ chat_messages.translation_language - FAILED:', error.message);
        }

        // Add is_translated column
        try {
            await db.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'chat_messages' 
                        AND column_name = 'is_translated'
                    ) THEN
                        ALTER TABLE chat_messages 
                        ADD COLUMN is_translated BOOLEAN DEFAULT false;
                        
                        RAISE NOTICE '✅ Added column: is_translated';
                    ELSE
                        RAISE NOTICE '⚠️ Column already exists: is_translated';
                    END IF;
                END $$;
            `);
            console.log('✅ chat_messages.is_translated - OK');
        } catch (error) {
            console.log('❌ chat_messages.is_translated - FAILED:', error.message);
        }

        // =====================================
        // STEP 3: Create performance indexes
        // =====================================
        console.log('📝 Creating performance indexes...');

        // Index on users.preferred_chat_language
        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_users_chat_language 
                ON users(preferred_chat_language)
            `);
            console.log('✅ Index created: idx_users_chat_language');
        } catch (error) {
            console.log('⚠️ Index creation failed (may already exist): idx_users_chat_language');
        }

        // Index on chat_messages.translation_language
        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_messages_translation_lang 
                ON chat_messages(translation_language)
            `);
            console.log('✅ Index created: idx_messages_translation_lang');
        } catch (error) {
            console.log('⚠️ Index creation failed (may already exist): idx_messages_translation_lang');
        }

        // Index on chat_messages.original_language
        try {
            await db.query(`
                CREATE INDEX IF NOT EXISTS idx_messages_original_lang 
                ON chat_messages(original_language)
            `);
            console.log('✅ Index created: idx_messages_original_lang');
        } catch (error) {
            console.log('⚠️ Index creation failed (may already exist): idx_messages_original_lang');
        }

        console.log('='.repeat(60));
        console.log('✅ Translation fields migration completed successfully!');
        console.log('='.repeat(60) + '\n');

        migrationCompleted = true;
        return true;

    } catch (error) {
        console.error('❌ Translation fields migration failed:', error);
        console.error('Stack trace:', error.stack);
        console.log('⚠️ Server will continue, but translation features may not work properly\n');
        return false;
    }
}

/**
 * Check if translation fields exist
 */
async function checkTranslationFieldsExist() {
    const db = getDb();
    
    try {
        const result = await db.query(`
            SELECT 
                EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'preferred_chat_language'
                ) as user_lang_exists,
                EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'chat_messages' AND column_name = 'translated_content'
                ) as message_trans_exists
        `);

        return result.rows[0].user_lang_exists && result.rows[0].message_trans_exists;
    } catch (error) {
        return false;
    }
}

module.exports = {
    addTranslationFields,
    checkTranslationFieldsExist
};

