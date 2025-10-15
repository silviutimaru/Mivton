// Fixed Video Call System - Complete Working Implementation
class VideoCallSystem {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.socket = window.socket;
        this.currentUserId = window.currentUserId;
        this.isCallActive = false;
        this.localVideo = null;
        this.remoteVideo = null;
        
        // ICE servers configuration
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        console.log('🎥 Video Call System Constructor', {
            socketConnected: this.socket?.connected,
            currentUserId: this.currentUserId
        });
        
        this.initialize();
    }

    async initialize() {
        console.log('🎥 Initializing Video Call System...');
        
        // Create UI elements first
        this.createVideoUI();
        
        // Register user immediately if socket is connected
        if (this.socket && this.socket.connected && this.currentUserId) {
            this.registerUser();
        }
        
        // Also listen for future connections
        if (this.socket) {
            this.socket.on('connect', () => {
                console.log('✅ Socket connected, registering for video calls');
                this.registerUser();
            });
        }
        
        this.setupEventListeners();
        this.setupSocketListeners();
        
        console.log('✅ Video Call System initialized');
    }

    registerUser() {
        if (this.currentUserId && this.socket) {
            // Register for chat (which sets up the user room)
            this.socket.emit('chat:register', this.currentUserId);
            console.log(`📝 Registered user ${this.currentUserId} for video calls in room user_${this.currentUserId}`);
            
            // Legacy event listener removed to prevent conflicts
        } else {
            console.warn('⚠️ Cannot register user - missing userId or socket', {
                currentUserId: this.currentUserId,
                socketExists: !!this.socket
            });
        }
    }

    createVideoUI() {
        // Remove any existing UI elements
        ['video-call-ui', 'incoming-call-ui', 'calling-ui'].forEach(id => {
            const existing = document.getElementById(id);
            if (existing) existing.remove();
        });

        // Create video call UI container
        const videoUI = document.createElement('div');
        videoUI.id = 'video-call-ui';
        videoUI.className = 'video-call-overlay';
        videoUI.style.display = 'none';
        videoUI.innerHTML = `
            <div class="video-container">
                <video id="remoteVideo" autoplay playsinline></video>
                <video id="localVideo" autoplay playsinline muted></video>
                
                <div id="remote-audio-indicator" style="display: none;">
                    <i class="fas fa-microphone-slash"></i> Muted
                </div>
                <div id="remote-video-indicator" style="display: none;">
                    <i class="fas fa-video-slash"></i> Camera Off
                </div>
                
                <div class="video-controls">
                    <button class="btn-call-control btn-audio" id="toggle-audio">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="btn-call-control btn-video" id="toggle-video">
                        <i class="fas fa-video"></i>
                    </button>
                    <button class="btn-call-control btn-end" id="end-call-active">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(videoUI);

        // Store references to video elements
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
    }

    setupEventListeners() {
        // Prevent duplicate event listeners
        if (this.domEventListenersSetup) {
            console.log('⚠️ DOM event listeners already setup, skipping...');
            return;
        }
        this.domEventListenersSetup = true;

        // Video call button in friends list
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.video-call-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const btn = e.target.closest('.video-call-btn');
                const friendId = btn.dataset.friendId;
                const friendName = btn.dataset.friendName || 'Friend';
                const friendAvatar = btn.dataset.friendAvatar || '/img/default-avatar.png';
                
                console.log(`📞 Video call button clicked for ${friendName} (ID: ${friendId})`);
                await this.initiateCall(friendId, friendName, friendAvatar);
            }

            // Call control buttons
            if (e.target.closest('#accept-call')) {
                await this.acceptCall();
            } else if (e.target.closest('#decline-call')) {
                this.declineCall();
            } else if (e.target.closest('#end-call') || e.target.closest('#end-call-active') || e.target.closest('#end-call-calling')) {
                this.endCall();
            } else if (e.target.closest('#toggle-audio')) {
                this.toggleAudio();
            } else if (e.target.closest('#toggle-video')) {
                this.toggleVideo();
            }
        });
    }

    setupSocketListeners() {
        // Prevent duplicate socket listeners
        if (this.socketEventListenersSetup) {
            console.log('⚠️ Socket event listeners already setup, skipping...');
            return;
        }
        this.socketEventListenersSetup = true;

        if (!this.socket) {
            console.error('❌ Socket not available for listeners');
            return;
        }

        console.log('🔌 Setting up socket listeners for video calls...');

        // New event system
        this.socket.on('video-call:incoming', (data) => {
            console.log('📞 [New] Incoming video call:', data);
            this.handleIncomingCall(data);
        });

        // Call responses
        this.socket.on('video-call:ringing', (data) => {
            console.log('🔔 Call is ringing:', data);
        });

        this.socket.on('video-call:accepted', async (data) => {
            console.log('✅ Call accepted:', data);
            this.hideCallingUI();
            this.showVideoUI();
            await this.startWebRTC(true);
        });

        this.socket.on('video-call:declined', (data) => {
            console.log('❌ Call declined:', data);
            this.hideCallingUI();
            this.showNotification('Call declined', 'error');
            this.cleanup();
        });

        this.socket.on('video-call:ended', (data) => {
            console.log('📴 Call ended by remote:', data);
            this.endCall(false);
        });

        this.socket.on('video-call:timeout', (data) => {
            console.log('⏱️ Call timed out:', data);
            this.hideCallingUI();
            this.showNotification('No answer', 'warning');
            this.cleanup();
        });

        this.socket.on('video-call:error', (data) => {
            console.error('❌ Call error:', data);
            this.hideAllUI();
            this.showNotification(data.error || 'Call failed', 'error');
            this.cleanup();
        });

        // WebRTC signaling
        this.socket.on('video-call:offer', async (data) => {
            console.log('📥 Received offer');
            await this.handleOffer(data);
        });

        this.socket.on('video-call:answer', async (data) => {
            console.log('📥 Received answer');
            await this.handleAnswer(data);
        });

        this.socket.on('video-call:ice-candidate', async (data) => {
            console.log('🧊 Received ICE candidate');
            await this.handleIceCandidate(data);
        });

        console.log('✅ Socket listeners setup complete');
    }

    async initiateCall(friendId, friendName, friendAvatar) {
        try {
            console.log(`🎥 Initiating call to ${friendName} (${friendId})`);
            
            if (this.isCallActive) {
                this.showNotification('Already in a call', 'warning');
                return;
            }

            // Store call information
            this.currentCall = {
                targetUserId: parseInt(friendId),
                targetName: friendName,
                targetAvatar: friendAvatar,
                isInitiator: true
            };

            // Show calling UI immediately
            this.showCallingUI(friendName, friendAvatar);
            
            // Request user media with error handling
            try {
                await this.getUserMedia();
                console.log('✅ Got user media successfully');
                
                // Show local video preview in calling UI
                if (this.localVideo && this.localStream) {
                    this.localVideo.srcObject = this.localStream;
                }
            } catch (mediaError) {
                console.error('❌ Failed to get user media:', mediaError);
                this.showNotification('Camera/microphone access denied', 'error');
                this.hideCallingUI();
                return;
            }

            // Send call initiation via new system only
            console.log('📤 Sending call initiation to server');
            
            this.socket.emit('video-call:initiate', {
                targetUserId: parseInt(friendId),
                callerInfo: {
                    id: this.currentUserId,
                    name: window.currentUserName || 'User',
                    avatar: window.currentUserAvatar || '/img/default-avatar.png'
                }
            });

            console.log(`✅ Call initiation sent to ${friendName}`);
            this.isCallActive = true;

        } catch (error) {
            console.error('❌ Error initiating call:', error);
            this.showNotification('Failed to start call', 'error');
            this.hideCallingUI();
            this.cleanup();
        }
    }

    async getUserMedia() {
        try {
            console.log('📹 Requesting user media...');
            
            // Request with fallback options
            const constraints = {
                video: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Got media stream:', {
                videoTracks: this.localStream.getVideoTracks().length,
                audioTracks: this.localStream.getAudioTracks().length
            });

            // Set local video
            if (this.localVideo) {
                this.localVideo.srcObject = this.localStream;
                console.log('✅ Local video element updated');
            }

            return this.localStream;

        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
            
            // Try audio only as fallback
            if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
                console.log('🎤 Trying audio-only fallback...');
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    console.log('✅ Got audio-only stream');
                    return this.localStream;
                } catch (audioError) {
                    console.error('❌ Audio-only fallback also failed:', audioError);
                    throw audioError;
                }
            }
            throw error;
        }
    }

    handleIncomingCall(data) {
        console.log('📥 Processing incoming call:', data);
        
        if (this.isCallActive) {
            console.log('⚠️ Already in a call, auto-declining');
            if (data.callId && data.caller?.id) {
                this.socket.emit('video-call:decline', {
                    callId: data.callId,
                    callerId: data.caller.id
                });
            }
            return;
        }

        this.currentCall = {
            callId: data.callId,
            callerId: data.caller?.id,
            callerName: data.caller?.name || 'Friend',
            callerAvatar: data.caller?.avatar || '/img/default-avatar.png',
            isInitiator: false
        };

        this.showIncomingCallUI(this.currentCall.callerName, this.currentCall.callerAvatar);
        this.playRingtone();
    }

    async acceptCall() {
        try {
            console.log('✅ Accepting call...');
            this.hideIncomingCallUI();
            this.stopRingtone();

            // Get user media first
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
        
        if (this.currentCall) {
            this.socket.emit('video-call:decline', {
                callId: this.currentCall.callId,
                callerId: this.currentCall.callerId
            });
        }

        this.hideIncomingCallUI();
        this.cleanup();
    }

    endCall(notifyRemote = true) {
        console.log('📴 Ending call...');
        
        if (notifyRemote && this.currentCall && this.socket) {
            const otherUserId = this.currentCall.isInitiator ? 
                this.currentCall.targetUserId : 
                this.currentCall.callerId;
                
            if (otherUserId) {
                this.socket.emit('video-call:end', {
                    callId: this.currentCall.callId,
                    otherUserId: otherUserId
                });
            }
        }

        this.cleanup();
        this.hideAllUI();
        this.isCallActive = false;
        this.showNotification('Call ended', 'info');
    }

    async startWebRTC(isInitiator) {
        console.log(`🔄 Starting WebRTC (initiator: ${isInitiator})`);
        
        try {
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
                    if (this.remoteVideo) {
                        this.remoteVideo.srcObject = this.remoteStream;
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

            // Connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                console.log('📡 Connection state:', this.peerConnection.connectionState);
                if (this.peerConnection.connectionState === 'connected') {
                    console.log('✅ WebRTC connected successfully!');
                    this.showNotification('Connected', 'success');
                }
            };

            // Create offer if initiator
            if (isInitiator) {
                await this.createOffer();
            }
            
        } catch (error) {
            console.error('❌ Error in startWebRTC:', error);
            throw error;
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
            
            // Check connection state before setting remote description
            if (this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                console.log('✅ Answer processed, connection should establish soon');
            } else {
                console.log('⚠️ Cannot set remote description, connection state:', this.peerConnection?.signalingState);
            }
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
            }
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up video call...');
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log(`🛑 Stopped ${track.kind} track`);
            });
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Clear streams from video elements
        if (this.localVideo) this.localVideo.srcObject = null;
        if (this.remoteVideo) this.remoteVideo.srcObject = null;

        this.remoteStream = null;
        this.currentCall = null;
    }

    showCallingUI(name, avatar) {
        this.hideAllUI();
        
        let callingUI = document.getElementById('calling-ui');
        if (!callingUI) {
            callingUI = document.createElement('div');
            callingUI.id = 'calling-ui';
            callingUI.className = 'video-call-overlay';
            document.body.appendChild(callingUI);
        }
        
        callingUI.innerHTML = `
            <div class="calling-container">
                <img src="${avatar}" alt="${name}" class="calling-avatar" onerror="this.src='/img/default-avatar.png'">
                <h3>Calling ${name}...</h3>
                <p class="calling-status">Waiting for response...</p>
                <div class="calling-actions">
                    <button class="btn-call-control btn-end" id="end-call-calling">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
                ${this.localVideo ? '<video id="localVideoPreview" autoplay playsinline muted style="width: 200px; height: 150px; border-radius: 10px; margin-top: 20px;"></video>' : ''}
            </div>
        `;
        
        callingUI.style.cssText = 'display: flex !important;';
        
        // Show local video preview
        if (this.localStream) {
            const preview = document.getElementById('localVideoPreview');
            if (preview) {
                preview.srcObject = this.localStream;
            }
        }
    }

    showIncomingCallUI(name, avatar) {
        this.hideAllUI();
        
        let incomingUI = document.getElementById('incoming-call-ui');
        if (!incomingUI) {
            incomingUI = document.createElement('div');
            incomingUI.id = 'incoming-call-ui';
            incomingUI.className = 'video-call-overlay';
            document.body.appendChild(incomingUI);
        }
        
        incomingUI.innerHTML = `
            <div class="incoming-call-container">
                <img src="${avatar}" alt="${name}" class="calling-avatar" onerror="this.src='/img/default-avatar.png'">
                <h3>${name} is calling...</h3>
                <p class="call-type">Video Call</p>
                <div class="calling-actions">
                    <button class="btn-call-control btn-accept" id="accept-call">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="btn-call-control btn-decline" id="decline-call">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;
        
        incomingUI.style.cssText = 'display: flex !important;';
    }

    showVideoUI() {
        this.hideAllUI();
        const videoUI = document.getElementById('video-call-ui');
        if (videoUI) {
            videoUI.style.display = 'flex';
            
            // Ensure video streams are assigned to elements
            if (this.localStream && this.localVideo) {
                this.localVideo.srcObject = this.localStream;
                console.log('✅ Local video stream assigned to UI');
                console.log('📹 Local video element:', this.localVideo);
                console.log('📹 Local stream tracks:', this.localStream.getTracks().length);
            }
            
            if (this.remoteStream && this.remoteVideo) {
                this.remoteVideo.srcObject = this.remoteStream;
                console.log('✅ Remote video stream assigned to UI');
                console.log('📹 Remote video element:', this.remoteVideo);
                console.log('📹 Remote stream tracks:', this.remoteStream.getTracks().length);
            }

            // Force video elements to be visible
            if (this.localVideo) {
                this.localVideo.style.display = 'block';
                this.localVideo.style.visibility = 'visible';
            }
            if (this.remoteVideo) {
                this.remoteVideo.style.display = 'block';
                this.remoteVideo.style.visibility = 'visible';
            }
        }
    }

    hideCallingUI() {
        const callingUI = document.getElementById('calling-ui');
        if (callingUI) {
            callingUI.style.display = 'none';
        }
    }

    hideIncomingCallUI() {
        const incomingUI = document.getElementById('incoming-call-ui');
        if (incomingUI) {
            incomingUI.style.display = 'none';
        }
    }

    hideVideoUI() {
        const videoUI = document.getElementById('video-call-ui');
        if (videoUI) {
            videoUI.style.display = 'none';
        }
    }

    hideAllUI() {
        this.hideCallingUI();
        this.hideIncomingCallUI();
        this.hideVideoUI();
    }

    playRingtone() {
        try {
            // Create a simple beep sound using Web Audio API instead of loading file
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Create a simple beep tone
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
            
            // Repeat the beep every second
            this.ringtoneInterval = setInterval(() => {
                if (this.audioContext) {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    
                    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
                    osc.type = 'sine';
                    
                    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                    
                    osc.start(this.audioContext.currentTime);
                    osc.stop(this.audioContext.currentTime + 0.5);
                }
            }, 1000);
            
        } catch (e) {
            console.log('Ringtone not available');
        }
    }

    stopRingtone() {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Use existing toast system if available
        if (window.toast?.show) {
            window.toast.show(message, type);
            return;
        }
        
        // Fallback toast
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 20000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize the video call system
if (typeof window !== 'undefined') {
    // Clean up any existing instance
    if (window.videoCallManager) {
        window.videoCallManager.cleanup?.();
    }
    
    // Wait for dependencies
    const initVideoCall = () => {
        if (window.socket && (window.currentUserId || window.currentUser?.id)) {
            // Set currentUserId if not already set
            if (!window.currentUserId && window.currentUser?.id) {
                window.currentUserId = window.currentUser.id;
                console.log('🔧 Set window.currentUserId from window.currentUser:', window.currentUserId);
            }
            
            console.log('🚀 Initializing Video Call System');
            window.videoCallSystem = new VideoCallSystem();
            window.videoCallManager = window.videoCallSystem; // Alias for compatibility
            return true;
        }
        return false;
    };
    
    // Try to initialize immediately
    if (!initVideoCall()) {
        console.log('⏳ Waiting for socket and user ID...');
        // Keep trying until successful
        const checkInterval = setInterval(() => {
            if (initVideoCall()) {
                clearInterval(checkInterval);
            }
        }, 500);
    }
}
