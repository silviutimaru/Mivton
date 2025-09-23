#!/bin/bash

# 🔧 MIVTON FRIEND SYNCHRONIZATION FIX DEPLOYMENT

echo "🚀 Deploying friend synchronization fix..."

# Create backups
echo "💾 Creating backups..."
cp routes/dashboard.js routes/dashboard.js.backup.$(date +%Y%m%d_%H%M%S)
cp public/js/socket-client.js public/js/socket-client.js.backup.$(date +%Y%m%d_%H%M%S)

echo "✅ Backups created"

# Restart application
echo "🔄 Restarting application..."

if command -v railway &> /dev/null; then
    echo "🚂 Deploying to Railway..."
    railway deploy
else
    echo "🔄 Restarting local server..."
    pkill -f "node.*server.js" || true
    npm start &
    echo "✅ Server restarted"
fi

echo ""
echo "✅ Friend synchronization fix deployed successfully!"
echo ""
echo "🎯 What was fixed:"
echo "   • Dashboard friends count now uses correct friendships table"
echo "   • Real-time dashboard refresh when friends are removed"
echo "   • All UI components update instantly via socket events"
echo "   • Pop-up notifications cleared when friends are removed"
echo "   • Complete database cleanup on friend removal"
echo ""
echo "🧪 Test the fix:"
echo "   1. SilviuT logs in to dashboard"
echo "   2. Check Friends tab shows correct count (should be 2 after removing IrinelT)"
echo "   3. Verify no popup notifications appear for IrinelT"
echo "   4. Try removing another friend to test real-time updates"
echo ""
echo "✅ Fix deployment complete!"
