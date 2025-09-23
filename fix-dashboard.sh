#!/bin/bash

# 🚀 MIVTON DASHBOARD FIX SCRIPT
# This script fixes the JavaScript syntax errors and authentication issues

echo "🔧 Starting Mivton Dashboard Fix..."

# Navigate to the Mivton directory
cd /Users/silviutimaru/Desktop/Mivton

# Create backup of the original dashboard.js
echo "📦 Creating backup of original dashboard.js..."
cp public/js/dashboard.js public/js/dashboard.js.broken-backup

# Replace the broken dashboard.js with the fixed version
echo "🔄 Replacing broken dashboard.js with fixed version..."
cp public/js/dashboard-fixed.js public/js/dashboard.js

# Update the dashboard.html to load the auth fix
echo "🔧 Updating dashboard.html to include authentication fix..."

# Add the auth fix script before the dashboard.js script
sed -i '' 's|<script src="/js/dashboard.js"></script>|<script src="/js/auth-fix.js"></script>\
    <script src="/js/dashboard.js"></script>|g' public/dashboard.html

echo "✅ Dashboard fixes applied successfully!"

echo "📝 Summary of fixes:"
echo "  ✓ Fixed JavaScript syntax errors in dashboard.js"
echo "  ✓ Added proper class structure and closing braces"
echo "  ✓ Added authentication error handling"
echo "  ✓ Fixed 401 error handling for API calls"
echo "  ✓ Added backup of broken file"
echo "  ✓ Updated HTML to load auth fix script"

echo ""
echo "🚀 You can now redeploy the application!"
echo "The dashboard should work without JavaScript errors."

# Optional: Display the git status to see changes
if [ -d ".git" ]; then
    echo ""
    echo "📋 Git status:"
    git status --porcelain
fi

echo ""
echo "💡 To deploy to Railway:"
echo "   git add ."
echo "   git commit -m 'Fix dashboard JavaScript syntax errors and auth issues'"
echo "   git push origin main"
