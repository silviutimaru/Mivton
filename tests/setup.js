// Jest setup file for Mivton tests
// This file runs before each test suite
require('dotenv').config({ path: '.env.test' });

const { initializeDatabase, getDb, closeDb } = require('../database/connection');
const fs = require('fs');
const path = require('path');

// Global test timeout
jest.setTimeout(30000);

// Test database setup
let testDbInitialized = false;

// Helper function to run SQL file
async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const db = getDb();
  await db.query(sql);
}

// Global setup - runs once before all tests
beforeAll(async () => {
  try {
    console.log('🔧 Setting up test environment...');
    
    // Initialize test database connection
    await initializeDatabase();
    console.log('✅ Test database connected');
    
    // Run schema setup if needed
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      await runSqlFile(schemaPath);
      console.log('✅ Test database schema ready');
    }
    
    testDbInitialized = true;
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

// Global teardown - runs once after all tests
afterAll(async () => {
  try {
    if (testDbInitialized) {
      console.log('🧹 Cleaning up test environment...');
      
      // Run teardown script
      const teardownPath = path.join(__dirname, '../database/teardown_test.sql');
      if (fs.existsSync(teardownPath)) {
        await runSqlFile(teardownPath);
        console.log('✅ Test data cleaned up');
      }
      
      // Close database connection
      await closeDb();
      console.log('✅ Test database connection closed');
    }
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Helper functions for tests
global.testHelpers = {
  // Reset test data before each test
  async resetTestData() {
    const teardownPath = path.join(__dirname, '../database/teardown_test.sql');
    const seedPath = path.join(__dirname, '../database/seed_test.sql');
    
    if (fs.existsSync(teardownPath)) {
      await runSqlFile(teardownPath);
    }
    if (fs.existsSync(seedPath)) {
      await runSqlFile(seedPath);
    }
  },
  
  // Get test user data
  getTestUsers() {
    return {
      userA: {
        username: 'userA',
        email: 'userA@example.com',
        password: 'TestPass123!',
        fullName: 'Test User A',
        gender: 'male',
        nativeLanguage: 'en'
      },
      userB: {
        username: 'userB', 
        email: 'userB@example.com',
        password: 'TestPass123!',
        fullName: 'Test User B',
        gender: 'female',
        nativeLanguage: 'es'
      }
    };
  },
  
  // Create test session data
  createTestSession(userId) {
    return {
      userId: userId,
      user: {
        id: userId,
        username: `user${userId}`,
        email: `user${userId}@example.com`
      }
    };
  },
  
  // Validate response format
  validateApiResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.headers['content-type']).toMatch(/json/);
    if (expectedStatus >= 400) {
      expect(response.body).toHaveProperty('error');
    }
  }
};

// Custom matchers
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidPassword(received) {
    // Must be 8+ chars with uppercase, lowercase, and number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    const pass = passwordRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid password`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid password (8+ chars, upper, lower, number)`,
        pass: false,
      };
    }
  }
});

// Suppress console logs during tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  const originalConsole = console.log;
  console.log = jest.fn();
  
  // But keep error logs
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] && args[0].includes('Test')) {
      originalError(...args);
    }
  };
}

// Export database helper for use in tests
module.exports = {
  runSqlFile,
  testHelpers: global.testHelpers
};
