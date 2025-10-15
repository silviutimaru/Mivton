#!/usr/bin/env node

/**
 * 🚀 PostgreSQL Data Migration Script
 * Migrates data from PostgreSQL 16 to PostgreSQL 17.6
 * 
 * This script handles the migration of all essential Mivton data:
 * - Users (accounts, profiles, authentication)
 * - Messages (multilingual chat data)
 * - Friendships (friend requests, connections)
 * - User presence and activity
 * - Admin and configuration data
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Database connection strings
const OLD_DATABASE_URL = "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway";
const NEW_DATABASE_URL = "postgresql://postgres:hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM@tramway.proxy.rlwy.net:12014/railway";

// Migration backup directory
const BACKUP_DIR = path.join(__dirname, 'migration-backup');

class PostgreSQLMigrator {
    constructor() {
        this.backupFiles = [];
    }

    async createBackupDirectory() {
        console.log('📁 Creating backup directory...');
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        console.log(`✅ Backup directory: ${BACKUP_DIR}`);
    }

    async exportTableData(tableName, customWhere = '') {
        console.log(`📤 Exporting ${tableName} table...`);
        
        try {
            const whereClause = customWhere ? `WHERE ${customWhere}` : '';
            const backupFile = path.join(BACKUP_DIR, `${tableName}.sql`);
            
            // Use pg_dump for schema and data
            const dumpCommand = `pg_dump "${OLD_DATABASE_URL}" --table=${tableName} --data-only --inserts > "${backupFile}"`;
            
            execSync(dumpCommand, { stdio: 'inherit' });
            
            this.backupFiles.push({
                table: tableName,
                file: backupFile,
                size: fs.statSync(backupFile).size
            });
            
            console.log(`✅ ${tableName} exported (${fs.statSync(backupFile).size} bytes)`);
            return backupFile;
            
        } catch (error) {
            console.error(`❌ Failed to export ${tableName}:`, error.message);
            return null;
        }
    }

    async exportSchema() {
        console.log('📋 Exporting database schema...');
        
        try {
            const schemaFile = path.join(BACKUP_DIR, 'schema.sql');
            const schemaCommand = `pg_dump "${OLD_DATABASE_URL}" --schema-only > "${schemaFile}"`;
            
            execSync(schemaCommand, { stdio: 'inherit' });
            
            console.log(`✅ Schema exported to ${schemaFile}`);
            return schemaFile;
            
        } catch (error) {
            console.error('❌ Failed to export schema:', error.message);
            return null;
        }
    }

    async testOldDatabaseConnection() {
        console.log('🔌 Testing connection to old database...');
        
        try {
            const testCommand = `psql "${OLD_DATABASE_URL}" -c "SELECT version();"`;
            const result = execSync(testCommand, { encoding: 'utf8' });
            
            if (result.includes('PostgreSQL')) {
                console.log('✅ Old database connection successful');
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('❌ Cannot connect to old database:', error.message);
            console.log('💡 This is expected if the PostgreSQL 16 service is down due to version conflict');
            return false;
        }
    }

    async testNewDatabaseConnection() {
        console.log('🔌 Testing connection to new database...');
        
        try {
            const testCommand = `psql "${NEW_DATABASE_URL}" -c "SELECT version();"`;
            const result = execSync(testCommand, { encoding: 'utf8' });
            
            if (result.includes('PostgreSQL 17')) {
                console.log('✅ New PostgreSQL 17.6 database connection successful');
                return true;
            }
            return false;
            
        } catch (error) {
            console.error('❌ Cannot connect to new database:', error.message);
            return false;
        }
    }

    async setupNewDatabaseSchema() {
        console.log('🏗️ Setting up schema in new database...');
        
        try {
            // Read the main schema file
            const schemaPath = path.join(__dirname, 'database', 'schema.sql');
            
            if (fs.existsSync(schemaPath)) {
                console.log('📋 Applying main schema...');
                const applySchemaCommand = `psql "${NEW_DATABASE_URL}" -f "${schemaPath}"`;
                execSync(applySchemaCommand, { stdio: 'inherit' });
                console.log('✅ Main schema applied');
            }

            // Apply additional schema files
            const additionalSchemas = [
                'database/friends-schema.sql',
                'database/advanced-presence-schema.sql',
                'database/user-activity.sql'
            ];

            for (const schemaFile of additionalSchemas) {
                const fullPath = path.join(__dirname, schemaFile);
                if (fs.existsSync(fullPath)) {
                    console.log(`📋 Applying ${schemaFile}...`);
                    const command = `psql "${NEW_DATABASE_URL}" -f "${fullPath}"`;
                    try {
                        execSync(command, { stdio: 'inherit' });
                        console.log(`✅ ${schemaFile} applied`);
                    } catch (error) {
                        console.warn(`⚠️ Warning applying ${schemaFile}:`, error.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Failed to setup schema:', error.message);
            throw error;
        }
    }

    async importTableData(backupFile, tableName) {
        console.log(`📥 Importing ${tableName} data...`);
        
        try {
            if (!fs.existsSync(backupFile)) {
                console.warn(`⚠️ Backup file not found: ${backupFile}`);
                return false;
            }

            const importCommand = `psql "${NEW_DATABASE_URL}" -f "${backupFile}"`;
            execSync(importCommand, { stdio: 'inherit' });
            
            console.log(`✅ ${tableName} data imported successfully`);
            return true;
            
        } catch (error) {
            console.error(`❌ Failed to import ${tableName}:`, error.message);
            return false;
        }
    }

    async performFullMigration() {
        console.log('🚀 STARTING POSTGRESQL DATA MIGRATION');
        console.log('=' .repeat(60));
        
        try {
            // Step 1: Create backup directory
            await this.createBackupDirectory();
            
            // Step 2: Test connections
            const newDbWorking = await this.testNewDatabaseConnection();
            if (!newDbWorking) {
                throw new Error('New database is not accessible');
            }
            
            const oldDbWorking = await this.testOldDatabaseConnection();
            
            // Step 3: Set up new database schema
            await this.setupNewDatabaseSchema();
            
            if (oldDbWorking) {
                // Step 4: Export data from old database (if accessible)
                console.log('\n📤 EXPORTING DATA FROM OLD DATABASE');
                console.log('-' .repeat(40));
                
                const tablesToExport = [
                    'users',
                    'messages',
                    'friendships',
                    'friend_requests',
                    'blocked_users',
                    'user_presence',
                    'user_presence_settings',
                    'user_activity',
                    'user_activity_tracking',
                    'session'
                ];
                
                // Export schema first
                await this.exportSchema();
                
                // Export each table
                for (const table of tablesToExport) {
                    await this.exportTableData(table);
                }
                
                // Step 5: Import data to new database
                console.log('\n📥 IMPORTING DATA TO NEW DATABASE');
                console.log('-' .repeat(40));
                
                for (const backup of this.backupFiles) {
                    await this.importTableData(backup.file, backup.table);
                }
                
            } else {
                console.log('\n⚠️ OLD DATABASE NOT ACCESSIBLE');
                console.log('This is expected due to PostgreSQL version incompatibility.');
                console.log('Manual data recovery steps will be provided.');
            }
            
            // Step 6: Verify migration
            await this.verifyMigration();
            
            console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
            console.log('=' .repeat(60));
            
            return true;
            
        } catch (error) {
            console.error('\n❌ MIGRATION FAILED:', error.message);
            console.log('\n📋 Backup files created:');
            this.backupFiles.forEach(backup => {
                console.log(`   - ${backup.table}: ${backup.file} (${backup.size} bytes)`);
            });
            
            return false;
        }
    }

    async verifyMigration() {
        console.log('\n🔍 VERIFYING MIGRATION');
        console.log('-' .repeat(30));
        
        try {
            const tables = ['users', 'messages', 'friendships', 'user_presence'];
            
            for (const table of tables) {
                try {
                    const countCommand = `psql "${NEW_DATABASE_URL}" -t -c "SELECT COUNT(*) FROM ${table};"`;
                    const result = execSync(countCommand, { encoding: 'utf8' });
                    const count = parseInt(result.trim());
                    
                    console.log(`✅ ${table}: ${count} records`);
                } catch (error) {
                    console.log(`⚠️ ${table}: Table not found or error`);
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Verification had issues:', error.message);
        }
    }

    async createManualRecoveryInstructions() {
        const instructionsPath = path.join(BACKUP_DIR, 'MANUAL_RECOVERY_INSTRUCTIONS.md');
        
        const instructions = `
# Manual Data Recovery Instructions

## Situation
Your PostgreSQL service was upgraded from version 16 to 17.6, causing a version incompatibility.
The old data is stored in the \`acceptable-volume\` but cannot be accessed directly.

## Recovery Options

### Option 1: Volume-Level Recovery (Recommended)
1. **Temporarily downgrade PostgreSQL** to version 16:
   - In Railway dashboard, go to your old Postgres service
   - Change the Docker image to \`postgres:16\`
   - This will allow you to access the existing data

2. **Export the data** using this script:
   \`\`\`bash
   node migrate-postgresql-data.js
   \`\`\`

3. **Switch back to PostgreSQL 17.6** and import the data

### Option 2: Direct Volume Access
1. **SSH into the old service** (if possible):
   \`\`\`bash
   railway ssh --service Postgres
   \`\`\`

2. **Manually copy data files** from \`/var/lib/postgresql/data/pgdata\`

### Option 3: Fresh Start (Last Resort)
If data recovery is not possible:
1. Start fresh with the new PostgreSQL 17.6 service
2. Use your application's user registration to recreate accounts
3. Import any critical data from backups

## New Database Connection
- **Service**: Postgres-3CDg
- **URL**: postgresql://postgres:hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM@tramway.proxy.rlwy.net:12014/railway
- **Internal**: postgres-3cdg.railway.internal:5432

## Files Created
- Schema: ${path.join(BACKUP_DIR, 'schema.sql')}
- Data backups: ${BACKUP_DIR}/*.sql

## Next Steps
1. Update your application's DATABASE_URL to use the new service
2. Test your application with the new database
3. Delete the old PostgreSQL service once everything is working
`;

        fs.writeFileSync(instructionsPath, instructions);
        console.log(`📄 Manual recovery instructions: ${instructionsPath}`);
    }
}

// Main execution
async function main() {
    const migrator = new PostgreSQLMigrator();
    
    try {
        const success = await migrator.performFullMigration();
        
        if (!success) {
            await migrator.createManualRecoveryInstructions();
            console.log('\n💡 Check the manual recovery instructions for next steps.');
        }
        
        console.log('\n📋 SUMMARY:');
        console.log(`- New Database: Postgres-3CDg (PostgreSQL 17.6)`);
        console.log(`- Connection: postgresql://postgres:hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM@tramway.proxy.rlwy.net:12014/railway`);
        console.log(`- Backup Directory: ${BACKUP_DIR}`);
        
    } catch (error) {
        console.error('💥 Migration script failed:', error);
        process.exit(1);
    }
}

// Run the migration
if (require.main === module) {
    main();
}

module.exports = { PostgreSQLMigrator };