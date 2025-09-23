#!/usr/bin/env node

/**
 * Start script that forces PostgreSQL usage
 * This ensures we use the same database as production
 */

// Force PostgreSQL usage
process.env.FORCE_POSTGRESQL = 'true';
process.env.NODE_ENV = 'production';

// Set default database URL if not provided
if (!process.env.DATABASE_URL) {
    console.log('🔧 No DATABASE_URL found, using default local PostgreSQL...');
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/mivton';
}

console.log('🚀 Starting server with PostgreSQL...');
console.log('📊 Database URL:', process.env.DATABASE_URL);

// Start the server
require('./server.js');
