/**
 * Debug script to test the user search functionality
 */

const { query } = require('./database/connection');

async function debugUserSearch() {
    try {
        console.log('🔍 Testing user search functionality...');
        
        // First, test basic connection
        const connectionTest = await query('SELECT COUNT(*) FROM users');
        console.log('✅ Database connection OK, total users:', connectionTest.rows[0].count);
        
        // Test simple user fetch
        const simpleTest = await query('SELECT id, username, full_name FROM users LIMIT 5');
        console.log('✅ Simple query OK, sample users:');
        simpleTest.rows.forEach(user => {
            console.log(`   - ${user.username}: ${user.full_name}`);
        });
        
        // Test search with ILIKE
        const searchTerm = 'a'; // Simple search term
        const searchTest = await query(
            'SELECT id, username, full_name FROM users WHERE username ILIKE $1 LIMIT 5',
            [`%${searchTerm}%`]
        );
        console.log(`✅ Search test OK, users matching '%${searchTerm}%':`);
        searchTest.rows.forEach(user => {
            console.log(`   - ${user.username}: ${user.full_name}`);
        });
        
        // Test the actual complex query
        const complexQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.native_language,
                u.is_verified,
                u.is_admin,
                u.created_at,
                -- Mock status and counts for demo
                'online' as status,
                NOW() as last_seen,
                NULL as status_message,
                false as is_friend,
                false as friend_request_sent,
                42 as friend_count
            FROM users u
            WHERE (u.full_name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)
            ORDER BY 
                u.is_verified DESC,
                CASE 
                    WHEN u.username ILIKE $1 THEN 1
                    WHEN u.full_name ILIKE $1 THEN 2
                    ELSE 3
                END,
                u.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const complexTest = await query(complexQuery, [`%${searchTerm}%`, 20, 0]);
        console.log(`✅ Complex query OK, found ${complexTest.rows.length} users`);
        
        console.log('🎉 All tests passed! Search should be working now.');
        
    } catch (error) {
        console.error('❌ Debug test failed:', error);
        console.error('Full error:', error.stack);
    }
    
    process.exit(0);
}

// Run the debug test
debugUserSearch();
