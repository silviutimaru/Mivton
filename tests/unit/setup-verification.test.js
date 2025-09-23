// Simple test to verify our setup works
describe('Test Setup Verification', () => {
  test('should run basic Jest functionality', () => {
    expect(1 + 1).toBe(2);
    expect('test').toBe('test');
    expect(true).toBeTruthy();
  });

  test('should have access to test helpers', () => {
    expect(global.testHelpers).toBeDefined();
    expect(typeof global.testHelpers.getTestUsers).toBe('function');
    expect(typeof global.testHelpers.validateApiResponse).toBe('function');
  });

  test('should have custom matchers', () => {
    expect('test@example.com').toBeValidEmail();
    expect('TestPass123!').toBeValidPassword();
  });

  test('should be able to access environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
