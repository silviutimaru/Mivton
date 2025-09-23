#!/bin/bash

# ==============================================
# MIVTON USER SEARCH FIX DEPLOYMENT SCRIPT
# ==============================================

echo "🚀 Deploying user search functionality fix..."

# Step 1: Setup missing database columns
echo "📊 Setting up missing database columns..."
node setup-search-columns.js

if [ $? -eq 0 ]; then
    echo "✅ Database columns setup completed"
else
    echo "❌ Database setup failed"
    exit 1
fi

# Step 2: Test the search functionality
echo "🔍 Testing user search functionality..."
node test-user-search-fix.js

if [ $? -eq 0 ]; then
    echo "✅ User search test completed"
else
    echo "❌ User search test failed"
    exit 1
fi

# Step 3: Deploy to Railway
echo "🚂 Deploying to Railway..."

# First, make sure we have the latest changes
git add .
git commit -m "Fix: Implement complete user search functionality with proper database columns and frontend integration"

# Push to Railway
railway deploy

if [ $? -eq 0 ]; then
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "✅ User search functionality has been fixed and deployed!"
    echo ""
    echo "🔗 Your app is available at: https://mivton-production.up.railway.app/"
    echo ""
    echo "📋 What was fixed:"
    echo "   - ✅ Complete dashboard.js implementation with user search"
    echo "   - ✅ Proper database column handling with COALESCE for missing columns"
    echo "   - ✅ Enhanced search results CSS styling"
    echo "   - ✅ Privacy-respecting search that only shows public profiles"
    echo "   - ✅ Real-time search with debouncing"
    echo "   - ✅ Friend request functionality from search results"
    echo "   - ✅ Responsive design for mobile and desktop"
    echo "   - ✅ Error handling and loading states"
    echo ""
    echo "🧪 Test the search by:"
    echo "   1. Go to https://mivton-production.up.railway.app/dashboard"
    echo "   2. Click on 'Find Users' in the sidebar"
    echo "   3. Type at least 2 characters in the search box"
    echo "   4. See live search results with user cards"
    echo "   5. Send friend requests directly from search results"
    echo ""
else
    echo "❌ Railway deployment failed"
    exit 1
fi
