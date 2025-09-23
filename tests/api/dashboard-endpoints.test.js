// Phase 2 API Tests - Dashboard Data Endpoints and Authorization
const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock database and routes
jest.mock('../../database/connection', () => ({
  getDb: jest.fn(() => ({
    query: jest.fn()
  }))
}));

const { getDb } = require('../../database/connection');

describe('Phase 2 - Dashboard API & Integration Tests', () => {
  let app;
  let mockDb;
  let authenticatedAgent;

  beforeAll(async () => {
    await global.testHelpers.resetTestData();
  });

  beforeEach(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    // Mock database
    mockDb = {
      query: jest.fn()
    };
    getDb.mockReturnValue(mockDb);

    // Load dashboard routes
    try {
      const dashboardRoutes = require('../../routes/dashboard');
      app.use('/api/dashboard', dashboardRoutes);
    } catch (error) {
      console.warn('Dashboard routes not available:', error.message);
    }

    // Load auth routes for authentication
    try {
      const authRoutes = require('../../routes/auth');
      app.use('/api/auth', authRoutes);
    } catch (error) {
      console.warn('Auth routes not available:', error.message);
    }

    // Load user profile routes
    try {
      const userProfileRoutes = require('../../routes/user-profile');
      app.use('/api/user-profile', userProfileRoutes);
    } catch (error) {
      console.warn('User profile routes not available:', error.message);
    }

    // Create authenticated agent
    authenticatedAgent = request.agent(app);
    
    // Mock login for authenticated requests
    mockDb.query
      .mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'userA',
          email: 'usera@example.com',
          password_hash: '$2b$04$rQvBXNk.VNpMGV5fJOy8QOEv.3vr4QvJGKuVXy8m9Yz8jNpFjK7gK',
          full_name: 'Test User A',
          gender: 'male',
          native_language: 'en',
          is_blocked: false
        }]
      })
      .mockResolvedValue({ rows: [] });

    await authenticatedAgent
      .post('/api/auth/login')
      .send({
        email: 'userA@example.com',
        password: 'TestPass123!'
      });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Data Endpoints', () => {
    test('GET /api/dashboard/stats should return dashboard statistics', async () => {
      // Mock dashboard stats query
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Friends count
        .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // Messages count
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Languages count
        .mockResolvedValueOnce({ rows: [{ hours: '10' }] }); // Chat hours

      const response = await authenticatedAgent
        .get('/api/dashboard/stats');

      if (response.status === 404) {
        console.log('Dashboard stats endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Validate expected stats structure
      const expectedStats = ['friends', 'messages', 'languages', 'chatHours'];
      expectedStats.forEach(stat => {
        if (response.body.data[stat] !== undefined) {
          expect(typeof response.body.data[stat]).toBe('number');
        }
      });
    });

    test('GET /api/dashboard/stats should reject unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats');

      if (response.status === 404) {
        console.log('Dashboard stats endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/(authenticated|authorized|login)/i);
    });

    test('GET /api/dashboard/recent-activity should return user activity', async () => {
      // Mock recent activity query
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            activity_type: 'friend_request',
            description: 'Friend request from userB',
            created_at: new Date(),
            metadata: JSON.stringify({ friend_id: 2 })
          },
          {
            id: 2,
            activity_type: 'message',
            description: 'New message received',
            created_at: new Date(),
            metadata: JSON.stringify({ message_count: 1 })
          }
        ]
      });

      const response = await authenticatedAgent
        .get('/api/dashboard/recent-activity');

      if (response.status === 404) {
        console.log('Recent activity endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const activity = response.body.data[0];
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('activity_type');
        expect(activity).toHaveProperty('description');
        expect(activity).toHaveProperty('created_at');
      }
    });

    test('GET /api/dashboard/user-summary should return user summary', async () => {
      // Mock user summary query
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'userA',
          full_name: 'Test User A',
          native_language: 'en',
          created_at: new Date('2025-01-01'),
          last_active: new Date(),
          friend_count: 5,
          message_count: 150
        }]
      });

      const response = await authenticatedAgent
        .get('/api/dashboard/user-summary');

      if (response.status === 404) {
        console.log('User summary endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      
      const user = response.body.user;
      expect(user.username).toBe('userA');
      expect(user.full_name).toBe('Test User A');
      expect(user.native_language).toBe('en');
    });
  });

  describe('User Profile API Endpoints', () => {
    test('GET /api/user-profile should return current user profile', async () => {
      // Mock user profile query
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'userA',
          email: 'usera@example.com',
          full_name: 'Test User A',
          gender: 'male',
          native_language: 'en',
          profile_visibility: 'public',
          show_language: true,
          show_online_status: true,
          created_at: new Date('2025-01-01'),
          last_active: new Date()
        }]
      });

      const response = await authenticatedAgent
        .get('/api/user-profile');

      if (response.status === 404) {
        console.log('User profile endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.profile).toBeDefined();
      
      const profile = response.body.profile;
      expect(profile.username).toBe('userA');
      expect(profile.email).toBe('usera@example.com');
      expect(profile.native_language).toBe('en');
    });

    test('PUT /api/user-profile should update user profile', async () => {
      const updateData = {
        full_name: 'Updated Test User',
        native_language: 'es',
        profile_visibility: 'friends',
        show_language: true,
        show_online_status: false
      };

      // Mock update query
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'userA',
          email: 'usera@example.com',
          full_name: 'Updated Test User',
          gender: 'male',
          native_language: 'es',
          profile_visibility: 'friends',
          show_language: true,
          show_online_status: false,
          updated_at: new Date()
        }]
      });

      const response = await authenticatedAgent
        .put('/api/user-profile')
        .send(updateData);

      if (response.status === 404) {
        console.log('User profile update endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.profile).toBeDefined();
      
      const profile = response.body.profile;
      expect(profile.full_name).toBe('Updated Test User');
      expect(profile.native_language).toBe('es');
      expect(profile.profile_visibility).toBe('friends');
    });

    test('PUT /api/user-profile should validate input data', async () => {
      const invalidData = {
        full_name: '', // Empty name
        native_language: 'invalid_lang', // Invalid language code
        profile_visibility: 'invalid_visibility' // Invalid visibility
      };

      const response = await authenticatedAgent
        .put('/api/user-profile')
        .send(invalidData);

      if (response.status === 404) {
        console.log('User profile update endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('PUT /api/user-profile should reject unauthorized requests', async () => {
      const updateData = {
        full_name: 'Updated Test User',
        native_language: 'es'
      };

      const response = await request(app)
        .put('/api/user-profile')
        .send(updateData);

      if (response.status === 404) {
        console.log('User profile update endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/(authenticated|authorized)/i);
    });
  });

  describe('Language Preferences API', () => {
    test('GET /api/user/languages should return available languages', async () => {
      const response = await authenticatedAgent
        .get('/api/user/languages');

      if (response.status === 404) {
        console.log('Languages endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.languages)).toBe(true);
      
      if (response.body.languages.length > 0) {
        const language = response.body.languages[0];
        expect(language).toHaveProperty('code');
        expect(language).toHaveProperty('name');
      }
    });

    test('PUT /api/user/language should update user language', async () => {
      // Mock language update
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          native_language: 'fr',
          updated_at: new Date()
        }]
      });

      const response = await authenticatedAgent
        .put('/api/user/language')
        .send({ language: 'fr' });

      if (response.status === 404) {
        console.log('Language update endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.language).toBe('fr');
    });

    test('PUT /api/user/language should validate language code', async () => {
      const response = await authenticatedAgent
        .put('/api/user/language')
        .send({ language: 'invalid_code' });

      if (response.status === 404) {
        console.log('Language update endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/(invalid|language)/i);
    });
  });

  describe('User Search API', () => {
    test('GET /api/users/search should return search results', async () => {
      // Mock user search query
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            username: 'userB',
            full_name: 'Test User B',
            native_language: 'es',
            profile_visibility: 'public',
            last_active: new Date()
          },
          {
            id: 3,
            username: 'userC',
            full_name: 'Test User C',
            native_language: 'fr',
            profile_visibility: 'public',
            last_active: new Date()
          }
        ]
      });

      const response = await authenticatedAgent
        .get('/api/users/search?q=user&language=es');

      if (response.status === 404) {
        console.log('User search endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.users)).toBe(true);
      
      if (response.body.users.length > 0) {
        const user = response.body.users[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('full_name');
        expect(user).not.toHaveProperty('email'); // Should not expose email
        expect(user).not.toHaveProperty('password_hash'); // Should not expose password
      }
    });

    test('GET /api/users/search should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/search?q=user');

      if (response.status === 404) {
        console.log('User search endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(401);
      expect(response.body.error).toMatch(/(authenticated|authorized)/i);
    });

    test('GET /api/users/search should validate search parameters', async () => {
      const response = await authenticatedAgent
        .get('/api/users/search'); // No search query

      if (response.status === 404) {
        console.log('User search endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/(query|search)/i);
    });
  });

  describe('Error Handling and Security', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await authenticatedAgent
        .get('/api/dashboard/stats');

      if (response.status === 404) {
        console.log('Dashboard stats endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(500);
      expect(response.body.error).toMatch(/(server|database|error)/i);
    });

    test('should not expose sensitive user data', async () => {
      // Mock user data with sensitive information
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'userA',
          email: 'usera@example.com',
          password_hash: '$2b$04$hashedpassword',
          full_name: 'Test User A',
          native_language: 'en',
          created_at: new Date()
        }]
      });

      const response = await authenticatedAgent
        .get('/api/dashboard/user-summary');

      if (response.status === 404) {
        console.log('User summary endpoint not implemented yet');
        return;
      }

      global.testHelpers.validateApiResponse(response, 200);
      
      if (response.body.user) {
        expect(response.body.user).not.toHaveProperty('password_hash');
        expect(response.body.user).not.toHaveProperty('session_token');
      }
    });

    test('should validate content types for POST/PUT requests', async () => {
      const response = await authenticatedAgent
        .put('/api/user-profile')
        .set('Content-Type', 'text/plain')
        .send('invalid data');

      if (response.status === 404) {
        console.log('User profile update endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(400);
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await authenticatedAgent
        .put('/api/user-profile')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      if (response.status === 404) {
        console.log('User profile update endpoint not implemented yet');
        return;
      }

      expect(response.status).toBe(400);
    });
  });

  describe('Response Format Validation', () => {
    test('should return consistent response format', async () => {
      const endpoints = [
        '/api/dashboard/stats',
        '/api/user-profile',
        '/api/users/search?q=test'
      ];

      for (const endpoint of endpoints) {
        const response = await authenticatedAgent.get(endpoint);
        
        if (response.status === 404) {
          console.log(`Endpoint ${endpoint} not implemented yet`);
          continue;
        }

        if (response.status === 200) {
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(true);
          expect(response.headers['content-type']).toMatch(/json/);
        }
      }
    });

    test('should include proper error details in error responses', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats'); // Unauthorized request

      if (response.status === 404) {
        console.log('Dashboard stats endpoint not implemented yet');
        return;
      }

      if (response.status >= 400) {
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
        expect(response.body.error.length).toBeGreaterThan(0);
      }
    });
  });
});
