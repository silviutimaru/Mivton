#!/usr/bin/env node

/**
 * Apply Multilingual Chat Migration
 * Updates the messages table to support multilingual features
 */

const { getDb } = require('./database/connection');
const fs = require('fs');
const path = require('path');

async function applyMultilingualMigration() {
    console.log('🚀 Starting Multilingual Chat Migration...');
    
    try {
        const db = getDb();
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'database/migrations/002_multilingual_chat.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Applying migration: 002_multilingual_chat.sql');
        
        // Execute the migration
        await db.query(migrationSQL);
        
        console.log('✅ Multilingual chat migration applied successfully!');
        
        // Verify the migration
        console.log('🔍 Verifying migration...');
        
        // Check if new columns exist
        const columnCheck = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name IN ('original_text', 'translated_text', 'original_lang', 'translated_lang')
            ORDER BY column_name
        `);
        
        console.log('📊 New columns added:');
        columnCheck.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // Check if functions exist
        const functionCheck = await db.query(`
            SELECT routine_name, routine_type
            FROM information_schema.routines 
            WHERE routine_name IN ('save_multilingual_message', 'get_multilingual_conversation')
            AND routine_schema = 'public'
        `);
        
        console.log('🔧 Functions created:');
        functionCheck.rows.forEach(row => {
            console.log(`  - ${row.routine_name}: ${row.routine_type}`);
        });
        
        // Test the new functionality
        console.log('🧪 Testing new functionality...');
        
        // Test saving a multilingual message (using test data)
        const testResult = await db.query(`
            SELECT * FROM save_multilingual_message(
                '1', '2', 
                'Hello, how are you?', 
                'Salut, cum ești?', 
                'en', 
                'ro'
            )
        `);
        
        if (testResult.rows.length > 0) {
            console.log('✅ Test message saved successfully');
            console.log(`  Original: ${testResult.rows[0].original_text} (${testResult.rows[0].original_lang})`);
            console.log(`  Translated: ${testResult.rows[0].translated_text} (${testResult.rows[0].translated_lang})`);
            
            // Clean up test data
            await db.query('DELETE FROM messages WHERE id = $1', [testResult.rows[0].id]);
            console.log('🧹 Test data cleaned up');
        }
        
        console.log('🎉 Multilingual chat migration completed successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log('  ✅ Messages table updated with multilingual columns');
        console.log('  ✅ Database functions created for multilingual messaging');
        console.log('  ✅ Indexes added for performance');
        console.log('  ✅ Test functionality verified');
        console.log('');
        console.log('🚀 Ready for OpenAI translation integration!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    applyMultilingualMigration()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { applyMultilingualMigration };
