#!/usr/bin/env node

/**
 * 🚀 RELIABLE DATABASE SETUP OPTIONS
 * Multiple database solutions to replace Railway PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DatabaseSetup {
    constructor() {
        this.options = [];
    }

    async checkLocalPostgreSQL() {
        console.log('🔍 Checking for local PostgreSQL...');
        
        try {
            const version = execSync('psql --version', { encoding: 'utf8' });
            console.log('✅ PostgreSQL found:', version.trim());
            
            // Check if PostgreSQL is running
            try {
                execSync('pg_isready', { encoding: 'utf8' });
                console.log('✅ PostgreSQL server is running');
                return true;
            } catch (error) {
                console.log('⚠️ PostgreSQL installed but not running');
                console.log('💡 Start it with: brew services start postgresql');
                return false;
            }
            
        } catch (error) {
            console.log('❌ PostgreSQL not found locally');
            console.log('💡 Install with: brew install postgresql');
            return false;
        }
    }

    async setupLocalDatabase() {
        console.log('🏗️ Setting up local PostgreSQL database...');
        
        try {
            // Create local database
            console.log('📝 Creating mivton database...');
            try {
                execSync('createdb mivton', { stdio: 'inherit' });
                console.log('✅ Database "mivton" created');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log('ℹ️ Database "mivton" already exists');
                } else {
                    throw error;
                }
            }
            
            // Apply schema
            console.log('📋 Applying database schema...');
            const schemaPath = path.join(__dirname, 'database', 'schema.sql');
            if (fs.existsSync(schemaPath)) {
                execSync(`psql mivton -f "${schemaPath}"`, { stdio: 'inherit' });
                console.log('✅ Main schema applied');
            }
            
            // Apply additional schemas
            const additionalSchemas = [
                'database/friends-schema.sql',
                'database/advanced-presence-schema.sql'
            ];
            
            for (const schema of additionalSchemas) {
                const fullPath = path.join(__dirname, schema);
                if (fs.existsSync(fullPath)) {
                    console.log(`📋 Applying ${schema}...`);
                    try {
                        execSync(`psql mivton -f "${fullPath}"`, { stdio: 'inherit' });
                        console.log(`✅ ${schema} applied`);
                    } catch (error) {
                        console.warn(`⚠️ Warning with ${schema}:`, error.message);
                    }
                }
            }
            
            // Create test user
            console.log('👤 Creating admin user...');
            const createAdminSQL = `
                INSERT INTO users (username, email, password_hash, full_name, gender, native_language, is_verified, is_admin)
                VALUES ('admin', 'admin@mivton.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJneh/5PMGjNJOK1C6DZacdG', 'Administrator', 'prefer-not-to-say', 'en', true, true)
                ON CONFLICT (email) DO UPDATE SET is_admin = true;
            `;
            
            execSync(`psql mivton -c "${createAdminSQL}"`, { stdio: 'inherit' });
            console.log('✅ Admin user created (admin@mivton.com / password: password123)');
            
            // Test connection
            const result = execSync('psql mivton -c "SELECT COUNT(*) as user_count FROM users;"', { encoding: 'utf8' });
            console.log('✅ Local database test successful');
            console.log(result);
            
            console.log('\n🎉 LOCAL DATABASE SETUP COMPLETE!');
            console.log('📊 Connection details:');
            console.log('   Database: mivton');
            console.log('   Host: localhost');
            console.log('   Port: 5432');
            console.log('   User: your system user');
            console.log('   Connection URL: postgresql://localhost:5432/mivton');
            
            return 'postgresql://localhost:5432/mivton';
            
        } catch (error) {
            console.error('❌ Local database setup failed:', error.message);
            return null;
        }
    }

    generateSupabaseInstructions() {
        return `
🌐 SUPABASE SETUP (Recommended for production)
============================================

1. Go to https://supabase.com
2. Sign up/Login
3. Create new project:
   - Name: Mivton
   - Database Password: (choose strong password)
   - Region: (closest to you)

4. Once created, get connection details:
   - Go to Settings > Database
   - Copy "Connection string" (URI format)
   - It looks like: postgresql://postgres.xxx:[PASSWORD]@xxx.supabase.co:5432/postgres

5. Apply your schema:
   psql "your_supabase_connection_string" -f database/schema.sql
   psql "your_supabase_connection_string" -f database/friends-schema.sql
   psql "your_supabase_connection_string" -f database/advanced-presence-schema.sql

6. Update your app:
   - Set DATABASE_URL to your Supabase connection string
   - Deploy to Railway (or run locally)

✅ Benefits:
   - More reliable than Railway PostgreSQL  
   - Built-in authentication (if needed later)
   - Real-time subscriptions
   - Generous free tier (500MB database)
   - Automatic backups
`;
    }

    generateNeonInstructions() {
        return `
⚡ NEON SETUP (Serverless PostgreSQL)
===================================

1. Go to https://neon.tech
2. Sign up with GitHub
3. Create database:
   - Name: mivton
   - PostgreSQL version: 16 (latest)
   - Region: (closest to you)

4. Get connection string:
   - Dashboard > Connection Details
   - Copy "Connection string"
   - Format: postgresql://username:password@host/database

5. Apply schema (same as Supabase steps 5-6 above)

✅ Benefits:
   - Serverless (scales to zero)
   - Very fast
   - Free tier: 512MB database, 1 compute unit
   - Branching (like Git for databases)
`;
    }

    generatePlanetScaleInstructions() {
        return `
🌎 PLANETSCALE SETUP (MySQL-compatible)
=====================================

Note: PlanetScale is MySQL, not PostgreSQL. You'd need to convert your schema.

1. Go to https://planetscale.com
2. Create database
3. Convert PostgreSQL schema to MySQL
4. Use mysql2 instead of pg in your Node.js app

✅ Benefits:
   - Extremely reliable
   - Branching workflow
   - Generous free tier

❌ Drawbacks:
   - Requires schema conversion (PostgreSQL → MySQL)
   - Code changes needed
`;
    }

    async updateAppConfig(databaseUrl) {
        console.log('🔧 Updating application configuration...');
        
        // Update environment files
        const configFiles = ['.env', '.env.local', '.env.production'];
        
        for (const configFile of configFiles) {
            const filePath = path.join(__dirname, configFile);
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Update or add DATABASE_URL
                if (content.includes('DATABASE_URL')) {
                    content = content.replace(/DATABASE_URL=.*$/m, `DATABASE_URL="${databaseUrl}"`);
                } else {
                    content += `\nDATABASE_URL="${databaseUrl}"`;
                }
                
                fs.writeFileSync(filePath, content);
                console.log(`✅ Updated ${configFile}`);
            }
        }
        
        console.log(`✅ App configured to use: ${databaseUrl}`);
    }

    async displayOptions() {
        console.log('🚀 MIVTON DATABASE SETUP OPTIONS');
        console.log('=' .repeat(50));
        
        console.log('\n🏠 OPTION 1: LOCAL POSTGRESQL (Recommended for development)');
        console.log('✅ Pros: Full control, fast, no internet required');
        console.log('❌ Cons: Only accessible on your machine');
        
        const hasLocal = await this.checkLocalPostgreSQL();
        if (hasLocal) {
            console.log('💡 Ready to setup local database!');
        } else {
            console.log('💡 Need to install/start PostgreSQL first');
        }
        
        console.log('\n☁️ OPTION 2: SUPABASE (Recommended for production)');
        console.log('✅ Pros: Reliable, free tier, built-in features, PostgreSQL-compatible');
        console.log('❌ Cons: Requires internet, external dependency');
        
        console.log('\n⚡ OPTION 3: NEON (Serverless PostgreSQL)');
        console.log('✅ Pros: Scales to zero, fast, PostgreSQL-compatible');
        console.log('❌ Cons: Newer service, requires internet');
        
        console.log('\n🌎 OPTION 4: PLANETSCALE (MySQL)');
        console.log('✅ Pros: Extremely reliable, branching');
        console.log('❌ Cons: Requires schema conversion (PostgreSQL → MySQL)');
        
        console.log('\n📋 INSTRUCTIONS:');
        console.log('1. Choose an option above');
        console.log('2. For local: run this script with --setup-local');
        console.log('3. For cloud: follow the detailed instructions');
        console.log('4. Update your Railway app configuration');
        console.log('5. Test your application');
        
        return true;
    }

    async run() {
        const args = process.argv.slice(2);
        
        if (args.includes('--setup-local')) {
            console.log('🏗️ Setting up local PostgreSQL database...\n');
            const localUrl = await this.setupLocalDatabase();
            if (localUrl) {
                await this.updateAppConfig(localUrl);
                
                console.log('\n🎯 NEXT STEPS:');
                console.log('1. Update Railway variables:');
                console.log(`   railway variables --set DATABASE_URL="${localUrl}"`);
                console.log('2. Test your application locally');
                console.log('3. Deploy to Railway when ready');
            }
            return;
        }
        
        if (args.includes('--supabase-help')) {
            console.log(this.generateSupabaseInstructions());
            return;
        }
        
        if (args.includes('--neon-help')) {
            console.log(this.generateNeonInstructions());
            return;
        }
        
        if (args.includes('--planetscale-help')) {
            console.log(this.generatePlanetScaleInstructions());
            return;
        }
        
        // Default: show all options
        await this.displayOptions();
        
        console.log('\n🔧 USAGE:');
        console.log('  node reliable-database-setup.js --setup-local     # Setup local PostgreSQL');
        console.log('  node reliable-database-setup.js --supabase-help   # Supabase instructions'); 
        console.log('  node reliable-database-setup.js --neon-help       # Neon instructions');
        console.log('  node reliable-database-setup.js --planetscale-help # PlanetScale instructions');
    }
}

// Run the setup
if (require.main === module) {
    const setup = new DatabaseSetup();
    setup.run().catch(console.error);
}

module.exports = { DatabaseSetup };