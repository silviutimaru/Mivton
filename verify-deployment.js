#!/usr/bin/env node

/**
 * Mivton Deployment Verification Script
 * Checks all dependencies, environment variables, and configurations
 */

require('dotenv').config();

console.log('🔧 Mivton Deployment Verification');
console.log('================================');

// Check Node.js version
const nodeVersion = process.version;
const [major] = nodeVersion.slice(1).split('.');
console.log(`📦 Node.js version: ${nodeVersion}`);

if (parseInt(major) < 18) {
  console.log('❌ Node.js 18+ required');
  process.exit(1);
} else {
  console.log('✅ Node.js version OK');
}

// Check required dependencies
const requiredDeps = [
  'express',
  'pg',
  'bcrypt',
  'helmet',
  'cors',
  'express-session',
  'connect-pg-simple',
  'socket.io',
  'dotenv',
  'nodemailer',
  'express-validator',
  'express-rate-limit',
  'jsonwebtoken'
];

console.log('\n📋 Checking dependencies...');
let depErrors = 0;

requiredDeps.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep}`);
  } catch (error) {
    console.log(`❌ ${dep} - MISSING`);
    depErrors++;
  }
});

if (depErrors > 0) {
  console.log(`\n❌ ${depErrors} dependencies missing. Run: npm install`);
  process.exit(1);
}

// Check environment variables
console.log('\n🔐 Checking environment variables...');
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = [
  'PORT',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'APP_URL',
  'OPENAI_API_KEY'
];

let envErrors = 0;

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}`);
  } else {
    console.log(`❌ ${envVar} - MISSING (REQUIRED)`);
    envErrors++;
  }
});

optionalEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}`);
  } else {
    console.log(`⚠️  ${envVar} - optional but recommended`);
  }
});

if (envErrors > 0) {
  console.log(`\n❌ ${envErrors} required environment variables missing`);
  process.exit(1);
}

// Check file structure
console.log('\n📁 Checking file structure...');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'server.js',
  'package.json',
  'database/connection.js',
  'routes/auth.js',
  'routes/dashboard.js',
  'routes/users-search.js',
  'routes/user-preferences.js',
  'middleware/auth.js',
  'utils/email.js',
  'utils/waitlist.js'
];

let fileErrors = 0;

requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    fileErrors++;
  }
});

if (fileErrors > 0) {
  console.log(`\n❌ ${fileErrors} required files missing`);
  process.exit(1);
}

// Test database connection
console.log('\n🗄️  Testing database connection...');
const { testConnection } = require('./database/connection');

testConnection()
  .then(() => {
    console.log('✅ Database connection successful');
    
    // Final summary
    console.log('\n🎉 Deployment Verification Complete!');
    console.log('=====================================');
    console.log('✅ All dependencies installed');
    console.log('✅ Environment variables configured');
    console.log('✅ File structure correct');
    console.log('✅ Database connection working');
    console.log('\n🚀 Ready for deployment!');
    console.log('\nTo start the server:');
    console.log('  npm start');
    console.log('\nTo start in development mode:');
    console.log('  npm run dev');
    
  })
  .catch((error) => {
    console.log('❌ Database connection failed:', error.message);
    console.log('\n🔧 Fix database connection and try again');
    process.exit(1);
  });
