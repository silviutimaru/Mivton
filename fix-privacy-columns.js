#!/usr/bin/env node

/**
 * Check if privacy columns exist and add them if missing
 */

const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
    console.error('❌ No DATABASE_URL found');
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkAndAddPrivacyColumns() {
    console.log('🔍 Checking if privacy columns exist...');
    
    try {
        // Check if columns exist
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name IN ('profile_visibility', 'show_language', 'show_online_status')
        `;
        
        const checkResult = await pool.query(checkQuery);
        const existingColumns = checkResult.rows.map(row => row.column_name);
        
        console.log('📊 Found existing privacy columns:', existingColumns);
        
        const neededColumns = ['profile_visibility', 'show_language', 'show_online_status'];
        const missingColumns = neededColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length === 0) {
            console.log('✅ All privacy columns already exist!');
            return;
        }
        
        console.log('⚠️ Missing columns:', missingColumns);
        console.log('🔧 Adding missing privacy columns...');
        
        // Add missing columns one by one
        for (const column of missingColumns) {
            try {
                let addColumnQuery = '';
                
                switch (column) {
                    case 'profile_visibility':
                        addColumnQuery = `
                            ALTER TABLE users 
                            ADD COLUMN profile_visibility VARCHAR(20) DEFAULT 'public' 
                            CHECK (profile_visibility IN ('public', 'friends', 'private'))
                        `;
                        break;
                    case 'show_language':
                        addColumnQuery = `ALTER TABLE users ADD COLUMN show_language BOOLEAN DEFAULT true`;
                        break;
                    case 'show_online_status':
                        addColumnQuery = `ALTER TABLE users ADD COLUMN show_online_status BOOLEAN DEFAULT true`;
                        break;
                }
                
                await pool.query(addColumnQuery);
                console.log(`✅ Added column: ${column}`);
                
            } catch (columnError) {
                console.log(`⚠️ Column ${column} might already exist:`, columnError.message);
            }
        }
        
        // Add index
        try {
            await pool.query('CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON users(profile_visibility)');
            console.log('✅ Added privacy index');
        } catch (indexError) {
            console.log('⚠️ Index might already exist:', indexError.message);
        }
        
        console.log('🎉 Privacy columns setup complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

checkAndAddPrivacyColumns().catch(console.error);
