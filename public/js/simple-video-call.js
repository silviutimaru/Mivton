/**
 * Simple Video Call Initiator
 * Fallback solution for video calling
 */

// Simple function to handle video calls
window.startSimpleVideoCall = function(friendId, friendName) {
    console.log('🎥 Starting simple video call to:', friendName, 'ID:', friendId);
    
    // Check if we have socket connection
    if (!window.friendChat || !window.friendChat.socket) {
        alert('Chat system not ready. Please refresh the page.');
        return;
    }
    
    const socket = window.friendChat.socket;
    const currentUser = window.currentUser;
    
    if (!currentUser) {
        alert('User not authenticated. Please refresh the page.');
        return;
    }
    
    // Create a simple call modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 20px; text-align: center; max-width: 400px;">
            <div style="width: 120px; height: 120px; margin: 0 auto 20px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; font-weight: bold;">
                ${friendName.charAt(0).toUpperCase()}
            </div>
            <h2 style="margin: 0 0 10px; color: #333;">Calling ${friendName}...</h2>
            <p style="color: #666; margin: 0 0 30px;">Waiting for response...</p>
            <button onclick="this.parentElement.parentElement.remove()" style="padding: 12px 32px; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                Cancel Call
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Send call initiation via socket
    console.log('📞 Sending call request via socket...');
    socket.emit('video_call:initiate', {
        targetUserId: friendId,
        callerName: currentUser.username || 'User'
    });
    
    // Set up basic handlers
    socket.once('video_call:unavailable', () => {
        modal.remove();
        alert(`${friendName} is not available right now.`);
    });
    
    socket.once('video_call:rejected', () => {
        modal.remove();
        alert(`${friendName} declined the call.`);
    });
    
    socket.once('video_call:accepted', async () => {
        modal.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 20px; text-align: center;">
                <h2>Call Accepted!</h2>
                <p>Setting up video connection...</p>
                <div id="videoContainer" style="margin-top: 20px;">
                    <video id="localVideo" style="width: 200px; height: 150px; background: #333;" autoplay muted></video>
                    <video id="remoteVideo" style="width: 400px; height: 300px; background: #222; margin-top: 10px;" autoplay></video>
                </div>
                <button onclick="endSimpleVideoCall()" style="margin-top: 20px; padding: 12px 32px; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
                    End Call
                </button>
            </div>
        `;
        
        // Start WebRTC connection
        await startWebRTCConnection(friendId);
    });
    
    // Auto-cancel after 30 seconds
    setTimeout(() => {
        if (document.body.contains(modal)) {
            modal.remove();
            alert('No answer from ' + friendName);
        }
    }, 30000);
};

// Simple WebRTC connection
async function startWebRTCConnection(friendId) {
    try {
        const localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        
        console.log('✅ Local media stream obtained');
        
        // Here you would set up the full WebRTC peer connection
        // For now, we'll just show the local video
        
    } catch (error) {
        console.error('Failed to get user media:', error);
        alert('Could not access camera/microphone. Please check permissions.');
    }
}

// End call function
window.endSimpleVideoCall = function() {
    // Stop all media tracks
    const localVideo = document.getElementById('localVideo');
    if (localVideo && localVideo.srcObject) {
        localVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    
    // Remove modal
    const modals = document.querySelectorAll('div[style*="z-index: 10000"]');
    modals.forEach(modal => modal.remove());
    
    console.log('📴 Call ended');
};

// Override the existing startVideoCall if needed
if (window.friendChat) {
    window.friendChat.startVideoCall = function() {
        console.log('🎬 Using simple video call fallback');
        if (this.currentFriendId && this.currentFriendUsername) {
            window.startSimpleVideoCall(this.currentFriendId, this.currentFriendUsername);
        } else {
            alert('Please select a friend to call');
        }
    };
}

console.log('✅ Simple video call system loaded');
