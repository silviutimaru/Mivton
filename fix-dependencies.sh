#!/bin/bash

echo "🔧 Fixing Mivton Package Lock Issue..."

# Navigate to project directory
cd ~/Desktop/Mivton

# Remove all lock files and node_modules
echo "📦 Removing old dependencies..."
rm -f package-lock.json
rm -f node_modules/.package-lock.json
rm -rf node_modules

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Fresh install
echo "📥 Fresh dependency install..."
npm install

# Verify installation
echo "✅ Verifying installation..."
if [ -f "package-lock.json" ]; then
    echo "✅ New package-lock.json created successfully"
else
    echo "❌ Package-lock.json not created - there may be an issue"
fi

# Check if key dependencies are installed
if [ -d "node_modules/express" ] && [ -d "node_modules/socket.io" ]; then
    echo "✅ Key dependencies installed successfully"
    echo "🚀 Ready for deployment with: railway up"
else
    echo "❌ Some dependencies missing - please check npm install output"
fi

echo "🎯 Fix complete! Now run: railway up"
