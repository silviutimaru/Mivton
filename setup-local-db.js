// Setup local SQLite database for testing
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

async function setupLocalDatabase() {
    console.log('🔧 Setting up local SQLite database for testing...');
    
    // Create database file
    const dbPath = path.join(__dirname, 'local-test.db');
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Create users table
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    gender TEXT NOT NULL,
                    native_language TEXT DEFAULT 'en',
                    is_verified INTEGER DEFAULT 1,
                    is_admin INTEGER DEFAULT 0,
                    is_blocked INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'offline',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Users table created');
        
        // Create session table
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS session (
                    sid TEXT PRIMARY KEY,
                    sess TEXT NOT NULL,
                    expire DATETIME NOT NULL
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Session table created');
        
        // Create test users
        const password = 'TestPass123!';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert test user 1
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO users 
                (username, email, password_hash, full_name, gender, native_language, is_verified, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'testuser1',
                'test1@local.com',
                hashedPassword,
                'Test User 1',
                'male',
                'en',
                1,
                'online'
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Insert test user 2
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO users 
                (username, email, password_hash, full_name, gender, native_language, is_verified, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'testuser2',
                'test2@local.com',
                hashedPassword,
                'Test User 2',
                'female',
                'es',
                1,
                'online'
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log('✅ Test users created');
        
        // Verify users
        const users = await new Promise((resolve, reject) => {
            db.all('SELECT username, email, full_name FROM users', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('\n📋 Available test users:');
        users.forEach(user => {
            console.log(`   - ${user.username} (${user.email}): ${user.full_name}`);
        });
        
        console.log('\n🔑 Password for all users: TestPass123!');
        console.log('\n🔗 Login URL: http://localhost:3000/login');
        
        db.close();
        console.log('\n✅ Local database setup complete!');
        
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        db.close();
    }
}

setupLocalDatabase();
