#!/bin/bash

echo "🚀 Deploying Video Call Quick Fix..."
echo "===================================="

git add -A
git commit -m "fix: Add simple video call fallback solution

- Created simple-video-call.js as immediate fallback
- Dynamically loads video call scripts if missing
- Shows calling modal immediately
- Basic WebRTC setup for video/audio
- Works without complex dependencies"

railway up

echo ""
echo "✅ Quick fix deployed!"
echo ""
echo "IMPORTANT: After deployment:"
echo "1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Open browser console (F12)"
echo "3. Open a chat conversation"
echo "4. Click the video call button or test button"
echo ""
echo "You should now see a 'Calling...' modal appear immediately!"
