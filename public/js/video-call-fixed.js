// Fixed Video Call System - Complete Working Implementation with WebRTC State Management
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
        
        // Critical: Prevent duplicate WebRTC initialization
        this.webrtcInitialized = false;
        this.isProcessingAnswer = false;
        
        // Track if we're currently playing videos to prevent interruptions
        this.isPlayingLocalVideo = false;
        this.isPlayingRemoteVideo = false;
        
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
                        🎤
                    </button>
                    <button class="btn-call-control btn-video" id="toggle-video">
                        📹
                    </button>
                    <button class="btn-call-control btn-end" id="end-call-active">
                        📞
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(videoUI);

        // Store references to video elements
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        
        // Set up video element event listeners
        this.setupVideoElementListeners();
    }

    setupVideoElementListeners() {
        if (this.localVideo) {
            this.localVideo.addEventListener('loadedmetadata', () => {
                console.log('📹 Local video metadata loaded');
                this.playLocalVideo();
            });
            
            this.localVideo.addEventListener('playing', () => {
                console.log('✅ Local video is playing');
                this.isPlayingLocalVideo = true;
            });
            
            this.localVideo.addEventListener('pause', () => {
                console.log('⏸️ Local video paused');
                this.isPlayingLocalVideo = false;
            });
        }
        
        if (this.remoteVideo) {
            this.remoteVideo.addEventListener('loadedmetadata', () => {
                console.log('📹 Remote video metadata loaded');
                this.playRemoteVideo();
            });
            
            this.remoteVideo.addEventListener('playing', () => {
                console.log('✅ Remote video is playing');
                this.isPlayingRemoteVideo = true;
            });
            
            this.remoteVideo.addEventListener('pause', () => {
                console.log('⏸️ Remote video paused');
                this.isPlayingRemoteVideo = false;
            });
        }
    }

    async playLocalVideo() {
        if (this.localVideo && this.localVideo.srcObject && !this.isPlayingLocalVideo) {
            try {
                await this.localVideo.play();
                console.log('✅ Local video play started');
            } catch (error) {
                console.warn('⚠️ Local video play failed (non-critical):', error.message);
                // Try again after a short delay
                setTimeout(() => this.playLocalVideo(), 500);
            }
        }
    }

    async playRemoteVideo() {
        if (this.remoteVideo && this.remoteVideo.srcObject && !this.isPlayingRemoteVideo) {
            try {
                await this.remoteVideo.play();
                console.log('✅ Remote video play started');
            } catch (error) {
                console.warn('⚠️ Remote video play failed (non-critical):', error.message);
                // Try again after a short delay
                setTimeout(() => this.playRemoteVideo(), 500);
            }
        }
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
            
            // CRITICAL FIX: Start WebRTC ONLY ONCE here as initiator
            if (!this.webrtcInitialized) {
                console.log('🔄 Initiator starting WebRTC after acceptance');
                await this.startWebRTC(true);
            } else {
                console.warn('⚠️ WebRTC already initialized, skipping duplicate initialization');
            }
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
            console.log('📥 Received offer from:', data.from);
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

            // Reset WebRTC state for new call
            this.webrtcInitialized = false;
            this.isProcessingAnswer = false;

            // Generate unique call ID
            const callId = `call_${this.currentUserId}_${friendId}_${Date.now()}`;

            // Store call information
            this.currentCall = {
                callId: callId,
                targetUserId: parseInt(friendId),
                targetName: friendName,
                targetAvatar: friendAvatar,
                isInitiator: true
            };

            // Request user media first (BEFORE showing UI)
            try {
                console.log('📹 Requesting user media...');
                await this.getUserMedia();
                console.log('✅ Got user media successfully');
            } catch (mediaError) {
                console.error('❌ Failed to get user media:', mediaError);
                this.showNotification('Camera/microphone access denied', 'error');
                this.currentCall = null;
                return;
            }

            // Show calling UI after we have the stream
            this.showCallingUI(friendName, friendAvatar);

            // Send call initiation via new system only
            console.log('📤 Sending call initiation to server with callId:', callId);
            
            this.socket.emit('video-call:initiate', {
                targetUserId: parseInt(friendId),
                callId: callId,
                callerInfo: {
                    id: this.currentUserId,
                    name: window.currentUser?.name || window.currentUserName || 'User',
                    avatar: window.currentUser?.avatar || window.currentUserAvatar || '/img/default-avatar.png'
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
            console.log('📹 Requesting user media with constraints...');
            
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
                audioTracks: this.localStream.getAudioTracks().length,
                videoTrackState: this.localStream.getVideoTracks()[0]?.readyState,
                audioTrackState: this.localStream.getAudioTracks()[0]?.readyState
            });

            // Verify tracks are active
            const videoTrack = this.localStream.getVideoTracks()[0];
            const audioTrack = this.localStream.getAudioTracks()[0];
            
            if (videoTrack && videoTrack.readyState === 'live') {
                console.log('✅ Video track is live');
            } else {
                console.warn('⚠️ Video track not live:', videoTrack?.readyState);
            }
            
            if (audioTrack && audioTrack.readyState === 'live') {
                console.log('✅ Audio track is live');
            } else {
                console.warn('⚠️ Audio track not live:', audioTrack?.readyState);
            }

            // Assign stream to local video element
            await this.assignLocalStream();

            return this.localStream;

        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
            
            // Try audio only as fallback
            if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
                console.log('🎤 Trying audio-only fallback...');
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    console.log('✅ Got audio-only stream');
                    await this.assignLocalStream();
                    return this.localStream;
                } catch (audioError) {
                    console.error('❌ Audio-only fallback also failed:', audioError);
                    throw audioError;
                }
            }
            throw error;
        }
    }

    async assignLocalStream() {
        if (this.localVideo && this.localStream) {
            // Clear any existing stream first
            if (this.localVideo.srcObject) {
                console.log('🔄 Clearing existing local video stream');
                this.localVideo.srcObject = null;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log('📹 Assigning local stream to video element');
            this.localVideo.srcObject = this.localStream;
            
            // Make video element visible
            this.localVideo.style.display = 'block';
            this.localVideo.style.visibility = 'visible';
            
            // Wait for metadata to load, then play
            if (this.localVideo.readyState >= 2) {
                await this.playLocalVideo();
            }
            // Otherwise, the 'loadedmetadata' event listener will trigger playback
            
            console.log('✅ Local video stream assigned');
        }
    }

    async assignRemoteStream() {
        if (this.remoteVideo && this.remoteStream) {
            // Clear any existing stream first
            if (this.remoteVideo.srcObject) {
                console.log('🔄 Clearing existing remote video stream');
                this.remoteVideo.srcObject = null;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log('📹 Assigning remote stream to video element');
            this.remoteVideo.srcObject = this.remoteStream;
            
            // Make video element visible
            this.remoteVideo.style.display = 'block';
            this.remoteVideo.style.visibility = 'visible';
            
            // Wait for metadata to load, then play
            if (this.remoteVideo.readyState >= 2) {
                await this.playRemoteVideo();
            }
            // Otherwise, the 'loadedmetadata' event listener will trigger playback
            
            console.log('✅ Remote video stream assigned');
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

        // Reset WebRTC state for new call
        this.webrtcInitialized = false;
        this.isProcessingAnswer = false;

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
            try {
                await this.getUserMedia();
                console.log('✅ Got user media for accepting call');
            } catch (mediaError) {
                console.error('❌ Failed to get user media:', mediaError);
                this.showNotification('Camera/microphone access denied', 'error');
                
                // Decline the call since we can't get media
                this.socket.emit('video-call:decline', {
                    callId: this.currentCall.callId,
                    callerId: this.currentCall.callerId
                });
                
                this.cleanup();
                return;
            }

            // Show video UI
            this.showVideoUI();

            // Send accept signal
            this.socket.emit('video-call:accept', {
                callId: this.currentCall.callId,
                callerId: this.currentCall.callerId
            });

            this.isCallActive = true;

            // CRITICAL FIX: Start WebRTC ONLY ONCE here as receiver (will wait for offer)
            if (!this.webrtcInitialized) {
                console.log('🔄 Receiver starting WebRTC after accepting');
                await this.startWebRTC(false);
            } else {
                console.warn('⚠️ WebRTC already initialized, skipping duplicate initialization');
            }

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
                    targetUserId: otherUserId
                });
            }
        }

        this.cleanup();
        this.hideAllUI();
        this.isCallActive = false;
        this.showNotification('Call ended', 'info');
    }

    async startWebRTC(isInitiator) {
        // CRITICAL FIX: Guard against duplicate initialization
        if (this.webrtcInitialized) {
            console.warn('⚠️ WebRTC already initialized, skipping duplicate initialization');
            return;
        }
        
        console.log(`🔄 Starting WebRTC (initiator: ${isInitiator})`);
        
        try {
            // Ensure we have local stream
            if (!this.localStream) {
                console.warn('⚠️ No local stream available, getting media...');
                await this.getUserMedia();
            }

            // Create peer connection ONCE
            this.peerConnection = new RTCPeerConnection(this.iceServers);
            console.log('✅ Peer connection created');
            
            // Mark as initialized BEFORE any async operations
            this.webrtcInitialized = true;
            
            // Add local stream tracks BEFORE creating offer/answer
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                    console.log(`✅ Added local ${track.kind} track (${track.readyState})`);
                });
            } else {
                console.error('❌ No local stream to add to peer connection');
            }

            // Handle remote stream
            this.peerConnection.ontrack = async (event) => {
                console.log('📥 Received remote track:', event.track.kind, 'state:', event.track.readyState);
                
                // Create remote stream if it doesn't exist
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                    console.log('✅ Created remote stream');
                }
                
                // Add track to remote stream
                this.remoteStream.addTrack(event.track);
                console.log(`✅ Added remote ${event.track.kind} track to stream`);
                
                // Assign remote stream to video element (only once)
                if (this.remoteVideo && !this.remoteVideo.srcObject) {
                    await this.assignRemoteStream();
                }
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
                } else if (this.peerConnection.connectionState === 'failed') {
                    console.error('❌ WebRTC connection failed');
                    this.showNotification('Connection failed', 'error');
                    this.endCall();
                } else if (this.peerConnection.connectionState === 'disconnected') {
                    console.warn('⚠️ WebRTC connection disconnected');
                }
            };

            // ICE connection state changes
            this.peerConnection.oniceconnectionstatechange = () => {
                console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
            };

            // Signaling state changes (for debugging)
            this.peerConnection.onsignalingstatechange = () => {
                console.log('📡 Signaling state:', this.peerConnection.signalingState);
            };

            // Create offer if initiator (after tracks are added)
            if (isInitiator) {
                // Wait a moment to ensure all tracks are fully added
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.createOffer();
            } else {
                console.log('📥 Receiver ready, waiting for offer...');
            }
            
        } catch (error) {
            console.error('❌ Error in startWebRTC:', error);
            this.webrtcInitialized = false; // Reset on error
            this.showNotification('Failed to establish connection', 'error');
            throw error;
        }
    }

    async createOffer() {
        try {
            console.log('📤 Creating offer...');
            
            // Verify signaling state before creating offer
            if (this.peerConnection.signalingState !== 'stable') {
                console.error('❌ Cannot create offer, signaling state not stable:', this.peerConnection.signalingState);
                return;
            }
            
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            
            await this.peerConnection.setLocalDescription(offer);
            console.log('✅ Local description set (offer), signaling state:', this.peerConnection.signalingState);
            
            this.socket.emit('video-call:offer', {
                targetUserId: this.currentCall.targetUserId,
                offer: offer,
                callId: this.currentCall.callId
            });
            
            console.log('✅ Offer sent to server');
        } catch (error) {
            console.error('❌ Error creating offer:', error);
            throw error;
        }
    }

    async handleOffer(data) {
        try {
            console.log('📥 Processing offer from user:', data.from);
            
            // CRITICAL FIX: Don't call startWebRTC if already initialized
            if (!this.peerConnection) {
                console.error('❌ No peer connection available - this should not happen. Call acceptCall first.');
                return;
            }
            
            // Verify signaling state before setting remote description
            if (this.peerConnection.signalingState !== 'stable') {
                console.warn('⚠️ Signaling state not stable when receiving offer:', this.peerConnection.signalingState);
            }
            
            // Set remote description
            console.log('📥 Setting remote description (offer)...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            console.log('✅ Remote description set (offer), signaling state:', this.peerConnection.signalingState);
            
            // Create answer
            console.log('📤 Creating answer...');
            const answer = await this.peerConnection.createAnswer();
            
            await this.peerConnection.setLocalDescription(answer);
            console.log('✅ Local description set (answer), signaling state:', this.peerConnection.signalingState);
            
            // Send answer back
            this.socket.emit('video-call:answer', {
                targetUserId: data.from,
                answer: answer,
                callId: data.callId || this.currentCall?.callId
            });
            
            console.log('✅ Answer sent to server');
        } catch (error) {
            console.error('❌ Error handling offer:', error);
            this.showNotification('Connection error', 'error');
        }
    }

    async handleAnswer(data) {
        // CRITICAL FIX: Prevent processing duplicate answers
        if (this.isProcessingAnswer) {
            console.warn('⚠️ Already processing an answer, ignoring duplicate');
            return;
        }
        
        try {
            this.isProcessingAnswer = true;
            console.log('📥 Processing answer...');
            
            if (!this.peerConnection) {
                console.error('❌ No peer connection available to handle answer');
                return;
            }
            
            const currentState = this.peerConnection.signalingState;
            console.log('📡 Current signaling state:', currentState);
            
            // CRITICAL FIX: Only set remote description if we're in the correct state
            if (currentState === 'have-local-offer') {
                console.log('📥 Setting remote description (answer)...');
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                console.log('✅ Remote description set (answer), signaling state:', this.peerConnection.signalingState);
            } else if (currentState === 'stable') {
                console.warn('⚠️ Already in stable state, ignoring answer (connection already established)');
            } else {
                console.error('❌ Cannot set remote description, wrong state:', currentState);
            }
        } catch (error) {
            console.error('❌ Error handling answer:', error);
        } finally {
            // Reset flag after a delay to allow for any late duplicate answers
            setTimeout(() => {
                this.isProcessingAnswer = false;
            }, 1000);
        }
    }

    async handleIceCandidate(data) {
        try {
            if (!this.peerConnection) {
                console.warn('⚠️ No peer connection available for ICE candidate');
                return;
            }
            
            if (data.candidate) {
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
                    btn.innerHTML = audioTrack.enabled ? '🎤' : '🔇';
                }
                console.log('🎤 Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
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
                    btn.innerHTML = videoTrack.enabled ? '📹' : '📵';
                }
                console.log('📹 Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
            }
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up video call...');
        
        // Reset WebRTC flags
        this.webrtcInitialized = false;
        this.isProcessingAnswer = false;
        
        // Stop playing flags
        this.isPlayingLocalVideo = false;
        this.isPlayingRemoteVideo = false;
        
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
            console.log('🔌 Peer connection closed');
        }

        // Clear streams from video elements
        if (this.localVideo) {
            this.localVideo.srcObject = null;
            this.localVideo.style.display = 'none';
        }
        if (this.remoteVideo) {
            this.remoteVideo.srcObject = null;
            this.remoteVideo.style.display = 'none';
        }

        this.remoteStream = null;
        this.currentCall = null;
        
        console.log('✅ Cleanup complete');
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
                        📞
                    </button>
                </div>
            </div>
        `;
        
        callingUI.style.cssText = 'display: flex !important;';
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
                        ✅
                    </button>
                    <button class="btn-call-control btn-decline" id="decline-call">
                        ❌
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
            // Show the video call UI with proper display
            videoUI.style.display = 'flex';
            videoUI.style.position = 'fixed';
            videoUI.style.top = '0';
            videoUI.style.left = '0';
            videoUI.style.width = '100%';
            videoUI.style.height = '100%';
            videoUI.style.zIndex = '999999';
            
            console.log('🎬 Showing video UI, checking video elements...');
            
            // Ensure video elements are visible (don't overwrite all styles with cssText)
            if (this.localVideo) {
                this.localVideo.style.display = 'block';
                this.localVideo.style.visibility = 'visible';
                this.localVideo.style.opacity = '1';
                
                const localComputedStyle = getComputedStyle(this.localVideo);
                console.log('📹 Local video element state:', {
                    exists: !!this.localVideo,
                    hasStream: !!this.localVideo.srcObject,
                    streamTracks: this.localVideo.srcObject?.getTracks().length || 0,
                    readyState: this.localVideo.readyState,
                    videoWidth: this.localVideo.videoWidth,
                    videoHeight: this.localVideo.videoHeight,
                    offsetWidth: this.localVideo.offsetWidth,
                    offsetHeight: this.localVideo.offsetHeight,
                    paused: this.localVideo.paused,
                    display: localComputedStyle.display,
                    visibility: localComputedStyle.visibility,
                    opacity: localComputedStyle.opacity,
                    width: localComputedStyle.width,
                    height: localComputedStyle.height,
                    position: localComputedStyle.position,
                    zIndex: localComputedStyle.zIndex,
                    top: localComputedStyle.top,
                    left: localComputedStyle.left,
                    right: localComputedStyle.right,
                    bottom: localComputedStyle.bottom
                });
            } else {
                console.error('❌ Local video element not found!');
            }
            
            if (this.remoteVideo) {
                this.remoteVideo.style.display = 'block';
                this.remoteVideo.style.visibility = 'visible';
                this.remoteVideo.style.opacity = '1';
                
                const remoteComputedStyle = getComputedStyle(this.remoteVideo);
                console.log('📹 Remote video element state:', {
                    exists: !!this.remoteVideo,
                    hasStream: !!this.remoteVideo.srcObject,
                    streamTracks: this.remoteVideo.srcObject?.getTracks().length || 0,
                    readyState: this.remoteVideo.readyState,
                    videoWidth: this.remoteVideo.videoWidth,
                    videoHeight: this.remoteVideo.videoHeight,
                    offsetWidth: this.remoteVideo.offsetWidth,
                    offsetHeight: this.remoteVideo.offsetHeight,
                    paused: this.remoteVideo.paused,
                    display: remoteComputedStyle.display,
                    visibility: remoteComputedStyle.visibility,
                    opacity: remoteComputedStyle.opacity,
                    width: remoteComputedStyle.width,
                    height: remoteComputedStyle.height,
                    position: remoteComputedStyle.position,
                    zIndex: remoteComputedStyle.zIndex,
                    top: remoteComputedStyle.top,
                    left: remoteComputedStyle.left,
                    right: remoteComputedStyle.right,
                    bottom: remoteComputedStyle.bottom
                });
            } else {
                console.error('❌ Remote video element not found!');
            }
            
            // Log video container state
            const videoContainer = videoUI.querySelector('.video-container');
            if (videoContainer) {
                const containerStyle = getComputedStyle(videoContainer);
                console.log('📦 Video container state:', {
                    width: containerStyle.width,
                    height: containerStyle.height,
                    position: containerStyle.position,
                    display: containerStyle.display,
                    zIndex: containerStyle.zIndex
                });
            }
            
            // Log video UI container state
            const videoUIStyle = getComputedStyle(videoUI);
            console.log('🎥 VIDEO UI CONTAINER DEBUG:', {
                containerDisplay: videoUIStyle.display,
                containerVisibility: videoUIStyle.visibility,
                containerZIndex: videoUIStyle.zIndex,
                containerPosition: videoUIStyle.position,
                containerWidth: videoUIStyle.width,
                containerHeight: videoUIStyle.height,
                containerTop: videoUIStyle.top,
                containerLeft: videoUIStyle.left
            });
            
            console.log('✅ Video UI shown with proper styling');
        } else {
            console.error('❌ Video UI element not found!');
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
            // Create a simple beep sound using Web Audio API
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
            console.log('Ringtone not available:', e);
        }
    }

    stopRingtone() {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(e => console.log('Error closing audio context:', e));
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
    if (window.videoCallSystem) {
        window.videoCallSystem.cleanup?.();
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
