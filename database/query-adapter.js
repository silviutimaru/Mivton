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
    // Messages table creation removed (chat functionality removed)
    console.log('⚠️ Messages table creation skipped - chat functionality removed');
    return;
}

/**
 * Message saving function removed (chat functionality removed)
 */
async function saveMessage() {
    throw new Error('Chat functionality has been removed');
}

/**
 * Simple conversation loading function (works with both databases)
 */
async function getConversation() {
    throw new Error('Chat functionality has been removed');
}

module.exports = {
    query,
    tableExists,
    ensureMessagesTable,
    saveMessage,
    getConversation
};
