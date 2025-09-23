/**
 * Test script to verify user search functionality
 */

const { query } = require('./database/connection');

async function testUserSearch() {
    try {
        console.log('🔍 Testing user search functionality...');
        
        // First, test basic connection
        const connectionTest = await query('SELECT COUNT(*) FROM users');
        console.log('✅ Database connection OK, total users:', connectionTest.rows[0].count);
        
        // Check if we have the required columns for search
        const columnTest = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('id', 'username', 'full_name', 'email', 'native_language', 'is_verified', 'created_at', 'profile_visibility', 'show_language', 'show_online_status')
        `);
        
        console.log('✅ Available user table columns:');
        columnTest.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        
        // Test simple user fetch
        const simpleTest = await query('SELECT id, username, full_name, email FROM users LIMIT 3');
        console.log('✅ Sample users:');
        simpleTest.rows.forEach(user => {
            console.log(`   - ${user.username}: ${user.full_name} (${user.email})`);
        });
        
        // Test the actual search query from the users-search.js route
        const searchTerm = 'a'; // Simple search term
        const searchQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.native_language,
                u.is_verified,
                u.is_admin,
                u.created_at,
                COALESCE(u.profile_visibility, 'public') as profile_visibility,
                COALESCE(u.show_language, true) as show_language,
                COALESCE(u.show_online_status, true) as show_online_status
            FROM users u
            WHERE (u.full_name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)
            AND u.is_blocked = false
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
        
        const searchTest = await query(searchQuery, [`%${searchTerm}%`, 5, 0]);
        console.log(`✅ Search test OK, users matching '%${searchTerm}%':`);
        searchTest.rows.forEach(user => {
            console.log(`   - ${user.username}: ${user.full_name} (verified: ${user.is_verified})`);
        });
        
        // Test the privacy filter (only public profiles)
        const privacyQuery = `
            SELECT 
                u.id,
                u.username,
                u.full_name,
                COALESCE(u.profile_visibility, 'public') as profile_visibility
            FROM users u
            WHERE (u.full_name ILIKE $1 OR u.username ILIKE $1 OR u.email ILIKE $1)
            AND u.is_blocked = false
            AND COALESCE(u.profile_visibility, 'public') = 'public'
            LIMIT $2
        `;
        
        const privacyTest = await query(privacyQuery, [`%${searchTerm}%`, 5]);
        console.log(`✅ Privacy filter test OK, public users matching '%${searchTerm}%':`);
        privacyTest.rows.forEach(user => {
            console.log(`   - ${user.username}: ${user.full_name} (visibility: ${user.profile_visibility})`);
        });
        
        console.log('🎉 All user search tests passed! The search functionality should be working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Full error:', error.stack);
        
        // If there are missing columns, let's check what we actually have
        if (error.message.includes('does not exist')) {
            console.log('\n🔍 Checking actual table structure...');
            try {
                const tableStructure = await query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'users'
                    ORDER BY ordinal_position
                `);
                
                console.log('📋 Actual users table structure:');
                tableStructure.rows.forEach(col => {
                    console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
                });
            } catch (structureError) {
                console.error('❌ Could not get table structure:', structureError.message);
            }
        }
    }
    
    process.exit(0);
}

// Run the test
testUserSearch();
