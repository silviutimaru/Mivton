#!/bin/bash

echo "🚀 Deploying Enhanced Presence Control to Railway..."
echo ""

# Check if we're in the right directory
if [[ ! -f "server.js" ]]; then
    echo "❌ Error: Please run this from the Mivton project directory"
    exit 1
fi

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found"
else
    echo "❌ Railway CLI not found. Please install with:"
    echo "   npm install -g @railway/cli"
    echo "   Then login with: railway login"
    exit 1
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

if [[ $? -eq 0 ]]; then
    echo ""
    echo "🎉 SUCCESS! Enhanced Presence Control deployed!"
    echo ""
    echo "🌐 Your app is live at: https://mivton.com"
    echo "🎯 Demo page: https://mivton.com/demo-presence"
    echo ""
    echo "✨ New features available:"
    echo "   🔒 Granular privacy controls"
    echo "   🎯 Advanced status management"
    echo "   💬 Custom status messages"
    echo "   📱 Real-time friend presence"
    echo "   ⚙️ Comprehensive settings"
    echo ""
    echo "Integration: Add <div data-component=\"enhanced-presence\"></div> to any page"
else
    echo "❌ Deployment failed. Please check the errors above."
fi
