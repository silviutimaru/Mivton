const bcrypt = require('bcrypt');

async function updatePassword() {
    try {
        console.log('🔐 Updating password for silviu@mivton.com to Bacau@2012...');
        
        const newPassword = 'Bacau@2012';
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        console.log('✅ Password hash generated successfully');
        console.log('📝 Use this SQL command to update the password:');
        console.log('');
        console.log(`UPDATE users SET password_hash = '${newPasswordHash}', updated_at = CURRENT_TIMESTAMP WHERE email = 'silviu@mivton.com';`);
        console.log('');
        console.log('🔍 To verify the update, run:');
        console.log("SELECT id, username, email, is_admin, admin_level, updated_at FROM users WHERE email = 'silviu@mivton.com';");
        
    } catch (error) {
        console.error('❌ Error generating password hash:', error);
    }
}

updatePassword();
