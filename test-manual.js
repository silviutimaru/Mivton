// Test API endpoint manually to check if routes are working
const express = require('express');
const request = require('supertest');

// Create a minimal test app to check dashboard routes
const app = express();
app.use(express.json());

// Mock session for testing
app.use((req, res, next) => {
  req.session = { userId: 1 };
  next();
});

// Try to load dashboard routes
try {
  const dashboardRoutes = require('./routes/dashboard');
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✅ Dashboard routes loaded successfully');
} catch (error) {
  console.log('❌ Failed to load dashboard routes:', error.message);
}

// Try to load auth routes
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded successfully');
} catch (error) {
  console.log('❌ Failed to load auth routes:', error.message);
}

// Test a simple endpoint
async function testDashboardStats() {
  try {
    const response = await request(app)
      .get('/api/dashboard/stats')
      .expect('Content-Type', /json/);
    
    console.log('Dashboard stats response:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));
    
    return response.status === 200;
  } catch (error) {
    console.log('Dashboard stats test failed:', error.message);
    return false;
  }
}

// Run the test
testDashboardStats().then(success => {
  console.log('Dashboard stats test:', success ? '✅ PASSED' : '❌ FAILED');
});
