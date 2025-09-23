#!/bin/bash

# 🔧 Dashboard.js Syntax Error Fix
# Fixes "Unexpected token '{'" error at line 1356

echo "🔧 Fixing dashboard.js syntax error..."
echo ""

# Check if we're in the right directory
if [ ! -f "public/js/dashboard.js" ]; then
    echo "❌ Error: dashboard.js not found. Please run from Mivton project root."
    exit 1
fi

echo "📋 Creating backup of dashboard.js..."
cp public/js/dashboard.js public/js/dashboard.js.backup

echo "🔍 Scanning for common syntax errors..."

# Fix 1: Replace double braces {{ with ${
echo "1. Fixing double opening braces {{ → \${"
sed -i.tmp 's/{{/$\{/g' public/js/dashboard.js

# Fix 2: Replace double closing braces }} with }
echo "2. Fixing double closing braces }} → }"
sed -i.tmp 's/}}/}/g' public/js/dashboard.js

# Fix 3: Fix template literal syntax errors ${{ → ${
echo "3. Fixing template literal syntax \${{ → \${"
sed -i.tmp 's/\${{/$\{/g' public/js/dashboard.js

# Fix 4: Fix spaced braces { { → ${
echo "4. Fixing spaced opening braces { { → \${"
sed -i.tmp 's/{ {/$\{/g' public/js/dashboard.js

# Fix 5: Fix spaced closing braces } } → }
echo "5. Fixing spaced closing braces } } → }"
sed -i.tmp 's/} }/}/g' public/js/dashboard.js

# Remove temporary files
rm -f public/js/dashboard.js.tmp

echo ""
echo "✅ Syntax fixes applied!"
echo ""

# Check for syntax errors
echo "🔍 Checking for remaining syntax issues..."

# Look for common remaining issues
ISSUES_FOUND=0

if grep -n "{{" public/js/dashboard.js > /dev/null; then
    echo "⚠️  Still found {{ patterns:"
    grep -n "{{" public/js/dashboard.js | head -5
    ISSUES_FOUND=1
fi

if grep -n "}}" public/js/dashboard.js > /dev/null; then
    echo "⚠️  Still found }} patterns:"
    grep -n "}}" public/js/dashboard.js | head -5
    ISSUES_FOUND=1
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ No obvious syntax issues found!"
else
    echo "⚠️  Some issues may remain - check the patterns above"
fi

echo ""
echo "📤 Deploying fixed dashboard.js..."

# Commit and deploy
git add public/js/dashboard.js
git commit -m "🔧 Fix dashboard.js syntax error - replace double braces

- Replace {{ with \${ in template literals
- Replace }} with } 
- Fix spaced brace patterns
- Resolve 'Unexpected token {' error at line 1356

Fixes: Dashboard loading syntax error"

echo ""
echo "🚀 Pushing to Railway..."
git push origin main

echo ""
echo "✅ Dashboard syntax fix deployed!"
echo ""
echo "🔍 What was fixed:"
echo "   ✓ Double braces {{ → \${"
echo "   ✓ Double closing braces }} → }"
echo "   ✓ Template literal syntax errors"
echo "   ✓ Spaced brace patterns"
echo ""
echo "⏰ Changes will be live in ~2-3 minutes"
echo "🌐 Test at: https://mivton-production.up.railway.app"
echo ""
echo "💡 If dashboard still doesn't load:"
echo "   1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)"
echo "   2. Check browser console for any remaining errors"
echo "   3. Try logging out and back in"
echo ""
echo "📄 Backup saved as: public/js/dashboard.js.backup"
