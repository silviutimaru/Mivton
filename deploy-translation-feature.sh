#!/bin/bash

echo "🚀 Deploying Chat Translation Feature to Railway"
echo "=================================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with:"
    echo "   npm i -g @railway/cli"
    exit 1
fi

# Check if logged in
echo "🔍 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway. Please login:"
    echo "   railway login"
    echo ""
    echo "After logging in, run this script again."
    exit 1
fi

echo "✅ Railway CLI authenticated"

# Show current project
echo ""
echo "📋 Current Railway project:"
railway status

# Confirm deployment
echo ""
echo "🎯 This will deploy the following changes:"
echo "  ✅ Database migration for translation fields"
echo "  ✅ Translation API endpoints"
echo "  ✅ Real-time Socket.IO translation"
echo "  ✅ Frontend language selector UI"
echo "  ✅ Startup validation checks"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Deploy to Railway
echo ""
echo "🚀 Deploying to Railway..."
railway up

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🎉 Chat Translation Feature Deployed!"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Check deployment logs: railway logs"
    echo "2. Open your app: railway open"
    echo "3. Test the feature using the testing guide:"
    echo "   - Look for language selector (🌍 EN) in chat"
    echo "   - Select a language from dropdown"
    echo "   - Send/receive messages to test translation"
    echo ""
    echo "🧪 Run automated tests in browser console:"
    echo "   testChatTranslation()"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check logs with: railway logs"
    exit 1
fi

