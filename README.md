# 🚀 Mivton - Multilingual Social Chat Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black.svg)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-blue.svg)](https://postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5--turbo-green.svg)](https://openai.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📖 Overview

Mivton is a real-time multilingual chat platform that enables users to communicate across language barriers using AI-powered translation. Built with modern web technologies, it provides seamless cross-language communication with real-time features, friend management, and advanced social capabilities.

## ✨ Features

### 🌐 **Multilingual Chat**
- Real-time translation using OpenAI GPT-3.5-turbo
- Automatic language detection
- Support for 60+ languages
- Server-side translation pipeline for consistency

### 👥 **Social Features**
- Friends system with request management
- Real-time presence indicators
- User profiles and preferences
- Advanced privacy controls

### 🔔 **Real-time Communication**
- WebSocket-based messaging
- Typing indicators
- Live notifications
- Connection management

### 🛡️ **Security & Admin**
- Session-based authentication
- Role-based admin access
- Rate limiting and input validation
- GDPR compliance ready

### 📱 **Modern UI/UX**
- Responsive design
- Dark mode interface
- Glassmorphism effects
- Mobile-first approach

## 🏗️ Architecture

```mermaid
graph TB
    Client[Web Client] --> Express[Express Server]
    Express --> Socket[Socket.IO]
    Express --> DB[(PostgreSQL)]
    Express --> OpenAI[OpenAI API]
    Socket --> Redis[(Redis Cache - Planned)]
    
    subgraph "Core Services"
        Auth[Authentication Service]
        Chat[Multilingual Chat Service]
        Friends[Friends Management]
        Admin[Admin Dashboard]
        Translation[OpenAI Translation]
    end
    
    Express --> Auth
    Express --> Chat
    Express --> Friends
    Express --> Admin
    Chat --> Translation
    
    subgraph "Database Layer"
        Users[Users Table]
        Messages[Messages Table]
        Sessions[Sessions Table]
        Friendships[Friendships Table]
    end
    
    DB --> Users
    DB --> Messages
    DB --> Sessions
    DB --> Friendships
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 13+ (or SQLite for development)
- **OpenAI API Key** for translation features
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/silviutimaru/Mivton.git
cd Mivton

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration (see Environment Variables below)
nano .env

# Initialize database
npm run init:db

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/mivton
POSTGRES_PASSWORD=your-secure-password

# Application Configuration
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Email Configuration (Hostinger SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password

# Security Configuration
JWT_SECRET=your-very-secure-jwt-secret-key
SESSION_SECRET=your-very-secure-session-secret
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_DEMO_MODE=false
ENABLE_ANALYTICS=true
ENABLE_REAL_TIME=true
```

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **PostgreSQL** - Primary database
- **SQLite** - Development database
- **bcrypt** - Password hashing
- **express-session** - Session management
- **express-validator** - Input validation
- **helmet** - Security headers

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **Socket.IO Client** - Real-time communication

### External Services
- **OpenAI GPT-3.5-turbo** - Translation and language detection
- **Hostinger SMTP** - Email notifications
- **Railway** - Cloud deployment platform

### Development & Testing
- **Jest** - Unit testing
- **Supertest** - API testing
- **Playwright** - End-to-end testing
- **ESLint** - Code linting
- **Docker** - Containerization

## 📁 Project Structure

```
Mivton/
├── 📄 server.js                    # Main Express server entry point
├── 📄 package.json                 # Dependencies and scripts
├── 📄 .env.example                 # Environment variables template
├── 📁 database/                    # Database layer
│   ├── 📄 connection.js           # Database connection management
│   ├── 📄 schema.sql              # Core database schema
│   ├── 📁 migrations/             # Database migrations
│   └── 📄 init-*.js               # Schema initialization scripts
├── 📁 routes/                      # API route handlers
│   ├── 📄 auth.js                 # Authentication endpoints
│   ├── 📄 multilingual-chat.js    # Chat API with translation
│   ├── 📄 friends.js              # Friends management
│   ├── 📄 admin.js                # Admin functionality
│   └── 📄 user-profile.js         # User profile management
├── 📁 services/                    # Business logic layer
│   ├── 📄 openai-translation.js   # OpenAI translation service
│   └── 📄 multilingual-messages.js # Message handling service
├── 📁 socket/                      # Real-time communication
│   ├── 📄 enhanced-friends-events.js # Socket.IO event handlers
│   ├── 📄 connection-manager.js   # Connection management
│   └── 📄 presence-events.js      # Presence management
├── 📁 middleware/                  # Express middleware
│   ├── 📄 auth.js                 # Authentication middleware
│   └── 📄 database.js             # Database middleware
├── 📁 public/                      # Frontend assets
│   ├── 📄 *.html                  # Static pages
│   ├── 📁 css/                    # Stylesheets
│   └── 📁 js/                     # Client-side JavaScript
├── 📁 tests/                       # Test suites
│   ├── 📁 api/                    # API tests
│   ├── 📁 unit/                   # Unit tests
│   └── 📁 e2e/                    # End-to-end tests
├── 📁 utils/                       # Utility functions
│   ├── 📄 email.js                # Email service
│   └── 📄 friends-utils.js        # Friends helper functions
└── 📁 Documentation/               # Project documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/status` - Check authentication status

### Multilingual Chat
- `POST /api/chat/send` - Send a message (auto-translated)
- `GET /api/chat/conversation/:userId` - Get conversation with user
- `GET /api/chat/recent` - Get recent messages (inbox)
- `POST /api/chat/translate` - Translate text
- `POST /api/chat/detect-language` - Detect message language
- `GET /api/chat/languages` - Get supported languages

### Friends System
- `GET /api/friends` - Get friends list
- `POST /api/friend-requests` - Send friend request
- `PUT /api/friend-requests/:id/accept` - Accept friend request
- `PUT /api/friend-requests/:id/decline` - Decline friend request
- `GET /api/friend-requests/received` - Get received requests
- `GET /api/friend-requests/sent` - Get sent requests
- `DELETE /api/friends/:id` - Remove friend

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `GET /api/admin/stats` - Get platform statistics

### System
- `GET /health` - Health check
- `GET /api/status` - API status and statistics

## 🌐 WebSocket Events

### Client → Server
- `join` - Join user room
- `send_message` - Send chat message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `presence_update` - Update presence status

### Server → Client
- `message_received` - New message notification
- `friend_request` - Friend request notification
- `friend_online` - Friend came online
- `friend_offline` - Friend went offline
- `typing` - Someone is typing
- `notification` - General notification

## 🗄️ Database Schema

### Core Tables

#### Users
```sql
users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    native_language VARCHAR(10) NOT NULL DEFAULT 'en',
    is_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### Messages (Multilingual)
```sql
messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    body TEXT NOT NULL,                    -- Translated text for display
    original_text TEXT NOT NULL,           -- Original message text
    translated_text TEXT NOT NULL,         -- Translated message text
    original_lang VARCHAR(10) NOT NULL,    -- Source language (ISO 639-1)
    translated_lang VARCHAR(10) NOT NULL,  -- Target language (ISO 639-1)
    created_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### Friendships
```sql
friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    friend_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run API tests only
npm run test:api

# Run E2E tests only
npm run test:e2e:headless

# Run with coverage
npm run test -- --coverage
```

### Test Coverage

- **Unit Tests**: Authentication, middleware, utilities
- **API Tests**: All REST endpoints
- **E2E Tests**: Complete user flows with Playwright

## 🚀 Deployment

### Railway Deployment

The application is configured for Railway deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy
railway up
```

### Docker Deployment

```bash
# Build Docker image
docker build -t mivton .

# Run container
docker run -p 3000:3000 --env-file .env mivton
```

### Environment Setup

For production deployment, ensure these environment variables are set:

- `NODE_ENV=production`
- `DATABASE_URL` (PostgreSQL connection string)
- `OPENAI_API_KEY` (Your OpenAI API key)
- `JWT_SECRET` (Secure random string)
- `SESSION_SECRET` (Secure random string)

## 📊 Performance & Scalability

### Current Performance
- **Database**: PostgreSQL with proper indexing
- **Caching**: None (planned Redis integration)
- **Scaling**: Single instance (planned horizontal scaling)
- **Rate Limiting**: Applied to authentication routes

### Planned Optimizations
- Redis caching for translations
- Horizontal scaling with Redis pub/sub
- Database query optimization
- CDN for static assets

## 🔒 Security Features

### Implemented
- ✅ Password hashing with bcrypt
- ✅ Session-based authentication
- ✅ Input validation with express-validator
- ✅ Security headers with Helmet
- ✅ Rate limiting on auth routes
- ✅ SQL injection prevention with parameterized queries

### Planned
- 🔄 CSRF protection
- 🔄 Redis session store
- 🔄 API rate limiting
- 🔄 Input sanitization
- 🔄 GDPR compliance endpoints

## 🌍 Internationalization

### Supported Languages
60+ languages supported including:
- **European**: English, Spanish, French, German, Italian, Portuguese, Romanian, Hungarian
- **Asian**: Chinese, Japanese, Korean, Hindi, Thai, Vietnamese
- **Middle Eastern**: Arabic, Hebrew, Persian, Turkish
- **And many more...**

### Language Features
- Automatic language detection
- Real-time translation
- Language preferences per user
- Fallback to English

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style
4. **Add tests**: Ensure your changes are tested
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**: Describe your changes clearly

### Development Guidelines

- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use semantic commit messages
- Ensure all tests pass

## 📈 Roadmap

### Phase 4.0 - Enhanced Features
- [ ] Group chat functionality
- [ ] File sharing and attachments
- [ ] Voice message translation
- [ ] Video call integration
- [ ] Advanced analytics dashboard

### Phase 4.1 - Performance & Scale
- [ ] Redis caching layer
- [ ] Horizontal scaling
- [ ] CDN integration
- [ ] Database optimization
- [ ] Performance monitoring

### Phase 4.2 - Mobile & Advanced UI
- [ ] React Native mobile app
- [ ] Progressive Web App (PWA)
- [ ] Advanced UI components
- [ ] Dark/light theme toggle
- [ ] Accessibility improvements

### Phase 4.3 - Enterprise Features
- [ ] Multi-tenant support
- [ ] Advanced admin tools
- [ ] API rate limiting
- [ ] Webhook system
- [ ] Third-party integrations

## 🐛 Known Issues

### High Priority
- CSRF protection not implemented
- No translation caching (performance impact)
- Single instance scaling limitation
- Missing rate limiting on chat endpoints

### Medium Priority
- No input sanitization for XSS protection
- Missing GDPR compliance endpoints
- Hardcoded secrets in email configuration
- No horizontal WebSocket scaling

### Low Priority
- No TypeScript type safety
- Missing API documentation
- No RTL language support
- Limited file upload capabilities

## 📞 Support

### Documentation
- [API Documentation](Documentation/)
- [Deployment Guide](RAILWAY_DEPLOYMENT.md)
- [Testing Guide](tests/)

### Issues
- Report bugs: [GitHub Issues](https://github.com/silviutimaru/Mivton/issues)
- Feature requests: [GitHub Discussions](https://github.com/silviutimaru/Mivton/discussions)

### Contact
- **Email**: info@mivton.com
- **Website**: https://mivton.com
- **Discord**: [Join our community](https://discord.gg/mivton)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the translation API
- **Railway** for hosting and deployment
- **Express.js** community for the excellent framework
- **Socket.IO** for real-time communication capabilities
- **PostgreSQL** community for the robust database system

---

**Made with ❤️ by the Mivton Team**

*Breaking language barriers, one conversation at a time.*