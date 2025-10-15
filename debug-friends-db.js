const { pool } = require('./database/connection');

async function checkUserFriends() {
    try {
        console.log('🔍 Checking user friends in database...');
        
        // Get all users first
        const usersResult = await pool.query('SELECT id, username, full_name FROM users ORDER BY id LIMIT 10');
        console.log('📋 Users in database:', usersResult.rows);
        
        // Check friendships table
        const friendshipsResult = await pool.query('SELECT * FROM friendships ORDER BY id LIMIT 10');
        console.log('🤝 Friendships in database:', friendshipsResult.rows);
        
        // Check if tables exist
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'friendships', 'friend_requests')
            ORDER BY table_name
        `);
        console.log('📊 Relevant tables:', tablesResult.rows);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUserFriends();