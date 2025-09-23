# 🚂 **Railway Deployment Guide - Mivton Phase 2.3**

## **Quick Deploy Options**

### 🎯 **Option 1: One-Click Deploy (Recommended)**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/mivton-phase-2-3)

### 🛠️ **Option 2: Manual CLI Deployment**

#### **Prerequisites**
- Node.js 18+ installed
- Git repository set up
- Railway account ([Sign up free](https://railway.app))

#### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

#### **Step 2: Login to Railway**
```bash
railway login
```

#### **Step 3: Clone and Deploy**
```bash
# Clone your repository
git clone https://github.com/yourusername/mivton.git
cd mivton

# Run automated deployment script
chmod +x scripts/deploy-railway.sh
./scripts/deploy-railway.sh
```

### 🔧 **Option 3: Manual Setup**

#### **1. Initialize Railway Project**
```bash
railway init
```

#### **2. Add Database Services**
```bash
# Add PostgreSQL
railway add postgresql

# Add Redis (optional, for sessions)
railway add redis
```

#### **3. Set Environment Variables**
```bash
# Copy template
cp .env.example .env

# Set variables in Railway dashboard or CLI
railway variables set NODE_ENV=production
railway variables set SESSION_SECRET=your-secret-here
```

#### **4. Deploy**
```bash
railway up
```

---

## **🗄️ Database Setup**

### **Automatic Migration**
The database will be automatically set up with:
- ✅ User preferences tables
- ✅ Status management tables  
- ✅ Language preferences
- ✅ Search optimization
- ✅ Demo data (optional)

### **Manual Migration (if needed)**
```bash
# Connect to Railway database
railway connect postgresql

# Run migrations
\i database/migrations/001_phase_2_3_enhancements.sql
\i database/migrations/002_demo_data.sql
```

---

## **⚙️ Environment Variables**

### **Required Variables**
```bash
DATABASE_URL=postgresql://...        # Auto-provided by Railway
NODE_ENV=production
SESSION_SECRET=your-secret-key
PORT=3000                           # Auto-provided by Railway
```

### **Optional Variables**
```bash
REDIS_URL=redis://...               # For session storage
MAX_FILE_SIZE=10485760              # 10MB file upload limit
ENABLE_DEMO_MODE=false              # Enable demo features
RATE_LIMIT_MAX=100                  # API rate limiting
```

---

## **🔗 Service Configuration**

### **Railway Services Setup**
1. **Main App** - Node.js application
2. **PostgreSQL** - Primary database
3. **Redis** - Session storage (optional)

### **Automatic Scaling**
- Railway auto-scales based on traffic
- Database connection pooling configured
- Static assets optimized for CDN delivery

---

## **🚀 Post-Deployment**

### **1. Verify Deployment**
```bash
# Check deployment status
railway status

# View logs
railway logs

# Open in browser
railway open
```

### **2. Test Phase 2.3 Features**
Visit your deployed app and test:
- ✅ User search functionality: `/demo-phase-2-3.html`
- ✅ Profile cards and interactions
- ✅ Status manager
- ✅ Settings interface
- ✅ API endpoints

### **3. Custom Domain (Optional)**
```bash
# Add custom domain
railway domain add yourdomain.com
```

---

## **📊 Monitoring & Maintenance**

### **View Application Logs**
```bash
railway logs --follow
```

### **Database Management**
```bash
# Connect to database
railway connect postgresql

# View database metrics
railway metrics
```

### **Environment Variables Management**
```bash
# List all variables
railway variables

# Set new variable
railway variables set KEY=value

# Delete variable
railway variables delete KEY
```

---

## **🔧 Troubleshooting**

### **Common Issues**

#### **Build Failures**
```bash
# Check build logs
railway logs --build

# Redeploy
railway up --force
```

#### **Database Connection Issues**
```bash
# Verify DATABASE_URL
railway variables | grep DATABASE_URL

# Test connection
railway connect postgresql
```

#### **Environment Variable Issues**
```bash
# Verify all required variables are set
railway variables

# Update variables through dashboard
railway open --admin
```

### **Performance Optimization**
- Database queries are optimized with indexes
- Static assets are compressed
- Redis caching enabled for sessions
- Connection pooling configured

---

## **📱 Mobile & Production Ready**

### **Features Enabled**
- ✅ **SSL/TLS** - Automatic HTTPS
- ✅ **CDN** - Global content delivery
- ✅ **Auto-scaling** - Based on traffic
- ✅ **Health checks** - Automatic monitoring
- ✅ **Logging** - Comprehensive error tracking
- ✅ **Security** - Helmet.js security headers

### **Performance Metrics**
- Sub-second response times
- 99.9% uptime SLA
- Global CDN distribution
- Automatic scaling

---

## **💰 Cost Estimation**

### **Railway Pricing**
- **Starter**: $5/month (1GB RAM, 1GB storage)
- **Pro**: $20/month (8GB RAM, 100GB storage)
- **Database**: $5/month (PostgreSQL addon)

### **Estimated Monthly Cost**
- Small app: ~$10/month
- Medium app: ~$25/month
- Large app: ~$50/month

---

## **🆘 Support & Resources**

### **Getting Help**
- 📖 [Railway Documentation](https://docs.railway.app)
- 💬 [Railway Discord](https://discord.gg/railway)
- 🐛 [GitHub Issues](https://github.com/yourusername/mivton/issues)

### **Useful Commands**
```bash
# Project info
railway status

# Deploy specific branch
railway up --branch main

# Connect to services
railway connect postgresql
railway connect redis

# Environment management
railway environments
railway environments create staging
```

---

**🎉 Your Mivton Phase 2.3 app is now live on Railway!**

Demo URL: `https://your-app.railway.app/demo-phase-2-3.html`
