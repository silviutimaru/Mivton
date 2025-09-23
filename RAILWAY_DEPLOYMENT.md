# Mivton - Phase 2.3 Railway Deployment

## Railway Configuration Files

### 1. Railway Service Configuration
- `railway.json` - Service configuration
- `Dockerfile` - Container configuration  
- `docker-compose.yml` - Multi-service setup
- `.env.example` - Environment variables template

### 2. Database Migrations
- SQL files for new Phase 2.3 features
- User preferences tables
- Status management tables
- Search indexing improvements

### 3. Deployment Scripts
- Build and deployment automation
- Environment setup
- Database seeding for demo data

## Quick Deploy to Railway

### Option 1: One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/mivton-phase-2-3)

### Option 2: Manual Deployment
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up
```

## Environment Variables Required
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-key
NODE_ENV=production
PORT=3000
REDIS_URL=redis://...
```

## Service Dependencies
- PostgreSQL Database
- Redis (for sessions/caching)
- Node.js 18+ Runtime

## Automatic Scaling
- Railway will auto-scale based on traffic
- Database connection pooling configured
- Static assets served via CDN
