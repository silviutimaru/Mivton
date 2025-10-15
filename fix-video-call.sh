#!/bin/bash

echo "🔧 Deploying Video Call Fixes..."
echo "================================"

# Quick deployment for fixes
git add -A
git commit -m "fix: Video call button not responding

- Added startVideoCall() method to FriendChat class
- Fixed event listener attachment for video call button
- Added inline onclick handler as backup
- Improved video call manager initialization
- Added test button for debugging
- Better error handling and logging"

railway up

echo "✅ Fixes deployed! Please refresh your browser and try again."
echo ""
echo "To test:"
echo "1. Refresh the page (Ctrl+F5 or Cmd+Shift+R)"
echo "2. Open a chat conversation"
echo "3. You should see a green 'Test Video Call' button in the bottom-left"
echo "4. Click either the video icon in chat OR the test button"
echo "5. Check browser console for any errors (F12)"
