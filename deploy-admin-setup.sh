#!/bin/bash

# 🚀 ADMIN SETUP AND DEPLOYMENT SCRIPT
# This script ensures silviu@mivton.com has proper admin access

echo "🚀 Starting Admin Setup and Deployment..."

# Step 1: Deploy the current code to Railway
echo "📦 Deploying to Railway..."
railway up

# Wait for deployment to complete
echo "⏳ Waiting for deployment to complete..."
sleep 30

# Step 2: Set up admin user via Railway CLI
echo "👑 Setting up admin user..."
railway run node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('🔌 Connecting to database...');
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, username, email, is_admin, admin_level FROM users WHERE email = \$1',
      ['silviu@mivton.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User silviu@mivton.com not found');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    console.log('👤 Current user status:', user);
    
    // Update user to admin if not already
    if (!user.is_admin) {
      console.log('👑 Promoting user to admin...');
      const updateResult = await pool.query(
        'UPDATE users SET is_admin = true, admin_level = 3, updated_at = CURRENT_TIMESTAMP WHERE email = \$1 RETURNING *',
        ['silviu@mivton.com']
      );
      
      console.log('✅ User promoted to admin:', updateResult.rows[0]);
    } else {
      console.log('✅ User is already an admin');
    }
    
    // Verify admin access
    const verifyResult = await pool.query(
      'SELECT id, username, email, is_admin, admin_level, status FROM users WHERE email = \$1',
      ['silviu@mivton.com']
    );
    
    console.log('✅ Final admin status:', verifyResult.rows[0]);
    
    // Check other admin users
    const adminUsers = await pool.query(
      'SELECT username, email, admin_level FROM users WHERE is_admin = true ORDER BY admin_level DESC'
    );
    
    console.log('👑 All admin users:');
    adminUsers.rows.forEach(admin => {
      console.log(\`  - \${admin.username} (\${admin.email}) - Level: \${admin.admin_level}\`);
    });
    
    await pool.end();
    console.log('🎉 Admin setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
"

# Step 3: Test admin functionality
echo "🧪 Testing admin functionality..."
railway run node -e "
const fetch = require('node-fetch');

(async () => {
  try {
    console.log('🔍 Testing admin API endpoints...');
    
    // Test admin stats endpoint
    const statsResponse = await fetch('https://www.mivton.com/api/admin/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ Admin stats API working:', stats.success);
    } else {
      console.log('❌ Admin stats API failed:', statsResponse.status);
    }
    
    // Test admin users endpoint
    const usersResponse = await fetch('https://www.mivton.com/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('✅ Admin users API working:', users.success);
    } else {
      console.log('❌ Admin users API failed:', usersResponse.status);
    }
    
    console.log('🎉 Admin functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
})();
"

echo "🎉 Admin setup and deployment completed!"
echo "📋 Next steps:"
echo "1. Visit https://www.mivton.com/dashboard.html"
echo "2. Login with silviu@mivton.com"
echo "3. Look for the Admin section in the sidebar"
echo "4. Click on Admin to access the admin dashboard"
echo "5. Test all admin functions (users, monitoring, analytics, settings)"
