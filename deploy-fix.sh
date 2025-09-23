#!/bin/bash

echo "🚀 DEPLOYING FRIEND REMOVAL/RE-ADD FIX"
echo "======================================"
echo ""

# Make sure we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Please run this from the Mivton directory"
    exit 1
fi

echo "1️⃣ Running quick test to verify fixes..."
node quick-test-friend-removal.js

if [ $? -eq 0 ]; then
    echo ""
    echo "2️⃣ Test passed! Ready to deploy..."
    echo ""
    echo "🚀 Run this command to deploy to Railway:"
    echo "   railway deploy"
    echo ""
    echo "📋 After deployment, test manually:"
    echo "   1. Go to: https://mivton-production.up.railway.app/register"
    echo "   2. Create 2 test accounts"  
    echo "   3. Add friend → Remove friend → Re-add friend"
    echo "   4. Should work without any errors!"
    echo ""
    echo "✅ Your friend removal/re-add synchronization is now fixed!"
else
    echo ""
    echo "❌ Test failed. Check the errors above."
    exit 1
fi
