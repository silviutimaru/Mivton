// Instant Video Call - Simple Working Solution
(function() {
    console.log('🚀 Instant Video Call Loading...');

    window.InstantVideoCall = {
        localStream: null,
        peerConnection: null,
        currentCall: null,
        
        async initiateCall(friendId, friendName) {
            console.log(`📞 INSTANT CALL TO ${friendName} (${friendId})`);
            
            // Create calling UI immediately
            this.showCallingUI(friendName);
            
            // Get camera/mic permissions
            try {
                console.log('📹 Requesting camera access...');
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                }).catch(async (videoError) => {
                    // If video fails, try audio only
                    console.log('📹 Camera failed, trying audio only...');
                    return await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: true
                    });
                });
                
                console.log('✅ Got media stream');
                this.showLocalVideo();
                
                // Send call signal via socket
                if (window.socket && window.socket.connected) {
                    console.log('📤 Sending call signal...');
                    
                    // Register user first
                    window.socket.emit('chat:register', window.currentUserId || window.currentUser?.id);
                    
                    // Send using both new and legacy events
                    window.socket.emit('video-call:initiate', {
                        targetUserId: parseInt(friendId),
                        callerInfo: {
                            id: window.currentUserId || window.currentUser?.id,
                            name: window.currentUserName || window.currentUser?.username || 'User',
                            avatar: '/img/default-avatar.png'
                        }
                    });
                    
                    // Also send legacy event
                    window.socket.emit('friend:initiate_video_call', {
                        friendId: parseInt(friendId)
                    });
                    
                    console.log('✅ Call signals sent');
                    
                    // Listen for responses
                    this.setupListeners();
                } else {
                    console.error('❌ Socket not connected');
                    alert('Connection error. Please refresh and try again.');
                }
                
            } catch (error) {
                console.error('❌ Media access error:', error);
                alert('Camera/microphone access denied. Please check permissions.');
                this.endCall();
            }
        },
        
        showCallingUI(friendName) {
            // Remove any existing UI
            const existing = document.getElementById('instant-call-ui');
            if (existing) existing.remove();
            
            const ui = document.createElement('div');
            ui.id = 'instant-call-ui';
            ui.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 20000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
            `;
            
            ui.innerHTML = `
                <div style="text-align: center;">
                    <div style="width: 150px; height: 150px; margin: 0 auto 30px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 60px; font-weight: bold; animation: pulse 2s infinite;">
                        ${friendName.charAt(0).toUpperCase()}
                    </div>
                    <h2 style="margin: 0 0 10px; font-size: 32px;">Calling ${friendName}...</h2>
                    <p style="font-size: 18px; opacity: 0.8; margin: 0 0 40px;">Waiting for response...</p>
                    
                    <video id="instant-local-video" autoplay muted playsinline style="width: 300px; height: 225px; background: #333; border-radius: 10px; margin: 0 0 30px;"></video>
                    
                    <button onclick="InstantVideoCall.endCall()" style="padding: 15px 40px; background: #ef4444; color: white; border: none; border-radius: 10px; font-size: 18px; cursor: pointer; transition: background 0.3s;">
                        End Call
                    </button>
                </div>
                
                <style>
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
                        70% { box-shadow: 0 0 0 30px rgba(102, 126, 234, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
                    }
                </style>
            `;
            
            document.body.appendChild(ui);
        },
        
        showLocalVideo() {
            const video = document.getElementById('instant-local-video');
            if (video && this.localStream) {
                video.srcObject = this.localStream;
                console.log('✅ Local video displaying');
            }
        },
        
        setupListeners() {
            if (!window.socket) return;
            
            // Listen for call accepted
            window.socket.on('video-call:accepted', (data) => {
                console.log('✅ Call accepted!', data);
                this.showConnectedUI();
            });
            
            // Listen for call declined
            window.socket.on('video-call:declined', (data) => {
                console.log('❌ Call declined', data);
                alert('Call was declined');
                this.endCall();
            });
            
            // Listen for call ended
            window.socket.on('video-call:ended', (data) => {
                console.log('📴 Call ended by other party', data);
                this.endCall();
            });
            
            // Listen for incoming calls
            window.socket.on('video-call:incoming', (data) => {
                console.log('📞 INCOMING CALL!', data);
                this.showIncomingCallUI(data);
            });
            
            // Legacy event support
            window.socket.on('friend:incoming_video_call', (data) => {
                console.log('📞 [Legacy] INCOMING CALL!', data);
                this.showIncomingCallUI({
                    caller: data.from,
                    callId: 'legacy_' + Date.now()
                });
            });
        },
        
        showIncomingCallUI(data) {
            const existing = document.getElementById('instant-incoming-ui');
            if (existing) existing.remove();
            
            const ui = document.createElement('div');
            ui.id = 'instant-incoming-ui';
            ui.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.95);
                z-index: 20001;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            `;
            
            const callerName = data.caller?.name || 'Friend';
            
            ui.innerHTML = `
                <div style="text-align: center; animation: slideIn 0.3s ease;">
                    <div style="width: 150px; height: 150px; margin: 0 auto 30px; background: linear-gradient(135deg, #10b981, #3b82f6); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 60px; font-weight: bold; animation: ring 1s ease-in-out infinite;">
                        ${callerName.charAt(0).toUpperCase()}
                    </div>
                    <h2 style="margin: 0 0 10px; font-size: 32px;">${callerName} is calling...</h2>
                    <p style="font-size: 18px; opacity: 0.8; margin: 0 0 40px;">Video Call</p>
                    
                    <div style="display: flex; gap: 20px; justify-content: center;">
                        <button onclick="InstantVideoCall.acceptCall('${data.callId}', ${data.caller?.id})" style="padding: 15px 40px; background: #10b981; color: white; border: none; border-radius: 10px; font-size: 18px; cursor: pointer;">
                            Accept
                        </button>
                        <button onclick="InstantVideoCall.declineCall('${data.callId}', ${data.caller?.id})" style="padding: 15px 40px; background: #ef4444; color: white; border: none; border-radius: 10px; font-size: 18px; cursor: pointer;">
                            Decline
                        </button>
                    </div>
                </div>
                
                <audio autoplay loop>
                    <source src="data:audio/wav;base64,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" type="audio/wav">
                </audio>
                
                <style>
                    @keyframes ring {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }
                    @keyframes slideIn {
                        from { opacity: 0; transform: scale(0.8); }
                        to { opacity: 1; transform: scale(1); }
                    }
                </style>
            `;
            
            document.body.appendChild(ui);
            
            // Play ringtone
            this.playRingtone();
        },
        
        async acceptCall(callId, callerId) {
            console.log('✅ Accepting call', callId, callerId);
            
            // Remove incoming UI
            const ui = document.getElementById('instant-incoming-ui');
            if (ui) ui.remove();
            
            // Stop ringtone
            this.stopRingtone();
            
            // Get media
            try {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                }).catch(async () => {
                    return await navigator.mediaDevices.getUserMedia({
                        video: false,
                        audio: true
                    });
                });
                
                // Send accept signal
                if (window.socket) {
                    window.socket.emit('video-call:accept', {
                        callId: callId,
                        callerId: callerId
                    });
                }
                
                this.showConnectedUI();
                
            } catch (error) {
                console.error('❌ Error accepting call:', error);
                alert('Failed to accept call');
                this.endCall();
            }
        },
        
        declineCall(callId, callerId) {
            console.log('❌ Declining call', callId, callerId);
            
            // Remove incoming UI
            const ui = document.getElementById('instant-incoming-ui');
            if (ui) ui.remove();
            
            // Stop ringtone
            this.stopRingtone();
            
            // Send decline signal
            if (window.socket) {
                window.socket.emit('video-call:decline', {
                    callId: callId,
                    callerId: callerId
                });
            }
        },
        
        showConnectedUI() {
            const ui = document.getElementById('instant-call-ui');
            if (ui) {
                ui.innerHTML = `
                    <div style="text-align: center;">
                        <h2 style="margin: 0 0 30px; font-size: 32px; color: #10b981;">Connected!</h2>
                        
                        <div style="display: flex; gap: 20px; margin: 0 0 30px;">
                            <video id="instant-local-video" autoplay muted playsinline style="width: 400px; height: 300px; background: #333; border-radius: 10px;"></video>
                            <video id="instant-remote-video" autoplay playsinline style="width: 400px; height: 300px; background: #222; border-radius: 10px;"></video>
                        </div>
                        
                        <button onclick="InstantVideoCall.endCall()" style="padding: 15px 40px; background: #ef4444; color: white; border: none; border-radius: 10px; font-size: 18px; cursor: pointer;">
                            End Call
                        </button>
                    </div>
                `;
                
                // Re-attach local stream
                if (this.localStream) {
                    const localVideo = document.getElementById('instant-local-video');
                    if (localVideo) {
                        localVideo.srcObject = this.localStream;
                    }
                }
            }
        },
        
        endCall() {
            console.log('📴 Ending call');
            
            // Stop media tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            // Remove UI
            const ui = document.getElementById('instant-call-ui');
            if (ui) ui.remove();
            
            const incomingUI = document.getElementById('instant-incoming-ui');
            if (incomingUI) incomingUI.remove();
            
            // Stop ringtone
            this.stopRingtone();
        },
        
        playRingtone() {
            // Ringtone is handled by the audio element in the UI
        },
        
        stopRingtone() {
            const audio = document.querySelector('#instant-incoming-ui audio');
            if (audio) {
                audio.pause();
            }
        }
    };
    
    console.log('✅ Instant Video Call Ready!');
    
    // Auto-setup listeners on load
    if (window.socket) {
        InstantVideoCall.setupListeners();
    }
    
})();
