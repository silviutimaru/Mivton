#!/usr/bin/env node
/**
 * Debug login issue by creating a test user and trying to login
 */

const https = require('https');
const { URLSearchParams } = require('url');

console.log('🔍 Debugging login issue...\n');

// Test 1: Create a test user
console.log('📝 Test 1: Creating test user...');

const createUserData = JSON.stringify({
  username: 'testuser123',
  email: 'testuser@example.com', 
  password: 'TestPassword123!',
  fullName: 'Test User',
  gender: 'prefer-not-to-say',
  nativeLanguage: 'english'
});

const createOptions = {
  hostname: 'www.mivton.com',
  port: 443,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': createUserData.length
  }
};

const createReq = https.request(createOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`   Registration Response (${res.statusCode}):`, data);
    
    if (res.statusCode === 201 || data.includes('already exists')) {
      // Test 2: Try to login
      console.log('\n🔑 Test 2: Attempting login...');
      
      const loginData = JSON.stringify({
        email: 'testuser@example.com',
        password: 'TestPassword123!'
      });
      
      const loginOptions = {
        hostname: 'www.mivton.com',
        port: 443,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': loginData.length
        }
      };
      
      const loginReq = https.request(loginOptions, (loginRes) => {
        let loginData = '';
        loginRes.on('data', (chunk) => {
          loginData += chunk;
        });
        loginRes.on('end', () => {
          console.log(`   Login Response (${loginRes.statusCode}):`, loginData);
          
          if (loginRes.statusCode === 500) {
            console.log('\n❌ 500 Error confirmed - this indicates a server-side issue');
            console.log('   Most likely causes:');
            console.log('   1. Database connection failure');
            console.log('   2. bcrypt comparison error'); 
            console.log('   3. Session creation error');
            console.log('   4. Database query syntax error');
          }
        });
      });
      
      loginReq.on('error', (e) => {
        console.error('Login request error:', e.message);
      });
      
      loginReq.write(loginData);
      loginReq.end();
    }
  });
});

createReq.on('error', (e) => {
  console.error('Create user request error:', e.message);
});

createReq.write(createUserData);
createReq.end();