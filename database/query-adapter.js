/**
 * Database Query Adapter
 * Provides database-agnostic query functions that work with both PostgreSQL and SQLite
 */

const { query: originalQuery } = require('./connection');

/**
 * Database-agnostic query function
 * Automatically adapts PostgreSQL queries to work with SQLite
 */
async function query(text, params = []) {
    try {
        // Try the original query first
        return await originalQuery(text, params);
    } catch (error) {
        // If it's a PostgreSQL-specific error, try to adapt it
        if (error.code === 'SQLITE_ERROR' && error.message.includes('no such function')) {
            const adaptedQuery = adaptPostgreSQLToSQLite(text);
            if (adaptedQuery !== text) {
                console.log('🔄 Adapting PostgreSQL query for SQLite:', adaptedQuery);
                return await originalQuery(adaptedQuery, params);
            }
        }
        
        // If it's a table existence check error, handle it gracefully
        if (error.code === 'SQLITE_ERROR' && error.message.includes('near "FROM"')) {
            console.log('⚠️ Table existence check failed, assuming table does not exist');
            return { rows: [], rowCount: 0 };
        }
        
        // Re-throw the original error if we can't adapt it
        throw error;
    }
}

/**
 * Adapt PostgreSQL-specific syntax to SQLite
 */
function adaptPostgreSQLToSQLite(query) {
    let adapted = query;
    
    // Replace PostgreSQL-specific functions with SQLite equivalents
    adapted = adapted.replace(/to_timestamp\(/g, 'datetime(');
    adapted = adapted.replace(/NOW\(\)/g, "datetime('now')");
    adapted = adapted.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");
    
    // Replace PostgreSQL information_schema with SQLite equivalent
    adapted = adapted.replace(
        /SELECT EXISTS \(\s*SELECT FROM information_schema\.tables\s+WHERE table_schema = 'public'\s+AND table_name = '([^']+)'\s*\)/gi,
        "SELECT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='$1')"
    );
    
    // Replace PostgreSQL-specific data types
    adapted = adapted.replace(/BIGSERIAL/g, 'INTEGER');
    adapted = adapted.replace(/TIMESTAMPTZ/g, 'DATETIME');
    adapted = adapted.replace(/TEXT\[\]/g, 'TEXT');
    
    // Replace PostgreSQL-specific syntax
    adapted = adapted.replace(/ON DELETE CASCADE/gi, '');
    adapted = adapted.replace(/ON UPDATE CASCADE/gi, '');
    
    return adapted;
}

/**
 * Check if a table exists (database-agnostic)
 */
async function tableExists(tableName) {
    try {
        // Try PostgreSQL first
        const result = await query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
            [tableName]
        );
        return result.rows.length > 0 && result.rows[0].exists === true;
    } catch (error) {
        try {
            // Fallback to SQLite
            const result = await query(
                "SELECT EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name=?)",
                [tableName]
            );
            return result.rows.length > 0 && result.rows[0][Object.keys(result.rows[0])[0]] === 1;
        } catch (sqliteError) {
            console.warn(`⚠️ Could not check if table ${tableName} exists:`, error.message);
            return false;
        }
    }
}

/**
 * Create a simple messages table if it doesn't exist
 */
async function ensureMessagesTable() {
    try {
        const exists = await tableExists('messages');
        if (!exists) {
            console.log('📝 Creating messages table...');
            
            // Try PostgreSQL syntax first
            try {
                await query(`
                    CREATE TABLE IF NOT EXISTS messages (
                        id BIGSERIAL PRIMARY KEY,
                        sender_id TEXT NOT NULL,
                        recipient_id TEXT NOT NULL,
                        body TEXT NOT NULL,
                        original_text TEXT,
                        translated_text TEXT,
                        original_lang VARCHAR(10),
                        translated_lang VARCHAR(10),
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    )
                `);
                console.log('✅ Messages table created (PostgreSQL)');
            } catch (pgError) {
                // Fallback to SQLite syntax
                await query(`
                    CREATE TABLE IF NOT EXISTS messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sender_id TEXT NOT NULL,
                        recipient_id TEXT NOT NULL,
                        body TEXT NOT NULL,
                        original_text TEXT,
                        translated_text TEXT,
                        original_lang VARCHAR(10),
                        translated_lang VARCHAR(10),
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('✅ Messages table created (SQLite)');
            }
        }
    } catch (error) {
        console.error('❌ Error creating messages table:', error);
        throw error;
    }
}

/**
 * Simple message saving function (works with both databases)
 */
async function saveMessage(senderId, recipientId, message, originalText = null, translatedText = null, originalLang = null, translatedLang = null) {
    try {
        await ensureMessagesTable();
        
        // Try PostgreSQL syntax first
        try {
            const result = await query(`
                INSERT INTO messages (sender_id, recipient_id, body, original_text, translated_text, original_lang, translated_lang, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING *
            `, [senderId, recipientId, message, originalText, translatedText, originalLang, translatedLang]);
            
            return result.rows[0];
        } catch (pgError) {
            // Fallback to SQLite syntax
            const result = await query(`
                INSERT INTO messages (sender_id, recipient_id, body, original_text, translated_text, original_lang, translated_lang, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                RETURNING *
            `, [senderId, recipientId, message, originalText, translatedText, originalLang, translatedLang]);
            
            return result.rows[0];
        }
    } catch (error) {
        console.error('❌ Error saving message:', error);
        throw error;
    }
}

/**
 * Simple conversation loading function (works with both databases)
 */
async function getConversation(user1Id, user2Id, limit = 50, offset = 0) {
    try {
        await ensureMessagesTable();
        
        // Try PostgreSQL syntax first
        try {
            const result = await query(`
                SELECT m.*, 
                       CASE WHEN m.sender_id = $1 THEN true ELSE false END as is_sender,
                       u.full_name as sender_name,
                       u.profile_picture as sender_profile_picture
                FROM messages m
                LEFT JOIN users u ON u.id::TEXT = m.sender_id
                WHERE (m.sender_id = $1 AND m.recipient_id = $2) 
                   OR (m.sender_id = $2 AND m.recipient_id = $1)
                ORDER BY m.created_at DESC
                LIMIT $3 OFFSET $4
            `, [user1Id, user2Id, limit, offset]);
            
            return result.rows;
        } catch (pgError) {
            // Fallback to SQLite syntax
            const result = await query(`
                SELECT m.*, 
                       CASE WHEN m.sender_id = ? THEN 1 ELSE 0 END as is_sender,
                       u.full_name as sender_name,
                       u.profile_picture as sender_profile_picture
                FROM messages m
                LEFT JOIN users u ON u.id = m.sender_id
                WHERE (m.sender_id = ? AND m.recipient_id = ?) 
                   OR (m.sender_id = ? AND m.recipient_id = ?)
                ORDER BY m.created_at DESC
                LIMIT ? OFFSET ?
            `, [user1Id, user1Id, user2Id, user2Id, user1Id, limit, offset]);
            
            return result.rows;
        }
    } catch (error) {
        console.error('❌ Error loading conversation:', error);
        throw error;
    }
}

module.exports = {
    query,
    tableExists,
    ensureMessagesTable,
    saveMessage,
    getConversation
};
