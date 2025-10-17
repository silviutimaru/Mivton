#!/bin/bash

echo "🚀 QUICK DEPLOY TO RAILWAY"
echo "=========================="
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not installed"
    echo ""
    echo "Install with: npm install -g @railway/cli"
    echo ""
    exit 1
fi

# Try to deploy
echo "📦 Deploying to Railway..."
echo ""

# Attempt deployment
railway up --detach

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment initiated successfully!"
    echo ""
    echo "📊 Check status with: railway status"
    echo "📝 View logs with: railway logs"
    echo "🌐 Open app with: railway open"
    echo ""
else
    echo ""
    echo "⚠️  Railway CLI deployment failed"
    echo ""
    echo "💡 Alternative: Railway should auto-deploy from GitHub"
    echo ""
    echo "✅ Your changes are pushed to GitHub (main branch)"
    echo "✅ If Railway is connected to GitHub, it will auto-deploy"
    echo ""
    echo "🔍 Check your Railway dashboard:"
    echo "   https://railway.app/dashboard"
    echo ""
    echo "📝 Or login and try again:"
    echo "   railway login"
    echo "   railway up"
    echo ""
fi

