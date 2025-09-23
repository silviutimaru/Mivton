#!/bin/bash

# 🚀 MIVTON ENHANCED PRESENCE DEPLOYMENT SCRIPT
# Deploy enhanced presence control to Railway

echo "🚀 Starting Mivtor Enhanced Presence Deployment to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway authentication confirmed"

# Verify all required files exist
echo "📋 Verifying enhanced presence files..."

required_files=(
    "public/js/enhanced-presence-control.js"
    "public/css/enhanced-presence.css"
    "demo-enhanced-presence.html"
    "ENHANCED_PRESENCE_GUIDE.md"
    "routes/presence-advanced.js"
    "database/advanced-presence-schema.sql"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Check if advanced presence schema is initialized
echo "🗄️ Checking database schema status..."
if railway run node -e "
const { getDb } = require('./database/connection');
(async () => {
    try {
        const db = getDb();
        const result = await db.query('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = \\'public\\' AND table_name = \\'user_presence_settings\\')');
        if (result.rows[0].exists) {
            console.log('✅ Advanced presence schema exists');
        } else {
            console.log('⚠️ Advanced presence schema not found - will initialize');
            process.exit(1);
        }
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        process.exit(1);
    }
})();
" 2>/dev/null; then
    echo "✅ Database schema verified"
else
    echo "🔄 Initializing advanced presence schema..."
    railway run npm run init:advanced-social
    if [[ $? -eq 0 ]]; then
        echo "✅ Advanced presence schema initialized"
    else
        echo "❌ Failed to initialize schema"
        exit 1
    fi
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

if [[ $? -eq 0 ]]; then
    echo ""
    echo "🎉 Enhanced Presence Control deployed successfully!"
    echo ""
    echo "📍 Your enhanced presence system is now live at:"
    echo "   🌐 Main app: https://mivton.com"
    echo "   🎯 Demo page: https://mivton.com/demo-presence" 
    echo "   📚 Integration guide: View ENHANCED_PRESENCE_GUIDE.md"
    echo ""
    echo "✨ Features now available:"
    echo "   🔒 Granular privacy controls (Everyone, Friends, Active Chats, Selected, Nobody)"
    echo "   🎯 Advanced status management (Online, Away, DND, Invisible, Offline)"
    echo "   🤖 Smart automation (Auto-away, Quiet hours, Activity detection)"
    echo "   💬 Custom status messages with emojis"
    echo "   📱 Real-time friend presence updates"
    echo "   ⚙️ Comprehensive settings panel"
    echo ""
    echo "🔧 To integrate on any page, just add:"
    echo "   <div data-component=\"enhanced-presence\"></div>"
    echo ""
    echo "🎊 Your users now have complete control over their presence visibility!"
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi
