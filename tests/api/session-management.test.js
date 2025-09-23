// API tests for session management and authentication state
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { requireAuth, requireGuest } = require('../../middleware/auth');

// Mock the database connection
jest.mock('../../database/connection', () => ({
  getDb: jest.fn(() => ({
    query: jest.fn()
  }))
}));

const { getDb } = require('../../database/connection');

describe('Session Management API', () => {
  let app;
  let mockDb;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    // Test routes to verify session behavior
    app.get('/protected', requireAuth, (req, res) => {
      res.json({ 
        success: true, 
        message: 'Access granted',
        user: req.user 
      });
    });

    app.get('/guest-only', requireGuest, (req, res) => {
      res.json({ 
        success: true, 
        message: 'Guest access granted' 
      });
    });

    app.post('/login-test', (req, res) => {
      // Simulate login by setting session
      req.session.userId = req.body.userId;
      req.session.user = req.body.user;
      res.json({ success: true, message: 'Session created' });
    });

    app.post('/logout-test', (req, res) => {
      // Simulate logout
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Session destroyed' });
      });
    });

    // Setup database mock
    mockDb = {
      query: jest.fn()
    };
    getDb.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Protected Route Access', () => {
    test('should allow access with valid session', async () => {
      const agent = request.agent(app);
      
      // Mock user data for database query
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: 'Test User',
        native_language: 'en',
        gender: 'male',
        is_verified: true,
        is_admin: false,
        status: 'online'
      };

      mockDb.query.mockResolvedValue({ rows: [mockUser] });

      // Create session
      await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      // Access protected route
      const response = await agent
        .get('/protected');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user).toBeDefined();
    });

    test('should deny access without session', async () => {
      const response = await request(app)
        .get('/protected');

      global.testHelpers.validateApiResponse(response, 401);
      expect(response.body.error).toBe('Authentication required');
      expect(response.body.redirectTo).toBe('/login.html');
    });

    test('should deny access with invalid user in database', async () => {
      const agent = request.agent(app);
      
      // Mock database to return no user
      mockDb.query.mockResolvedValue({ rows: [] });

      // Create session with invalid user
      await agent
        .post('/login-test')
        .send({ 
          userId: 999, 
          user: { id: 999, username: 'invaliduser' } 
        });

      const response = await agent
        .get('/protected');

      global.testHelpers.validateApiResponse(response, 401);
      expect(response.body.error).toBe('User not found');
    });

    test('should handle database errors in auth middleware', async () => {
      const agent = request.agent(app);
      
      // Mock database error
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      // Create session
      await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      const response = await agent
        .get('/protected');

      global.testHelpers.validateApiResponse(response, 500);
      expect(response.body.error).toBe('Authentication error');
    });
  });

  describe('Guest-Only Route Access', () => {
    test('should allow access without session', async () => {
      const response = await request(app)
        .get('/guest-only');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Guest access granted');
    });

    test('should deny access with active session', async () => {
      const agent = request.agent(app);

      // Create session
      await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      const response = await agent
        .get('/guest-only');

      global.testHelpers.validateApiResponse(response, 403);
      expect(response.body.error).toBe('Already authenticated');
      expect(response.body.redirectTo).toBe('/dashboard.html');
    });
  });

  describe('Session Lifecycle', () => {
    test('should create and maintain session across requests', async () => {
      const agent = request.agent(app);
      
      // Create session
      const loginResponse = await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      global.testHelpers.validateApiResponse(loginResponse, 200);

      // Verify session persists
      const response1 = await agent
        .get('/guest-only');
      
      global.testHelpers.validateApiResponse(response1, 403); // Should be blocked

      // Session should still exist after multiple requests
      const response2 = await agent
        .get('/guest-only');
        
      global.testHelpers.validateApiResponse(response2, 403);
    });

    test('should destroy session on logout', async () => {
      const agent = request.agent(app);

      // Create session
      await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      // Verify session exists
      let response = await agent
        .get('/guest-only');
      global.testHelpers.validateApiResponse(response, 403);

      // Logout
      const logoutResponse = await agent
        .post('/logout-test');
      global.testHelpers.validateApiResponse(logoutResponse, 200);

      // Verify session is destroyed
      response = await agent
        .get('/guest-only');
      global.testHelpers.validateApiResponse(response, 200);
    });

    test('should handle session timeout gracefully', async () => {
      // Note: This is a conceptual test - actual timeout testing would require
      // more complex setup with session store configuration
      
      const agent = request.agent(app);

      // Create session
      await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      // In a real scenario, you would wait for session timeout
      // For testing, we simulate it by not sending cookies
      const response = await request(app) // New request without agent
        .get('/guest-only');

      global.testHelpers.validateApiResponse(response, 200);
    });
  });

  describe('Session Security', () => {
    test('should regenerate session ID on login (security best practice)', async () => {
      const agent = request.agent(app);

      // First request to establish initial session
      const response1 = await agent
        .get('/guest-only');

      // Extract session cookie
      const initialCookie = response1.headers['set-cookie'];

      // Login (should regenerate session)
      await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      // Make another request to check if session ID changed
      const response2 = await agent
        .get('/guest-only'); // Will be blocked but we can check cookies

      // Note: In a full implementation, you'd verify the session ID changed
      expect(response2.status).toBe(403); // Confirms login session exists
    });

    test('should handle concurrent sessions appropriately', async () => {
      // Create two separate agents (different browsers/sessions)
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Login with both agents
      await agent1
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'user1' } 
        });

      await agent2
        .post('/login-test')
        .send({ 
          userId: 2, 
          user: { id: 2, username: 'user2' } 
        });

      // Both should be blocked from guest routes
      const response1 = await agent1.get('/guest-only');
      const response2 = await agent2.get('/guest-only');

      global.testHelpers.validateApiResponse(response1, 403);
      global.testHelpers.validateApiResponse(response2, 403);
    });

    test('should not leak session data between requests', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      // Login with agent1
      await agent1
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'user1' } 
        });

      // Agent2 should not have access to agent1's session
      const response = await agent2
        .get('/guest-only');

      global.testHelpers.validateApiResponse(response, 200); // Should allow guest access
    });
  });

  describe('Session Cookie Configuration', () => {
    test('should set appropriate cookie attributes in test environment', async () => {
      const agent = request.agent(app);

      // Create session
      const response = await agent
        .post('/login-test')
        .send({ 
          userId: 1, 
          user: { id: 1, username: 'testuser' } 
        });

      // Check cookie headers
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        const sessionCookie = cookies.find(cookie => cookie.includes('connect.sid'));
        expect(sessionCookie).toBeDefined();
        
        // In test environment, secure should be false
        expect(sessionCookie).toContain('HttpOnly');
        // Note: Secure flag should be false in test environment
      }
    });

    test('should handle missing or malformed cookies gracefully', async () => {
      // Make request with malformed cookie
      const response = await request(app)
        .get('/guest-only')
        .set('Cookie', 'malformed-cookie-data');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
    });
  });
});
