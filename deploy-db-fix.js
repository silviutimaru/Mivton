// Quick database setup fix for Railway
const { Pool } = require('pg');
const fs = require('fs');

async function setupDatabase() {
    console.log('🚀 Setting up database tables for chat system...');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
        // Read the SQL setup file
        const setupSQL = fs.readFileSync('setup-modern-chat-db.sql', 'utf8');
        
        console.log('📝 Executing database setup SQL...');
        await pool.query(setupSQL);
        
        console.log('✅ Database setup completed successfully!');
        
        // Test the tables
        const testQuery = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('messages', 'chat_conversations', 'message_status', 'typing_status')
        `);
        
        console.log('📋 Created tables:', testQuery.rows.map(r => r.table_name));
        
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    setupDatabase();
}

module.exports = { setupDatabase };