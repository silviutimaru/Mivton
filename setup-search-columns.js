/**
 * Add missing columns for user search functionality
 */

const { query } = require('./database/connection');

async function addMissingSearchColumns() {
    try {
        console.log('🔍 Checking for missing user search columns...');
        
        // Check existing columns
        const existingColumns = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        
        const columnNames = existingColumns.rows.map(row => row.column_name);
        console.log('📋 Existing columns:', columnNames);
        
        // List of required columns for search
        const requiredColumns = [
            { name: 'profile_visibility', type: 'VARCHAR(20)', default: "'public'" },
            { name: 'show_language', type: 'BOOLEAN', default: 'true' },
            { name: 'show_online_status', type: 'BOOLEAN', default: 'true' },
            { name: 'is_blocked', type: 'BOOLEAN', default: 'false' }
        ];
        
        // Add missing columns
        for (const column of requiredColumns) {
            if (!columnNames.includes(column.name)) {
                console.log(`➕ Adding missing column: ${column.name}`);
                
                const addColumnQuery = `
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} DEFAULT ${column.default}
                `;
                
                await query(addColumnQuery);
                console.log(`✅ Added column: ${column.name}`);
            } else {
                console.log(`✓ Column ${column.name} already exists`);
            }
        }
        
        // Ensure existing users have proper default values
        console.log('🔄 Updating existing users with default values...');
        
        const updateQuery = `
            UPDATE users 
            SET 
                profile_visibility = COALESCE(profile_visibility, 'public'),
                show_language = COALESCE(show_language, true),
                show_online_status = COALESCE(show_online_status, true),
                is_blocked = COALESCE(is_blocked, false)
        `;
        
        const updateResult = await query(updateQuery);
        console.log(`✅ Updated ${updateResult.rowCount} users with default values`);
        
        // Verify the changes
        const verifyQuery = await query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN profile_visibility = 'public' THEN 1 END) as public_users,
                COUNT(CASE WHEN show_language = true THEN 1 END) as show_language_users,
                COUNT(CASE WHEN show_online_status = true THEN 1 END) as show_status_users,
                COUNT(CASE WHEN is_blocked = false THEN 1 END) as non_blocked_users
            FROM users
        `);
        
        const stats = verifyQuery.rows[0];
        console.log('📊 User statistics after update:');
        console.log(`   - Total users: ${stats.total_users}`);
        console.log(`   - Public profiles: ${stats.public_users}`);
        console.log(`   - Show language: ${stats.show_language_users}`);
        console.log(`   - Show status: ${stats.show_status_users}`);
        console.log(`   - Non-blocked: ${stats.non_blocked_users}`);
        
        console.log('🎉 User search columns setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Error setting up search columns:', error);
        console.error('Full error:', error.stack);
    }
    
    process.exit(0);
}

// Run the setup
addMissingSearchColumns();
