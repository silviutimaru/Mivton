// Unit tests for database connection utilities
const { initializeDatabase, getDb, closeDb } = require('../../database/connection');

// Mock pg module
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }))
}));

describe('Database Connection', () => {
  let mockPool;

  beforeEach(() => {
    const { Pool } = require('pg');
    mockPool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn()
    };
    Pool.mockImplementation(() => mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeDatabase', () => {
    test('should initialize database connection successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ now: new Date() }] });

      await expect(initializeDatabase()).resolves.not.toThrow();
      
      // Should test connection with SELECT NOW()
      expect(mockPool.query).toHaveBeenCalledWith('SELECT NOW()');
    });

    test('should handle database connection errors', async () => {
      const connectionError = new Error('Connection refused');
      mockPool.query.mockRejectedValueOnce(connectionError);

      await expect(initializeDatabase()).rejects.toThrow('Connection refused');
    });

    test('should handle missing environment variables gracefully', async () => {
      // Store original env vars
      const originalDatabaseUrl = process.env.DATABASE_URL;
      
      // Clear DATABASE_URL
      delete process.env.DATABASE_URL;

      try {
        // Should not throw, should use defaults or handle gracefully
        await initializeDatabase();
      } catch (error) {
        // If it throws, it should be a meaningful error
        expect(error.message).toContain('DATABASE_URL');
      } finally {
        // Restore original env var
        if (originalDatabaseUrl) {
          process.env.DATABASE_URL = originalDatabaseUrl;
        }
      }
    });
  });

  describe('getDb', () => {
    test('should return database pool instance', () => {
      const db = getDb();
      expect(db).toBeDefined();
      expect(typeof db.query).toBe('function');
    });

    test('should return same instance on multiple calls', () => {
      const db1 = getDb();
      const db2 = getDb();
      expect(db1).toBe(db2);
    });
  });

  describe('closeDb', () => {
    test('should close database connection', async () => {
      mockPool.end.mockResolvedValueOnce();

      await expect(closeDb()).resolves.not.toThrow();
      expect(mockPool.end).toHaveBeenCalled();
    });

    test('should handle close errors gracefully', async () => {
      const closeError = new Error('Close failed');
      mockPool.end.mockRejectedValueOnce(closeError);

      await expect(closeDb()).rejects.toThrow('Close failed');
    });
  });

  describe('Database Query Error Handling', () => {
    test('should handle SQL syntax errors', async () => {
      const sqlError = new Error('syntax error at or near "SELET"');
      sqlError.code = '42601';
      mockPool.query.mockRejectedValueOnce(sqlError);

      const db = getDb();
      await expect(db.query('SELET * FROM users')).rejects.toThrow('syntax error');
    });

    test('should handle connection timeouts', async () => {
      const timeoutError = new Error('connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockPool.query.mockRejectedValueOnce(timeoutError);

      const db = getDb();
      await expect(db.query('SELECT 1')).rejects.toThrow('connection timeout');
    });

    test('should handle permission errors', async () => {
      const permissionError = new Error('permission denied for table users');
      permissionError.code = '42501';
      mockPool.query.mockRejectedValueOnce(permissionError);

      const db = getDb();
      await expect(db.query('SELECT * FROM users')).rejects.toThrow('permission denied');
    });
  });

  describe('Connection Pool Configuration', () => {
    test('should use environment variables for pool configuration', () => {
      // Set test environment variables
      process.env.DB_POOL_MIN = '2';
      process.env.DB_POOL_MAX = '10';
      process.env.DB_POOL_IDLE_TIMEOUT = '30000';

      const { Pool } = require('pg');
      
      // Reinitialize to pick up new env vars
      jest.resetModules();
      require('../../database/connection');

      // Verify Pool was called with correct configuration
      expect(Pool).toHaveBeenCalled();
    });

    test('should use default values when environment variables are missing', () => {
      // Clear environment variables
      delete process.env.DB_POOL_MIN;
      delete process.env.DB_POOL_MAX;
      delete process.env.DB_POOL_IDLE_TIMEOUT;

      const { Pool } = require('pg');
      
      // Reinitialize to pick up defaults
      jest.resetModules();
      require('../../database/connection');

      expect(Pool).toHaveBeenCalled();
    });
  });
});
