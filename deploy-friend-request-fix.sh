#!/bin/bash

# Make script executable
chmod +x "$0"

# =======================================================
# FRIEND REQUEST DUPLICATE ISSUE FIX - DEPLOYMENT SCRIPT
# =======================================================

echo "🔧 FIXING FRIEND REQUEST DUPLICATE ISSUE"
echo "========================================"
echo ""

echo "📝 Summary of the issue:"
echo "   - User removed a friend and wants to add them back"
echo "   - Database still has old friend request record"
echo "   - Unique constraint prevents creating new request"
echo "   - Error: duplicate key value violates unique constraint"
echo ""

echo "🛠️ Solution implemented:"
echo "   1. Updated friend request creation logic"
echo "   2. Now checks for ANY existing request (not just pending)"
echo "   3. Automatically deletes old/expired requests"
echo "   4. Allows creation of new request after cleanup"
echo ""

echo "📋 Changes made to code:"
echo "   ✅ Modified routes/friend-requests.js"
echo "      - Improved duplicate request detection"
echo "      - Added automatic cleanup of old requests"
echo "      - Prevents unique constraint violations"
echo ""

echo "🧹 Running database cleanup..."
node cleanup-friend-requests.js

if [ $? -eq 0 ]; then
    echo "✅ Database cleanup completed successfully!"
else
    echo "❌ Database cleanup failed!"
    exit 1
fi

echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Run: railway up"
echo "2. Test friend request functionality"
echo "3. Verify that removed users can be re-added"
echo ""
echo "🎯 Expected behavior after fix:"
echo "   - User can remove friends without issues"
echo "   - User can add back previously removed friends"
echo "   - No more duplicate key constraint errors"
echo "   - Friend request system works seamlessly"
echo ""
echo "✅ FRIEND REQUEST FIX COMPLETE!"
