const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import custom modules
const { initializeDatabase, getDb } = require('./database/connection');
const { testEmailConnection } = require('./utils/email');
const authRoutes = require('./routes/auth');
const { addUserToLocals } = require('./middleware/auth');
const { waitlistUtils } = require('./utils/waitlist');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://mivton.com",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// ===== MIDDLEWARE SETUP =====

// Trust proxy for Railway deployment (more secure)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https://ssl.gstatic.com", "data:", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://mivton.com",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
// Session configuration - use same logic as database connection
const isLocalDev = !process.env.DATABASE_URL && 
                   !process.env.FORCE_POSTGRESQL && 
                   process.env.NODE_ENV !== 'production' && 
                   (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');

console.log('🔍 Session configuration decision:', {
    DATABASE_URL: !!process.env.DATABASE_URL,
    FORCE_POSTGRESQL: !!process.env.FORCE_POSTGRESQL,
    NODE_ENV: process.env.NODE_ENV,
    isLocalDev
});

// Use memory store for both local and production to avoid database session store issues
console.log('🔧 Using memory session store for all environments');
app.use(session({
  store: new (require('express-session').MemoryStore)(),
  secret: process.env.JWT_SECRET || 'mivton-super-secret-jwt-key-2025-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  name: 'mivton.sid'
}));

// Add user to locals middleware
app.use(addUserToLocals);

// Serve default avatar if missing (before static files)
app.get('/images/default-avatar.*', (req, res) => {
  const svgAvatar = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="50" fill="url(#bg)"/>
    <circle cx="50" cy="35" r="15" fill="#ffffff"/>
    <ellipse cx="50" cy="75" rx="20" ry="15" fill="#ffffff"/>
  </svg>`;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.send(svgAvatar);
});

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ===== ROUTES =====

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = getDb();
    await db.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        server: 'running',
        authentication: 'active'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const db = getDb();
    
    // Test database connection
    const dbResult = await db.query('SELECT NOW() as current_time');
    
    // Get basic stats
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    const waitlistCount = await db.query('SELECT COUNT(*) FROM waitlist');
    
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        timestamp: dbResult.rows[0].current_time
      },
      stats: {
        totalUsers: parseInt(userCount.rows[0].count),
        waitlistUsers: parseInt(waitlistCount.rows[0].count)
      },
      version: '1.3.3',
      features: {
        authentication: true,
        registration: true,
        email: true,
        sessions: true
      }
    });
  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Waitlist endpoints (from Phase 1.2)
app.post('/api/waitlist', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    // Get request metadata
    const emailData = {
      email: email.toLowerCase().trim(),
      referrer: req.get('Referrer') || null,
      user_agent: req.get('User-Agent') || null,
      ip_address: req.ip || req.connection.remoteAddress || null
    };

    // Store in database
    const result = await waitlistUtils.addEmail(emailData);
    
    if (result.success) {
      console.log('✅ Waitlist signup stored:', email);
      res.json({
        success: true,
        message: 'Thanks for joining the waitlist! We\'ll notify you when Mivton launches.'
      });
    } else {
      console.log('⚠️ Duplicate waitlist signup:', email);
      res.json({
        success: true,
        message: 'You\'re already on our waitlist! We\'ll notify you when Mivton launches.'
      });
    }
    
  } catch (error) {
    console.error('❌ Waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});

app.get('/api/waitlist/stats', async (req, res) => {
  try {
    const stats = await waitlistUtils.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Waitlist stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get waitlist stats'
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Phase 2.3 Enhanced Routes
try {
  const usersSearchRoutes = require('./routes/users-search');
  const userPreferencesRoutes = require('./routes/user-preferences');
  
  app.use('/api/users', usersSearchRoutes);
  app.use('/api/user', userPreferencesRoutes);
  
  // Create a route alias for languages to be accessible at both locations
  app.get('/api/languages', (req, res) => {
    res.redirect('/api/user/languages');
  });
  
  console.log('✅ Phase 2.3 enhanced routes loaded');
} catch (error) {
  console.log('⚠️ Phase 2.3 routes not available:', error.message);
}

// Phase 3.1 Friends System Routes  
try {
  const friendsRoutes = require('./routes/friends');
  const friendRequestsRoutes = require('./routes/friend-requests');
  const blockedUsersRoutes = require('./routes/blocked-users');
  const socialNotificationsRoutes = require('./routes/social-notifications');
  
  app.use('/api/friends', friendsRoutes);
  app.use('/api/friend-requests', friendRequestsRoutes);
  app.use('/api/blocked-users', blockedUsersRoutes);
  app.use('/api/social-notifications', socialNotificationsRoutes);
  
  console.log('✅ Phase 3.1 friends system routes loaded');
} catch (error) {
  console.log('⚠️ Phase 3.1 routes not available:', error.message);
}

// Phase 3.2 Real-Time API Routes
try {
  const realtimeApiRoutes = require('./routes/realtime-api');
  const notificationsApiRoutes = require('./routes/notifications-api');
  const presenceApiRoutes = require('./routes/presence-api');
  const offlineNotificationsRoutes = require('./routes/offline-notifications');
  const notificationsUnreadRoutes = require('./routes/notifications-unread');
  
  app.use('/api/realtime', realtimeApiRoutes);
  app.use('/api/notifications', notificationsApiRoutes);
  app.use('/api/notifications', offlineNotificationsRoutes); // Offline notifications
  app.use('/api/notifications', notificationsUnreadRoutes); // Unread notifications
  app.use('/api/presence', presenceApiRoutes);
  
  console.log('✅ Phase 3.2 real-time API routes loaded');
} catch (error) {
  console.log('⚠️ Phase 3.2 routes not available:', error.message);
}

// Enhanced Presence Advanced API Routes
try {
  const presenceAdvancedRoutes = require('./routes/presence-advanced');
  app.use('/api/presence/advanced', presenceAdvancedRoutes);
  console.log('✅ Enhanced presence advanced routes loaded');
} catch (error) {
  console.log('⚠️ Enhanced presence advanced routes not available:', error.message);
}

// Phase 3.3 Advanced Social Features Routes
try {
  const friendGroupsRoutes = require('./routes/friend-groups');
  const socialAnalyticsRoutes = require('./routes/social-analytics');
  const friendRecommendationsRoutes = require('./routes/friend-recommendations');
  const privacyControlsRoutes = require('./routes/privacy-controls');
  const conversationPreviewsRoutes = require('./routes/conversation-previews');
  
  app.use('/api/friend-groups', friendGroupsRoutes);
  app.use('/api/social-analytics', socialAnalyticsRoutes);
  app.use('/api/friend-recommendations', friendRecommendationsRoutes);
  app.use('/api/privacy-controls', privacyControlsRoutes);
  app.use('/api/conversation-previews', conversationPreviewsRoutes);
  
  console.log('✅ Phase 3.3 advanced social features routes loaded');
} catch (error) {
  console.log('⚠️ Phase 3.3 routes not available:', error.message);
}

// Complete Chat System Routes
try {
  const completeChatRoutes = require('./routes/complete-chat-api');
  const chatBypassRoutes = require('./routes/chat-bypass');
  const workingChatRoutes = require('./routes/working-chat');
  const userApiRoutes = require('./routes/user-api');
  
  console.log('🔧 DEBUG: Working chat routes loaded, registering at /api/chat...');
  
  // Register working chat routes at /api/chat (FIXED: was missing)
  app.use('/api/chat', workingChatRoutes);
  
  console.log('🔧 DEBUG: Working chat routes registered successfully');
  
  // Use simple chat routes (guaranteed to work)
  const simpleChatRoutes = require('./routes/simple-chat');
  app.use('/api/simple-chat', simpleChatRoutes);
  app.use('/api/user', userApiRoutes);
  
  console.log('✅ Complete chat system routes loaded');
} catch (error) {
  console.log('⚠️ Complete chat system routes not available:', error.message);
  console.log('🔧 DEBUG: Error details:', error);
}

// Chat Monitoring Route (accessible without auth for monitoring)
app.get('/chat-monitor', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat-monitor.html'));
});

// Dashboard routes
const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

// Admin routes (admin only)
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Task 4.3: Messages Dev Endpoints
const { saveMessage, getRecentConversation } = require('./database/messages');

// POST /dev/seed-message - Insert a test message
app.post('/dev/seed-message', async (req, res) => {
  try {
    const { senderId = 'test_sender', recipientId = 'test_recipient', body = 'Hello, this is a test message!' } = req.body;
    
    const result = await saveMessage(senderId, recipientId, body);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Test message inserted successfully',
        data: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to insert test message',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Dev seed message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while inserting test message',
      error: error.message
    });
  }
});

// GET /dev/last-messages - Get recent conversation between two users
app.get('/dev/last-messages', async (req, res) => {
  try {
    const { userA, userB, limit = 50 } = req.query;
    
    if (!userA || !userB) {
      return res.status(400).json({
        success: false,
        message: 'Both userA and userB query parameters are required'
      });
    }
    
    const result = await getRecentConversation(userA, userB, parseInt(limit));
    
    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to retrieve messages',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Dev last messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving messages',
      error: error.message
    });
  }
});

// User Profile routes
const userProfileRoutes = require('./routes/user-profile');
app.use('/api/user-profile', userProfileRoutes);

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve Phase 2.3 demo page
app.get('/demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo-phase-2-3.html'));
});

app.get('/demo-phase-2-3.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo-phase-2-3.html'));
});

// Serve Enhanced Presence Control demo page
app.get('/demo-presence', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo-enhanced-presence.html'));
});

app.get('/demo-enhanced-presence.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'demo-enhanced-presence.html'));
});

// Serve Task 4.2 test page
app.get('/task-4-2-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'task-4-2-test.html'));
});

app.get('/task-4-2-test.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'task-4-2-test.html'));
});

// Test chat interface route
app.get('/test-chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-chat.html'));
});

// Test authentication bypass for chat testing
app.post('/api/test/login', async (req, res) => {
  try {
    // Set a test session
    req.session.userId = 'test-user-id';
    req.session.username = 'TestUser';
    req.session.email = 'test@example.com';
    req.session.fullName = 'Test User';
    req.session.isAdmin = false;
    
    res.json({
      success: true,
      message: 'Test login successful',
      user: {
        id: 'test-user-id',
        username: 'TestUser',
        email: 'test@example.com',
        fullName: 'Test User'
      }
    });
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ error: 'Test login failed' });
  }
});

// FINAL WORKING CHAT - NO AUTH, NO DATABASE, JUST WORKS
const workingMessages = [];
let workingMessageId = 1;

app.get('/api/chat/conversation/:userId', (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.query.userId || 'user-' + Date.now();
  
  console.log(`📨 FINAL WORKING CHAT conversation: ${currentUserId} <-> ${userId}`);
  
  // Get messages for this conversation
  const conversationMessages = workingMessages.filter(msg => 
    (msg.senderId === currentUserId && msg.recipientId === userId) ||
    (msg.senderId === userId && msg.recipientId === currentUserId)
  );
  
  res.json({
    success: true,
    conversation: conversationMessages.map(msg => ({
      id: msg.id,
      sender_id: msg.senderId,
      recipient_id: msg.recipientId,
      body: msg.body,
      created_at: msg.timestamp,
      is_sender: msg.senderId === currentUserId,
      sender_name: msg.senderId === currentUserId ? 'You' : 'Friend'
    })),
    friend: {
      id: userId,
      fullName: 'Silviu Timaru',
      username: 'silviu',
      status: 'online'
    },
    count: conversationMessages.length
  });
});

app.post('/api/chat/send', (req, res) => {
  const { recipientId, message, userId } = req.body;
  const senderId = userId || 'user-' + Date.now();
  
  if (!recipientId || !message) {
    return res.status(400).json({
      success: false,
      error: 'Recipient ID and message are required'
    });
  }
  
  console.log(`💬 FINAL WORKING CHAT send: ${senderId} -> ${recipientId}: ${message}`);
  
  // Create and store message
  const newMessage = {
    id: workingMessageId++,
    senderId: senderId,
    recipientId: recipientId,
    body: message.trim(),
    timestamp: new Date().toISOString()
  };
  
  workingMessages.push(newMessage);
  
  res.json({
    success: true,
    message: {
      id: newMessage.id,
      senderId: newMessage.senderId,
      recipientId: newMessage.recipientId,
      body: newMessage.body,
      createdAt: newMessage.timestamp,
      sender: {
        id: senderId,
        fullName: 'You',
        username: 'user',
        status: 'online'
      }
    }
  });
});

// Serve Presence Settings page
app.get('/presence-settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'presence-settings.html'));
});

// Redirect root to appropriate page based on authentication
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    res.redirect('/dashboard.html');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ===== SOCKET.IO SETUP =====

// Initialize Complete Chat System and Enhanced Real-Time Events
try {
  const { initializeEnhancedFriendsEvents } = require('./socket/enhanced-friends-events');
  const { initializeCompleteChatEvents } = require('./socket/complete-chat-events');
  
  initializeEnhancedFriendsEvents(io);
  initializeCompleteChatEvents(io);
  
  console.log('✅ Complete chat system and enhanced real-time events loaded');
  
  // Store io instance globally for access from other modules
  global.io = io;
  
} catch (error) {
  console.log('⚠️ Enhanced real-time events not available, falling back to Phase 3.1:', error.message);
  
  try {
    const { initializeFriendsEvents } = require('./socket/friends-events');
    initializeFriendsEvents(io);
    console.log('✅ Phase 3.1 Friends Socket.IO events loaded (fallback)');
  } catch (fallbackError) {
    console.log('⚠️ Friends Socket.IO events not available:', fallbackError.message);
    
    // Fallback to basic socket handling
    io.use((socket, next) => {
      next();
    });
    
    io.on('connection', (socket) => {
      console.log(`🔌 Socket connection established: ${socket.id}`);
      
      // Task 4.2: Room management
      socket.on('join', (userIdForRoom) => {
        try {
          const roomName = `user:${userIdForRoom}`;
          socket.join(roomName);
          console.log(`🚀 Socket ${socket.id} joined room: ${roomName}`);
          
          // Store the room info on the socket for cleanup
          socket.userRoom = roomName;
          socket.roomUserId = userIdForRoom;
          
          // Send confirmation
          socket.emit('joined', { room: roomName, userId: userIdForRoom });
        } catch (error) {
          console.error('❌ Error joining room:', error);
        }
      });

      socket.on('server:notify', (data) => {
        try {
          const { to, msg } = data;
          console.log(`🚀 Notify request from ${socket.id}: ${to} -> ${msg}`);
          
          // Send notification to the target room
          io.to(to).emit('notify', { msg });
          console.log(`✉️ Sent notify to room ${to}: ${msg}`);
        } catch (error) {
          console.error('❌ Error sending notify:', error);
        }
      });
      
      // Task 4.1: Basic ping-pong functionality
      socket.on('ping', (data) => {
        console.log(`🏓 Ping received from ${socket.id}:`, data);
        socket.emit('pong', {
          timestamp: data.timestamp,
          serverTime: Date.now(),
          message: 'pong'
        });
      });
      
      socket.on('disconnect', () => {
        console.log(`🔴 Socket disconnected: ${socket.id}`);
        
        // Task 4.2: Clean up room membership
        if (socket.userRoom) {
          socket.leave(socket.userRoom);
          console.log(`🚊 Socket ${socket.id} left room: ${socket.userRoom}`);
        }
      });
      
      socket.on('message', (data) => {
        console.log(`💬 Message from ${socket.id}: ${data}`);
      });
    });
  }
}

// ===== TEMPORARY ADMIN ENDPOINT =====

// Temporary admin endpoint to make silviu@mivton.com an admin
app.get('/temp-admin-fix', async (req, res) => {
    try {
        console.log('👑 Temporary admin fix - making silviu@mivton.com an admin...');
        
        const db = getDb();
        
        // Update user to admin
        const updateResult = await db.query(
            'UPDATE users SET is_admin = true, admin_level = 3, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *',
            ['silviu@mivton.com']
        );
        
        if (updateResult.rows.length > 0) {
            const updatedUser = updateResult.rows[0];
            console.log('✅ User successfully updated to admin:', updatedUser);
            res.json({
                success: true,
                message: 'User updated to admin successfully',
                user: updatedUser
            });
        } else {
            res.json({
                success: false,
                message: 'User not found'
            });
        }
        
    } catch (error) {
        console.error('❌ Error making user admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
});

// Temporary password update endpoint
app.get('/temp-password-fix', async (req, res) => {
    try {
        console.log('🔐 Updating password for silviu@mivton.com to Bacau@2012...');
        
        const db = getDb();
        const bcrypt = require('bcrypt');
        const newPassword = 'Bacau@2012';
        
        // Generate new password hash
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password in database
        const updateResult = await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING *',
            [newPasswordHash, 'silviu@mivton.com']
        );
        
        if (updateResult.rows.length > 0) {
            const updatedUser = updateResult.rows[0];
            console.log('✅ Password successfully updated for user:', updatedUser.email);
            res.json({
                success: true,
                message: 'Password updated successfully',
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    email: updatedUser.email,
                    is_admin: updatedUser.is_admin,
                    admin_level: updatedUser.admin_level,
                    updated_at: updatedUser.updated_at
                },
                newPassword: newPassword
            });
        } else {
            res.json({
                success: false,
                message: 'User not found'
            });
        }
        
    } catch (error) {
        console.error('❌ Error updating password:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating password',
            error: error.message
        });
    }
});

// ===== ERROR HANDLING =====

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// ===== SERVER STARTUP =====

const startServer = async () => {
  try {
    console.log('🚀 Starting Mivton server...');
    
    // Initialize database (non-blocking)
    console.log('📊 Initializing database connection...');
    try {
      await initializeDatabase();
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.log('⚠️ Database connection failed, but server will continue:', dbError.message);
      console.log('ℹ️ Some features may not work, but basic functionality is available');
    }
    
    // Run complete chat system migration
    try {
      const { runCompleteChatMigration } = require('./run-complete-chat-migration.js');
      await runCompleteChatMigration();
    } catch (migrationError) {
      console.log('⚠️ Complete chat system migration failed, but continuing:', migrationError.message);
    }
    
    // Initialize Phase 3.1 Friends Database Schema
    try {
      const { initializeFriendsSchema, isSchemaInitialized } = require('./database/init-friends');
      
      const schemaExists = await isSchemaInitialized();
      if (!schemaExists) {
        console.log('🔄 Initializing friends database schema...');
        await initializeFriendsSchema();
        console.log('✅ Friends database schema initialized');
      } else {
        console.log('✅ Friends database schema already exists');
      }
    } catch (friendsError) {
      console.log('⚠️ Friends schema initialization failed, but continuing:', friendsError.message);
    }
    
    // Initialize Phase 3.2 Real-Time Database Schema
    try {
      const { initializeRealtimeSchema, isRealtimeSchemaInitialized } = require('./database/init-realtime');
      
      const realtimeSchemaExists = await isRealtimeSchemaInitialized();
      if (!realtimeSchemaExists) {
        console.log('🔄 Initializing real-time database schema...');
        const schemaInitialized = await initializeRealtimeSchema();
        if (schemaInitialized) {
          console.log('✅ Real-time database schema initialized');
        } else {
          console.log('❌ Real-time schema initialization failed - some features may not work');
        }
      } else {
        console.log('✅ Real-time database schema already exists');
      }
    } catch (realtimeError) {
      console.log('⚠️ Real-time schema initialization failed, but continuing:', realtimeError.message);
      console.log('ℹ️ Run "railway run npm run init:realtime" to fix this manually');
    }
    
    // Initialize Phase 3.3 Advanced Social Features Database Schema
    try {
      const { initializeAdvancedSocial, isAdvancedSocialSchemaInitialized } = require('./database/init-advanced-social');
      
      const advancedSocialExists = await isAdvancedSocialSchemaInitialized();
      if (!advancedSocialExists) {
        console.log('🔄 Initializing advanced social features database schema...');
        const schemaInitialized = await initializeAdvancedSocial();
        if (schemaInitialized) {
          console.log('✅ Advanced social features database schema initialized');
        } else {
          console.log('❌ Advanced social schema initialization failed - Phase 3.3 features may not work');
        }
      } else {
        console.log('✅ Advanced social features database schema already exists');
      }
    } catch (advancedSocialError) {
      console.log('⚠️ Advanced social schema initialization failed, but continuing:', advancedSocialError.message);
      console.log('ℹ️ Run "railway run npm run init:advanced-social" to fix this manually');
    }
    
    // Initialize Advanced Presence Schema
    try {
    const { initializeAdvancedPresenceSchema, isAdvancedPresenceSchemaInitialized } = require('./database/init-advanced-presence');
    
    const advancedPresenceExists = await isAdvancedPresenceSchemaInitialized();
    if (!advancedPresenceExists) {
    console.log('🔄 Initializing advanced presence database schema...');
    const schemaInitialized = await initializeAdvancedPresenceSchema();
    if (schemaInitialized) {
    console.log('✅ Advanced presence database schema initialized');
    } else {
    console.log('❌ Advanced presence schema initialization failed - presence features may not work');
    }
    } else {
    console.log('✅ Advanced presence database schema already exists');
    }
    } catch (advancedPresenceError) {
    console.log('⚠️ Advanced presence schema initialization failed, but continuing:', advancedPresenceError.message);
    }
    
    // Auto-fix socket_sessions schema (critical for real-time features)
    try {
        const { autoFixSocketSessionsSchema } = require('./database/auto-fix-socket-schema');
        await autoFixSocketSessionsSchema();
    } catch (socketSchemaError) {
        console.log('⚠️ Socket sessions schema auto-fix failed:', socketSchemaError.message);
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.log('🔄 Continuing with server startup anyway...');
  }
  
  // Start the server regardless of database status
  server.listen(PORT, HOST, () => {
      console.log('');
      console.log('🎉 Mivton server is running!');
      console.log(`🌐 URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Phase: 3.3 - Advanced Social Features ACTIVE`);
      console.log(`🚀 Server ready to accept requests - App is accessible immediately!`);
      console.log('');
      console.log('✅ Features enabled:');
      console.log('   - Landing page');
      console.log('   - User registration & login');
      console.log('   - Password security (bcrypt)');
      console.log('   - Session management');
      console.log('   - Email integration (Hostinger)');
      console.log('   - Database storage');
      console.log('   - Waitlist system');
      console.log('   - Health monitoring');
      console.log('   - Socket.IO with real-time friends events');
      console.log('   - Dashboard with navigation');
      console.log('   - Profile management');
      console.log('   - User search functionality');
      console.log('   - Enhanced profile cards');
      console.log('   - Status manager');
      console.log('   - Settings interface');
      console.log('   - Phase 2.3 UI Polish components');
      console.log('   - Phase 3.1 Friends System');
      console.log('   - Friend requests management');
      console.log('   - User blocking system');
      console.log('   - Social notifications');
      console.log('   - Phase 3.2 Real-Time Social Updates');
      console.log('   - Real-time presence management');
      console.log('   - Live notification delivery');
      console.log('   - Friend activity feed');
      console.log('   - Socket connection management');
      console.log('   - Advanced notification system');
      console.log('   - Phase 3.3 Advanced Social Features (NEW)');
      console.log('   - Friend groups and organization');
      console.log('   - Social analytics and insights');
      console.log('   - AI-powered friend recommendations');
      console.log('   - Advanced privacy controls');
      console.log('   - Conversation previews and management');
      console.log('   - Social interaction tracking');
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('   • GET  /health - Health check');
      console.log('   • GET  /api/status - API status');
      console.log('   • POST /api/auth/register - User registration');
      console.log('   • POST /api/auth/login - User login');
      console.log('   • POST /api/auth/logout - User logout');
      console.log('   • GET  /api/auth/me - Current user data');
      console.log('   • GET  /api/auth/status - Auth status');
      console.log('   • GET  /api/auth/check-username/:username - Username availability');
      console.log('   • GET  /api/auth/check-email/:email - Email availability');
      console.log('   • POST /api/waitlist - Waitlist signup');
      console.log('   • GET  /api/waitlist/stats - Waitlist statistics');
      console.log('   • GET  /api/dashboard/stats - Dashboard statistics');
      console.log('   • PUT  /api/dashboard/profile - Update profile');
      console.log('   • GET  /api/dashboard/search-users - Search users');
      console.log('   • GET  /api/users/search - Enhanced user search (Phase 2.3)');
      console.log('   • GET  /api/users/profiles - Profile cards data (Phase 2.3)');
      console.log('   • GET  /api/user/preferences - User preferences (Phase 2.3)');
      console.log('   • PUT  /api/user/preferences - Update preferences (Phase 2.3)');
      console.log('   • PUT  /api/user/status - Update user status (Phase 2.3)');
      console.log('   • GET  /api/friends - Get friends list (Phase 3.1)');
      console.log('   • DELETE /api/friends/:id - Remove friend (Phase 3.1)');
      console.log('   • POST /api/friend-requests - Send friend request (Phase 3.1)');
      console.log('   • PUT  /api/friend-requests/:id/accept - Accept request (Phase 3.1)');
      console.log('   • PUT  /api/friend-requests/:id/decline - Decline request (Phase 3.1)');
      console.log('   • GET  /api/friend-requests/received - Received requests (Phase 3.1)');
      console.log('   • GET  /api/friend-requests/sent - Sent requests (Phase 3.1)');
      console.log('   • POST /api/blocked-users - Block user (Phase 3.1)');
      console.log('   • DELETE /api/blocked-users/:id - Unblock user (Phase 3.1)');
      console.log('   • GET  /api/social-notifications - Get notifications (Phase 3.1)');
      console.log('   • GET  /api/realtime/stats - Real-time statistics (Phase 3.2)');
      console.log('   • GET  /api/notifications - Enhanced notifications API (Phase 3.2)');
      console.log('   • GET  /api/presence/friends - Friends presence status (Phase 3.2)');
      console.log('   • PUT  /api/presence/status - Update presence status (Phase 3.2)');
      console.log('   • GET  /api/realtime/activity/feed - Activity feed (Phase 3.2)');
      console.log('   • POST /dev/seed-message - Insert test message (Task 4.3 dev)');
      console.log('   • GET  /dev/last-messages?userA=a&userB=b - Get conversation (Task 4.3 dev)');
      console.log('');
      console.log('📱 Pages available:');
      console.log('   • GET  / - Landing page (redirects based on auth)');
      console.log('   • GET  /login.html - Login page');
      console.log('   • GET  /register.html - Registration page');
      console.log('   • GET  /dashboard.html - User dashboard');
      console.log('   • GET  /demo - Phase 2.3 UI Components Demo');
      console.log('');
      
      // Run slow operations in background after server starts
      setImmediate(async () => {
        // Test email connection in background (non-blocking)
        console.log('📧 Testing email configuration in background...');
        try {
          await testEmailConnection();
          console.log('✅ Email connection successful');
        } catch (emailError) {
          console.log('⚠️ Email connection failed, but continuing:', emailError.message);
        }
      });
    });
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log the error
});

// Start the server with error handling
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  // Don't exit immediately, try to restart
  setTimeout(() => {
    console.log('🔄 Attempting to restart server...');
    startServer();
  }, 5000);
});
