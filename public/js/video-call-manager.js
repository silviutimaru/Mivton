/**
 * 📹 VIDEO CALL MANAGER
 * Handles peer-to-peer video calling between friends
 * Features: Video/Audio calls, screen sharing, call controls
 */

class VideoCallManager {
    constructor(socket, currentUserId) {
        this.socket = socket;
        this.currentUserId = currentUserId;
        this.currentCall = null;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.callStartTime = null;
        this.callTimer = null;
        
        // Call state
        this.isInCall = false;
        this.isCalling = false;
        this.isReceivingCall = false;
        this.currentFriendId = null;
        this.currentFriendUsername = null;
        
        // Media state
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.isScreenSharing = false;
        this.originalVideoStream = null;
        
        // ICE servers configuration
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.setupSocketListeners();
        this.createCallUI();
        this.setupRingtone();
    }
    
    setupSocketListeners() {
        // Incoming call
        this.socket.on('video-call:incoming', (data) => {
            console.log('📞 Incoming video call:', data);
            this.handleIncomingCall(data);
        });
        
        // Call accepted
        this.socket.on('video-call:accepted', (data) => {
            console.log('✅ Call accepted:', data);
            this.handleCallAccepted(data);
        });
        
        // Call rejected
        this.socket.on('video-call:declined', (data) => {
            console.log('❌ Call rejected:', data);
            this.handleCallRejected(data);
        });
        
        // Call ended
        this.socket.on('video-call:ended', (data) => {
            console.log('📴 Call ended:', data);
            this.handleCallEnded(data);
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
            console.log('🧊 Received ICE candidate');
            await this.handleIceCandidate(data);
        });
        
        // User unavailable
        this.socket.on('video-call:error', (data) => {
            console.log('📵 User unavailable:', data);
            this.showNotification(data.error || 'User is not available', 'error');
            this.endCall();
        });
    }
    
    setupRingtone() {
        // Create audio elements for ringtones
        this.outgoingRingtone = new Audio('/sounds/outgoing-call.mp3');
        this.incomingRingtone = new Audio('/sounds/incoming-call.mp3');
        
        // Set loop for ringtones
        this.outgoingRingtone.loop = true;
        this.incomingRingtone.loop = true;
        
        // Set volume
        this.outgoingRingtone.volume = 0.3;
        this.incomingRingtone.volume = 0.5;
        
        // Fallback to data URI if files don't exist
        this.outgoingRingtone.onerror = () => {
            // Simple beep sound as data URI
            this.outgoingRingtone.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAAAAAAA';
        };
        
        this.incomingRingtone.onerror = () => {
            // Simple ring sound as data URI
            this.incomingRingtone.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAAAAAAA';
        };
    }
    
    createCallUI() {
        // Remove existing UI if present
        const existingUI = document.getElementById('videoCallUI');
        if (existingUI) {
            existingUI.remove();
        }
        
        // Create video call UI overlay
        const callUI = document.createElement('div');
        callUI.id = 'videoCallUI';
        callUI.className = 'video-call-ui hidden';
        callUI.innerHTML = `
            <!-- Incoming Call Modal -->
            <div id="incomingCallModal" class="call-modal hidden">
                <div class="call-modal-content">
                    <div class="caller-avatar">
                        <span id="callerInitial">?</span>
                    </div>
                    <h2 id="callerName">Someone</h2>
                    <p>Incoming video call...</p>
                    <div class="call-actions">
                        <button class="call-btn reject-btn" onclick="videoCallManager.rejectCall()">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.57.9-.7.36-1.37.78-2 1.26-.21.16-.48.26-.76.26-.56 0-1.02-.46-1.02-1.03l-.02-3.21c0-.37.2-.7.52-.88C5.47 8.78 8.64 8 12 8s6.53.78 8.45 2.12c.32.18.52.51.52.88l-.02 3.21c0 .57-.46 1.03-1.02 1.03-.28 0-.55-.1-.76-.26-.63-.48-1.3-.9-2-1.26-.34-.16-.57-.51-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                            </svg>
                            Decline
                        </button>
                        <button class="call-btn accept-btn" onclick="videoCallManager.acceptCall()">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                            </svg>
                            Accept
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Outgoing Call Modal -->
            <div id="outgoingCallModal" class="call-modal hidden">
                <div class="call-modal-content">
                    <div class="caller-avatar">
                        <span id="calleeInitial">?</span>
                    </div>
                    <h2 id="calleeName">Someone</h2>
                    <p>Calling...</p>
                    <div class="call-actions">
                        <button class="call-btn reject-btn" onclick="videoCallManager.cancelCall()">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.57.9-.7.36-1.37.78-2 1.26-.21.16-.48.26-.76.26-.56 0-1.02-.46-1.02-1.03l-.02-3.21c0-.37.2-.7.52-.88C5.47 8.78 8.64 8 12 8s6.53.78 8.45 2.12c.32.18.52.51.52.88l-.02 3.21c0 .57-.46 1.03-1.02 1.03-.28 0-.55-.1-.76-.26-.63-.48-1.3-.9-2-1.26-.34-.16-.57-.51-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                            </svg>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Active Video Call -->
            <div id="activeCallContainer" class="video-call-container hidden">
                <!-- Remote Video (Full Screen) -->
                <video id="remoteVideo" class="remote-video" autoplay playsinline></video>
                
                <!-- Local Video (Picture-in-Picture) -->
                <div class="local-video-wrapper">
                    <video id="localVideo" class="local-video" autoplay playsinline muted></video>
                </div>
                
                <!-- Call Info Overlay -->
                <div class="call-info-overlay">
                    <div class="call-info">
                        <span id="callPartnerName">Partner</span>
                        <span id="callDuration">00:00</span>
                    </div>
                </div>
                
                <!-- Call Controls -->
                <div class="call-controls">
                    <button class="control-btn" id="toggleVideoBtn" onclick="videoCallManager.toggleVideo()" title="Toggle Video">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                        </svg>
                    </button>
                    
                    <button class="control-btn" id="toggleAudioBtn" onclick="videoCallManager.toggleAudio()" title="Toggle Audio">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                        </svg>
                    </button>
                    
                    <button class="control-btn" id="shareScreenBtn" onclick="videoCallManager.toggleScreenShare()" title="Share Screen">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.89-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zm-7-3.53v-2.19c-2.78 0-4.61.85-6 2.72.56-2.67 2.11-5.33 6-5.87V7l4 3.73-4 3.74z"/>
                        </svg>
                    </button>
                    
                    <button class="control-btn end-call-btn" onclick="videoCallManager.endCall()" title="End Call">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.57.9-.7.36-1.37.78-2 1.26-.21.16-.48.26-.76.26-.56 0-1.02-.46-1.02-1.03l-.02-3.21c0-.37.2-.7.52-.88C5.47 8.78 8.64 8 12 8s6.53.78 8.45 2.12c.32.18.52.51.52.88l-.02 3.21c0 .57-.46 1.03-1.02 1.03-.28 0-.55-.1-.76-.26-.63-.48-1.3-.9-2-1.26-.34-.16-.57-.51-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(callUI);
        this.addCallStyles();
    }
    
    addCallStyles() {
        // Check if styles already exist
        if (document.getElementById('videoCallStyles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'videoCallStyles';
        styles.innerHTML = `
            .video-call-ui {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
            }
            
            .video-call-ui.hidden {
                display: none;
            }
            
            /* Call Modals */
            .call-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            }
            
            .call-modal.hidden {
                display: none;
            }
            
            .call-modal-content {
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 400px;
            }
            
            .caller-avatar {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                font-size: 48px;
                color: white;
                font-weight: bold;
            }
            
            .call-modal h2 {
                margin: 0 0 10px;
                font-size: 28px;
                color: #333;
            }
            
            .call-modal p {
                margin: 0 0 30px;
                color: #666;
                font-size: 18px;
            }
            
            .call-actions {
                display: flex;
                gap: 20px;
                justify-content: center;
            }
            
            .call-btn {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s;
            }
            
            .call-btn:hover {
                transform: scale(1.1);
            }
            
            .call-btn svg {
                width: 32px;
                height: 32px;
            }
            
            .reject-btn {
                background: #ef4444;
                color: white;
            }
            
            .accept-btn {
                background: #10b981;
                color: white;
            }
            
            /* Active Video Call */
            .video-call-container {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: #000;
            }
            
            .video-call-container.hidden {
                display: none;
            }
            
            .remote-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .local-video-wrapper {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 200px;
                height: 150px;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                background: #333;
            }
            
            .local-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
                transform: scaleX(-1); /* Mirror effect */
            }
            
            /* Call Info Overlay */
            .call-info-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                padding: 20px;
                background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
            }
            
            .call-info {
                text-align: center;
                color: white;
            }
            
            .call-info span {
                display: block;
            }
            
            #callPartnerName {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            #callDuration {
                font-size: 16px;
                opacity: 0.9;
            }
            
            /* Call Controls */
            .call-controls {
                position: absolute;
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 20px;
                padding: 20px;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 60px;
                backdrop-filter: blur(10px);
            }
            
            .control-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                border: none;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s;
            }
            
            .control-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }
            
            .control-btn svg {
                width: 28px;
                height: 28px;
            }
            
            .control-btn.active {
                background: #3b82f6;
            }
            
            .control-btn.disabled {
                background: #6b7280;
            }
            
            .end-call-btn {
                background: #ef4444;
            }
            
            .end-call-btn:hover {
                background: #dc2626;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .local-video-wrapper {
                    width: 120px;
                    height: 90px;
                    top: 10px;
                    right: 10px;
                }
                
                .call-controls {
                    bottom: 20px;
                    padding: 15px;
                }
                
                .control-btn {
                    width: 50px;
                    height: 50px;
                }
                
                .control-btn svg {
                    width: 24px;
                    height: 24px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setCurrentFriend(friendId, friendUsername) {
        this.currentFriendId = friendId;
        this.currentFriendUsername = friendUsername;
        console.log(`📹 Video call manager set for friend: ${friendUsername} (ID: ${friendId})`);
    }
    
    async initiateCall() {
        if (!this.currentFriendId) {
            this.showNotification('Please select a friend to call', 'error');
            return;
        }
        
        if (this.isInCall || this.isCalling) {
            this.showNotification('Already in a call', 'warning');
            return;
        }
        
        console.log(`📞 Initiating call to ${this.currentFriendUsername}`);
        
        this.isCalling = true;
        this.currentCall = {
            friendId: this.currentFriendId,
            friendUsername: this.currentFriendUsername,
            isInitiator: true
        };
        
        // Show outgoing call UI
        this.showOutgoingCallModal();
        
        // Play outgoing ringtone
        this.playOutgoingRingtone();
        
        // Send call request via socket
        this.socket.emit('video-call:initiate', {
            targetUserId: this.currentFriendId,
            callerInfo: {
                id: this.currentUserId,
                name: window.currentUser?.username || 'User',
                avatar: window.currentUser?.profile_picture_url || '/img/default-avatar.png'
            }
        });
        
        // Set timeout for no answer (30 seconds)
        this.callTimeout = setTimeout(() => {
            if (this.isCalling) {
                this.showNotification('No answer', 'info');
                this.cancelCall();
            }
        }, 30000);
    }
    
    handleIncomingCall(data) {
        if (this.isInCall) {
            // Send busy signal
            this.socket.emit('video-call:decline', {
                callId: data.callId,
                callerId: data.caller?.id || data.callerId
            });
            return;
        }
        
        this.isReceivingCall = true;
        this.currentCall = {
            callId: data.callId,
            friendId: data.caller?.id || data.callerId,
            friendUsername: data.caller?.name || data.callerName || 'Friend',
            isInitiator: false
        };
        
        // Show incoming call UI
        this.showIncomingCallModal(this.currentCall.friendUsername);
        
        // Play incoming ringtone
        this.playIncomingRingtone();
    }
    
    async acceptCall() {
        console.log('✅ Accepting call');
        
        this.isReceivingCall = false;
        this.isInCall = true;
        
        // Stop ringtone
        this.stopRingtones();
        
        // Hide modal
        this.hideCallModals();
        
        // Start video call
        await this.startVideoCall();
        
        // Send acceptance
        this.socket.emit('video-call:accept', {
            callId: this.currentCall.callId,
            callerId: this.currentCall.friendId
        });
    }
    
    rejectCall() {
        console.log('❌ Rejecting call');
        
        this.isReceivingCall = false;
        
        // Stop ringtone
        this.stopRingtones();
        
        // Hide modal
        this.hideCallModals();
        
        // Send rejection
        this.socket.emit('video-call:decline', {
            callId: this.currentCall.callId,
            callerId: this.currentCall.friendId
        });
        
        // Clean up
        this.currentCall = null;
    }
    
    cancelCall() {
        console.log('🚫 Cancelling call');
        
        this.isCalling = false;
        
        // Clear timeout
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }
        
        // Stop ringtone
        this.stopRingtones();
        
        // Hide modal
        this.hideCallModals();
        
        // Send cancellation (end call signal)
        this.socket.emit('video-call:end', {
            callId: this.currentCall.callId,
            otherUserId: this.currentCall.friendId
        });
        
        // Clean up
        this.currentCall = null;
    }
    
    async handleCallAccepted(data) {
        console.log('✅ Call accepted by peer');
        
        this.isCalling = false;
        this.isInCall = true;
        
        // Clear timeout
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }
        
        // Stop ringtone
        this.stopRingtones();
        
        // Hide modal
        this.hideCallModals();
        
        // Start video call
        await this.startVideoCall();
        
        // Create offer if we're the initiator
        if (this.currentCall.isInitiator) {
            await this.createOffer();
        }
    }
    
    handleCallRejected(data) {
        this.showNotification('Call rejected', 'info');
        this.cleanup();
    }
    
    handleCallEnded(data) {
        this.showNotification('Call ended', 'info');
        this.endCall();
    }
    
    async startVideoCall() {
        try {
            console.log('📹 Starting video call');
            
            // Show video call container
            this.showVideoCallContainer();
            
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // Display local video
            const localVideo = document.getElementById('localVideo');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
            
            // Create peer connection
            this.createPeerConnection();
            
            // Add local stream tracks to peer connection
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Start call timer
            this.startCallTimer();
            
        } catch (error) {
            console.error('❌ Error starting video:', error);
            this.showNotification('Failed to access camera/microphone', 'error');
            this.endCall();
        }
    }
    
    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.iceServers);
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('video-call:ice-candidate', {
                    targetUserId: this.currentCall.friendId,
                    candidate: event.candidate,
                    callId: this.currentCall.callId
                });
            }
        };
        
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📥 Received remote stream');
            
            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
                const remoteVideo = document.getElementById('remoteVideo');
                if (remoteVideo) {
                    remoteVideo.srcObject = this.remoteStream;
                }
            }
            
            this.remoteStream.addTrack(event.track);
        };
        
        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔄 Connection state:', this.peerConnection.connectionState);
            
            switch (this.peerConnection.connectionState) {
                case 'connected':
                    console.log('✅ Peer connection established');
                    break;
                case 'failed':
                    this.showNotification('Connection failed', 'error');
                    this.endCall();
                    break;
            }
        };
    }
    
    async createOffer() {
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('video-call:offer', {
                targetUserId: this.currentCall.friendId,
                offer: offer,
                callId: this.currentCall.callId
            });
            
        } catch (error) {
            console.error('❌ Error creating offer:', error);
        }
    }
    
    async handleOffer(data) {
        try {
            if (!this.peerConnection) {
                console.error('❌ Peer connection not initialized');
                return;
            }
            
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('video-call:answer', {
                targetUserId: this.currentCall.friendId,
                answer: answer,
                callId: this.currentCall.callId
            });
            
        } catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    }
    
    async handleAnswer(data) {
        try {
            if (!this.peerConnection) {
                console.error('❌ Peer connection not initialized');
                return;
            }
            
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            
        } catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    }
    
    async handleIceCandidate(data) {
        try {
            if (!this.peerConnection) {
                console.error('❌ Peer connection not initialized');
                return;
            }
            
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }
    
    toggleVideo() {
        if (!this.localStream) return;
        
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            this.isVideoEnabled = !this.isVideoEnabled;
            videoTrack.enabled = this.isVideoEnabled;
            
            const btn = document.getElementById('toggleVideoBtn');
            if (btn) {
                btn.classList.toggle('disabled', !this.isVideoEnabled);
            }
        }
    }
    
    toggleAudio() {
        if (!this.localStream) return;
        
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            this.isAudioEnabled = !this.isAudioEnabled;
            audioTrack.enabled = this.isAudioEnabled;
            
            const btn = document.getElementById('toggleAudioBtn');
            if (btn) {
                btn.classList.toggle('disabled', !this.isAudioEnabled);
            }
        }
    }
    
    async toggleScreenShare() {
        if (!this.isScreenSharing) {
            try {
                // Get screen share stream
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
                
                // Save original video stream
                this.originalVideoStream = this.localStream.getVideoTracks()[0];
                
                // Replace video track with screen share
                const screenTrack = screenStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(
                    s => s.track && s.track.kind === 'video'
                );
                
                if (sender) {
                    await sender.replaceTrack(screenTrack);
                }
                
                // Update local video
                const localVideo = document.getElementById('localVideo');
                if (localVideo) {
                    localVideo.srcObject = screenStream;
                }
                
                this.isScreenSharing = true;
                
                // Update button
                const btn = document.getElementById('shareScreenBtn');
                if (btn) {
                    btn.classList.add('active');
                }
                
                // Listen for screen share end
                screenTrack.onended = () => {
                    this.stopScreenShare();
                };
                
            } catch (error) {
                console.error('❌ Error sharing screen:', error);
                this.showNotification('Failed to share screen', 'error');
            }
        } else {
            this.stopScreenShare();
        }
    }
    
    async stopScreenShare() {
        if (!this.isScreenSharing) return;
        
        // Replace screen share with original video
        const sender = this.peerConnection.getSenders().find(
            s => s.track && s.track.kind === 'video'
        );
        
        if (sender && this.originalVideoStream) {
            await sender.replaceTrack(this.originalVideoStream);
        }
        
        // Update local video
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = this.localStream;
        }
        
        this.isScreenSharing = false;
        
        // Update button
        const btn = document.getElementById('shareScreenBtn');
        if (btn) {
            btn.classList.remove('active');
        }
    }
    
    endCall() {
        console.log('📴 Ending call');
        
        // Send end signal
        if (this.currentCall && this.isInCall) {
            this.socket.emit('video-call:end', {
                callId: this.currentCall.callId,
                otherUserId: this.currentCall.friendId
            });
        }
        
        this.cleanup();
    }
    
    cleanup() {
        // Stop all media tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.remoteStream) {
            this.remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStream = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Clear timers
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }
        
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        
        // Reset state
        this.isInCall = false;
        this.isCalling = false;
        this.isReceivingCall = false;
        this.currentCall = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.isScreenSharing = false;
        this.originalVideoStream = null;
        
        // Stop ringtones
        this.stopRingtones();
        
        // Hide all UI
        this.hideCallModals();
        this.hideVideoCallContainer();
    }
    
    startCallTimer() {
        this.callStartTime = Date.now();
        
        this.callTimer = setInterval(() => {
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            
            const durationText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const durationEl = document.getElementById('callDuration');
            if (durationEl) {
                durationEl.textContent = durationText;
            }
        }, 1000);
    }
    
    // UI Helper Methods
    showIncomingCallModal(callerName) {
        const modal = document.getElementById('incomingCallModal');
        const nameEl = document.getElementById('callerName');
        const initialEl = document.getElementById('callerInitial');
        
        if (modal) {
            if (nameEl) nameEl.textContent = callerName;
            if (initialEl) initialEl.textContent = callerName.charAt(0).toUpperCase();
            modal.classList.remove('hidden');
        }
        
        const container = document.getElementById('videoCallUI');
        if (container) {
            container.classList.remove('hidden');
        }
    }
    
    showOutgoingCallModal() {
        const modal = document.getElementById('outgoingCallModal');
        const nameEl = document.getElementById('calleeName');
        const initialEl = document.getElementById('calleeInitial');
        
        if (modal) {
            if (nameEl) nameEl.textContent = this.currentFriendUsername;
            if (initialEl) initialEl.textContent = this.currentFriendUsername.charAt(0).toUpperCase();
            modal.classList.remove('hidden');
        }
        
        const container = document.getElementById('videoCallUI');
        if (container) {
            container.classList.remove('hidden');
        }
    }
    
    showVideoCallContainer() {
        const container = document.getElementById('activeCallContainer');
        const nameEl = document.getElementById('callPartnerName');
        
        if (container) {
            container.classList.remove('hidden');
        }
        
        if (nameEl) {
            nameEl.textContent = this.currentCall.friendUsername;
        }
        
        const uiContainer = document.getElementById('videoCallUI');
        if (uiContainer) {
            uiContainer.classList.remove('hidden');
        }
    }
    
    hideCallModals() {
        const incomingModal = document.getElementById('incomingCallModal');
        const outgoingModal = document.getElementById('outgoingCallModal');
        
        if (incomingModal) incomingModal.classList.add('hidden');
        if (outgoingModal) outgoingModal.classList.add('hidden');
    }
    
    hideVideoCallContainer() {
        const container = document.getElementById('activeCallContainer');
        if (container) {
            container.classList.add('hidden');
        }
        
        const uiContainer = document.getElementById('videoCallUI');
        if (uiContainer) {
            uiContainer.classList.add('hidden');
        }
    }
    
    playIncomingRingtone() {
        try {
            this.incomingRingtone.play().catch(e => {
                console.log('Could not play ringtone:', e);
            });
        } catch (error) {
            console.log('Ringtone error:', error);
        }
    }
    
    playOutgoingRingtone() {
        try {
            this.outgoingRingtone.play().catch(e => {
                console.log('Could not play ringtone:', e);
            });
        } catch (error) {
            console.log('Ringtone error:', error);
        }
    }
    
    stopRingtones() {
        try {
            this.incomingRingtone.pause();
            this.incomingRingtone.currentTime = 0;
            
            this.outgoingRingtone.pause();
            this.outgoingRingtone.currentTime = 0;
        } catch (error) {
            console.log('Stop ringtone error:', error);
        }
    }
    
    showNotification(message, type = 'info') {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
        } else if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoCallManager;
}
