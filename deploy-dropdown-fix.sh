#!/bin/bash
# Make this script executable
chmod +x "$0"

# ==============================================
# MIVTON - LANGUAGE DROPDOWN Z-INDEX FIX
# Fix for disappearing language options
# ==============================================

echo "🔧 Deploying Language Dropdown Fix..."
echo "====================================="

# Check if we're in the Mivton directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Must be run from Mivton project root directory"
    exit 1
fi

echo "🐛 Problem identified:"
echo "  • Language dropdown options disappearing"
echo "  • Profile modal z-index (9999) covering dropdowns"
echo "  • Native language selector affected on registration"
echo ""

echo "✅ Solution implemented:"
echo "  • Created dropdown-fix.css with z-index: 99999 for language selectors"
echo "  • Added to dashboard.html and register.html"
echo "  • Targets all language-related select elements"
echo "  • Includes mobile-specific fixes"
echo ""

echo "📁 Files modified:"
echo "  ✅ public/css/dropdown-fix.css (new)"
echo "  ✅ public/css/language-selector.css (updated z-index)"
echo "  ✅ public/dashboard.html (added dropdown-fix.css)"
echo "  ✅ public/register.html (added dropdown-fix.css)"
echo ""

echo "🎯 CSS targets:"
echo "  • select[id*=\"language\"]"
echo "  • select[name*=\"language\"]"
echo "  • #nativeLanguageSelect"
echo "  • #languageFilter"
echo "  • .language-select"
echo ""

echo "🚀 Ready for deployment!"
echo "======================"
echo ""
echo "Deploy commands:"
echo "  railway up"
echo ""

echo "🧪 Testing after deployment:"
echo "  1. Go to Dashboard → Profile & Settings"
echo "  2. Click on Native Language dropdown"
echo "  3. Verify options are visible (not disappeared)"
echo "  4. Test on Registration page language selector"
echo "  5. Open profile modal and test language dropdowns"
echo ""

echo "✨ The fix ensures language dropdowns always stay visible!"
echo "   Higher z-index (99999) than profile modal (9999)"
echo "   Comprehensive targeting of all language selectors"
echo "   Mobile-specific optimizations included"
echo ""

echo "🎉 Language dropdown issue should be resolved!"
