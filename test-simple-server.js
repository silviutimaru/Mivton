// ULTRA SIMPLE SERVER FOR TESTING SIMPLE ROUTES
const express = require('express');
const session = require('express-session');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (minimal for testing)
app.use(session({
  secret: process.env.SESSION_SECRET || 'test-secret-key-simple-chat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Add test middleware to create a fake user session for testing
app.use((req, res, next) => {
  // Create a fake session for testing
  if (!req.session.user) {
    req.session.user = {
      id: 1,
      username: 'testuser',
      full_name: 'Test User'
    };
  }
  next();
});

console.log('🔧 SIMPLE SERVER: About to load simple modern chat routes...');

// Load simple chat routes
try {
  const simpleChatRoutes = require('./routes/simple-modern-chat');
  app.use('/api/modern-chat', simpleChatRoutes);
  console.log('✅ SIMPLE SERVER: Simple modern chat routes loaded successfully!');
} catch (error) {
  console.log('❌ SIMPLE SERVER: Simple modern chat routes FAILED to load:', error.message);
  console.error('Error details:', error);
}

// Basic health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Simple server is running' });
});

// List routes endpoint for debugging
app.get('/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const basePath = middleware.regexp.source.replace('\\/?(?=\\/|$)', '').replace('^\\', '').replace('\\/', '/');
          routes.push({
            path: basePath + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes });
});

const PORT = 3002; // Different port from main server

app.listen(PORT, () => {
  console.log('🚀 SIMPLE SERVER: Test server running on port', PORT);
  console.log('🔗 SIMPLE SERVER: Test endpoints:');
  console.log('   - http://localhost:3001/health');
  console.log('   - http://localhost:3001/routes');
  console.log('   - http://localhost:3001/api/modern-chat/debug/status');
});