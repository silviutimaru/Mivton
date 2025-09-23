#!/usr/bin/env node

/**
 * Create Multilingual Chat Database Functions
 * Simple script to create the required database functions
 */

const { getDb } = require('./database/connection');

async function createChatFunctions() {
    console.log('🔧 Creating multilingual chat database functions...');
    
    try {
        const db = getDb();
        
        // Create the save_multilingual_message function
        const saveFunctionSQL = `
            CREATE OR REPLACE FUNCTION save_multilingual_message(
                p_sender_id TEXT,
                p_recipient_id TEXT,
                p_original_text TEXT,
                p_translated_text TEXT,
                p_original_lang VARCHAR(10),
                p_translated_lang VARCHAR(10)
            )
            RETURNS TABLE(
                id BIGINT,
                sender_id TEXT,
                recipient_id TEXT,
                body TEXT,
                original_text TEXT,
                translated_text TEXT,
                original_lang VARCHAR(10),
                translated_lang VARCHAR(10),
                created_at TIMESTAMPTZ
            ) AS $$
            BEGIN
                RETURN QUERY
                INSERT INTO messages (
                    sender_id, 
                    recipient_id, 
                    body, 
                    original_text, 
                    translated_text, 
                    original_lang, 
                    translated_lang, 
                    created_at
                )
                VALUES (
                    p_sender_id, 
                    p_recipient_id, 
                    p_translated_text, -- body stores the translated version for display
                    p_original_text, 
                    p_translated_text, 
                    p_original_lang, 
                    p_translated_lang, 
                    NOW()
                )
                RETURNING 
                    messages.id,
                    messages.sender_id,
                    messages.recipient_id,
                    messages.body,
                    messages.original_text,
                    messages.translated_text,
                    messages.original_lang,
                    messages.translated_lang,
                    messages.created_at;
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        await db.query(saveFunctionSQL);
        console.log('✅ Created save_multilingual_message function');
        
        // Create the get_multilingual_conversation function
        const getFunctionSQL = `
            CREATE OR REPLACE FUNCTION get_multilingual_conversation(
                p_user_a TEXT,
                p_user_b TEXT,
                p_limit INTEGER DEFAULT 50
            )
            RETURNS TABLE(
                id BIGINT,
                sender_id TEXT,
                recipient_id TEXT,
                body TEXT,
                original_text TEXT,
                translated_text TEXT,
                original_lang VARCHAR(10),
                translated_lang VARCHAR(10),
                created_at TIMESTAMPTZ,
                sender_name VARCHAR(100),
                recipient_name VARCHAR(100)
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    m.id,
                    m.sender_id,
                    m.recipient_id,
                    m.body,
                    m.original_text,
                    m.translated_text,
                    m.original_lang,
                    m.translated_lang,
                    m.created_at,
                    s.full_name as sender_name,
                    r.full_name as recipient_name
                FROM messages m
                LEFT JOIN users s ON s.id::TEXT = m.sender_id
                LEFT JOIN users r ON r.id::TEXT = m.recipient_id
                WHERE (m.sender_id = p_user_a AND m.recipient_id = p_user_b)
                   OR (m.sender_id = p_user_b AND m.recipient_id = p_user_a)
                ORDER BY m.created_at DESC
                LIMIT p_limit;
            END;
            $$ LANGUAGE plpgsql;
        `;
        
        await db.query(getFunctionSQL);
        console.log('✅ Created get_multilingual_conversation function');
        
        // Grant permissions
        await db.query('GRANT EXECUTE ON FUNCTION save_multilingual_message TO current_user;');
        await db.query('GRANT EXECUTE ON FUNCTION get_multilingual_conversation TO current_user;');
        console.log('✅ Granted permissions on functions');
        
        console.log('🎉 All multilingual chat functions created successfully!');
        
    } catch (error) {
        console.error('❌ Error creating functions:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    createChatFunctions()
        .then(() => {
            console.log('✅ Function creation completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Function creation failed:', error);
            process.exit(1);
        });
}

module.exports = { createChatFunctions };
