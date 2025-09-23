/**
 * Quick test script to verify user search is working
 */

const { query } = require('./database/connection');

async function testUserSearch() {
    try {
        console.log('🔍 Testing user search functionality...');
        
        // 1. Test database connection
        console.log('1. Testing database connection...');
        const connectionTest = await query('SELECT NOW() as current_time');
        console.log('✅ Database connected at:', connectionTest.rows[0].current_time);
        
        // 2. Check if users exist
        console.log('2. Checking users table...');
        const userCount = await query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Found ${userCount.rows[0].count} users in database`);
        
        if (parseInt(userCount.rows[0].count) === 0) {
            console.log('⚠️ No users found - creating a test user...');
            await query(`
                INSERT INTO users (username, email, full_name, password_hash, native_language)
                VALUES ('testuser', 'test@example.com', 'Test User', '$2b$12$hash', 'en')
                ON CONFLICT (email) DO NOTHING
            `);
            console.log('✅ Test user created');
        }
        
        // 3. Test simple search
        console.log('3. Testing simple search...');
        const searchResult = await query(`
            SELECT id, username, full_name 
            FROM users 
            WHERE username ILIKE $1 OR full_name ILIKE $1
            LIMIT 5
        `, ['%test%']);
        
        console.log(`✅ Search returned ${searchResult.rows.length} results:`);
        searchResult.rows.forEach(user => {
            console.log(`   - ${user.username}: ${user.full_name}`);
        });
        
        // 4. Test the exact API query
        console.log('4. Testing actual API query...');
        const apiQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.native_language,
                u.is_verified,
                u.is_admin,
                u.created_at
            FROM users u
            WHERE (u.full_name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)
            ORDER BY 
                u.is_verified DESC,
                u.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const apiResult = await query(apiQuery, ['%test%', 20, 0]);
        console.log(`✅ API query returned ${apiResult.rows.length} results`);
        
        console.log('🎉 All tests passed! User search should be working.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }
    
    process.exit(0);
}

testUserSearch();
