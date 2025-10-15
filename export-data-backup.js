#!/usr/bin/env node

/**
 * 🛟 EMERGENCY DATA EXPORT SCRIPT
 * Exports all your Mivton data from PostgreSQL 16 service
 * Run this after downgrading the old service to PostgreSQL 16
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Old PostgreSQL 16 service connection (after downgrade)
const OLD_DB_URL = "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway";

// Backup directory
const BACKUP_DIR = path.join(process.env.HOME || __dirname, 'mivton-backup');

class DataExporter {
    constructor() {
        this.exportedFiles = [];
    }

    async createBackupDirectory() {
        console.log('📁 Creating backup directory...');
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        console.log(`✅ Backup directory: ${BACKUP_DIR}`);
    }

    async testConnection() {
        console.log('🔌 Testing connection to PostgreSQL 16 service...');
        
        try {
            const result = execSync(`psql "${OLD_DB_URL}" -c "SELECT version();" --no-psqlrc`, { 
                encoding: 'utf8',
                timeout: 10000 
            });
            
            if (result.includes('PostgreSQL 16')) {
                console.log('✅ Connected to PostgreSQL 16 - data recovery possible!');
                return true;
            } else if (result.includes('PostgreSQL 17')) {
                console.log('❌ Still running PostgreSQL 17 - please downgrade first');
                return false;
            } else {
                console.log('✅ PostgreSQL connection successful');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Cannot connect to database:', error.message);
            console.log('💡 Make sure you downgraded the Docker image to postgres:16 in Railway dashboard');
            return false;
        }
    }

    async checkDataExists() {
        console.log('🔍 Checking what data exists...');
        
        try {
            const tables = ['users', 'messages', 'friendships', 'friend_requests', 'user_presence'];
            const dataCheck = {};
            
            for (const table of tables) {
                try {
                    const result = execSync(
                        `psql "${OLD_DB_URL}" -t -c "SELECT COUNT(*) FROM ${table};" --no-psqlrc`, 
                        { encoding: 'utf8', timeout: 5000 }
                    );
                    const count = parseInt(result.trim()) || 0;
                    dataCheck[table] = count;
                    
                    if (count > 0) {
                        console.log(`✅ ${table}: ${count} records`);
                    } else {
                        console.log(`⚪ ${table}: empty`);
                    }
                } catch (error) {
                    console.log(`⚠️ ${table}: table not found or error`);
                    dataCheck[table] = 'error';
                }
            }
            
            return dataCheck;
            
        } catch (error) {
            console.error('❌ Failed to check data:', error.message);
            return {};
        }
    }

    async exportCompleteDatabase() {
        console.log('📤 Exporting complete database...');
        
        try {
            const backupFile = path.join(BACKUP_DIR, `mivton_complete_backup_${Date.now()}.sql`);
            
            console.log('   📋 Exporting schema and data...');
            execSync(`pg_dump "${OLD_DB_URL}" > "${backupFile}"`, { 
                stdio: 'inherit',
                timeout: 60000 
            });
            
            const size = fs.statSync(backupFile).size;
            console.log(`✅ Complete backup: ${backupFile} (${(size/1024).toFixed(1)} KB)`);
            
            this.exportedFiles.push({
                type: 'complete',
                file: backupFile,
                size: size
            });
            
            return backupFile;
            
        } catch (error) {
            console.error('❌ Failed to export complete database:', error.message);
            return null;
        }
    }

    async exportTableData(tableName) {
        console.log(`📤 Exporting ${tableName} table...`);
        
        try {
            const backupFile = path.join(BACKUP_DIR, `${tableName}_data.sql`);
            
            // Export with INSERT statements for easier importing
            execSync(
                `pg_dump "${OLD_DB_URL}" --table=${tableName} --data-only --inserts --no-owner > "${backupFile}"`, 
                { stdio: 'inherit', timeout: 30000 }
            );
            
            const size = fs.statSync(backupFile).size;
            
            if (size > 0) {
                console.log(`✅ ${tableName}: ${backupFile} (${(size/1024).toFixed(1)} KB)`);
                this.exportedFiles.push({
                    type: 'table',
                    table: tableName,
                    file: backupFile,
                    size: size
                });
                return backupFile;
            } else {
                console.log(`⚪ ${tableName}: no data to export`);
                fs.unlinkSync(backupFile); // Remove empty file
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Failed to export ${tableName}:`, error.message);
            return null;
        }
    }

    async createImportScript() {
        const importScript = path.join(BACKUP_DIR, 'import_to_new_database.sh');
        const newDbUrl = "postgresql://postgres:hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM@tramway.proxy.rlwy.net:12014/railway";
        
        const scriptContent = `#!/bin/bash
# Import script for Mivton data
# Run this to import your data to the new PostgreSQL 17.6 service

echo "🚀 Importing Mivton data to PostgreSQL 17.6..."

# Find the most recent complete backup
BACKUP_FILE=$(ls -t mivton_complete_backup_*.sql 2>/dev/null | head -n1)

if [ -f "$BACKUP_FILE" ]; then
    echo "📥 Importing complete backup: $BACKUP_FILE"
    psql "${newDbUrl}" < "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Import successful!"
        echo "🔍 Verifying data..."
        psql "${newDbUrl}" -c "SELECT 'Users:' as table, COUNT(*) as count FROM users UNION ALL SELECT 'Messages:', COUNT(*) FROM messages WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') UNION ALL SELECT 'Friendships:', COUNT(*) FROM friendships;"
    else
        echo "❌ Import failed. Try importing individual table files."
    fi
else
    echo "❌ No complete backup found. Make sure export completed successfully."
fi
`;

        fs.writeFileSync(importScript, scriptContent);
        fs.chmodSync(importScript, 0o755); // Make executable
        
        console.log(`📜 Import script created: ${importScript}`);
        return importScript;
    }

    async exportAll() {
        console.log('🚀 STARTING DATA EXPORT FROM POSTGRESQL 16');
        console.log('=' .repeat(60));
        
        try {
            // Step 1: Setup
            await this.createBackupDirectory();
            
            // Step 2: Test connection
            const canConnect = await this.testConnection();
            if (!canConnect) {
                throw new Error('Cannot connect to PostgreSQL 16 service');
            }
            
            // Step 3: Check what data exists
            const dataCheck = await this.checkDataExists();
            
            // Step 4: Export complete database
            console.log('\n📦 EXPORTING COMPLETE DATABASE');
            console.log('-' .repeat(40));
            const completeBackup = await this.exportCompleteDatabase();
            
            // Step 5: Export individual tables (as insurance)
            console.log('\n📊 EXPORTING INDIVIDUAL TABLES');
            console.log('-' .repeat(40));
            
            const importantTables = ['users', 'messages', 'friendships', 'friend_requests', 'user_presence', 'session'];
            
            for (const table of importantTables) {
                if (dataCheck[table] && dataCheck[table] !== 'error' && dataCheck[table] > 0) {
                    await this.exportTableData(table);
                }
            }
            
            // Step 6: Create import script
            await this.createImportScript();
            
            // Step 7: Summary
            console.log('\n🎉 DATA EXPORT COMPLETE!');
            console.log('=' .repeat(60));
            
            console.log(`📁 Backup location: ${BACKUP_DIR}`);
            console.log(`📊 Files created: ${this.exportedFiles.length}`);
            
            let totalSize = 0;
            this.exportedFiles.forEach(file => {
                console.log(`   - ${file.type === 'complete' ? 'COMPLETE' : file.table}: ${path.basename(file.file)} (${(file.size/1024).toFixed(1)} KB)`);
                totalSize += file.size;
            });
            
            console.log(`💾 Total backup size: ${(totalSize/1024).toFixed(1)} KB`);
            
            console.log('\n🔄 NEXT STEPS:');
            console.log('1. Run the import script to move data to PostgreSQL 17.6:');
            console.log(`   cd "${BACKUP_DIR}" && ./import_to_new_database.sh`);
            console.log('2. Or set up local PostgreSQL and import there');
            console.log('3. Keep these backup files safe!');
            
            return true;
            
        } catch (error) {
            console.error('\n💥 DATA EXPORT FAILED:', error.message);
            console.log('\n📋 Backup files created so far:');
            this.exportedFiles.forEach(file => {
                console.log(`   - ${file.file}`);
            });
            
            return false;
        }
    }
}

// Main execution
async function main() {
    const exporter = new DataExporter();
    
    console.log('⚠️  IMPORTANT: Make sure you downgraded the Postgres service to postgres:16 in Railway dashboard first!');
    console.log('');
    
    const success = await exporter.exportAll();
    
    if (success) {
        console.log('\n✅ Your data is now safely backed up!');
        process.exit(0);
    } else {
        console.log('\n❌ Export failed. Check the error messages above.');
        process.exit(1);
    }
}

// Run the export
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { DataExporter };