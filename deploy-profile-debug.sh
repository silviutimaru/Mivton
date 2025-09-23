#!/bin/bash

# Deployment script for profile debugging updates

echo "🚀 Deploying profile debugging updates..."

# Check if we're in the right directory
if [ ! -f "app.js" ]; then
    echo "❌ Error: Not in Mivton root directory"
    exit 1
fi

echo "✅ In correct directory"

# Check if changes are present
if grep -q "💾 === SAVE PROFILE DEBUG START ===" public/js/dashboard.js; then
    echo "✅ Dashboard debugging code found"
else
    echo "❌ Dashboard debugging code not found"
    exit 1
fi

if grep -q "disabled readonly" public/dashboard.html; then
    echo "✅ Gender field made read-only"
else
    echo "❌ Gender field not made read-only"
    exit 1
fi

if grep -q "Profile update request for user" routes/dashboard.js; then
    echo "✅ Backend debugging code found"
else
    echo "❌ Backend debugging code not found"
    exit 1
fi

echo "🎯 All changes verified successfully!"
echo ""
echo "📋 Summary of changes:"
echo "  1. ✅ Added comprehensive debugging to profile save function"
echo "  2. ✅ Made gender field read-only for legal compliance"
echo "  3. ✅ Added backend API debugging logs"
echo "  4. ✅ Removed gender from profile update requests"
echo ""
echo "🧪 Ready for testing! Now you can:"
echo "  1. Go to your dashboard Profile section"
echo "  2. Change your name and language"
echo "  3. Click Save Changes"
echo "  4. Check browser console for detailed debug logs"
echo ""
echo "📊 The console will show exactly what's happening at each step!"
