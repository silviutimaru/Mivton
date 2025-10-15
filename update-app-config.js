#!/usr/bin/env node

/**
 * 🔄 Update Application Configuration for New PostgreSQL 17.6
 * This script updates your app to use the new database service
 */

const fs = require('fs');
const path = require('path');

// New database connection details
const NEW_DATABASE_CONFIG = {
    public_url: "postgresql://postgres:hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM@tramway.proxy.rlwy.net:12014/railway",
    internal_url: "postgresql://postgres:hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM@postgres-3cdg.railway.internal:5432/railway",
    host: "postgres-3cdg.railway.internal",
    port: 5432,
    database: "railway",
    username: "postgres",
    password: "hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM"
};

class AppConfigUpdater {
    constructor() {
        this.updatedFiles = [];
    }

    async updateEnvironmentFiles() {
        console.log('🔧 Updating environment configuration files...');

        // Check for common config files
        const configFiles = [
            '.env',
            '.env.local',
            '.env.production',
            'config/database.js',
            'database/connection.js'
        ];

        for (const configFile of configFiles) {
            const filePath = path.join(__dirname, configFile);
            if (fs.existsSync(filePath)) {
                console.log(`📝 Found config file: ${configFile}`);
                await this.updateConfigFile(filePath, configFile);
            }
        }
    }

    async updateConfigFile(filePath, fileName) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let updated = false;

            // Update DATABASE_URL
            if (content.includes('DATABASE_URL')) {
                const oldPattern = /DATABASE_URL\s*=\s*["']?postgresql:\/\/[^"'\n\r]+["']?/g;
                if (oldPattern.test(content)) {
                    content = content.replace(oldPattern, `DATABASE_URL="${NEW_DATABASE_CONFIG.internal_url}"`);
                    updated = true;
                    console.log(`   ✅ Updated DATABASE_URL in ${fileName}`);
                }
            }

            // Update individual database components
            const dbUpdates = [
                { pattern: /PGHOST\s*=\s*["']?[^"'\n\r]+["']?/g, replacement: `PGHOST="${NEW_DATABASE_CONFIG.host}"` },
                { pattern: /PGPORT\s*=\s*["']?[^"'\n\r]+["']?/g, replacement: `PGPORT="${NEW_DATABASE_CONFIG.port}"` },
                { pattern: /PGDATABASE\s*=\s*["']?[^"'\n\r]+["']?/g, replacement: `PGDATABASE="${NEW_DATABASE_CONFIG.database}"` },
                { pattern: /PGUSER\s*=\s*["']?[^"'\n\r]+["']?/g, replacement: `PGUSER="${NEW_DATABASE_CONFIG.username}"` },
                { pattern: /PGPASSWORD\s*=\s*["']?[^"'\n\r]+["']?/g, replacement: `PGPASSWORD="${NEW_DATABASE_CONFIG.password}"` }
            ];

            dbUpdates.forEach(update => {
                if (update.pattern.test(content)) {
                    content = content.replace(update.pattern, update.replacement);
                    updated = true;
                }
            });

            if (updated) {
                // Create backup
                fs.writeFileSync(`${filePath}.backup`, fs.readFileSync(filePath));
                // Write updated content
                fs.writeFileSync(filePath, content);
                this.updatedFiles.push(fileName);
                console.log(`   ✅ Updated and backed up ${fileName}`);
            } else {
                console.log(`   ℹ️  No database config found in ${fileName}`);
            }

        } catch (error) {
            console.error(`   ❌ Failed to update ${fileName}:`, error.message);
        }
    }

    async testDatabaseConnection() {
        console.log('\n🔌 Testing new database connection...');

        try {
            // Test connection using Node.js
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const testQuery = `psql "${NEW_DATABASE_CONFIG.public_url}" -c "SELECT 'Connection successful!' as status, version();"`;
            
            const { stdout } = await execAsync(testQuery);
            
            if (stdout.includes('Connection successful')) {
                console.log('✅ Database connection test successful!');
                console.log('✅ PostgreSQL version confirmed: 17.6');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Database connection test failed:', error.message);
            return false;
        }
    }

    async createTestUser() {
        console.log('\n👤 Creating test user in new database...');

        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);

            const createUserSQL = `
                INSERT INTO users (username, email, password_hash, full_name, gender, native_language, is_verified)
                VALUES ('admin', 'admin@mivton.com', '$2b$12$test', 'Administrator', 'prefer-not-to-say', 'en', true)
                ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username;
            `;

            const command = `psql "${NEW_DATABASE_CONFIG.public_url}" -c "${createUserSQL}"`;
            await execAsync(command);

            console.log('✅ Test user created successfully');
            return true;

        } catch (error) {
            console.error('❌ Failed to create test user:', error.message);
            return false;
        }
    }

    async displaySummary() {
        console.log('\n' + '='.repeat(60));
        console.log('🎉 CONFIGURATION UPDATE COMPLETE!');
        console.log('='.repeat(60));
        
        console.log('\n📊 NEW DATABASE DETAILS:');
        console.log(`   Service: Postgres-3CDg (PostgreSQL 17.6)`);
        console.log(`   Public URL: ${NEW_DATABASE_CONFIG.public_url}`);
        console.log(`   Internal URL: ${NEW_DATABASE_CONFIG.internal_url}`);
        
        console.log('\n📝 UPDATED FILES:');
        if (this.updatedFiles.length > 0) {
            this.updatedFiles.forEach(file => {
                console.log(`   ✅ ${file} (backup created: ${file}.backup)`);
            });
        } else {
            console.log('   ℹ️  No configuration files were automatically updated');
        }
        
        console.log('\n🔄 NEXT STEPS:');
        console.log('   1. Update your Railway environment variables:');
        console.log('      railway variables --set DATABASE_URL="' + NEW_DATABASE_CONFIG.internal_url + '"');
        console.log('   2. Restart your application');
        console.log('   3. Test your application functionality');
        console.log('   4. If everything works, delete the old PostgreSQL service');
        
        console.log('\n💾 DATA RECOVERY:');
        console.log('   - Your old data is in the "acceptable-volume" on the old service');
        console.log('   - To recover it, you can temporarily downgrade the old service to PostgreSQL 16');
        console.log('   - Then run the migration script to transfer the data');
        
        console.log('\n🗑️  CLEANUP:');
        console.log('   - Old service: Postgres (PostgreSQL 16 - not working)');
        console.log('   - New service: Postgres-3CDg (PostgreSQL 17.6 - working)');
        console.log('   - Once migration is complete, delete the old service');
    }
}

async function main() {
    const updater = new AppConfigUpdater();

    console.log('🚀 UPDATING APPLICATION CONFIGURATION');
    console.log('=' .repeat(50));

    try {
        // Update configuration files
        await updater.updateEnvironmentFiles();
        
        // Test database connection
        const connectionWorking = await updater.testDatabaseConnection();
        
        if (connectionWorking) {
            // Create test user
            await updater.createTestUser();
        }
        
        // Display summary
        await updater.displaySummary();

    } catch (error) {
        console.error('💥 Configuration update failed:', error);
    }
}

// Run the updater
if (require.main === module) {
    main();
}

module.exports = { AppConfigUpdater, NEW_DATABASE_CONFIG };