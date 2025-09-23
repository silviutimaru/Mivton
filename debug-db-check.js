/**
 * Quick database check script
 */

const { query } = require('./database/connection');

async function checkDatabase() {
    try {
        console.log('🔍 Checking database...');
        
        // Check users table
        const userCount = await query('SELECT COUNT(*) FROM users');
        console.log('📊 Total users:', userCount.rows[0].count);
        
        // Check sample users
        const sampleUsers = await query('SELECT id, username, full_name FROM users LIMIT 10');
        console.log('👤 Sample users:');
        sampleUsers.rows.forEach(user => {
            console.log(`   - ID: ${user.id}, Username: ${user.username}, Name: ${user.full_name}`);
        });
        
        // Check database tables
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('📋 Available tables:');
        tables.rows.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Database check failed:', error);
    }
    
    process.exit(0);
}

checkDatabase();
