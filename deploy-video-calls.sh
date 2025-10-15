#!/bin/bash

echo "🚀 Deploying Video Call Feature to Railway..."
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in the Mivton project directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies if needed...${NC}"
npm install

echo -e "${YELLOW}📝 Committing video call feature...${NC}"
git add -A
git commit -m "feat: Add video calling functionality for friend-to-friend calls

- Implemented WebRTC-based video calling system
- Added VideoCallManager class for managing calls
- Created beautiful video call UI with incoming/outgoing modals
- Integrated with existing friend chat system
- Added server-side socket handlers for signaling
- Implemented call controls (mute, video toggle, screen share)
- Added responsive design for mobile devices
- Features: Video/Audio calls, screen sharing, call timer
- Works seamlessly with existing authentication system"

echo -e "${GREEN}✅ Changes committed${NC}"

echo -e "${YELLOW}🚂 Pushing to Railway...${NC}"
railway up

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Video Call Feature is now live! Users can:"
echo "  • Click the video icon in chat to start a call"
echo "  • Receive incoming call notifications"
echo "  • Control video/audio during calls"
echo "  • Share their screen"
echo ""
echo "The feature will be available immediately on your Railway app."
