// Unit tests for password hashing and verification
const bcrypt = require('bcrypt');

describe('Password Security Utils', () => {
  const testPassword = 'TestPass123!';
  const wrongPassword = 'WrongPass123!';

  describe('Password hashing', () => {
    test('should hash password successfully', async () => {
      const hash = await bcrypt.hash(testPassword, 4);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(testPassword);
      expect(hash.startsWith('$2b$')).toBe(true);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should generate different hashes for same password', async () => {
      const hash1 = await bcrypt.hash(testPassword, 4);
      const hash2 = await bcrypt.hash(testPassword, 4);
      
      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty password', async () => {
      const hash = await bcrypt.hash('', 4);
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('Password verification', () => {
    let testHash;

    beforeAll(async () => {
      testHash = await bcrypt.hash(testPassword, 4);
    });

    test('should verify correct password', async () => {
      const isValid = await bcrypt.compare(testPassword, testHash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const isValid = await bcrypt.compare(wrongPassword, testHash);
      expect(isValid).toBe(false);
    });

    test('should reject empty password against valid hash', async () => {
      const isValid = await bcrypt.compare('', testHash);
      expect(isValid).toBe(false);
    });

    test('should handle invalid hash format', async () => {
      await expect(bcrypt.compare(testPassword, 'invalid-hash')).rejects.toThrow();
    });

    test('should handle null/undefined inputs gracefully', async () => {
      await expect(bcrypt.compare(null, testHash)).rejects.toThrow();
      await expect(bcrypt.compare(testPassword, null)).rejects.toThrow();
    });
  });

  describe('Salt rounds performance', () => {
    test('should complete hashing within reasonable time for test rounds', async () => {
      const start = Date.now();
      await bcrypt.hash(testPassword, 4);
      const duration = Date.now() - start;
      
      // Should complete within 1 second for test rounds
      expect(duration).toBeLessThan(1000);
    }, 2000);
  });
});
