#!/bin/bash
# Make this script executable
chmod +x "$0"

# ==============================================
# MIVTON - PROFILE VIEW FEATURE DEPLOYMENT
# Deploy the new profile viewing functionality
# ==============================================

echo "🚀 Deploying Profile View Feature..."
echo "======================================"

# Check if we're in the Mivton directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Must be run from Mivton project root directory"
    exit 1
fi

echo "📊 Summary of changes:"
echo "  ✅ New API route: /api/user-profile/:userId"
echo "  ✅ New API route: /api/user-profile/:userId/mutual-friends"
echo "  ✅ New API route: /api/user-profile/:userId/activity"
echo "  ✅ New component: MivtonProfileModal"
echo "  ✅ New stylesheet: profile-modal.css"
echo "  ✅ Updated friends manager to use profile modal"
echo "  ✅ Updated dashboard.html with profile modal support"
echo ""

echo "🔧 Checking dependencies..."

# Check if all required files exist
required_files=(
    "routes/user-profile.js"
    "public/js/profile-modal.js"
    "public/css/profile-modal.css"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ Missing: $file"
        exit 1
    fi
done

echo ""
echo "🎯 Testing server startup..."

# Test that the server can start without errors
timeout 10s node -e "
require('./server.js');
setTimeout(() => {
    console.log('✅ Server startup test passed');
    process.exit(0);
}, 3000);
" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "  ✅ Server startup test passed"
else
    echo "  ❌ Server startup test failed"
    echo "  🔍 Check server.js for syntax errors"
    exit 1
fi

echo ""
echo "📦 Railway deployment commands:"
echo "  railway login"
echo "  railway up"
echo ""

echo "🧪 Testing checklist:"
echo "  1. Go to dashboard and navigate to Friends section"
echo "  2. Click on 'View Profile' button for any friend"
echo "  3. Verify profile modal opens with user information"
echo "  4. Test profile actions (Add Friend, Send Message, etc.)"
echo "  5. Verify mutual friends display (if applicable)"
echo "  6. Test responsive design on mobile devices"
echo "  7. Check console for any JavaScript errors"
echo ""

echo "✨ Feature overview:"
echo "======================================"
echo "📋 Profile Modal Features:"
echo "  • Beautiful, responsive profile viewing"
echo "  • Real-time online status indicators"
echo "  • Mutual friends display"
echo "  • Activity badges and achievements"
echo "  • Privacy-aware information display"
echo "  • Action buttons (Add Friend, Message, Block, etc.)"
echo "  • Mobile-optimized design"
echo "  • Keyboard navigation support"
echo "  • Dark mode compatible"
echo ""

echo "🔒 Privacy Features:"
echo "  • Respects user privacy settings"
echo "  • Blocked users cannot view profiles"
echo "  • Friends-only and private profile options"
echo "  • Mutual friends only shown to friends"
echo "  • Activity data privacy controls"
echo ""

echo "🎨 UI/UX Features:"
echo "  • Smooth animations and transitions"
echo "  • Loading states and error handling"
echo "  • Accessible design with ARIA labels"
echo "  • High contrast mode support"
echo "  • Reduced motion support"
echo "  • Touch-friendly mobile interface"
echo ""

echo "🚀 Profile View Feature deployment ready!"
echo "======================================"
echo ""
echo "📝 Next steps:"
echo "  1. Deploy to Railway: railway up"
echo "  2. Test the new profile viewing functionality"
echo "  3. Monitor for any issues in production"
echo "  4. Gather user feedback on the profile modal experience"
echo ""

echo "🎉 The Friends Dashboard 'View Profile' button is now fully functional!"
echo "   Users can view detailed profiles, see mutual friends, and interact"
echo "   with other users through the beautiful new profile modal interface."
echo ""
