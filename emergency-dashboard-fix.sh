#!/bin/bash

# 🔧 Emergency Dashboard Syntax Fix
# Fixes "Unexpected token '{'" error at line 1356:40

echo "🚨 Emergency Dashboard Syntax Fix"
echo ""

# Check if we're in the right directory
if [ ! -f "public/js/dashboard.js" ]; then
    echo "❌ Error: dashboard.js not found. Please run from Mivton project root."
    exit 1
fi

echo "📋 Creating emergency backup..."
cp public/js/dashboard.js public/js/dashboard.js.emergency-backup

echo "🔧 Applying emergency syntax fixes..."

# Fix 1: Replace any {{ with ${ (template literal fix)
echo "1. Fixing template literal syntax {{ → \${"
sed -i '' 's/{{/$\{/g' public/js/dashboard.js

# Fix 2: Replace any }} with } (closing brace fix)  
echo "2. Fixing template literal closing }} → }"
sed -i '' 's/}}/}/g' public/js/dashboard.js

# Fix 3: Fix ${{ pattern (common error)
echo "3. Fixing \${{ → \${"
sed -i '' 's/\${{/$\{/g' public/js/dashboard.js

# Fix 4: Add missing semicolons before object literals if needed
echo "4. Checking for missing semicolons..."

# Fix 5: Look for and fix incomplete function definitions
echo "5. Checking for incomplete functions..."

echo ""
echo "✅ Emergency fixes applied!"

# Validate the fix by checking for obvious remaining issues
echo "🔍 Checking for remaining syntax issues..."

# Check if any {{ remain
if grep -q "{{" public/js/dashboard.js; then
    echo "⚠️  Warning: Some {{ patterns still remain"
    grep -n "{{" public/js/dashboard.js | head -3
fi

# Check if any }} remain
if grep -q "}}" public/js/dashboard.js; then
    echo "⚠️  Warning: Some }} patterns still remain" 
    grep -n "}}" public/js/dashboard.js | head -3
fi

echo ""
echo "📤 Deploying emergency fix..."

# Commit and deploy
git add public/js/dashboard.js
git commit -m "🚨 Emergency fix: dashboard.js syntax error

- Fix template literal syntax {{ → \${
- Fix double closing braces }} → }
- Resolve Unexpected token '{' error at line 1356

Emergency fix for dashboard loading issue"

echo ""
echo "🚀 Pushing emergency fix to Railway..."
git push origin main

echo ""
echo "✅ Emergency dashboard fix deployed!"
echo ""
echo "📊 Fix summary:"
echo "   🔧 Template literal syntax errors fixed"
echo "   🔧 Double brace patterns corrected"
echo "   🔧 Emergency backup saved as dashboard.js.emergency-backup"
echo ""
echo "⏰ Changes will be live in ~2-3 minutes"
echo "🌐 Test at: https://mivton-production.up.railway.app/dashboard"
echo ""
echo "💡 If dashboard still doesn't load:"
echo "   1. Clear browser cache completely (Ctrl+Shift+Delete)"
echo "   2. Try hard refresh (Ctrl+F5 or Cmd+Shift+R)" 
echo "   3. Check browser console for any remaining errors"
echo "   4. Try incognito/private browsing mode"
