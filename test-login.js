// Test login functionality
const { getDb, query } = require('./database/connection');

async function testLogin() {
    try {
        console.log('🔧 Testing login functionality...');
        
        // Test database connection
        const db = getDb();
        console.log('✅ Database connection established');
        
        // Test query function
        const result = await query('SELECT * FROM users WHERE email = ?', ['test1@local.com']);
        console.log('✅ Query executed successfully');
        console.log('📊 Found users:', result.rows.length);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('👤 User found:', {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name
            });
        } else {
            console.log('⚠️ No users found in database');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testLogin();
