#!/usr/bin/env node

/**
 * Create Messages Table
 * Creates the basic messages table if it doesn't exist
 */

const { getDb } = require('./database/connection');

async function createMessagesTable() {
    console.log('🔧 Creating messages table...');
    
    try {
        const db = getDb();
        
        // Create the basic messages table
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS messages (
                id BIGSERIAL PRIMARY KEY,
                sender_id TEXT NOT NULL,
                recipient_id TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;
        
        await db.query(createTableSQL);
        console.log('✅ Created messages table');
        
        // Add multilingual columns if they don't exist
        const addColumnsSQL = `
            ALTER TABLE messages
            ADD COLUMN IF NOT EXISTS original_text TEXT,
            ADD COLUMN IF NOT EXISTS translated_text TEXT,
            ADD COLUMN IF NOT EXISTS original_lang VARCHAR(10),
            ADD COLUMN IF NOT EXISTS translated_lang VARCHAR(10);
        `;
        
        await db.query(addColumnsSQL);
        console.log('✅ Added multilingual columns to messages table');
        
        // Update existing rows to populate new columns
        const updateRowsSQL = `
            UPDATE messages
            SET
                original_text = COALESCE(original_text, body),
                translated_text = COALESCE(translated_text, body),
                original_lang = COALESCE(original_lang, 'en'),
                translated_lang = COALESCE(translated_lang, 'en')
            WHERE original_text IS NULL OR translated_text IS NULL;
        `;
        
        await db.query(updateRowsSQL);
        console.log('✅ Updated existing message rows');
        
        // Make new columns NOT NULL after population
        const makeNotNullSQL = `
            ALTER TABLE messages 
            ALTER COLUMN original_text SET NOT NULL,
            ALTER COLUMN translated_text SET NOT NULL,
            ALTER COLUMN original_lang SET NOT NULL,
            ALTER COLUMN translated_lang SET NOT NULL;
        `;
        
        try {
            await db.query(makeNotNullSQL);
            console.log('✅ Made multilingual columns NOT NULL');
        } catch (error) {
            console.warn('⚠️ Could not make columns NOT NULL (they may already be NOT NULL):', error.message);
        }
        
        console.log('🎉 Messages table setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Error creating messages table:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createMessagesTable()
        .then(() => {
            console.log('✅ Messages table creation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Messages table creation failed:', error);
            process.exit(1);
        });
}

module.exports = { createMessagesTable };
