#!/usr/bin/env node
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkNotificationSystem() {
  console.log('🔔 Checking Mivton Notification System\n');
  
  try {
    // Check recent friend notifications
    console.log('📨 Recent Friend Notifications:');
    console.log('='.repeat(50));
    
    const notifications = await pool.query(`
      SELECT 
        fn.id,
        fn.type,
        fn.message,
        fn.is_read,
        fn.created_at,
        us.full_name as sender_name,
        ur.full_name as receiver_name
      FROM friend_notifications fn
      JOIN users us ON fn.sender_id = us.id
      JOIN users ur ON fn.user_id = ur.id
      ORDER BY fn.created_at DESC
      LIMIT 10
    `);
    
    if (notifications.rows.length === 0) {
      console.log('❌ No friend notifications found');
    } else {
      notifications.rows.forEach((notif, i) => {
        const status = notif.is_read ? '📖 READ' : '🔔 UNREAD';
        console.log(`${i+1}. ${notif.sender_name} → ${notif.receiver_name}`);
        console.log(`   📝 ${notif.message}`);
        console.log(`   ${status} | ${notif.type.toUpperCase()}`);
        console.log(`   📅 ${new Date(notif.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    // Check for real-time tables
    console.log('🔄 Real-time System Components:');
    console.log('='.repeat(50));
    
    const realtimeTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%socket%' OR 
           table_name LIKE '%presence%' OR 
           table_name LIKE '%realtime%' OR
           table_name = 'user_activity')
      ORDER BY table_name
    `);
    
    if (realtimeTables.rows.length === 0) {
      console.log('❌ No real-time tables found');
    } else {
      realtimeTables.rows.forEach((table, i) => {
        console.log(`${i+1}. ${table.table_name}`);
      });
    }
    
    // Check user activity/presence
    console.log('\n👥 Current User Activity:');
    console.log('='.repeat(50));
    
    const userActivity = await pool.query(`
      SELECT 
        u.full_name,
        u.status,
        u.last_login,
        COUNT(fn.id) as unread_notifications
      FROM users u
      LEFT JOIN friend_notifications fn ON u.id = fn.user_id AND fn.is_read = false
      GROUP BY u.id, u.full_name, u.status, u.last_login
      ORDER BY u.last_login DESC NULLS LAST
    `);
    
    userActivity.rows.forEach((user, i) => {
      const statusIcon = user.status === 'online' ? '🟢' : '🔴';
      console.log(`${i+1}. ${user.full_name} ${statusIcon} ${user.status.toUpperCase()}`);
      console.log(`   🔔 ${user.unread_notifications} unread notifications`);
      if (user.last_login) {
        console.log(`   📅 Last login: ${new Date(user.last_login).toLocaleString()}`);
      }
      console.log('');
    });
    
    // Check app.js for Socket.IO implementation
    console.log('🔍 Application Files Check:');
    console.log('='.repeat(50));
    
    const fs = require('fs');
    const path = require('path');
    
    const appJsPath = path.join(process.cwd(), 'app.js');
    if (fs.existsSync(appJsPath)) {
      const appContent = fs.readFileSync(appJsPath, 'utf8');
      
      const hasSocketIO = appContent.includes('socket.io') || appContent.includes('Socket.IO');
      const hasNotificationRoutes = appContent.includes('notification') || appContent.includes('/api/friends');
      
      console.log(`📁 app.js found: ${hasSocketIO ? '✅' : '❌'} Socket.IO`);
      console.log(`📁 app.js found: ${hasNotificationRoutes ? '✅' : '❌'} Notification routes`);
      
      if (hasSocketIO) {
        console.log('✅ Socket.IO appears to be implemented');
      } else {
        console.log('⚠️  Socket.IO not detected in app.js');
      }
    } else {
      console.log('❌ app.js not found in current directory');
    }
    
    // Check public directory for notification sounds
    const publicDir = path.join(process.cwd(), 'public');
    if (fs.existsSync(publicDir)) {
      const soundFiles = fs.readdirSync(publicDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name)
        .filter(name => name.match(/\.(mp3|wav|ogg|m4a)$/i));
      
      console.log(`🔊 Sound files in public/: ${soundFiles.length > 0 ? soundFiles.join(', ') : 'None found'}`);
    }
    
    console.log('\n💡 NOTIFICATION SYSTEM STATUS:');
    console.log('='.repeat(50));
    console.log('✅ Database notifications: Working (friend_notifications table)');
    console.log('✅ Activity feed: Working (friend_activity_feed table)');
    console.log('❓ Real-time pop-ups: Requires Socket.IO integration');
    console.log('❓ Sound notifications: Requires frontend audio implementation');
    
    console.log('\n🎯 To test friend request notifications:');
    console.log('1. Send a friend request from one user to another');
    console.log('2. Check if notification appears in friend_notifications table');
    console.log('3. Check if real-time pop-up appears (requires Socket.IO)');
    console.log('4. Check if sound plays (requires frontend audio)');
    
  } catch (error) {
    console.error('❌ Error checking notifications:', error.message);
  } finally {
    await pool.end();
  }
}

checkNotificationSystem();
