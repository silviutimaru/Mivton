#!/bin/bash

# 🚀 DEPLOY REAL-TIME FRIEND STATUS UPDATES
# This script deploys the enhanced real-time friend status system

echo "🚀 Deploying Real-Time Friend Status Updates..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in the mivton project directory"
    echo "Please run this script from the mivton root directory"
    exit 1
fi

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Error: Railway CLI not found"
    echo "Please install Railway CLI: https://docs.railway.app/develop/cli"
    exit 1
fi

echo "📋 Deployment Summary:"
echo "- Enhanced socket client for real-time updates"
echo "- Improved friends manager with status sync"
echo "- Enhanced presence events system"
echo "- Smooth UI animations for status changes"
echo "- Friend online/offline notifications"
echo ""

# Confirm deployment
read -p "🚀 Deploy to Railway? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "🔄 Starting deployment..."
echo ""

# Deploy to Railway
railway up

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "🎯 What's New:"
    echo "- Friends' status now updates in real-time without page refresh"
    echo "- When a friend comes online, you'll see a notification AND their status updates immediately"
    echo "- Smooth animations when status changes"
    echo "- Enhanced presence management"
    echo ""
    echo "🧪 Testing:"
    echo "1. Open your dashboard in two different browsers/incognito windows"
    echo "2. Log in as different users who are friends"
    echo "3. When one comes online, the other should see the status update immediately"
    echo "4. Check the browser console for debug messages"
    echo ""
    echo "📱 Your app is live at: https://mivton.up.railway.app"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi
