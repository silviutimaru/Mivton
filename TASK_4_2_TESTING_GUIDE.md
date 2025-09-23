# Task 4.2 - Room per User (Temporary Stub IDs) - Testing Guide

## 🎯 Overview

Task 4.2 implements room-based Socket.IO communication with temporary user IDs. This allows:

1. **Temporary User IDs**: Generated and stored in localStorage if missing
2. **Room Management**: Users join rooms named `user:${userId}`
3. **Targeted Notifications**: Send messages to specific users via their rooms
4. **Cross-tab Communication**: Test messaging between browser tabs

## 🔧 Implementation Details

### Frontend Changes

1. **Enhanced Socket Client** (`/public/js/enhanced-socket-client.js`):
   - Generates temporary userId from localStorage
   - Emits `join` event with userId on connection
   - Listens for `notify` events
   - Exposes `window.socket` for console testing

2. **Basic Socket Client** (`/public/js/socket-client.js`):
   - Same temporary userId functionality
   - Room joining and notify listening
   - Console testing support

### Backend Changes

1. **Enhanced Friends Events** (`/socket/enhanced-friends-events.js`):
   - Handles `join` event to join `user:${userId}` rooms
   - Handles `server:notify` event to send messages to target rooms
   - Room cleanup on disconnect

2. **Fallback Socket Handling** (`server.js`):
   - Basic room management for when enhanced events aren't available
   - Same join/notify functionality

## 🧪 Testing Instructions

### Method 1: Using the Test Page

1. **Open Test Page**: Navigate to `/task-4-2-test` or `/task-4-2-test.html`
2. **Open Multiple Tabs**: Open the same URL in Tab A and Tab B
3. **Set User IDs**: In each tab's console:
   ```javascript
   // Tab A
   localStorage.setItem('userId','alice'); location.reload();
   
   // Tab B  
   localStorage.setItem('userId','bob'); location.reload();
   ```
4. **Send Messages**: Use the form on the page or console commands
5. **Verify Reception**: Check the notifications area and console logs

### Method 2: Manual Console Testing

1. **Open Two Tabs**: Both pointing to any page that loads socket clients (dashboard, test page, etc.)

2. **Set User IDs**:
   ```javascript
   // Tab A console
   localStorage.setItem('userId','alice'); 
   location.reload();
   
   // Tab B console
   localStorage.setItem('userId','bob'); 
   location.reload();
   ```

3. **Send Test Message**:
   ```javascript
   // Tab A console
   socket.emit('server:notify', { to: 'user:bob', msg: 'hi bob' });
   ```

4. **Verify in Tab B**:
   - Console should log: `📧 Message received: hi bob`
   - Console should show: `🔔 Received notify event: { msg: 'hi bob' }`

### Method 3: Dashboard Testing

1. **Open Dashboard** (`/dashboard`) in two tabs
2. **Set different userIds** in each tab's localStorage
3. **Use console** to send messages between tabs
4. **Verify** real-time communication works

## 🔍 Expected Results

### Successful Test Flow

1. **Connection**: Each tab connects with its userId
   ```
   🔌 Socket connected for real-time updates
   🚀 Joined room for user: alice
   🆔 Socket exposed globally as window.socket for testing
   ```

2. **Message Sending**: Tab A sends message to Tab B
   ```
   🚀 Notify request from socket_id: user:bob -> hi bob
   ✉️ Sent notify to room user:bob: hi bob
   ```

3. **Message Reception**: Tab B receives message
   ```
   🔔 Received notify event: { msg: 'hi bob' }
   📧 Message received: hi bob
   ```

### Console Output Examples

**Tab A (Sender):**
```javascript
> socket.emit('server:notify', { to: 'user:bob', msg: 'hi bob' })
> // Should see confirmation in server logs
```

**Tab B (Receiver):**
```
🔔 Received notify event: { msg: 'hi bob' }
📧 Message received: hi bob
```

## 🛠 Debugging Tools

### Check Current Setup
```javascript
// Check current userId
console.log('Current userId:', localStorage.getItem('userId'));

// Check socket connection
console.log('Socket connected:', window.socket?.connected);
console.log('Socket ID:', window.socket?.id);

// Test basic ping
window.socket.emit('ping', { timestamp: Date.now() });
```

### Regenerate User ID
```javascript
// Generate new temporary ID
const newId = 'temp_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('userId', newId);
location.reload();
```

### Send Custom Messages
```javascript
// Send custom notification
window.socket.emit('server:notify', {
    to: 'user:TARGET_USER_ID',
    msg: 'Your custom message here'
});
```

## 🐛 Troubleshooting

### Problem: Socket not exposed globally
**Solution**: Wait for connection or check console for initialization messages

### Problem: Messages not received
**Check**:
1. Both tabs have different userIds set
2. Target userId matches exactly (case-sensitive)
3. Both sockets are connected
4. No console errors

### Problem: Console shows connection errors
**Check**:
1. Server is running (`npm start`)
2. No browser extensions blocking WebSocket
3. Refresh both tabs to reset connections

## 📊 Server Monitoring

Check server console for these messages:

```
🔌 Socket connection established: socket_id
🚀 Socket socket_id joined room: user:alice
🚀 Notify request from socket_id: user:bob -> hi bob
✉️ Sent notify to room user:bob: hi bob
🚊 Socket socket_id left room: user:alice
```

## 🚀 Integration Points

This room-based system integrates with:
- **Friend System**: Real-time friend status updates
- **Notification System**: Targeted user notifications  
- **Presence Management**: Online/offline status broadcasting
- **Chat System**: Future direct messaging features

## 📝 Technical Notes

- **Room Names**: Always prefixed with `user:` (e.g., `user:alice`)
- **User IDs**: Can be temporary (`temp_abc123`) or real user IDs
- **Message Format**: `{ to: 'user:targetId', msg: 'message content' }`
- **Event Names**: `join`, `server:notify`, `notify`
- **Cleanup**: Rooms are automatically left on socket disconnect

## ✅ Success Criteria

- [ ] Temporary userIds generated and stored in localStorage
- [ ] Sockets join rooms on connection
- [ ] Messages sent to specific user rooms
- [ ] Cross-tab communication works
- [ ] Console testing functions properly
- [ ] Server logs show room operations
- [ ] Clean disconnect and room cleanup
