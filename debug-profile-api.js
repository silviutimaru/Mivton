/**
 * DEBUG SCRIPT: Test Profile API Endpoint
 * Run this to debug the profile API issues
 */

const { getDb } = require('./database/connection');

async function debugProfileAPI() {
    try {
        console.log('🔍 Debugging Profile API...');
        
        const db = getDb();
        
        // Test database connection
        console.log('📊 Testing database connection...');
        const testQuery = await db.query('SELECT NOW() as current_time');
        console.log('✅ Database connected:', testQuery.rows[0].current_time);
        
        // Check users table structure
        console.log('\n📋 Checking users table structure...');
        const columnsQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        `;
        
        const columnsResult = await db.query(columnsQuery);
        console.log('Users table columns:');
        columnsResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // Check for test users
        console.log('\n👥 Checking for test users...');
        const usersQuery = 'SELECT id, username, full_name, email FROM users LIMIT 5';
        const usersResult = await db.query(usersQuery);
        
        if (usersResult.rows.length > 0) {
            console.log('Available users:');
            usersResult.rows.forEach(user => {
                console.log(`  - ID: ${user.id}, Username: ${user.username}, Name: ${user.full_name || 'N/A'}`);
            });
            
            // Test profile query for first user
            const testUserId = usersResult.rows[0].id;
            console.log(`\n🧪 Testing profile query for user ID: ${testUserId}`);
            
            const profileQuery = `
                SELECT id, username, email, full_name, created_at
                FROM users 
                WHERE id = $1
            `;
            
            const profileResult = await db.query(profileQuery, [testUserId]);
            
            if (profileResult.rows.length > 0) {
                console.log('✅ Profile query successful:');
                console.log(JSON.stringify(profileResult.rows[0], null, 2));
            } else {
                console.log('❌ No user found with ID:', testUserId);
            }
            
        } else {
            console.log('❌ No users found in database');
        }
        
        // Check friendship tables
        console.log('\n🫂 Checking friendship tables...');
        
        try {
            const friendshipsQuery = 'SELECT COUNT(*) as count FROM friendships';
            const friendshipsResult = await db.query(friendshipsQuery);
            console.log(`✅ Friendships table exists with ${friendshipsResult.rows[0].count} records`);
        } catch (error) {
            console.log('ℹ️ Friendships table not available');
        }
        
        try {
            const requestsQuery = 'SELECT COUNT(*) as count FROM friend_requests';
            const requestsResult = await db.query(requestsQuery);
            console.log(`✅ Friend_requests table exists with ${requestsResult.rows[0].count} records`);
        } catch (error) {
            console.log('ℹ️ Friend_requests table not available');
        }
        
        // Check presence table
        console.log('\n🟢 Checking presence tables...');
        
        try {
            const presenceQuery = 'SELECT COUNT(*) as count FROM user_presence';
            const presenceResult = await db.query(presenceQuery);
            console.log(`✅ User_presence table exists with ${presenceResult.rows[0].count} records`);
        } catch (error) {
            console.log('ℹ️ User_presence table not available');
        }
        
        console.log('\n✅ Debug complete!');
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        console.error('Error details:', error.message);
    }
}

// Run debug if this file is executed directly
if (require.main === module) {
    debugProfileAPI().then(() => {
        console.log('Debug script finished');
        process.exit(0);
    }).catch(error => {
        console.error('Debug script failed:', error);
        process.exit(1);
    });
}

module.exports = { debugProfileAPI };
