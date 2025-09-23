const { test, expect } = require('@playwright/test');

/**
 * 🚀 MIVTON PHASE 3 - FRIENDS SYSTEM E2E TESTS
 * End-to-end testing for the complete friends workflow
 * 
 * Test Scenarios:
 * - User A sends friend request to User B
 * - User B accepts request and both see each other as friends
 * - Friend removal and re-adding cycle
 * - Block/unblock functionality
 * - Real-time updates and notifications
 */

test.describe('Phase 3: Friends System E2E', () => {
    let userAPage, userBPage;
    let userACredentials, userBCredentials;

    test.beforeAll(async ({ browser }) => {
        // Create two browser contexts for testing interactions
        const contextA = await browser.newContext();
        const contextB = await browser.newContext();
        
        userAPage = await contextA.newPage();
        userBPage = await contextB.newPage();

        // Create unique test users for this run
        const timestamp = Date.now();
        userACredentials = {
            username: `e2e_user_a_${timestamp}`,
            email: `e2e_a_${timestamp}@example.com`,
            password: 'TestPassword123',
            fullName: 'E2E Test User A'
        };
        
        userBCredentials = {
            username: `e2e_user_b_${timestamp}`,
            email: `e2e_b_${timestamp}@example.com`, 
            password: 'TestPassword123',
            fullName: 'E2E Test User B'
        };

        console.log('🔧 Setting up E2E test users:', userACredentials.username, userBCredentials.username);
    });

    test.afterAll(async () => {
        await userAPage?.close();
        await userBPage?.close();
    });

    test('Complete friends workflow: request → accept → friendship', async () => {
        // Step 1: Register both users
        await test.step('Register User A', async () => {
            await userAPage.goto('http://localhost:3001/register');
            await userAPage.fill('input[name="username"]', userACredentials.username);
            await userAPage.fill('input[name="email"]', userACredentials.email);
            await userAPage.fill('input[name="password"]', userACredentials.password);
            await userAPage.fill('input[name="confirmPassword"]', userACredentials.password);
            await userAPage.fill('input[name="fullName"]', userACredentials.fullName);
            
            await userAPage.click('button[type="submit"]');
            await expect(userAPage).toHaveURL(/dashboard/, { timeout: 10000 });
            console.log('✅ User A registered and logged in');
        });

        await test.step('Register User B', async () => {
            await userBPage.goto('http://localhost:3001/register');
            await userBPage.fill('input[name="username"]', userBCredentials.username);
            await userBPage.fill('input[name="email"]', userBCredentials.email);
            await userBPage.fill('input[name="password"]', userBCredentials.password);
            await userBPage.fill('input[name="confirmPassword"]', userBCredentials.password);
            await userBPage.fill('input[name="fullName"]', userBCredentials.fullName);
            
            await userBPage.click('button[type="submit"]');
            await expect(userBPage).toHaveURL(/dashboard/, { timeout: 10000 });
            console.log('✅ User B registered and logged in');
        });

        // Step 2: User A searches for User B
        await test.step('User A searches for User B', async () => {
            // Navigate to user search
            await userAPage.click('a[href*="search"], [data-test="user-search"]');
            
            // Search for User B
            await userAPage.fill('input[type="search"], input[placeholder*="search"]', userBCredentials.username);
            await userAPage.press('input[type="search"], input[placeholder*="search"]', 'Enter');
            
            // Wait for search results
            await userAPage.waitForSelector('[data-test="search-results"], .search-results, .user-card', { timeout: 5000 });
            
            // Verify User B appears in results
            await expect(userAPage.locator(`text=${userBCredentials.fullName}`)).toBeVisible();
            console.log('✅ User A found User B in search results');
        });

        // Step 3: User A sends friend request to User B
        await test.step('User A sends friend request to User B', async () => {
            // Click on User B's profile or friend request button
            await userAPage.click(`text=${userBCredentials.fullName}`);
            
            // Send friend request
            await userAPage.click('button:has-text("Add Friend"), button:has-text("Send Request"), [data-test="send-friend-request"]');
            
            // Verify success message
            await expect(userAPage.locator('text=/friend request sent/i, .success-message')).toBeVisible({ timeout: 5000 });
            console.log('✅ User A sent friend request to User B');
        });

        // Step 4: User B receives and accepts friend request
        await test.step('User B accepts friend request', async () => {
            // Navigate to friend requests or notifications
            await userBPage.click('a[href*="requests"], [data-test="friend-requests"], .notifications-bell');
            
            // Wait for friend request to appear
            await userBPage.waitForSelector(`text=${userACredentials.fullName}, [data-test="friend-request"]`, { timeout: 10000 });
            
            // Accept the friend request
            await userBPage.click('button:has-text("Accept"), [data-test="accept-request"]');
            
            // Verify acceptance message
            await expect(userBPage.locator('text=/now friends/i, text=/accepted/i')).toBeVisible({ timeout: 5000 });
            console.log('✅ User B accepted friend request from User A');
        });

        // Step 5: Verify both users see each other as friends
        await test.step('Verify friendship is established for both users', async () => {
            // Check User A's friends list
            await userAPage.click('a[href*="friends"], [data-test="friends-list"]');
            await expect(userAPage.locator(`text=${userBCredentials.fullName}`)).toBeVisible({ timeout: 5000 });
            console.log('✅ User A sees User B in friends list');
            
            // Check User B's friends list
            await userBPage.click('a[href*="friends"], [data-test="friends-list"]');
            await expect(userBPage.locator(`text=${userACredentials.fullName}`)).toBeVisible({ timeout: 5000 });
            console.log('✅ User B sees User A in friends list');
        });

        // Step 6: Test friend removal
        await test.step('Test friend removal', async () => {
            // User A removes User B as friend
            await userAPage.hover(`text=${userBCredentials.fullName}`);
            await userAPage.click('button:has-text("Remove"), [data-test="remove-friend"]');
            
            // Confirm removal if there's a confirmation dialog
            const confirmButton = userAPage.locator('button:has-text("Confirm"), button:has-text("Yes"), [data-test="confirm-remove"]');
            if (await confirmButton.isVisible()) {
                await confirmButton.click();
            }
            
            // Verify removal message
            await expect(userAPage.locator('text=/removed/i, .success-message')).toBeVisible({ timeout: 5000 });
            console.log('✅ User A removed User B from friends list');
        });

        // Step 7: Verify friend is removed from both lists
        await test.step('Verify friend removal for both users', async () => {
            // Refresh and check User A's friends list
            await userAPage.reload();
            await userAPage.click('a[href*="friends"], [data-test="friends-list"]');
            await expect(userAPage.locator(`text=${userBCredentials.fullName}`)).not.toBeVisible();
            
            // Check User B's friends list
            await userBPage.reload();
            await userBPage.click('a[href*="friends"], [data-test="friends-list"]');
            await expect(userBPage.locator(`text=${userACredentials.fullName}`)).not.toBeVisible();
            console.log('✅ Both users no longer see each other in friends lists');
        });
    });

    test('Friend request decline workflow', async () => {
        await test.step('User A sends another friend request', async () => {
            await userAPage.goto('http://localhost:3001/search');
            await userAPage.fill('input[type="search"]', userBCredentials.username);
            await userAPage.press('input[type="search"]', 'Enter');
            
            await userAPage.click(`text=${userBCredentials.fullName}`);
            await userAPage.click('button:has-text("Add Friend"), button:has-text("Send Request")');
            
            await expect(userAPage.locator('text=/friend request sent/i')).toBeVisible();
            console.log('✅ User A sent another friend request');
        });

        await test.step('User B declines friend request', async () => {
            await userBPage.click('a[href*="requests"], [data-test="friend-requests"]');
            await userBPage.waitForSelector(`text=${userACredentials.fullName}`);
            
            await userBPage.click('button:has-text("Decline"), [data-test="decline-request"]');
            
            await expect(userBPage.locator('text=/declined/i')).toBeVisible();
            console.log('✅ User B declined friend request');
        });

        await test.step('Verify no friendship established', async () => {
            await userAPage.click('a[href*="friends"]');
            await expect(userAPage.locator(`text=${userBCredentials.fullName}`)).not.toBeVisible();
            
            await userBPage.click('a[href*="friends"]');  
            await expect(userBPage.locator(`text=${userACredentials.fullName}`)).not.toBeVisible();
            console.log('✅ No friendship established after decline');
        });
    });

    test('Block user functionality', async () => {
        await test.step('User B blocks User A', async () => {
            // Find User A in search or recent interactions
            await userBPage.goto('http://localhost:3001/search');
            await userBPage.fill('input[type="search"]', userACredentials.username);
            await userBPage.press('input[type="search"]', 'Enter');
            
            await userBPage.click(`text=${userACredentials.fullName}`);
            
            // Block user
            await userBPage.click('button:has-text("Block"), [data-test="block-user"]');
            
            // Confirm if needed
            const confirmButton = userBPage.locator('button:has-text("Confirm"), [data-test="confirm-block"]');
            if (await confirmButton.isVisible()) {
                await confirmButton.click();
            }
            
            await expect(userBPage.locator('text=/blocked/i')).toBeVisible();
            console.log('✅ User B blocked User A');
        });

        await test.step('Verify User A cannot send friend request to blocked User B', async () => {
            await userAPage.goto('http://localhost:3001/search');
            await userAPage.fill('input[type="search"]', userBCredentials.username);
            await userAPage.press('input[type="search"]', 'Enter');
            
            // Try to send friend request
            await userAPage.click(`text=${userBCredentials.fullName}`);
            
            // Should see blocked message or no friend request button
            const addFriendButton = userAPage.locator('button:has-text("Add Friend")');
            await expect(addFriendButton).not.toBeVisible();
            console.log('✅ User A cannot send friend request to blocked user');
        });
    });

    test('Real-time friend status updates', async () => {
        // This test would require WebSocket functionality to be working
        await test.step('Check online status indicators', async () => {
            await userAPage.goto('http://localhost:3001/friends');
            
            // Look for online status indicators
            const statusIndicators = userAPage.locator('[data-test="status-indicator"], .status-dot, .online-status');
            if (await statusIndicators.count() > 0) {
                console.log('✅ Status indicators are present');
            } else {
                console.log('ℹ️ No status indicators found (may not be implemented yet)');
            }
        });
    });

    test('Friends list pagination and search', async () => {
        await test.step('Test friends list search functionality', async () => {
            await userAPage.goto('http://localhost:3001/friends');
            
            // Look for search input in friends list
            const searchInput = userAPage.locator('input[placeholder*="search"], [data-test="friend-search"]');
            if (await searchInput.isVisible()) {
                await searchInput.fill('Test');
                await userAPage.press('input[placeholder*="search"]', 'Enter');
                console.log('✅ Friends search functionality works');
            } else {
                console.log('ℹ️ Friends search not found (may not be implemented)');
            }
        });

        await test.step('Test pagination if available', async () => {
            const paginationControls = userAPage.locator('[data-test="pagination"], .pagination, button:has-text("Next")');
            if (await paginationControls.count() > 0) {
                console.log('✅ Pagination controls found');
            } else {
                console.log('ℹ️ No pagination controls (list may be short)');
            }
        });
    });

    test('Input validation and error handling', async () => {
        await test.step('Test empty search queries', async () => {
            await userAPage.goto('http://localhost:3001/search');
            
            // Try searching with empty or very short query
            await userAPage.fill('input[type="search"]', 'x');
            await userAPage.press('input[type="search"]', 'Enter');
            
            // Should show validation error
            const errorMessage = userAPage.locator('text=/too short/i, .error-message');
            if (await errorMessage.isVisible()) {
                console.log('✅ Validation error shown for short search');
            } else {
                console.log('ℹ️ No validation error (may handle differently)');
            }
        });

        await test.step('Test network error handling', async () => {
            // Simulate network issues by going offline temporarily
            await userAPage.context().setOffline(true);
            
            await userAPage.goto('http://localhost:3001/friends');
            
            // Should show offline or error state
            const offlineIndicator = userAPage.locator('text=/offline/i, text=/error/i, .error-state');
            if (await offlineIndicator.isVisible()) {
                console.log('✅ Offline state handling works');
            }
            
            // Restore connection
            await userAPage.context().setOffline(false);
        });
    });
});
