#!/bin/bash

# Make script executable
chmod +x "$0"

# 🚀 MIVTON - Fix Profile View Feature
# This script deploys the fixed friends manager with working profile view

echo "🚀 Deploying Profile View Fix to Railway..."
echo "📝 Changes: Fixed viewProfile function in friends-manager.js"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the Mivton project directory"
    echo "Please run this script from the Mivton project root directory"
    exit 1
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Add all changes
echo "📦 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing fixes..."
git commit -m "🔧 Fix profile view functionality

- Fixed viewProfile function in friends-manager.js
- Removed debugging test div code
- Added proper profile modal initialization
- Improved error handling for profile modal
- Now correctly shows friend profiles when clicking View Profile button

Changes:
- /public/js/friends-manager.js: Complete rewrite of viewProfile function
- Better integration with existing profile modal component
- Proper modal container handling and initialization
- Added comprehensive logging for debugging

This fix ensures that users can properly view their friends' profiles
when clicking the 'View Profile' button from the friends list."

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 To test the fix:"
echo "1. Go to your Mivton app in the browser"
echo "2. Navigate to Friends section"
echo "3. Click on a friend to open the actions modal"
echo "4. Click 'View Profile' button"
echo "5. The profile modal should now appear properly"
echo ""
echo "🔍 If issues persist, check the browser console for any errors."
echo "The new code includes detailed logging to help debug any remaining issues."
