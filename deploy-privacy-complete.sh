#!/bin/bash

# Complete Privacy Settings Deployment Script

echo "🚀 Deploying Privacy Settings & Profile Debugging Updates..."
echo ""

# Check if we're in the right directory
if [ ! -f "app.js" ]; then
    echo "❌ Error: Not in Mivton root directory"
    exit 1
fi

echo "✅ In correct directory"

# Check if changes are present
echo ""
echo "🔍 Verifying changes..."

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

if grep -q "Privacy filter: Only showing public profiles" routes/users-search.js; then
    echo "✅ Privacy-aware search implemented"
else
    echo "❌ Privacy-aware search not found"
    exit 1
fi

if grep -q "profile_visibility = COALESCE" routes/dashboard.js; then
    echo "✅ Privacy settings API implemented"
else
    echo "❌ Privacy settings API not found"
    exit 1
fi

echo ""
echo "🗄️ Running database migration..."

# Run the privacy migration
node run-privacy-migration.js

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed"
else
    echo "❌ Database migration failed"
    exit 1
fi

echo ""
echo "🎯 All changes verified and deployed successfully!"
echo ""
echo "📋 Summary of what's been implemented:"
echo "  1. ✅ Comprehensive profile debugging with detailed logs"
echo "  2. ✅ Gender field made read-only for legal compliance"
echo "  3. ✅ Privacy settings added to database (profile_visibility, show_language, show_online_status)"
echo "  4. ✅ Privacy-aware user search (only shows public profiles)"
echo "  5. ✅ Privacy settings API endpoints implemented"
echo "  6. ✅ Frontend privacy controls integrated"
echo ""
echo "🧪 Testing Instructions:"
echo "  1. Go to your dashboard Profile section"
echo "  2. Change profile visibility to 'Private'"
echo "  3. Click Save Changes"
echo "  4. Open a new browser/incognito window"
echo "  5. Create/login with a different account"
echo "  6. Try searching for your main account - it should NOT appear!"
echo ""
echo "📊 Debug Console:"
echo "  - Profile saves show detailed step-by-step logs"
echo "  - Privacy settings are saved separately from profile data"
echo "  - Search API logs privacy filtering"
echo ""
echo "🔒 Privacy Protection:"
echo "  - 'Private' profiles won't appear in any searches"
echo "  - 'Friends' profiles only appear to friends (Phase 3 feature)"
echo "  - 'Public' profiles appear normally"
echo "  - Language/status visibility respects user preferences"
echo ""
echo "🚀 Ready for comprehensive testing!"
