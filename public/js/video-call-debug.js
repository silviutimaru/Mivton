// Video Call Debug Script - Add this to your dashboard to debug the issue
(function() {
    console.log('🔍 VIDEO CALL DEBUG SCRIPT LOADED');
    
    // Check socket status
    if (window.socket) {
        console.log('✅ Socket exists:', {
            connected: window.socket.connected,
            id: window.socket.id,
            listeners: window.socket._callbacks ? Object.keys(window.socket._callbacks) : []
        });
        
        // List all event listeners
        if (window.socket._callbacks) {
            console.log('📋 Registered socket events:');
            Object.keys(window.socket._callbacks).forEach(event => {
                console.log(`  - ${event}: ${window.socket._callbacks[event].length} listener(s)`);
            });
        }
        
        // Monitor all incoming socket events
        const originalEmit = window.socket.emit;
        window.socket.emit = function(event, ...args) {
            console.log(`📤 EMIT: ${event}`, args);
            return originalEmit.apply(this, [event, ...args]);
        };
        
        // Monitor specific video call events
        const videoEvents = [
            'video-call:incoming',
            'video-call:ringing',
            'video-call:accepted',
            'video-call:declined',
            'video-call:ended',
            'video-call:error',
            'video-call:timeout',
            'friend:incoming_video_call'
        ];
        
        videoEvents.forEach(event => {
            window.socket.on(event, (data) => {
                console.log(`📥 RECEIVED ${event}:`, data);
                
                // Show visual alert for incoming calls
                if (event === 'video-call:incoming' || event === 'friend:incoming_video_call') {
                    alert(`INCOMING CALL! Event: ${event}, Data: ${JSON.stringify(data)}`);
                }
            });
        });
        
        // Check room membership
        window.socket.emit('chat:register', window.currentUserId);
        console.log(`📝 Re-registered user ${window.currentUserId} in room user_${window.currentUserId}`);
        
    } else {
        console.error('❌ Socket not found!');
    }
    
    // Check if video call manager exists
    if (window.videoCallManager || window.videoCallSystem) {
        console.log('✅ Video call manager exists');
    } else {
        console.error('❌ Video call manager not found!');
    }
    
    // Test function to simulate incoming call
    window.testIncomingCall = function() {
        const testData = {
            callId: 'test_call_' + Date.now(),
            caller: {
                id: 999,
                name: 'Test Caller',
                avatar: '/img/default-avatar.png'
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('🧪 Simulating incoming call with data:', testData);
        
        if (window.socket) {
            // Trigger the event locally
            window.socket.emit('video-call:incoming', testData);
            
            // Also trigger on the manager directly
            if (window.videoCallSystem) {
                window.videoCallSystem.handleIncomingCall(testData);
            }
        }
    };
    
    console.log('💡 TIP: Run testIncomingCall() to simulate an incoming call');
    
    // Add debug info to the page
    const debugInfo = document.createElement('div');
    debugInfo.id = 'video-call-debug';
    debugInfo.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0,0,0,0.8);
        color: #0f0;
        padding: 10px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-width: 300px;
    `;
    debugInfo.innerHTML = `
        <div>🔍 VIDEO CALL DEBUG</div>
        <div>Socket: ${window.socket ? 'Connected' : 'Not Connected'}</div>
        <div>User ID: ${window.currentUserId || 'Unknown'}</div>
        <div>Room: user_${window.currentUserId || '?'}</div>
        <button onclick="testIncomingCall()" style="margin-top:5px">Test Incoming Call</button>
    `;
    document.body.appendChild(debugInfo);
    
})();
