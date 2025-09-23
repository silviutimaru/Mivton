// API tests for authentication routes
const request = require('supertest');
const express = require('express');
const session = require('express-session');
const authRoutes = require('../../routes/auth');

// Mock the database connection
jest.mock('../../database/connection', () => ({
  getDb: jest.fn(() => ({
    query: jest.fn()
  }))
}));

// Mock email utils
jest.mock('../../utils/email', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

const { getDb } = require('../../database/connection');

describe('Authentication API Routes', () => {
  let app;
  let mockDb;

  beforeAll(async () => {
    // Reset test data before running tests
    await global.testHelpers.resetTestData();
  });

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
    app.use('/api/auth', authRoutes);

    // Setup database mock
    mockDb = {
      query: jest.fn()
    };
    getDb.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'ValidPass123!',
      fullName: 'New User',
      gender: 'male',
      nativeLanguage: 'en'
    };

    test('should register a new user successfully', async () => {
      // Mock database calls
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ // Insert new user
          rows: [{
            id: 3,
            username: 'newuser',
            email: 'newuser@example.com',
            full_name: 'New User',
            gender: 'male',
            native_language: 'en',
            created_at: new Date()
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Update last login

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      global.testHelpers.validateApiResponse(response, 201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('newuser');
    });

    test('should reject registration with invalid email', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            msg: expect.stringContaining('valid email')
          })
        ])
      );
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordData = {
        ...validRegistrationData,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData);

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'password'
          })
        ])
      );
    });

    test('should reject registration with duplicate email', async () => {
      // Mock database to return existing user
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, email: 'newuser@example.com' }] 
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.error).toContain('already exists');
    });

    test('should reject registration with duplicate username', async () => {
      // Mock database to return existing user
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, username: 'newuser' }] 
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.error).toContain('already exists');
    });

    test('should handle database errors during registration', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData);

      global.testHelpers.validateApiResponse(response, 500);
      expect(response.body.error).toContain('Server error');
    });

    test('should reject registration with missing required fields', async () => {
      const incompleteData = {
        username: 'newuser',
        email: 'newuser@example.com'
        // Missing password, fullName, etc.
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData);

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should enforce username length requirements', async () => {
      const shortUsernameData = {
        ...validRegistrationData,
        username: 'ab' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(shortUsernameData);

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'username'
          })
        ])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'userA@example.com',
      password: 'TestPass123!'
    };

    test('should login with valid credentials', async () => {
      // Mock database to return valid user
      mockDb.query
        .mockResolvedValueOnce({ // Find user
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
        .mockResolvedValueOnce({ rows: [] }); // Update last login

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('userA');
    });

    test('should reject login with invalid email', async () => {
      // Mock database to return no user
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPass123!'
        });

      global.testHelpers.validateApiResponse(response, 401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should reject login with wrong password', async () => {
      // Mock database to return user
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'userA',
          email: 'usera@example.com',
          password_hash: '$2b$04$rQvBXNk.VNpMGV5fJOy8QOEv.3vr4QvJGKuVXy8m9Yz8jNpFjK7gK',
          is_blocked: false
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'userA@example.com',
          password: 'WrongPassword123!'
        });

      global.testHelpers.validateApiResponse(response, 401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    test('should reject login for blocked users', async () => {
      // Mock database to return blocked user
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'blockeduser',
          email: 'blocked@example.com',
          password_hash: '$2b$04$rQvBXNk.VNpMGV5fJOy8QOEv.3vr4QvJGKuVXy8m9Yz8jNpFjK7gK',
          is_blocked: true
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'blocked@example.com',
          password: 'TestPass123!'
        });

      global.testHelpers.validateApiResponse(response, 403);
      expect(response.body.error).toContain('blocked');
    });

    test('should handle database errors during login', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData);

      global.testHelpers.validateApiResponse(response, 500);
      expect(response.body.error).toContain('Server error');
    });

    test('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPass123!'
        });

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should reject login with empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'userA@example.com',
          password: ''
        });

      global.testHelpers.validateApiResponse(response, 400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout authenticated user', async () => {
      // Mock session with user
      const agent = request.agent(app);
      
      // First login to create session
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
        .mockResolvedValue({ rows: [] }); // For any subsequent queries

      await agent
        .post('/api/auth/login')
        .send({
          email: 'userA@example.com',
          password: 'TestPass123!'
        });

      // Now logout
      const response = await agent
        .post('/api/auth/logout');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    test('should handle logout without active session', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      // Should still return success even without session
      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user data when authenticated', async () => {
      // Create agent with session
      const agent = request.agent(app);
      
      // Login first
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

      await agent
        .post('/api/auth/login')
        .send({
          email: 'userA@example.com',
          password: 'TestPass123!'
        });

      const response = await agent
        .get('/api/auth/me');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('userA');
    });

    test('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      global.testHelpers.validateApiResponse(response, 401);
      expect(response.body.error).toBe('Not authenticated');
    });
  });

  describe('GET /api/auth/status', () => {
    test('should return authentication status', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body).toHaveProperty('authenticated');
      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBe(null);
    });
  });

  describe('GET /api/auth/check-username/:username', () => {
    test('should check username availability', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Username available

      const response = await request(app)
        .get('/api/auth/check-username/availableuser');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.available).toBe(true);
      expect(response.body.message).toContain('available');
    });

    test('should detect taken usernames', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Username taken

      const response = await request(app)
        .get('/api/auth/check-username/takenuser');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toContain('taken');
    });

    test('should reject invalid usernames', async () => {
      const response = await request(app)
        .get('/api/auth/check-username/a'); // Too short

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toContain('3 and 20 characters');
    });
  });

  describe('GET /api/auth/check-email/:email', () => {
    test('should check email availability', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Email available

      const response = await request(app)
        .get('/api/auth/check-email/available@example.com');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.available).toBe(true);
      expect(response.body.message).toContain('available');
    });

    test('should detect taken emails', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Email taken

      const response = await request(app)
        .get('/api/auth/check-email/taken@example.com');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toContain('registered');
    });

    test('should reject invalid email formats', async () => {
      const response = await request(app)
        .get('/api/auth/check-email/invalid-email');

      global.testHelpers.validateApiResponse(response, 200);
      expect(response.body.available).toBe(false);
      expect(response.body.message).toContain('valid email');
    });
  });
});
