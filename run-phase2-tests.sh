#!/bin/bash

# Phase 2 Test Runner Script
echo "🚀 Starting Phase 2 Dashboard/UI Tests"
echo "======================================"

cd /Users/silviutimaru/Desktop/mivton

# Ensure test environment is set up
export NODE_ENV=test

echo "📊 Running API Tests..."
npm run test:api 2>&1 | tee test-api-output.log

echo ""
echo "🎭 Running E2E Tests (Headless)..."
npm run test:e2e:headless 2>&1 | tee test-e2e-output.log

echo ""
echo "✅ Test execution completed"
echo "Check test-api-output.log and test-e2e-output.log for detailed results"
