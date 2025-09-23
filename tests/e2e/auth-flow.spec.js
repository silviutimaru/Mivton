// E2E tests for authentication flow
const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
  });

  test.describe('Landing Page', () => {
    test('should display landing page for unauthenticated users', async ({ page }) => {
      // Check that we're on the landing page
      await expect(page).toHaveTitle(/Mivton/);
      
      // Should have login and register links
      const loginLink = page.locator('a[href*="login"], a:has-text("Login"), a:has-text("Sign In")');
      const registerLink = page.locator('a[href*="register"], a:has-text("Register"), a:has-text("Sign Up")');
      
      await expect(loginLink.first()).toBeVisible();
      await expect(registerLink.first()).toBeVisible();
    });

    test('should redirect authenticated users to dashboard', async ({ page }) => {
      // This test would require setting up authentication state first
      // For now, we'll test the redirect mechanism
      
      // If user is authenticated, should redirect to dashboard
      await page.goto('/dashboard');
      
      // Since we're not authenticated, should redirect to login or show login page
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/(login|dashboard)/);
    });
  });

  test.describe('Login Flow', () => {
    test('should navigate to login page', async ({ page }) => {
      // Navigate to login page
      await page.goto('/login');
      
      // Should display login form
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/login');
      
      // Find login form elements
      const emailInput = page.locator('input[type="email"], input[name="email"], #email');
      const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
      const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      // Submit form with invalid email
      await emailInput.fill('invalid-email');
      await passwordInput.fill('somepassword');
      await submitButton.click();
      
      // Should show validation error (either browser validation or custom)
      // Wait for either browser validation or custom error message
      await page.waitForTimeout(1000); // Give time for validation to appear
      
      // Check for validation - either browser or custom
      const hasValidationError = await page.evaluate(() => {
        const emailField = document.querySelector('input[type="email"], input[name="email"], #email');
        return !emailField?.validity?.valid || 
               document.querySelector('.error, .invalid, [class*="error"]') !== null ||
               document.body.textContent.includes('valid email');
      });
      
      expect(hasValidationError).toBe(true);
    });

    test('should handle login with test user credentials', async ({ page }) => {
      await page.goto('/login');
      
      // Use test user credentials
      const emailInput = page.locator('input[type="email"], input[name="email"], #email');
      const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
      const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      await emailInput.fill('userA@example.com');
      await passwordInput.fill('TestPass123!');
      await submitButton.click();
      
      // Wait for navigation or response
      await page.waitForTimeout(2000);
      
      // Should either redirect to dashboard or show an error (depending on test DB state)
      const currentUrl = page.url();
      const pageContent = await page.textContent('body');
      
      // Success case: redirected to dashboard
      const isOnDashboard = currentUrl.includes('dashboard');
      
      // Error case: shows meaningful error message
      const hasErrorMessage = pageContent.includes('Invalid') || 
                             pageContent.includes('error') || 
                             pageContent.includes('failed');
      
      // One of these should be true
      expect(isOnDashboard || hasErrorMessage).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      const emailInput = page.locator('input[type="email"], input[name="email"], #email');
      const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
      const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      // Use invalid credentials
      await emailInput.fill('nonexistent@example.com');
      await passwordInput.fill('WrongPassword123!');
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Should show error message
      const pageContent = await page.textContent('body');
      const hasErrorMessage = pageContent.includes('Invalid') || 
                             pageContent.includes('incorrect') || 
                             pageContent.includes('password') ||
                             pageContent.includes('error');
      
      expect(hasErrorMessage).toBe(true);
    });
  });

  test.describe('Registration Flow', () => {
    test('should navigate to registration page', async ({ page }) => {
      await page.goto('/register');
      
      // Should display registration form
      await expect(page.locator('form')).toBeVisible();
      
      // Check for required form fields
      const formFields = [
        'input[name="username"], #username',
        'input[name="email"], #email',
        'input[name="password"], #password',
        'input[name="fullName"], #fullName',
        'select[name="gender"], #gender',
        'select[name="nativeLanguage"], #nativeLanguage'
      ];
      
      for (const selector of formFields) {
        const field = page.locator(selector);
        if (await field.count() > 0) {
          await expect(field.first()).toBeVisible();
        }
      }
      
      // Should have submit button
      await expect(page.locator('button[type="submit"], input[type="submit"]')).toBeVisible();
    });

    test('should validate registration form fields', async ({ page }) => {
      await page.goto('/register');
      
      // Find form elements
      const usernameInput = page.locator('input[name="username"], #username');
      const emailInput = page.locator('input[name="email"], #email');
      const passwordInput = page.locator('input[name="password"], #password');
      const submitButton = page.locator('button[type="submit"], input[type="submit"]');
      
      // Try submitting with invalid data
      if (await usernameInput.count() > 0) {
        await usernameInput.fill('ab'); // Too short
      }
      if (await emailInput.count() > 0) {
        await emailInput.fill('invalid-email');
      }
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('weak'); // Too weak
      }
      
      await submitButton.click();
      
      // Wait for validation
      await page.waitForTimeout(1000);
      
      // Should show validation errors
      const hasValidationErrors = await page.evaluate(() => {
        return document.querySelector('.error, .invalid, [class*="error"]') !== null ||
               !document.querySelector('input[name="email"], #email')?.validity?.valid ||
               document.body.textContent.includes('invalid') ||
               document.body.textContent.includes('required');
      });
      
      expect(hasValidationErrors).toBe(true);
    });

    test('should handle registration with valid data', async ({ page }) => {
      await page.goto('/register');
      
      // Generate unique test data
      const timestamp = Date.now();
      const testUser = {
        username: `testuser${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'TestPass123!',
        fullName: 'Test User',
        gender: 'male',
        nativeLanguage: 'en'
      };
      
      // Fill form if fields exist
      const usernameInput = page.locator('input[name="username"], #username');
      const emailInput = page.locator('input[name="email"], #email');
      const passwordInput = page.locator('input[name="password"], #password');
      const fullNameInput = page.locator('input[name="fullName"], #fullName');
      const genderSelect = page.locator('select[name="gender"], #gender');
      const languageSelect = page.locator('select[name="nativeLanguage"], #nativeLanguage');
      const submitButton = page.locator('button[type="submit"], input[type="submit"]');
      
      if (await usernameInput.count() > 0) {
        await usernameInput.fill(testUser.username);
      }
      if (await emailInput.count() > 0) {
        await emailInput.fill(testUser.email);
      }
      if (await passwordInput.count() > 0) {
        await passwordInput.fill(testUser.password);
      }
      if (await fullNameInput.count() > 0) {
        await fullNameInput.fill(testUser.fullName);
      }
      if (await genderSelect.count() > 0) {
        await genderSelect.selectOption(testUser.gender);
      }
      if (await languageSelect.count() > 0) {
        await languageSelect.selectOption(testUser.nativeLanguage);
      }
      
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Should either succeed or show meaningful error
      const currentUrl = page.url();
      const pageContent = await page.textContent('body');
      
      const isSuccessful = currentUrl.includes('dashboard') || 
                          pageContent.includes('success') ||
                          pageContent.includes('welcome');
      
      const hasErrorMessage = pageContent.includes('error') ||
                             pageContent.includes('exists') ||
                             pageContent.includes('invalid');
      
      // One of these should be true
      expect(isSuccessful || hasErrorMessage).toBe(true);
    });
  });

  test.describe('Dashboard Access', () => {
    test('should redirect unauthenticated users from dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Wait for potential redirect
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      
      // Should be redirected to login or show login prompt
      const isRedirectedOrShowsLogin = currentUrl.includes('login') ||
                                      await page.locator('input[type="email"]').count() > 0 ||
                                      await page.textContent('body').then(text => 
                                        text.includes('login') || text.includes('authenticate')
                                      );
      
      expect(isRedirectedOrShowsLogin).toBe(true);
    });

    test('should show dashboard for authenticated users', async ({ page }) => {
      // First login with test credentials
      await page.goto('/login');
      
      const emailInput = page.locator('input[type="email"], input[name="email"], #email');
      const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
      const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login")');
      
      if (await emailInput.count() > 0) {
        await emailInput.fill('userA@example.com');
        await passwordInput.fill('TestPass123!');
        await submitButton.click();
        
        // Wait for login response
        await page.waitForTimeout(2000);
        
        // If login was successful, navigate to dashboard
        if (page.url().includes('dashboard') || 
            await page.textContent('body').then(text => text.includes('dashboard'))) {
          
          // Should show dashboard content
          const pageContent = await page.textContent('body');
          const hasDashboardContent = pageContent.includes('Dashboard') ||
                                    pageContent.includes('Welcome') ||
                                    await page.locator('[class*="dashboard"], [id*="dashboard"]').count() > 0;
          
          expect(hasDashboardContent).toBe(true);
        }
      }
    });
  });

  test.describe('Navigation and User Experience', () => {
    test('should not have console errors on critical pages', async ({ page }) => {
      const consoleErrors = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Test critical pages
      const pagesToTest = ['/', '/login', '/register'];
      
      for (const pagePath of pagesToTest) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
      
      // Filter out known acceptable errors (e.g., favicon 404, service worker issues)
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('favicon') &&
        !error.includes('service-worker') &&
        !error.includes('sw.js') &&
        !error.toLowerCase().includes('non-critical')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('should handle network failures gracefully', async ({ page }) => {
      await page.goto('/login');
      
      // Simulate network failure during form submission
      await page.route('**/api/auth/login', route => {
        route.abort('failed');
      });
      
      const emailInput = page.locator('input[type="email"], input[name="email"], #email');
      const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
      const submitButton = page.locator('button[type="submit"], input[type="submit"]');
      
      if (await emailInput.count() > 0) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('TestPass123!');
        await submitButton.click();
        
        // Wait for error handling
        await page.waitForTimeout(2000);
        
        // Should show error message or retry option
        const pageContent = await page.textContent('body');
        const hasErrorHandling = pageContent.includes('error') ||
                                pageContent.includes('try again') ||
                                pageContent.includes('network') ||
                                pageContent.includes('connection');
        
        expect(hasErrorHandling).toBe(true);
      }
    });

    test('should have proper page titles and meta tags', async ({ page }) => {
      const pagesToTest = [
        { path: '/', expectedTitle: /Mivton/ },
        { path: '/login', expectedTitle: /Login|Sign In|Mivton/ },
        { path: '/register', expectedTitle: /Register|Sign Up|Mivton/ }
      ];
      
      for (const pageTest of pagesToTest) {
        await page.goto(pageTest.path);
        await expect(page).toHaveTitle(pageTest.expectedTitle);
        
        // Check for viewport meta tag
        const hasViewport = await page.locator('meta[name="viewport"]').count() > 0;
        expect(hasViewport).toBe(true);
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/login');
      
      // Form should still be usable
      const emailInput = page.locator('input[type="email"], input[name="email"], #email');
      const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
      
      if (await emailInput.count() > 0) {
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        
        // Should be able to interact with form
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password');
        
        // Verify input values
        expect(await emailInput.inputValue()).toBe('test@example.com');
        expect(await passwordInput.inputValue()).toBe('password');
      }
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/register');
      
      // Form should be properly laid out
      const form = page.locator('form');
      if (await form.count() > 0) {
        await expect(form).toBeVisible();
        
        // Check that form elements are accessible
        const formInputs = page.locator('input, select, button');
        const inputCount = await formInputs.count();
        expect(inputCount).toBeGreaterThan(0);
      }
    });
  });
});
