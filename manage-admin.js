#!/usr/bin/env node

/**
 * 🚀 MIVTON ADMIN ACCOUNT MANAGER
 * 
 * This script helps you create or promote admin accounts
 * Works with your actual PostgreSQL database
 */

const bcrypt = require('bcrypt');

// Database connection - using the same pattern as your app
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class AdminManager {
    constructor() {
        this.pool = pool;
    }

    async createAdminAccount() {
        console.log('🚀 MIVTON ADMIN ACCOUNT CREATOR');
        console.log('================================\n');

        try {
            // Check existing users
            const existingUsers = await this.pool.query(
                'SELECT id, username, email, is_admin, admin_level FROM users ORDER BY id'
            );

            console.log('👥 Current Users in Database:');
            console.log('============================');
            existingUsers.rows.forEach(user => {
                const adminBadge = user.is_admin ? `👑 Admin (Level ${user.admin_level || 0})` : '👤 User';
                console.log(`   ${adminBadge} ${user.username} (${user.email})`);
            });
            console.log('');

            // Create new admin account
            const adminData = {
                username: 'admin',
                email: 'admin@mivton.com',
                password: 'AdminPass123!',
                fullName: 'Mivton Administrator',
                gender: 'other',
                nativeLanguage: 'en'
            };

            console.log('📝 Creating/Updating admin account...');
            console.log(`   Username: ${adminData.username}`);
            console.log(`   Email: ${adminData.email}`);
            console.log(`   Password: ${adminData.password}`);
            console.log('');

            // Check if admin account exists
            const existingAdmin = await this.pool.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [adminData.username, adminData.email]
            );

            if (existingAdmin.rows.length > 0) {
                console.log('⚠️  Admin account exists. Updating password and privileges...');
                
                // Update existing admin account
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
                
                const updateResult = await this.pool.query(
                    'UPDATE users SET password_hash = $1, is_admin = true, admin_level = 3, updated_at = CURRENT_TIMESTAMP WHERE username = $2 OR email = $3 RETURNING *',
                    [passwordHash, adminData.username, adminData.email]
                );

                console.log('✅ Admin account updated successfully!');
                console.log(`   User: ${updateResult.rows[0].username} (${updateResult.rows[0].email})`);
                console.log(`   Admin Level: ${updateResult.rows[0].admin_level}`);
            } else {
                // Create new admin account
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(adminData.password, saltRounds);

                const newAdmin = await this.pool.query(
                    `INSERT INTO users (username, email, password_hash, full_name, gender, native_language, is_admin, admin_level, is_verified, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, true, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                     RETURNING id, username, email, full_name, is_admin, admin_level`,
                    [adminData.username, adminData.email, passwordHash, adminData.fullName, adminData.gender, adminData.nativeLanguage]
                );

                console.log('✅ Admin account created successfully!');
                console.log(`   ID: ${newAdmin.rows[0].id}`);
                console.log(`   Username: ${newAdmin.rows[0].username}`);
                console.log(`   Email: ${newAdmin.rows[0].email}`);
                console.log(`   Admin Level: ${newAdmin.rows[0].admin_level}`);
            }

            console.log('\n🎯 Admin Account Details:');
            console.log('========================');
            console.log(`🌐 Login URL: https://www.mivton.com/login.html`);
            console.log(`👤 Username: ${adminData.username}`);
            console.log(`📧 Email: ${adminData.email}`);
            console.log(`🔑 Password: ${adminData.password}`);
            console.log(`👑 Admin Level: 3 (Full Access)`);

            console.log('\n🚀 Admin Features Available:');
            console.log('============================');
            console.log('✅ User management and moderation');
            console.log('✅ System monitoring and analytics');
            console.log('✅ Database administration');
            console.log('✅ Content moderation tools');
            console.log('✅ Advanced privacy controls');

        } catch (error) {
            console.error('❌ Error managing admin account:', error);
            process.exit(1);
        } finally {
            await this.pool.end();
        }
    }

    async promoteUserToAdmin(usernameOrEmail) {
        console.log(`🚀 Promoting user to admin: ${usernameOrEmail}`);
        console.log('==========================================\n');

        try {
            const promoteResult = await this.pool.query(
                'UPDATE users SET is_admin = true, admin_level = 2, updated_at = CURRENT_TIMESTAMP WHERE username = $1 OR email = $1 RETURNING *',
                [usernameOrEmail]
            );

            if (promoteResult.rows.length === 0) {
                console.log('❌ User not found. Please check the username or email.');
                return;
            }

            const user = promoteResult.rows[0];
            console.log('✅ User successfully promoted to admin!');
            console.log(`   Username: ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Admin Level: ${user.admin_level}`);
            console.log(`   Full Name: ${user.full_name}`);

        } catch (error) {
            console.error('❌ Error promoting user to admin:', error);
        } finally {
            await this.pool.end();
        }
    }

    async listAllUsers() {
        console.log('👥 ALL USERS IN SYSTEM');
        console.log('======================\n');

        try {
            const users = await this.pool.query(
                'SELECT id, username, email, full_name, is_admin, admin_level, is_verified, status, created_at FROM users ORDER BY created_at DESC'
            );

            if (users.rows.length === 0) {
                console.log('No users found in the system.');
                return;
            }

            console.log(`Total Users: ${users.rows.length}\n`);

            users.rows.forEach(user => {
                const adminBadge = user.is_admin ? `👑 Admin (Level ${user.admin_level || 0})` : '👤 User';
                const verifiedBadge = user.is_verified ? '✅' : '❌';
                const statusBadge = user.status === 'online' ? '🟢' : '⚪';
                
                console.log(`${adminBadge} ${user.username} (${user.email})`);
                console.log(`   ${verifiedBadge} Verified | ${statusBadge} ${user.status || 'offline'} | Created: ${new Date(user.created_at).toLocaleDateString()}`);
                console.log('');
            });

        } catch (error) {
            console.error('❌ Error listing users:', error);
        } finally {
            await this.pool.end();
        }
    }

    async showHelp() {
        console.log('🚀 MIVTON ADMIN ACCOUNT MANAGER');
        console.log('===============================\n');
        console.log('Available commands:');
        console.log('');
        console.log('1. Create/Update admin account:');
        console.log('   node manage-admin.js');
        console.log('');
        console.log('2. Promote existing user to admin:');
        console.log('   node manage-admin.js promote <username_or_email>');
        console.log('');
        console.log('3. List all users:');
        console.log('   node manage-admin.js list');
        console.log('');
        console.log('4. Show this help:');
        console.log('   node manage-admin.js help');
        console.log('');
        console.log('Examples:');
        console.log('   node manage-admin.js promote SilviuT');
        console.log('   node manage-admin.js promote silviotimaru@gmail.com');
        console.log('   node manage-admin.js list');
    }
}

// Main execution
async function main() {
    const manager = new AdminManager();
    const command = process.argv[2];
    const argument = process.argv[3];

    try {
        switch (command) {
            case 'promote':
                if (!argument) {
                    console.log('❌ Please provide a username or email to promote.');
                    console.log('Usage: node manage-admin.js promote <username_or_email>');
                    process.exit(1);
                }
                await manager.promoteUserToAdmin(argument);
                break;

            case 'list':
                await manager.listAllUsers();
                break;

            case 'help':
                await manager.showHelp();
                break;

            default:
                await manager.createAdminAccount();
                break;
        }

        console.log('\n🎉 Operation completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = AdminManager;
