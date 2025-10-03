#!/bin/bash

# Create backup and remove all chat functionality from server.js
echo "🧹 Removing all chat functionality from server.js..."

# Create backup
cp server.js server.js.backup

# Use sed to remove chat sections
echo "📝 Editing server.js to remove chat endpoints..."

# This will remove lines from the chat section start to the ERROR HANDLING section
sed -i '/All chat endpoints removed/,/===== ERROR HANDLING =====/c\
\
// ===== ERROR HANDLING =====' server.js

echo "✅ Chat functionality removed from server.js"