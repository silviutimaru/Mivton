#!/bin/bash

# Railway Deployment Script for Mivton Phase 2.3
# This script automates the deployment process to Railway

set -e  # Exit on any error

echo "🚂 Starting Mivton Phase 2.3 Railway Deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway..."
    railway login
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file from template..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual values before continuing!"
    echo "Press Enter when ready to continue..."
    read
fi

# Initialize Railway project if not already done
if [ ! -f railway.toml ]; then
    echo "🚀 Initializing Railway project..."
    railway init
fi

# Deploy the application
echo "📦 Deploying to Railway..."
railway up --detach

# Get the deployment URL
echo "🌐 Getting deployment URL..."
DEPLOY_URL=$(railway domain)

if [ -n "$DEPLOY_URL" ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your Mivton Phase 2.3 app is available at: $DEPLOY_URL"
    echo "📊 Demo page: $DEPLOY_URL/demo-phase-2-3.html"
else
    echo "⚠️  Deployment completed but URL not available yet."
    echo "Check Railway dashboard for deployment status."
fi

echo ""
echo "🎉 Mivton Phase 2.3 deployment complete!"
echo "📋 Next steps:"
echo "   1. Check Railway dashboard for deployment status"
echo "   2. Set up custom domain (optional)"
echo "   3. Configure environment variables in Railway dashboard"
echo "   4. Test all Phase 2.3 features"
echo ""
echo "🔗 Useful links:"
echo "   Railway Dashboard: https://railway.app/dashboard"
echo "   Project Logs: railway logs"
echo "   Environment Variables: railway variables"
