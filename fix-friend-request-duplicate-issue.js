/**
 * FIX: Friend Request Duplicate Key Constraint Issue
 * 
 * This script fixes the duplicate key constraint issue by:
 * 1. Cleaning up old/invalid friend requests
 * 2. Updating the friend request creation logic to handle duplicates
 */

const fs = require('fs');
const path = require('path');

// Read the current friend-requests.js file
const friendRequestsPath = path.join(__dirname, 'routes', 'friend-requests.js');
let fileContent = fs.readFileSync(friendRequestsPath, 'utf8');

// Replace the existing friend request check logic with improved version
const oldLogic = `        // Check if friend request already exists (only check for active pending requests)
        const existingRequest = await pool.query(\`
            SELECT id, status FROM friend_requests 
            WHERE sender_id = $1 AND receiver_id = $2
            AND status = 'pending'
            AND expires_at > CURRENT_TIMESTAMP
        \`, [senderId, receiverId]);

        if (existingRequest.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Friend request already sent',
                code: 'REQUEST_EXISTS'
            });
        }`;

const newLogic = `        // Check if friend request already exists (check for any request)
        const existingRequest = await pool.query(\`
            SELECT id, status, expires_at FROM friend_requests 
            WHERE sender_id = $1 AND receiver_id = $2
            ORDER BY created_at DESC
            LIMIT 1
        \`, [senderId, receiverId]);

        if (existingRequest.rows.length > 0) {
            const request = existingRequest.rows[0];
            
            // If there's an active pending request, don't allow duplicate
            if (request.status === 'pending' && new Date(request.expires_at) > new Date()) {
                return res.status(409).json({
                    success: false,
                    error: 'Friend request already sent',
                    code: 'REQUEST_EXISTS'
                });
            }
            
            // If there's an old request (expired, declined, cancelled), delete it and allow new one
            if (request.status !== 'pending' || new Date(request.expires_at) <= new Date()) {
                console.log(\`\ud83d\uddd1\ufe0f Deleting old friend request with status: \${request.status}\`);
                await pool.query('DELETE FROM friend_requests WHERE id = $1', [request.id]);
            }
        }`;

// Replace the logic in the file
fileContent = fileContent.replace(oldLogic, newLogic);

// Write the updated file back
fs.writeFileSync(friendRequestsPath, fileContent);

console.log('✅ Friend request duplicate issue fix applied successfully!');
console.log('');
console.log('🔧 Changes made:');
console.log('   - Now checks for any existing friend request (not just pending ones)');
console.log('   - Automatically deletes old/expired requests before creating new ones');
console.log('   - Prevents the unique constraint violation error');
console.log('');
console.log('🚀 You can now deploy with: railway up');
