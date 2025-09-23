#!/bin/bash

# Make script executable
chmod +x "$0"

# 🚀 Mivton Rate Limit Fix Deployment Script
# This script fixes the 429 Too Many Requests error by updating rate limits

echo "🔧 Fixing Mivton rate limit issues..."
echo ""

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this script from the Mivton project root directory"
    exit 1
fi

# Show what we're fixing
echo "📋 Issues being fixed:"
echo "   - Increased rate limit from 50/hour to 100/15min"
echo "   - Excluded GET /api/friends from rate limiting"
echo "   - Added exponential backoff retry logic"
echo "   - Reduced auto-refresh frequency from 30s to 2min"
echo ""

# Check current git status
echo "📊 Current git status:"
git status --porcelain

echo ""
echo "💾 Committing rate limit fixes..."

# Add and commit the changes
git add routes/friends.js public/js/friends-manager.js
git commit -m "🔧 Fix rate limiting issues for friends API

- Increase rate limit from 50/hour to 100/15min for better UX
- Skip rate limiting for GET /api/friends (read operations)
- Add exponential backoff retry logic for 429 errors
- Reduce auto-refresh from 30s to 2min to prevent spam
- Improve error handling for rate limit scenarios

Fixes: 429 Too Many Requests error on friends list loading"

echo ""
echo "🚀 Deploying to Railway production..."

# Deploy to Railway
git push origin main

echo ""
echo "✅ Rate limit fixes deployed!"
echo ""
echo "🔍 What was changed:"
echo "   ✓ Friends API rate limit: 50/hour → 100/15min"
echo "   ✓ GET requests to friends list are now excluded from rate limiting"
echo "   ✓ Auto-refresh interval: 30 seconds → 2 minutes"
echo "   ✓ Added intelligent retry with exponential backoff"
echo "   ✓ Better error messages for rate limit scenarios"
echo ""
echo "⏰ Changes will be live in ~2-3 minutes"
echo "🌐 Test at: https://mivton-production.up.railway.app"
echo ""
echo "💡 If you still see 429 errors:"
echo "   1. Wait 15 minutes for rate limit to reset"
echo "   2. Clear browser cache and cookies"
echo "   3. Try logging in again"
