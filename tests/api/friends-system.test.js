const request = require('supertest');
const { pool } = require('../../database/connection');

/**
 * 🚀 MIVTON PHASE 3 - FRIENDS SYSTEM API TESTS
 * Comprehensive testing for friend requests, acceptance, decline, and management
 * 
 * Test Coverage:
 * - Friend request creation (POST /friend-requests)
 * - Friend request acceptance (PUT /friend-requests/:id/accept)
 * - Friend request decline (PUT /friend-requests/:id/decline)
 * - Friends list management (GET /friends)
 * - Duplicate request prevention
 * - Block/unblock interactions
 * - Data validation and edge cases
 */

describe('Phase 3: Friends System API', () => {
    let app;
    let testUsers = {};
    let authTokens = {};
    let testFriendRequestId;

    beforeAll(async () => {
        // Import app after environment setup
        app = require('../../server');
        
        // Wait for database connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔧 Setting up test users for friends system...');
        
        // Create test users
        const userCreatePromises = [
            createTestUser('testuser1', 'test1@example.com', 'Test User One'),
            createTestUser('testuser2', 'test2@example.com', 'Test User Two'), 
            createTestUser('testuser3', 'test3@example.com', 'Test User Three'),
            createTestUser('blockeduser', 'blocked@example.com', 'Blocked User')
        ];
        
        const users = await Promise.all(userCreatePromises);
        
        users.forEach((user, index) => {
            const usernames = ['testuser1', 'testuser2', 'testuser3', 'blockeduser'];
            testUsers[usernames[index]] = user;
        });
        
        console.log('✅ Test users created:', Object.keys(testUsers));
        
        // Get auth tokens for all users
        for (const [username, user] of Object.entries(testUsers)) {
            authTokens[username] = await loginUser(username, 'password123');
            console.log(`🔑 Auth token obtained for ${username}`);
        }
    });

    afterAll(async () => {
        // Cleanup test data
        try {
            console.log('🧹 Cleaning up test data...');
            
            const userIds = Object.values(testUsers).map(u => u.id);
            
            // Clean up in proper order to respect foreign key constraints
            await pool.query('DELETE FROM friend_notifications WHERE user_id = ANY($1) OR sender_id = ANY($1)', [userIds]);
            await pool.query('DELETE FROM social_activity_log WHERE user_id = ANY($1) OR target_user_id = ANY($1)', [userIds]);
            await pool.query('DELETE FROM friendships WHERE user1_id = ANY($1) OR user2_id = ANY($1)', [userIds]);
            await pool.query('DELETE FROM friend_requests WHERE sender_id = ANY($1) OR receiver_id = ANY($1)', [userIds]);
            await pool.query('DELETE FROM blocked_users WHERE blocker_id = ANY($1) OR blocked_id = ANY($1)', [userIds]);
            await pool.query('DELETE FROM sessions WHERE sess::text LIKE ANY($1)', 
                userIds.map(id => `%"userId":${id}%`));
            await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
            
            console.log('✅ Test data cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    });

    describe('POST /api/friend-requests', () => {
        it('should send a friend request successfully', async () => {
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: testUsers.testuser2.id,
                    message: 'Hello! Let\'s be friends on Mivton!'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Friend request sent');
            expect(response.body.request).toBeDefined();
            expect(response.body.request.receiver.id).toBe(testUsers.testuser2.id);
            
            testFriendRequestId = response.body.request.id;
            console.log(`✅ Friend request created with ID: ${testFriendRequestId}`);
        });

        it('should prevent duplicate friend requests', async () => {
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: testUsers.testuser2.id,
                    message: 'Another request'
                })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('REQUEST_EXISTS');
        });

        it('should reject friend request to self', async () => {
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: testUsers.testuser1.id
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('SELF_FRIEND_REQUEST');
        });

        it('should reject invalid receiver ID', async () => {
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: 'invalid_id'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('INVALID_RECEIVER_ID');
        });

        it('should reject request to non-existent user', async () => {
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: 99999
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('USER_NOT_FOUND');
        });

        it('should handle reverse friend request (auto-accept)', async () => {
            // First, create a request from user3 to user1
            const firstRequest = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser3}`)
                .send({
                    receiver_id: testUsers.testuser1.id,
                    message: 'Let\'s connect!'
                })
                .expect(200);

            // Then, user1 sends request to user3 (should auto-accept)
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: testUsers.testuser3.id
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.auto_accepted).toBe(true);
            expect(response.body.message).toContain('now friends');
        });
    });

    describe('PUT /api/friend-requests/:id/accept', () => {
        it('should accept a friend request successfully', async () => {
            const response = await request(app)
                .put(`/api/friend-requests/${testFriendRequestId}/accept`)
                .set('Authorization', `Bearer ${authTokens.testuser2}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('now friends');
            expect(response.body.friend.id).toBe(testUsers.testuser1.id);
        });

        it('should reject accepting non-existent request', async () => {
            const response = await request(app)
                .put('/api/friend-requests/99999/accept')
                .set('Authorization', `Bearer ${authTokens.testuser2}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('REQUEST_NOT_FOUND');
        });

        it('should reject accepting already processed request', async () => {
            const response = await request(app)
                .put(`/api/friend-requests/${testFriendRequestId}/accept`)
                .set('Authorization', `Bearer ${authTokens.testuser2}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('REQUEST_NOT_FOUND');
        });

        it('should reject invalid request ID', async () => {
            const response = await request(app)
                .put('/api/friend-requests/invalid/accept')
                .set('Authorization', `Bearer ${authTokens.testuser2}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('INVALID_REQUEST_ID');
        });
    });

    describe('PUT /api/friend-requests/:id/decline', () => {
        let declineRequestId;

        beforeAll(async () => {
            // Create a request specifically for decline testing
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.blockeduser}`)
                .send({
                    receiver_id: testUsers.testuser2.id,
                    message: 'Please be my friend'
                });
            
            declineRequestId = response.body.request.id;
        });

        it('should decline a friend request successfully', async () => {
            const response = await request(app)
                .put(`/api/friend-requests/${declineRequestId}/decline`)
                .set('Authorization', `Bearer ${authTokens.testuser2}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Friend request declined');
            expect(response.body.request_id).toBe(declineRequestId);
        });

        it('should reject declining non-existent request', async () => {
            const response = await request(app)
                .put('/api/friend-requests/99999/decline')
                .set('Authorization', `Bearer ${authTokens.testuser2}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('REQUEST_NOT_FOUND');
        });
    });

    describe('GET /api/friends', () => {
        it('should get friends list with pagination', async () => {
            const response = await request(app)
                .get('/api/friends')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .query({ page: 1, limit: 10 })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.friends).toBeInstanceOf(Array);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.stats).toBeDefined();
            
            // Should have friendship with testuser2 and testuser3
            expect(response.body.friends.length).toBeGreaterThan(0);
        });

        it('should search friends by name', async () => {
            const response = await request(app)
                .get('/api/friends/search')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .query({ q: 'Test User Two' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.friends).toBeInstanceOf(Array);
            
            if (response.body.friends.length > 0) {
                expect(response.body.friends[0].full_name).toContain('Test User Two');
            }
        });

        it('should get friends statistics', async () => {
            const response = await request(app)
                .get('/api/friends/stats')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.stats).toBeDefined();
            expect(response.body.stats.total_friends).toBeGreaterThanOrEqual(0);
            expect(response.body.stats.online_friends).toBeGreaterThanOrEqual(0);
        });

        it('should reject search with invalid query', async () => {
            const response = await request(app)
                .get('/api/friends/search')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .query({ q: 'x' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('INVALID_SEARCH_QUERY');
        });
    });

    describe('DELETE /api/friends/:id', () => {
        it('should remove a friend successfully', async () => {
            const response = await request(app)
                .delete(`/api/friends/${testUsers.testuser2.id}`)
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('removed successfully');
            expect(response.body.removed_friend.id).toBe(testUsers.testuser2.id);
        });

        it('should reject removing non-existent friend', async () => {
            const response = await request(app)
                .delete(`/api/friends/${testUsers.testuser2.id}`)
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('FRIENDSHIP_NOT_FOUND');
        });

        it('should reject invalid friend ID', async () => {
            const response = await request(app)
                .delete('/api/friends/invalid')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('INVALID_FRIEND_ID');
        });
    });

    describe('Rate Limiting', () => {
        it('should respect friend request rate limits', async () => {
            // This test would need to send many requests rapidly
            // For now, just verify the endpoint handles rate limiting structure
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: testUsers.blockeduser.id
                });

            // Should either succeed or fail with rate limit (depending on previous tests)
            expect([200, 429]).toContain(response.status);
        });
    });

    describe('Block/Unblock Interactions', () => {
        it('should prevent friend requests to blocked users', async () => {
            // First block the user
            await request(app)
                .post(`/api/friends/${testUsers.testuser1.id}/block`)
                .set('Authorization', `Bearer ${authTokens.blockeduser}`)
                .send({ reason: 'Test blocking' });

            // Try to send friend request
            const response = await request(app)
                .post('/api/friend-requests')
                .set('Authorization', `Bearer ${authTokens.testuser1}`)
                .send({
                    receiver_id: testUsers.blockeduser.id
                })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('BLOCKED_BY_USER');
        });
    });

    // Helper functions
    async function createTestUser(username, email, fullName) {
        try {
            const hashedPassword = require('bcrypt').hashSync('password123', 4);
            
            const result = await pool.query(`
                INSERT INTO users (username, email, password_hash, full_name, status, is_verified, created_at)
                VALUES ($1, $2, $3, $4, 'active', true, CURRENT_TIMESTAMP)
                RETURNING id, username, email, full_name
            `, [username, email, hashedPassword, fullName]);
            
            return result.rows[0];
        } catch (error) {
            console.error(`Error creating test user ${username}:`, error);
            throw error;
        }
    }

    async function loginUser(username, password) {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ username, password });
            
        if (response.body.success && response.body.token) {
            return response.body.token;
        }
        
        throw new Error(`Failed to login user ${username}: ${response.body.error}`);
    }
});
