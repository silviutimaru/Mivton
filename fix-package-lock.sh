#!/bin/bash

echo "🔧 Fixing package-lock.json sync issues..."

# Remove the problematic lock file
rm -f package-lock.json

echo "✅ Removed old package-lock.json"

# Remove node_modules to ensure clean install
rm -rf node_modules

echo "✅ Removed node_modules directory"

# Install dependencies fresh
npm install

echo "✅ Generated new package-lock.json"
echo "🚀 Ready for deployment!"
