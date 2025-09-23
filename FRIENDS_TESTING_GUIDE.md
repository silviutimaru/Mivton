# 🚀 Mivton Friends System Testing Guide

This guide will help you test the complete friends list management system in Mivton.

## 📋 Quick Start

### 1. Run the Quick Test
```bash
npm run test:quick
```

This will verify:
- ✅ Database connection
- ✅ Friends schema tables exist
- ✅ Utility functions work
- ✅ Required files are present
- ✅ Basic operations function

### 2. Run the Comprehensive Test
```bash
npm run test:friends
```

This runs a full test suite covering:
- Database connectivity and schema
- Server health and API status  
- User authentication and management
- Friends API endpoints
- Friend requests workflow
- User blocking system
- Social notifications
- Frontend components

## 🏗️ Manual Testing Steps

### Step 1: Start the Server
```bash
npm start
# or for development
npm run dev
```

### Step 2: Open the Application
1. Go to `http://localhost:3000`
2. Register a few test accounts:
   - Username: `alice_test`, Email: `alice@test.com`
   - Username: `bob_test`, Email: `bob@test.com`  
   - Username: `charlie_test`, Email: `charlie@test.com`

### Step 3: Test Friends System Features

#### 3.1 Friends List Management
1. **Login as Alice** (`http://localhost:3000/login`)
2. **Navigate to Dashboard** (`http://localhost:3000/dashboard`)
3. **View Friends Section** - Should show empty friends list initially
4. **Test Search** - Try searching for non-existent friends

#### 3.2 Friend Requests Workflow
1. **Send Friend Request**:
   - Still logged in as Alice
   - Search for "bob_test" in user search
   - Click "Add Friend" button
   - Verify request is sent

2. **Receive Friend Request**:
   - Login as Bob
   - Check notifications/friend requests section
   - Should see request from Alice

3. **Accept Friend Request**:
   - As Bob, accept Alice's friend request
   - Verify both users are now friends

4. **View Friends List**:
   - Both Alice and Bob should see each other in friends list
   - Test online/offline status indicators

#### 3.3 Friend Management Actions
1. **Chat with Friend** (if implemented):
   - Click chat button on friend card
   - Verify chat functionality

2. **Remove Friend**:
   - Click options menu on friend card
   - Select "Remove Friend"
   - Confirm removal
   - Verify friend is removed from both lists

3. **Block User**:
   - Search for Charlie
   - Send friend request
   - As Charlie, decline and block Alice
   - Verify Alice cannot send another request

## 🔧 API Testing

You can test the APIs directly using curl or Postman:

### Authentication
```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"TestPass123!","full_name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}' \
  -c cookies.txt

# Use cookies for authenticated requests
curl -X GET http://localhost:3000/api/friends \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Friends API Endpoints
```bash
# Get friends list
GET /api/friends

# Get friends statistics  
GET /api/friends/stats

# Search friends
GET /api/friends/search?q=searchterm

# Remove friend
DELETE /api/friends/{friendId}

# Get online friends only
GET /api/friends/online
```

### Friend Requests API
```bash
# Send friend request
POST /api/friend-requests
Body: {"receiver_id": 123, "message": "Let's be friends!"}

# Get received requests
GET /api/friend-requests/received

# Get sent requests
GET /api/friend-requests/sent

# Accept request
PUT /api/friend-requests/{requestId}/accept

# Decline request
PUT /api/friend-requests/{requestId}/decline
```

### Blocking API
```bash
# Block user
POST /api/blocked-users
Body: {"user_id": 123, "reason": "Spam"}

# Get blocked users
GET /api/blocked-users

# Unblock user
DELETE /api/blocked-users/{userId}
```

## 🎯 Testing Checklist

### Database Layer ✅
- [ ] Friends schema tables created
- [ ] Utility functions working
- [ ] Indexes for performance
- [ ] Triggers and constraints
- [ ] Views for data access

### Backend API ✅  
- [ ] Friends CRUD operations
- [ ] Friend requests workflow
- [ ] User blocking system
- [ ] Social notifications
- [ ] Rate limiting
- [ ] Input validation
- [ ] Error handling
- [ ] Authentication

### Frontend Components ✅
- [ ] Friends list display
- [ ] Search and filtering
- [ ] Friend request management
- [ ] Status indicators (online/offline)
- [ ] Action buttons (chat, remove, block)
- [ ] Responsive design
- [ ] Real-time updates
- [ ] Error handling

### Real-time Features ✅
- [ ] Socket.io connections
- [ ] Friend status updates
- [ ] Notification delivery
- [ ] Presence management
- [ ] Activity tracking

## 🐛 Common Issues & Solutions

### Issue: Database connection fails
**Solution**: Check your `.env` file has correct PostgreSQL credentials

### Issue: Friends schema not found  
**Solution**: Run `npm run init:friends` to initialize the schema

### Issue: 500 errors on API calls
**Solution**: Check server logs and ensure user is authenticated

### Issue: Socket.io not connecting
**Solution**: Verify CORS settings and Socket.io configuration

### Issue: Frontend components not loading
**Solution**: Check browser console for JavaScript errors

## 📊 Expected Test Results

### Quick Test Success:
```
🚀 Starting Mivton Friends System Quick Test...

1️⃣  Testing database connection...
   ✅ Database connected: 2025-08-01T...

2️⃣  Testing friends database schema...
   ✅ Table friendships: 0 records
   ✅ Table friend_requests: 0 records
   ✅ Table blocked_users: 0 records
   ✅ Table friend_notifications: 0 records

3️⃣  Testing friends utility functions...
   ✅ areUsersFriends function works: false
   ✅ isUserBlocked function works: false
   ✅ canUsersInteract function works: true

4️⃣  Testing file structure...
   ✅ routes/friends.js (25KB)
   ✅ routes/friend-requests.js (22KB)
   ✅ public/js/friends-manager.js (45KB)
   ✅ public/css/friends-system.css (8KB)
   ✅ utils/friends-utils.js (18KB)
   ✅ database/friends-schema.sql (12KB)

5️⃣  Testing basic operations...
   ✅ Total users in system: 3
   ✅ Total active friendships: 0
   ✅ Pending friend requests: 0

🎉 Quick test completed!

✅ Friends system is ready for use!
```

### Comprehensive Test Success Rate: 90%+
- Database tests: 100%
- API tests: 95%
- Frontend tests: 85%
- Integration tests: 90%

## 🚀 Next Steps

After successful testing:

1. **Deploy to Production**: The friends system is ready for deployment
2. **Monitor Performance**: Use the analytics endpoints to track usage
3. **Gather Feedback**: Test with real users and collect feedback
4. **Iterate**: Make improvements based on testing results

## 📞 Support

If you encounter issues:

1. Check the server logs: `tail -f logs/server.log`
2. Review database logs: Check PostgreSQL logs
3. Use browser dev tools for frontend debugging
4. Run tests with verbose output: `NODE_ENV=test npm run test:friends`

---

**Happy Testing! 🎉**

The Mivton friends system is designed to be robust, scalable, and user-friendly. These tests ensure everything works perfectly before your users start building their language exchange networks!
