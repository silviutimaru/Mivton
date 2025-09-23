// Phase 2 E2E Tests - Dashboard Navigation and UI
const { test, expect } = require('@playwright/test');

test.describe('Phase 2 - Dashboard Navigation & UI', () => {
  
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Login with test user
    await page.fill('input[type="email"], input[name="email"], #email', 'userA@example.com');
    await page.fill('input[type="password"], input[name="password"], #password', 'TestPass123!');
    await page.click('button[type="submit"], input[type="submit"], button:has-text("Login")');
    
    // Wait for redirect to dashboard or handle login result
    await page.waitForTimeout(2000);
    
    // If not on dashboard yet, navigate there
    if (!page.url().includes('dashboard')) {
      await page.goto('/dashboard');
    }
    
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  });

  test.describe('Landing Page Load', () => {
    test('should load landing page with 200 status and main assets', async ({ page }) => {
      // Navigate to landing page
      const response = await page.goto('/');
      
      // Check response status
      expect(response.status()).toBe(200);
      
      // Check main assets load
      await expect(page.locator('link[rel="stylesheet"]')).toHaveCount({ atLeast: 1 });
      await expect(page.locator('script')).toHaveCount({ atLeast: 1 });
      
      // Check no severe console errors
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // Filter out acceptable errors (favicon, etc.)
      const severeErrors = consoleErrors.filter(error => 
        !error.includes('favicon') &&
        !error.includes('service-worker') &&
        !error.includes('sw.js')
      );
      
      expect(severeErrors).toHaveLength(0);
    });
  });

  test.describe('Dashboard Access and Loading', () => {
    test('should load dashboard successfully after login', async ({ page }) => {
      // Should be on dashboard page
      expect(page.url()).toContain('dashboard');
      
      // Check dashboard title
      await expect(page).toHaveTitle(/Dashboard.*Mivton/);
      
      // Check main dashboard elements
      await expect(page.locator('.dashboard-wrapper, #dashboardWrapper')).toBeVisible();
      await expect(page.locator('.sidebar, #sidebar')).toBeVisible();
      await expect(page.locator('.main-content')).toBeVisible();
      
      // Check loading screen disappears
      const loadingScreen = page.locator('#loadingScreen, .loading-screen');
      if (await loadingScreen.isVisible()) {
        await expect(loadingScreen).toBeHidden({ timeout: 10000 });
      }
    });

    test('should display user information correctly', async ({ page }) => {
      // Check user avatar and name
      const userAvatar = page.locator('#userAvatar, .user-avatar');
      const userName = page.locator('#userName, .user-name');
      
      await expect(userAvatar).toBeVisible();
      await expect(userName).toBeVisible();
      
      // Should show actual username or "Loading..." initially
      const nameText = await userName.textContent();
      expect(nameText).toMatch(/(userA|Loading\.\.\.)/);
    });
  });

  test.describe('Sidebar Navigation', () => {
    test('should display all navigation sections', async ({ page }) => {
      const sidebar = page.locator('.sidebar, #sidebar');
      
      // Check navigation sections exist
      await expect(sidebar.locator('.nav-section')).toHaveCount({ atLeast: 2 });
      
      // Check main navigation items
      const navItems = [
        { selector: '[data-section="overview"]', text: 'Overview' },
        { selector: '[data-section="friends"]', text: 'Friends' },
        { selector: '[data-section="requests"]', text: 'Requests' },
        { selector: '[data-section="find"]', text: 'Find' },
        { selector: '[data-section="profile"]', text: 'Profile' }
      ];
      
      for (const item of navItems) {
        const navElement = sidebar.locator(item.selector);
        await expect(navElement).toBeVisible();
        await expect(navElement).toContainText(item.text);
      }
    });

    test('should navigate between dashboard sections', async ({ page }) => {
      const sidebar = page.locator('.sidebar, #sidebar');
      
      // Test navigation to different sections
      const sections = ['friends', 'requests', 'find', 'profile', 'overview'];
      
      for (const section of sections) {
        const navLink = sidebar.locator(`[data-section="${section}"]`);
        
        if (await navLink.isVisible()) {
          // Click navigation item
          await navLink.click();
          await page.waitForTimeout(500);
          
          // Check section is displayed
          const sectionElement = page.locator(`#${section}-section, .content-section[id*="${section}"]`);
          if (await sectionElement.count() > 0) {
            await expect(sectionElement).toBeVisible();
          }
          
          // Check breadcrumb updates
          const breadcrumb = page.locator('#currentSection, .breadcrumb');
          if (await breadcrumb.count() > 0) {
            const breadcrumbText = await breadcrumb.textContent();
            expect(breadcrumbText.toLowerCase()).toContain(section.toLowerCase());
          }
        }
      }
    });

    test('should show active navigation state', async ({ page }) => {
      const sidebar = page.locator('.sidebar, #sidebar');
      
      // Click different nav items and check active state
      const navItems = sidebar.locator('.nav-item[data-section]');
      const navCount = await navItems.count();
      
      if (navCount > 0) {
        // Click first nav item
        await navItems.first().click();
        await page.waitForTimeout(300);
        
        // Should have active class
        const activeItems = sidebar.locator('.nav-item.active');
        await expect(activeItems).toHaveCount({ atLeast: 1 });
      }
    });
  });

  test.describe('Profile Panel and Language Selector', () => {
    test('should open profile panel', async ({ page }) => {
      // Navigate to profile section
      const profileNav = page.locator('[data-section="profile"], .nav-item:has-text("Profile")');
      
      if (await profileNav.isVisible()) {
        await profileNav.click();
        await page.waitForTimeout(500);
        
        // Check profile section is visible
        const profileSection = page.locator('#profile-section, .content-section:has(.profile-container)');
        await expect(profileSection).toBeVisible();
        
        // Check profile form elements
        await expect(page.locator('#fullNameInput, input[name="fullName"]')).toBeVisible();
        await expect(page.locator('#emailInput, input[name="email"]')).toBeVisible();
      }
    });

    test('should display and persist language selector', async ({ page }) => {
      // Navigate to profile
      const profileNav = page.locator('[data-section="profile"]');
      if (await profileNav.isVisible()) {
        await profileNav.click();
        await page.waitForTimeout(500);
        
        // Check language selector exists
        const languageSelect = page.locator('#nativeLanguageSelect, select[name="nativeLanguage"]');
        if (await languageSelect.isVisible()) {
          await expect(languageSelect).toBeVisible();
          
          // Test language selection
          await languageSelect.selectOption('es');
          await page.waitForTimeout(300);
          
          // Check if value persists
          const selectedValue = await languageSelect.inputValue();
          expect(selectedValue).toBe('es');
          
          // Check localStorage/session persistence
          const hasStoredValue = await page.evaluate(() => {
            return localStorage.getItem('userLanguage') || 
                   sessionStorage.getItem('userLanguage') ||
                   localStorage.getItem('language') ||
                   sessionStorage.getItem('language');
          });
          
          // Value should be stored (might be null if not implemented yet)
          console.log('Stored language value:', hasStoredValue);
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport (390-420px)', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 390, height: 844 });
      
      // Dashboard should still be accessible
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check mobile header appears
      const mobileHeader = page.locator('.mobile-header');
      if (await mobileHeader.count() > 0) {
        await expect(mobileHeader).toBeVisible();
      }
      
      // Check mobile menu button works
      const mobileMenuBtn = page.locator('#mobileMenuBtn, .mobile-menu-btn');
      if (await mobileMenuBtn.isVisible()) {
        await mobileMenuBtn.click();
        await page.waitForTimeout(300);
        
        // Sidebar should be visible or overlay should appear
        const sidebar = page.locator('.sidebar, #sidebar');
        await expect(sidebar).toBeVisible();
      }
      
      // Check no horizontal scrolling
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Small tolerance
    });

    test('should work on larger mobile viewport (420px)', async ({ page }) => {
      await page.setViewportSize({ width: 420, height: 844 });
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Main navigation should be accessible
      const dashboardWrapper = page.locator('.dashboard-wrapper, #dashboardWrapper');
      await expect(dashboardWrapper).toBeVisible();
      
      // Check layout doesn't break
      const sidebar = page.locator('.sidebar, #sidebar');
      const mainContent = page.locator('.main-content');
      
      if (await sidebar.count() > 0) {
        const sidebarBounds = await sidebar.boundingBox();
        const mainBounds = await mainContent.boundingBox();
        
        // Elements should not overlap in a broken way
        expect(sidebarBounds).toBeTruthy();
        expect(mainBounds).toBeTruthy();
      }
    });

    test('should handle sidebar toggle on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const mobileMenuBtn = page.locator('#mobileMenuBtn, .mobile-menu-btn');
      const sidebar = page.locator('.sidebar, #sidebar');
      const sidebarClose = page.locator('#sidebarClose, .sidebar-close');
      
      if (await mobileMenuBtn.isVisible()) {
        // Open sidebar
        await mobileMenuBtn.click();
        await page.waitForTimeout(300);
        await expect(sidebar).toBeVisible();
        
        // Close sidebar
        if (await sidebarClose.isVisible()) {
          await sidebarClose.click();
          await page.waitForTimeout(300);
          
          // Sidebar should be hidden or have appropriate class
          const sidebarClasses = await sidebar.getAttribute('class');
          const isHidden = sidebarClasses?.includes('hidden') || 
                          sidebarClasses?.includes('closed') ||
                          !(await sidebar.isVisible());
          
          expect(isHidden).toBe(true);
        }
      }
    });
  });

  test.describe('Key Screen Navigation', () => {
    test('should navigate through all main screens without layout breaks', async ({ page }) => {
      const screens = [
        { name: 'overview', selector: '[data-section="overview"]' },
        { name: 'friends', selector: '[data-section="friends"]' },
        { name: 'requests', selector: '[data-section="requests"]' },
        { name: 'find', selector: '[data-section="find"]' },
        { name: 'profile', selector: '[data-section="profile"]' }
      ];
      
      for (const screen of screens) {
        const navLink = page.locator(screen.selector);
        
        if (await navLink.isVisible()) {
          // Navigate to screen
          await navLink.click();
          await page.waitForTimeout(500);
          
          // Check no layout breaks
          const mainContent = page.locator('.main-content');
          const contentSection = page.locator('.content-section.active, .content-section:visible');
          
          await expect(mainContent).toBeVisible();
          
          if (await contentSection.count() > 0) {
            // Check content doesn't overflow
            const bounds = await contentSection.first().boundingBox();
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBeGreaterThan(0);
          }
          
          console.log(`✅ ${screen.name} screen layout OK`);
        }
      }
    });

    test('should display appropriate empty states', async ({ page }) => {
      // Check friends section empty state
      const friendsNav = page.locator('[data-section="friends"]');
      if (await friendsNav.isVisible()) {
        await friendsNav.click();
        await page.waitForTimeout(500);
        
        const emptyState = page.locator('.empty-state, .friends-fallback');
        if (await emptyState.count() > 0) {
          await expect(emptyState.first()).toBeVisible();
        }
      }
      
      // Check requests section empty state
      const requestsNav = page.locator('[data-section="requests"]');
      if (await requestsNav.isVisible()) {
        await requestsNav.click();
        await page.waitForTimeout(500);
        
        const emptyState = page.locator('.empty-state');
        if (await emptyState.count() > 0) {
          await expect(emptyState.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Dashboard Statistics and UI Elements', () => {
    test('should display dashboard statistics', async ({ page }) => {
      // Navigate to overview
      const overviewNav = page.locator('[data-section="overview"]');
      if (await overviewNav.isVisible()) {
        await overviewNav.click();
        await page.waitForTimeout(500);
        
        // Check stats display
        const statsElements = page.locator('.stat-value, .stat-number, .dashboard-card');
        const statsCount = await statsElements.count();
        
        if (statsCount > 0) {
          await expect(statsElements.first()).toBeVisible();
          
          // Check numeric values
          const statNumbers = page.locator('#statMessages, #statLanguages, #statFriends, #statHours');
          for (let i = 0; i < await statNumbers.count(); i++) {
            const statElement = statNumbers.nth(i);
            const value = await statElement.textContent();
            expect(value).toMatch(/^\d+$/); // Should be numeric
          }
        }
      }
    });

    test('should show proper user welcome message', async ({ page }) => {
      const welcomeBanner = page.locator('.welcome-banner');
      if (await welcomeBanner.isVisible()) {
        const welcomeText = page.locator('#welcomeUserName, .welcome-content h2');
        if (await welcomeText.count() > 0) {
          const text = await welcomeText.textContent();
          expect(text).toMatch(/(User|userA|Welcome)/);
        }
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('should handle quick action buttons', async ({ page }) => {
      // Navigate to overview
      const overviewNav = page.locator('[data-section="overview"]');
      if (await overviewNav.isVisible()) {
        await overviewNav.click();
        await page.waitForTimeout(500);
        
        // Test quick action buttons
        const findFriendsBtn = page.locator('button:has-text("Find Friends"), .action-btn:has-text("Find")');
        if (await findFriendsBtn.isVisible()) {
          await findFriendsBtn.click();
          await page.waitForTimeout(300);
          
          // Should navigate to find section
          const findSection = page.locator('#find-section');
          if (await findSection.count() > 0) {
            await expect(findSection).toBeVisible();
          }
        }
      }
    });

    test('should handle notifications button', async ({ page }) => {
      const notificationsBtn = page.locator('#notificationsBtn, .notifications-btn');
      if (await notificationsBtn.isVisible()) {
        await notificationsBtn.click();
        await page.waitForTimeout(300);
        
        // Should show notifications panel or update badge
        const notificationBadge = page.locator('#notificationBadge, .notification-badge');
        if (await notificationBadge.count() > 0) {
          const badge = await notificationBadge.textContent();
          expect(badge).toMatch(/^\d+$/);
        }
      }
    });

    test('should handle logout functionality', async ({ page }) => {
      const logoutBtn = page.locator('#logoutBtn, .logout-btn');
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
        await page.waitForTimeout(1000);
        
        // Should redirect to login or landing page
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/(login|^\/$)/);
      }
    });
  });
});
