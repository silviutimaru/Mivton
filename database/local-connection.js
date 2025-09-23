// Local SQLite database connection for testing
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, '..', 'local-test.db');
const db = new sqlite3.Database(dbPath);

// Wrapper to make SQLite work like PostgreSQL
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        // Convert PostgreSQL-style queries to SQLite
        let sqliteQuery = sql
            .replace(/\$(\d+)/g, '?') // Replace $1, $2, etc. with ?
            .replace(/CURRENT_TIMESTAMP/g, "datetime('now')")
            .replace(/NOW\(\)/g, "datetime('now')")
            .replace(/ILIKE/g, 'LIKE')
            .replace(/LOWER\(([^)]+)\)/g, 'LOWER($1)')
            .replace(/UPPER\(([^)]+)\)/g, 'UPPER($1)');
        
        if (sqliteQuery.trim().toLowerCase().startsWith('select')) {
            db.all(sqliteQuery, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ rows: rows || [] });
                }
            });
        } else {
            db.run(sqliteQuery, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ 
                        rows: [{ id: this.lastID }],
                        rowCount: this.changes 
                    });
                }
            });
        }
    });
}

// Test connection
const testConnection = async () => {
    try {
        const result = await query('SELECT datetime("now") as now');
        console.log('✅ Local SQLite database connected:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('❌ Local database connection error:', err.message);
        return false;
    }
};

// Initialize database connection (for server.js compatibility)
const initializeDatabase = async () => {
    try {
        await testConnection();
        console.log('✅ Local database initialization completed');
        return true;
    } catch (err) {
        console.error('❌ Local database initialization failed:', err.message);
        throw err;
    }
};

// Get database instance with query method
const getDb = () => {
    // Add query method to db object for compatibility
    if (!db.query) {
        db.query = query;
    }
    return db;
};

// Get client for transactions (SQLite doesn't need this, but for compatibility)
const getClient = async () => {
    return db;
};

// Close database (for compatibility)
const closePool = async () => {
    return new Promise((resolve) => {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
            } else {
                console.log('✅ Local database closed');
            }
            resolve();
        });
    });
};

module.exports = {
    query,
    getDb,
    testConnection,
    initializeDatabase,
    getClient,
    closePool
};
