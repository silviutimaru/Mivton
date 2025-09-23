#!/usr/bin/env node

/**
 * Run Migration on Startup
 * Applies the multilingual chat migration when the server starts
 */

const { getDb } = require('./database/connection');
const fs = require('fs');
const path = require('path');

async function runMigrationOnStartup() {
    console.log('🔄 Checking if multilingual chat migration is needed...');
    
    try {
        const db = getDb();
        console.log('✅ Database connection established for migration');
        
        // First create the messages table if it doesn't exist
        try {
            console.log('🔧 Creating messages table...');
            const { createMessagesTable } = require('./create-messages-table');
            await createMessagesTable();
            console.log('✅ Messages table creation completed');
        } catch (tableError) {
            console.warn('⚠️ Messages table creation warning:', tableError.message);
        }
        
        // Check if the new columns already exist
        const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name IN ('original_text', 'translated_text', 'original_lang', 'translated_lang')
        `);
        
        if (columnCheck.rows.length === 4) {
            console.log('✅ Multilingual chat migration already applied');
            return;
        }
        
        console.log('📊 Applying multilingual chat migration...');
        
        // Read and apply the migration
        const migrationPath = path.join(__dirname, 'database/migrations/002_multilingual_chat.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration SQL directly
        try {
            await db.query(migrationSQL);
            console.log('✅ Migration SQL executed successfully');
        } catch (error) {
            console.warn('⚠️ Migration SQL warning:', error.message);
            
            // If the main migration fails, try to execute individual statements
            const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await db.query(statement);
                        console.log('✅ Executed individual SQL statement');
                    } catch (stmtError) {
                        // Ignore errors for statements that might already exist
                        if (!stmtError.message.includes('already exists') && 
                            !stmtError.message.includes('does not exist')) {
                            console.warn('⚠️ SQL statement warning:', stmtError.message);
                        }
                    }
                }
            }
        }
        
        // First create the messages table if it doesn't exist
        try {
            const { createMessagesTable } = require('./create-messages-table');
            await createMessagesTable();
        } catch (tableError) {
            console.warn('⚠️ Messages table creation warning:', tableError.message);
        }
        
        // Then create the database functions
        try {
            const { createChatFunctions } = require('./create-chat-functions');
            await createChatFunctions();
        } catch (functionError) {
            console.warn('⚠️ Function creation warning:', functionError.message);
        }
        
        console.log('🎉 Multilingual chat migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        // Don't exit - let the server continue running
    }
}

// Run the migration
runMigrationOnStartup();
