// Simple script to create a test user for local development
const bcrypt = require('bcrypt');

async function createTestUser() {
    try {
        console.log('🔧 Creating test user for local development...');
        
        // Hash the password
        const password = 'TestPass123!';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('✅ Password hashed successfully');
        console.log('📧 Email: test@local.com');
        console.log('🔑 Password: TestPass123!');
        console.log('👤 Username: testuser');
        console.log('📝 Full Name: Test User');
        
        console.log('\n🔗 Login URL: http://localhost:3000/login');
        console.log('\n📋 Login Credentials:');
        console.log('   Email: test@local.com');
        console.log('   Password: TestPass123!');
        
        console.log('\n⚠️  Note: You may need to register this user first if the database is empty.');
        console.log('   Go to: http://localhost:3000/register');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createTestUser();
