// Unit tests for authentication middleware
const authMiddleware = require('../../middleware/auth');

// Mock the database connection
jest.mock('../../database/connection', () => ({
  getDb: jest.fn(() => ({
    query: jest.fn()
  }))
}));

const { getDb } = require('../../database/connection');

describe('Authentication Middleware', () => {
  let req, res, next;
  let mockDb;

  beforeEach(() => {
    req = {
      session: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {}
    };
    next = jest.fn();
    
    mockDb = {
      query: jest.fn()
    };
    getDb.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth middleware', () => {
    test('should reject unauthenticated requests', async () => {
      // No session
      req.session = null;

      await authMiddleware.requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        redirectTo: '/login.html'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject requests without userId in session', async () => {
      // Session exists but no userId
      req.session = {};

      await authMiddleware.requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        redirectTo: '/login.html'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle user not found in database', async () => {
      req.session = { 
        userId: 999,
        destroy: jest.fn()
      };
      
      // Mock database to return no user
      mockDb.query.mockResolvedValue({ rows: [] });

      await authMiddleware.requireAuth(req, res, next);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, username, email, full_name, native_language, gender, is_verified, is_admin, status FROM users WHERE id = $1',
        [999]
      );
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
        redirectTo: '/login.html'
      });
    });

    test('should allow authenticated requests with valid user', async () => {
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

      req.session = { userId: 1 };
      mockDb.query.mockResolvedValue({ rows: [mockUser] });

      await authMiddleware.requireAuth(req, res, next);

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, username, email, full_name, native_language, gender, is_verified, is_admin, status FROM users WHERE id = $1',
        [1]
      );
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      req.session = { userId: 1 };
      mockDb.query.mockRejectedValue(new Error('Database connection error'));

      await authMiddleware.requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication error'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireGuest middleware', () => {
    test('should allow unauthenticated requests', () => {
      req.session = null;

      authMiddleware.requireGuest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow requests without userId', () => {
      req.session = {};

      authMiddleware.requireGuest(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject authenticated requests', () => {
      req.session = { userId: 1 };

      authMiddleware.requireGuest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Already authenticated',
        redirectTo: '/dashboard.html'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin middleware', () => {
    test('should reject unauthenticated requests', async () => {
      req.session = null;

      await authMiddleware.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        redirectTo: '/login.html'
      });
    });

    test('should reject non-admin users', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        is_admin: false
      };

      req.session = { userId: 1 };
      mockDb.query.mockResolvedValue({ rows: [mockUser] });

      await authMiddleware.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin access required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow admin users', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        is_admin: true
      };

      req.session = { userId: 1 };
      mockDb.query.mockResolvedValue({ rows: [mockUser] });

      await authMiddleware.requireAdmin(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    test('should always call next regardless of authentication status', () => {
      // Test with no session
      req.session = null;
      authMiddleware.optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset and test with session
      next.mockClear();
      req.session = { userId: 1 };
      authMiddleware.optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('addUserToLocals middleware', () => {
    test('should add user to res.locals when authenticated', () => {
      const mockUser = { id: 1, username: 'testuser' };
      req.session = { user: mockUser };

      authMiddleware.addUserToLocals(req, res, next);

      expect(res.locals.user).toEqual(mockUser);
      expect(res.locals.isAuthenticated).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    test('should set null user when not authenticated', () => {
      req.session = null;

      authMiddleware.addUserToLocals(req, res, next);

      expect(res.locals.user).toBe(null);
      expect(res.locals.isAuthenticated).toBe(false);
      expect(next).toHaveBeenCalled();
    });
  });
});
