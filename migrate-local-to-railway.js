const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

async function migrate() {
  console.log('🔄 Starting migration from local SQLite to Railway PostgreSQL...');

  // Connect to local SQLite
  const localDb = new sqlite3.Database('./local-test.db');

  // Connect to Railway PostgreSQL
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Get users from SQLite
    const users = await new Promise((resolve, reject) => {
      localDb.all('SELECT * FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`📊 Found ${users.length} users in local database`);

    // Insert users into PostgreSQL
    for (const user of users) {
      try {
        await pgPool.query(
          `INSERT INTO users (
            id, username, email, password_hash, full_name, gender,
            native_language, is_verified, is_blocked, is_admin,
            admin_level, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (email) DO NOTHING`,
          [
            user.id, user.username, user.email, user.password_hash,
            user.full_name, user.gender, user.native_language || 'en',
            user.is_verified || false, user.is_blocked || false,
            user.is_admin || false, user.admin_level || 0,
            user.status || 'offline', user.created_at, user.updated_at || user.created_at
          ]
        );
        console.log(`✅ Migrated: ${user.email}`);
      } catch (err) {
        console.log(`⚠️  Skipped ${user.email}: ${err.message}`);
      }
    }

    console.log('✅ Migration complete!');
    await pgPool.end();
    localDb.close();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
