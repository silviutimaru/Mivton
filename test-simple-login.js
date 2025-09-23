// Simple login test
const { getDb, query } = require('./database/connection');
const bcrypt = require('bcrypt');

async function testSimpleLogin() {
    try {
        console.log('🔧 Testing simple login...');
        
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
            
            // Test password verification
            const password = 'TestPass123!';
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            console.log('🔑 Password match:', passwordMatch);
            
            if (passwordMatch) {
                console.log('✅ Login would be successful!');
            } else {
                console.log('❌ Password verification failed');
            }
        } else {
            console.log('⚠️ No users found in database');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSimpleLogin();
