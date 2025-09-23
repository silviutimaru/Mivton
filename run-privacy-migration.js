#!/usr/bin/env node

/**
 * Database migration script to add privacy settings
 * Run this before testing privacy features
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Get database URL from Railway or local
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
    console.error('❌ No DATABASE_URL or POSTGRES_URL found in environment variables');
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    console.log('🚀 Starting privacy settings migration...');
    
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, 'database', 'migrations', '003_privacy_settings.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Migration SQL loaded');
        console.log('🔧 Executing migration...');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('✅ Privacy settings migration completed successfully!');
        console.log('');
        console.log('📋 Added columns:');
        console.log('  - profile_visibility (public/friends/private)');
        console.log('  - show_language (boolean)');
        console.log('  - show_online_status (boolean)');
        console.log('');
        console.log('🔒 Privacy features are now ready to test!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
runMigration();
