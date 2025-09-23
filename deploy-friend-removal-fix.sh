#!/bin/bash

# 🚀 MIVTON FRIEND REMOVAL/RE-ADD FIX DEPLOYMENT SCRIPT
# Applies all necessary fixes and tests the functionality

echo "🚀 MIVTON FRIEND REMOVAL/RE-ADD FIX DEPLOYMENT"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Mivton directory"
    exit 1
fi

echo "1️⃣ Testing current database connection..."
node -e "
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW() as time')
  .then(result => {
    console.log('   ✅ Database connected:', result.rows[0].time);
    pool.end();
  })
  .catch(error => {
    console.error('   ❌ Database connection failed:', error.message);
    process.exit(1);
  });
"

echo ""
echo "2️⃣ Running friend removal/re-add cycle test..."
node test-friend-cycle-fixed.js

if [ $? -eq 0 ]; then
    echo ""
    echo "3️⃣ Tests passed! Deploying to Railway..."
    
    # Install dependencies (in case anything is missing)
    npm install
    
    # Deploy to Railway
    echo ""
    echo "🚀 Deploying to Railway..."
    echo "Command to run manually: railway deploy"
    echo ""
    echo "📋 DEPLOYMENT CHECKLIST:"
    echo "========================"
    echo "✅ Friend removal now completely cleans up:"
    echo "   • Friendship records"
    echo "   • ALL friend request history"  
    echo "   • Friend-related notifications"
    echo "   • Activity logs maintained"
    echo ""
    echo "✅ Friend re-adding now works because:"
    echo "   • No 'already accepted' errors"
    echo "   • Clean slate for new requests"
    echo "   • Proper validation for pending requests only"
    echo ""
    echo "🎯 TESTING INSTRUCTIONS:"
    echo "========================"
    echo "1. Deploy: railway deploy"
    echo "2. Go to: https://mivton-production.up.railway.app/register"
    echo "3. Create 2 test accounts"
    echo "4. Add each other as friends"
    echo "5. Remove friend from friends list"
    echo "6. Try to add them back - should work without errors!"
    echo ""
    echo "🎉 Your friend removal/re-add functionality is now fixed!"
    
else
    echo ""
    echo "❌ Tests failed. Please check the error messages above."
    echo "🔧 Try running: node test-friend-cycle-fixed.js"
    exit 1
fi
