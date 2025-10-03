// Simple test user creator for SQLite
const bcrypt = require('bcrypt');
const { query } = require('./database/local-connection');

async function createTestUser() {
    try {
        console.log('🔑 Creating test user with proper password hash...');
        
        // Hash the password
        const password = 'TestPass123!';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        console.log('💡 Password hash created');
        
        // Insert user
        const result = await query(`
            INSERT OR REPLACE INTO users (
                username, email, password_hash, full_name, gender,
                is_admin, admin_level, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, ['testuser', 'test@example.com', hashedPassword, 'Test User', 'prefer-not-to-say', 1, 3, 1]);
        
        console.log('✅ Test user created successfully!');
        console.log('');
        console.log('🎯 Login Credentials:');
        console.log('   Email: test@example.com');
        console.log('   Password: TestPass123!');
        console.log('   Admin Level: 3');
        
    } catch (error) {
        console.error('❌ Error creating test user:', error);
    }
}

createTestUser();