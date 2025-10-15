// Video Call System - Client Side Handler
class VideoCallManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.socket = window.socket;
        this.currentUserId = window.currentUserId;
        this.isCallActive = false;
        
        // ICE servers configuration
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.initialize();
    }

    initialize() {
        console.log('🎥 Initializing Video Call Manager...');
        
        // Register the user for video calls when socket connects
        if (this.socket.connected) {
            this.registerUser();
        }
        
        this.socket.on('connect', () => {
            console.log('✅ Socket connected, registering for video calls');
            this.registerUser();
        });
        
        this.setupEventListeners();
        this.setupSocketListeners();
        
        console.log('✅ Video Call Manager initialized');
    }

    registerUser() {
        if (this.currentUserId) {
            // Register for chat (which sets up the user room)
            this.socket.emit('chat:register', this.currentUserId);
            console.log(`📝 Registered user ${this.currentUserId} for video calls`);
        }
    }

    setupEventListeners() {
        // Video call button in friends list
        document.addEventListener('click', (e) => {
            if (e.target.closest('.video-call-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.video-call-btn');
                const friendId = btn.dataset.friendId;
                const friendName = btn.dataset.friendName || 'Friend';
                const friendAvatar = btn.dataset.friendAvatar || '/img/default-avatar.png';
                
                console.log(`📞 Initiating call to ${friendName} (ID: ${friendId})`);
                this.initiateCall(friendId, friendName, friendAvatar);
            }
        });

        // Call controls
        document.addEventListener('click', (e) => {
            if (e.target.closest('#accept-call')) {
                this.acceptCall();
            } else if (e.target.closest('#decline-call')) {
                this.declineCall();
            } else if (e.target.closest('#end-call')) {
                this.endCall();
            } else if (e.target.closest('#toggle-audio')) {
                this.toggleAudio();
            } else if (e.target.closest('#toggle-video')) {
                this.toggleVideo();
            }
        });
    }

    setupSocketListeners() {
        console.log('🔌 Setting up socket listeners for video calls...');

        // Incoming call
        this.socket.on('video-call:incoming', (data) => {
            console.log('📞 Incoming video call:', data);
            this.handleIncomingCall(data);
        });

        // Call accepted
        this.socket.on('video-call:accepted', async (data) => {
            console.log('✅ Call accepted:', data);
            this.hideCallingUI();
            await this.startWebRTC(true);
        });

        // Call declined
        this.socket.on('video-call:declined', (data) => {
            console.log('❌ Call declined:', data);
            this.hideCallingUI();
            this.showNotification('Call declined', 'error');
            this.cleanup();
        });

        // Call ended
        this.socket.on('video-call:ended', (data) => {
            console.log('📴 Call ended:', data);
            this.endCall(false);
            this.showNotification('Call ended', 'info');
        });

        // Call timeout
        this.socket.on('video-call:timeout', (data) => {
            console.log('⏱️ Call timeout:', data);
            this.hideCallingUI();
            this.showNotification('Call timed out', 'warning');
            this.cleanup();
        });

        // Call errors
        this.socket.on('video-call:error', (data) => {
            console.error('❌ Call error:', data);
            this.hideCallingUI();
            this.hideIncomingCallUI();
            this.showNotification(data.error || 'Call failed', 'error');
            this.cleanup();
        });

        // WebRTC signaling
        this.socket.on('video-call:offer', async (data) => {
            console.log('📥 Received offer:', data);
            await this.handleOffer(data);
        });

        this.socket.on('video-call:answer', async (data) => {
            console.log('📥 Received answer:', data);
            await this.handleAnswer(data);
        });

        this.socket.on('video-call:ice-candidate', async (data) => {
            console.log('🧊 Received ICE candidate:', data);
            await this.handleIceCandidate(data);
        });

        // Media controls
        this.socket.on('video-call:audio-toggled', (data) => {
            console.log('🔇 Remote audio toggled:', data);
            this.updateRemoteMediaState('audio', data.muted);
        });

        this.socket.on('video-call:video-toggled', (data) => {
            console.log('📹 Remote video toggled:', data);
            this.updateRemoteMediaState('video', data.videoOff);
        });

        // Disconnection during call
        this.socket.on('video-call:disconnected', (data) => {
            console.log('🔌 Remote user disconnected:', data);
            this.showNotification('User disconnected', 'error');
            this.endCall(false);
        });

        // Legacy events (backward compatibility)
        this.socket.on('friend:incoming_video_call', (data) => {
            console.log('📞 [Legacy] Incoming call:', data);
            this.handleIncomingCall({
                caller: data.from,
                timestamp: data.timestamp
            });
        });

        console.log('✅ Socket listeners setup complete');
    }

    async initiateCall(friendId, friendName, friendAvatar) {
        try {
            console.log(`🎥 Starting call to ${friendName} (${friendId})`);
            
            // Check if already in a call
            if (this.isCallActive) {
                this.showNotification('Already in a call', 'warning');
                return;
            }

            this.currentCall = {
                targetUserId: parseInt(friendId),
                targetName: friendName,
                targetAvatar: friendAvatar,
                isInitiator: true
            };

            // Show calling UI
            this.showCallingUI(friendName, friendAvatar);

            // Get user media first
            await this.getUserMedia();

            // Emit call initiation through the new event system
            this.socket.emit('video-call:initiate', {
                targetUserId: parseInt(friendId),
                callerInfo: {
                    name: window.currentUserName || 'User',
                    avatar: window.currentUserAvatar || '/img/default-avatar.png'
                }
            });

            console.log(`✅ Call initiated to ${friendName}`);
            this.isCallActive = true;

        } catch (error) {
            console.error('❌ Error initiating call:', error);
            this.showNotification('Failed to start call: ' + error.message, 'error');
            this.hideCallingUI();
            this.cleanup();
        }
    }

    handleIncomingCall(data) {
        console.log('📥 Processing incoming call:', data);
        
        // Check if already in a call
        if (this.isCallActive) {
            console.log('⚠️ Already in a call, declining new call');
            this.socket.emit('video-call:decline', {
                callId: data.callId,
                callerId: data.caller.id
            });
            return;
        }

        this.currentCall = {
            callId: data.callId,
            callerId: data.caller.id,
            callerName: data.caller.name || 'Friend',
            callerAvatar: data.caller.avatar || '/img/default-avatar.png',
            isInitiator: false
        };

        this.showIncomingCallUI(
            this.currentCall.callerName,
            this.currentCall.callerAvatar
        );

        // Play ringtone
        this.playRingtone();
    }

    async acceptCall() {
        try {
            console.log('✅ Accepting call...');
            this.hideIncomingCallUI();
            this.stopRingtone();

            // Get user media
            await this.getUserMedia();

            // Show video UI
            this.showVideoUI();

            // Send accept signal
            this.socket.emit('video-call:accept', {
                callId: this.currentCall.callId,
                callerId: this.currentCall.callerId
            });

            this.isCallActive = true;

            // Start WebRTC as receiver
            await this.startWebRTC(false);

        } catch (error) {
            console.error('❌ Error accepting call:', error);
            this.showNotification('Failed to accept call', 'error');
            this.cleanup();
        }
    }

    declineCall() {
        console.log('❌ Declining call...');
        this.stopRingtone();
        
        this.socket.emit('video-call:decline', {
            callId: this.currentCall.callId,
            callerId: this.currentCall.callerId
        });

        this.hideIncomingCallUI();
        this.cleanup();
    }

    endCall(notifyRemote = true) {
        console.log('📴 Ending call...');
        
        if (notifyRemote && this.currentCall) {
            const otherUserId = this.currentCall.isInitiator ? 
                this.currentCall.targetUserId : 
                this.currentCall.callerId;
                
            this.socket.emit('video-call:end', {
                callId: this.currentCall.callId,
                otherUserId: otherUserId
            });
        }

        this.cleanup();
        this.hideVideoUI();
        this.hideCallingUI();
        this.isCallActive = false;
    }

    async getUserMedia() {
        try {
            console.log('📹 Requesting user media...');
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: true
            });

            // Display local video
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
                console.log('✅ Local video stream set');
            }

            return this.localStream;

        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
            throw error;
        }
    }

    async startWebRTC(isInitiator) {
        console.log(`🔄 Starting WebRTC (initiator: ${isInitiator})`);
        
        // Create peer connection
        this.peerConnection = new RTCPeerConnection(this.iceServers);

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
                console.log(`✅ Added local track: ${track.kind}`);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📥 Received remote track:', event.track.kind);
            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo) {
                    remoteVideo.srcObject = this.remoteStream;
                    console.log('✅ Remote video stream set');
                }
            }
            this.remoteStream.addTrack(event.track);
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                const targetUserId = this.currentCall.isInitiator ? 
                    this.currentCall.targetUserId : 
                    this.currentCall.callerId;
                    
                this.socket.emit('video-call:ice-candidate', {
                    targetUserId: targetUserId,
                    candidate: event.candidate,
                    callId: this.currentCall.callId
                });
            }
        };

        // Create offer if initiator
        if (isInitiator) {
            await this.createOffer();
        }
    }

    async createOffer() {
        try {
            console.log('📤 Creating offer...');
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('video-call:offer', {
                targetUserId: this.currentCall.targetUserId,
                offer: offer,
                callId: this.currentCall.callId
            });
            
            console.log('✅ Offer sent');
        } catch (error) {
            console.error('❌ Error creating offer:', error);
        }
    }

    async handleOffer(data) {
        try {
            console.log('📥 Processing offer...');
            
            if (!this.peerConnection) {
                await this.startWebRTC(false);
            }
            
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('video-call:answer', {
                targetUserId: data.from,
                answer: answer,
                callId: data.callId
            });
            
            console.log('✅ Answer sent');
        } catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    }

    async handleAnswer(data) {
        try {
            console.log('📥 Processing answer...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            this.hideCallingUI();
            this.showVideoUI();
            console.log('✅ Answer processed');
        } catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    }

    async handleIceCandidate(data) {
        try {
            if (this.peerConnection && data.candidate) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                console.log('✅ ICE candidate added');
            }
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    }

    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const btn = document.getElementById('toggle-audio');
                if (btn) {
                    btn.innerHTML = audioTrack.enabled ? 
                        '<i class="fas fa-microphone"></i>' : 
                        '<i class="fas fa-microphone-slash"></i>';
                }
                
                // Notify remote peer
                const targetUserId = this.currentCall.isInitiator ? 
                    this.currentCall.targetUserId : 
                    this.currentCall.callerId;
                    
                this.socket.emit('video-call:toggle-audio', {
                    targetUserId: targetUserId,
                    muted: !audioTrack.enabled
                });
            }
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const btn = document.getElementById('toggle-video');
                if (btn) {
                    btn.innerHTML = videoTrack.enabled ? 
                        '<i class="fas fa-video"></i>' : 
                        '<i class="fas fa-video-slash"></i>';
                }
                
                // Notify remote peer
                const targetUserId = this.currentCall.isInitiator ? 
                    this.currentCall.targetUserId : 
                    this.currentCall.callerId;
                    
                this.socket.emit('video-call:toggle-video', {
                    targetUserId: targetUserId,
                    videoOff: !videoTrack.enabled
                });
            }
        }
    }

    updateRemoteMediaState(type, state) {
        // Update UI to show remote media state
        const indicator = document.getElementById(`remote-${type}-indicator`);
        if (indicator) {
            indicator.style.display = state ? 'block' : 'none';
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up video call...');
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Clear remote stream
        this.remoteStream = null;

        // Clear current call
        this.currentCall = null;

        // Clear video elements
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
    }

    showCallingUI(name, avatar) {
        const callingUI = document.getElementById('calling-ui');
        if (!callingUI) {
            const html = `
                <div id="calling-ui" class="video-call-overlay">
                    <div class="calling-container">
                        <img src="${avatar}" alt="${name}" class="calling-avatar">
                        <h3>Calling ${name}...</h3>
                        <div class="calling-actions">
                            <button class="btn-call-control btn-end" id="end-call">
                                <i class="fas fa-phone-slash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        } else {
            callingUI.style.display = 'flex';
        }
    }

    hideCallingUI() {
        const callingUI = document.getElementById('calling-ui');
        if (callingUI) {
            callingUI.style.display = 'none';
        }
    }

    showIncomingCallUI(name, avatar) {
        const incomingUI = document.getElementById('incoming-call-ui');
        if (!incomingUI) {
            const html = `
                <div id="incoming-call-ui" class="video-call-overlay">
                    <div class="incoming-call-container">
                        <img src="${avatar}" alt="${name}" class="calling-avatar">
                        <h3>${name} is calling...</h3>
                        <div class="calling-actions">
                            <button class="btn-call-control btn-accept" id="accept-call">
                                <i class="fas fa-phone"></i>
                            </button>
                            <button class="btn-call-control btn-decline" id="decline-call">
                                <i class="fas fa-phone-slash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        } else {
            incomingUI.style.display = 'flex';
        }
    }

    hideIncomingCallUI() {
        const incomingUI = document.getElementById('incoming-call-ui');
        if (incomingUI) {
            incomingUI.style.display = 'none';
        }
    }

    showVideoUI() {
        const videoUI = document.getElementById('video-call-ui');
        if (videoUI) {
            videoUI.style.display = 'flex';
        }
    }

    hideVideoUI() {
        const videoUI = document.getElementById('video-call-ui');
        if (videoUI) {
            videoUI.style.display = 'none';
        }
    }

    playRingtone() {
        // Implement ringtone
        this.ringtone = new Audio('/sounds/ringtone.mp3');
        this.ringtone.loop = true;
        this.ringtone.play().catch(e => console.log('Could not play ringtone:', e));
    }

    stopRingtone() {
        if (this.ringtone) {
            this.ringtone.pause();
            this.ringtone = null;
        }
    }

    showNotification(message, type = 'info') {
        console.log(`📢 Notification (${type}): ${message}`);
        
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.socket && window.currentUserId) {
        window.videoCallManager = new VideoCallManager();
        console.log('✅ Video Call Manager ready');
    } else {
        console.log('⏳ Waiting for socket connection...');
        // Wait for socket to be ready
        const checkSocket = setInterval(() => {
            if (window.socket && window.currentUserId) {
                clearInterval(checkSocket);
                window.videoCallManager = new VideoCallManager();
                console.log('✅ Video Call Manager ready (delayed)');
            }
        }, 500);
    }
});
