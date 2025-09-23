#!/bin/bash
# Make this script executable
chmod +x "$0"

# ==============================================
# MIVTON - PROFILE API ERROR FIX DEPLOYMENT
# Fix the 500 error in profile API
# ==============================================

echo "🚀 Deploying Profile API Error Fix..."
echo "====================================="

# Check if we're in the Mivton directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Must be run from Mivton project root directory"
    exit 1
fi

echo "🔧 Changes applied:"
echo "  ✅ Updated user-profile.js with safe column checking"
echo "  ✅ Added graceful fallbacks for missing database columns"
echo "  ✅ Added better error logging and debugging"
echo "  ✅ Created debug script for troubleshooting"
echo ""

echo "📊 Testing server startup..."

# Test that the server can start
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
    echo "  🔍 Check for syntax errors"
    exit 1
fi

echo ""
echo "🧪 Debug tools available:"
echo "  • Run: node debug-profile-api.js"
echo "  • Check database structure and test queries"
echo "  • Verify user data and table availability"
echo ""

echo "🚀 Ready for deployment!"
echo "======================"
echo ""
echo "Deploy commands:"
echo "  railway up"
echo ""

echo "🔍 If issues persist after deployment:"
echo "  1. Check Railway logs for detailed error messages"
echo "  2. Run debug script locally: node debug-profile-api.js"
echo "  3. Verify database schema matches expected columns"
echo "  4. Check that user ID 5 exists in your database"
echo ""

echo "✨ The fix includes:"
echo "  • Safe column existence checking"
echo "  • Graceful fallbacks for missing features"
echo "  • Better error handling and logging"
echo "  • Support for basic user tables"
echo ""

echo "🎯 This should resolve the 500 Internal Server Error!"
