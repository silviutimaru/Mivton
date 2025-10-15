#!/bin/bash

echo "🚀 Deploying chat system fix and creating test data..."

# 1. Deploy the code changes
echo "📤 Deploying code changes..."
railway up &
DEPLOY_PID=$!

# Wait for deployment to complete (give it 2 minutes)
echo "⏳ Waiting for deployment to complete..."
sleep 120

# 2. Run the test conversation creation script on Railway
echo "📝 Creating test conversations on production..."
railway run node create-production-test-conversations.js

echo "✅ Deployment and test data creation complete!"
echo "🔍 Check the chat sidebar - it should now show conversations!"