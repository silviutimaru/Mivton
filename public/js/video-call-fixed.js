// Fixed Video Call System - Complete Working Implementation with WebRTC State Management

// Logging System - Set level to control verbosity
const LOG_LEVEL = {
    SILENT: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
};

// Set to INFO for clean production logs, DEBUG for troubleshooting
const CURRENT_LOG_LEVEL = LOG_LEVEL.INFO;

function vcLog(level, message, data = null) {
    if (level <= CURRENT_LOG_LEVEL) {
        const prefix = level === LOG_LEVEL.ERROR ? '❌' : 
                      level === LOG_LEVEL.WARN ? '⚠️' : 
                      level === LOG_LEVEL.INFO ? '✅' : '🔍';
        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }
}

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
        
        vcLog(LOG_LEVEL.DEBUG, '🎥 Video Call System Constructor', {
            socketConnected: this.socket?.connected,
            currentUserId: this.currentUserId
        });
        
        this.initialize();
    }

    async initialize() {
        vcLog(LOG_LEVEL.INFO, 'Video Call System initializing...');
        
        // Create UI elements first
        this.createVideoUI();
        
        // Register user immediately if socket is connected
        if (this.socket && this.socket.connected && this.currentUserId) {
            this.registerUser();
        }
        
        // Also listen for future connections
        if (this.socket) {
            this.socket.on('connect', () => {
                vcLog(LOG_LEVEL.DEBUG, 'Socket connected, registering for video calls');
                this.registerUser();
            });
        }
        
        this.setupEventListeners();
        this.setupSocketListeners();
        
        vcLog(LOG_LEVEL.INFO, 'Video Call System ready');
    }

    registerUser() {
        if (this.currentUserId && this.socket) {
            // Register for chat (which sets up the user room)
            this.socket.emit('chat:register', this.currentUserId);
            vcLog(LOG_LEVEL.DEBUG, `Registered user ${this.currentUserId} for video calls`);
        } else {
            vcLog(LOG_LEVEL.WARN, 'Cannot register user - missing userId or socket', {
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
                vcLog(LOG_LEVEL.DEBUG, 'Local video metadata loaded');
                this.playLocalVideo();
            });
            
            this.localVideo.addEventListener('playing', () => {
                vcLog(LOG_LEVEL.DEBUG, 'Local video is playing');
                this.isPlayingLocalVideo = true;
            });
            
            this.localVideo.addEventListener('pause', () => {
                vcLog(LOG_LEVEL.DEBUG, 'Local video paused');
                this.isPlayingLocalVideo = false;
            });
        }
        
        if (this.remoteVideo) {
            this.remoteVideo.addEventListener('loadedmetadata', () => {
                vcLog(LOG_LEVEL.DEBUG, 'Remote video metadata loaded');
                this.playRemoteVideo();
            });
            
            this.remoteVideo.addEventListener('playing', () => {
                vcLog(LOG_LEVEL.DEBUG, 'Remote video is playing');
                this.isPlayingRemoteVideo = true;
            });
            
            this.remoteVideo.addEventListener('pause', () => {
                vcLog(LOG_LEVEL.DEBUG, 'Remote video paused');
                this.isPlayingRemoteVideo = false;
            });
        }
    }

    async playLocalVideo() {
        if (this.localVideo && this.localVideo.srcObject && !this.isPlayingLocalVideo) {
            try {
                await this.localVideo.play();
                vcLog(LOG_LEVEL.DEBUG, 'Local video play started');
            } catch (error) {
                vcLog(LOG_LEVEL.WARN, 'Local video play failed (non-critical):', error.message);
                // Try again after a short delay
                setTimeout(() => this.playLocalVideo(), 500);
            }
        }
    }

    async playRemoteVideo() {
        if (this.remoteVideo && this.remoteVideo.srcObject && !this.isPlayingRemoteVideo) {
            try {
                await this.remoteVideo.play();
                vcLog(LOG_LEVEL.DEBUG, 'Remote video play started');
            } catch (error) {
                vcLog(LOG_LEVEL.WARN, 'Remote video play failed (non-critical):', error.message);
                // Try again after a short delay
                setTimeout(() => this.playRemoteVideo(), 500);
            }
        }
    }

    setupEventListeners() {
        // Prevent duplicate event listeners
        if (this.domEventListenersSetup) {
            vcLog(LOG_LEVEL.DEBUG, 'DOM event listeners already setup, skipping...');
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
                
                vcLog(LOG_LEVEL.INFO, `Video call initiated to ${friendName}`);
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
            vcLog(LOG_LEVEL.DEBUG, 'Socket event listeners already setup, skipping...');
            return;
        }
        this.socketEventListenersSetup = true;

        if (!this.socket) {
            vcLog(LOG_LEVEL.ERROR, ' Socket not available for listeners');
            return;
        }

        vcLog(LOG_LEVEL.DEBUG, 'Setting up socket listeners for video calls...');

        // New event system
        this.socket.on('video-call:incoming', (data) => {
            vcLog(LOG_LEVEL.INFO, 'Incoming video call:', data);
            this.handleIncomingCall(data);
        });

        // Call responses
        this.socket.on('video-call:ringing', (data) => {
            vcLog(LOG_LEVEL.INFO, 'Call is ringing:', data);
        });

        this.socket.on('video-call:accepted', async (data) => {
            vcLog(LOG_LEVEL.INFO, 'Call accepted', data);
            this.hideCallingUI();
            this.showVideoUI();
            
            // CRITICAL FIX: Start WebRTC ONLY ONCE here as initiator
            if (!this.webrtcInitialized) {
                vcLog(LOG_LEVEL.INFO, 'Initiator starting WebRTC after acceptance');
                await this.startWebRTC(true);
            } else {
                vcLog(LOG_LEVEL.WARN, 'WebRTC already initialized, skipping duplicate initialization');
            }
        });

        this.socket.on('video-call:declined', (data) => {
            vcLog(LOG_LEVEL.ERROR, ' Call declined:', data);
            this.hideCallingUI();
            this.showNotification('Call declined', 'error');
            this.cleanup();
        });

        this.socket.on('video-call:ended', (data) => {
            vcLog(LOG_LEVEL.INFO, 'Call ended by remote');
            this.endCall(false);
        });

        this.socket.on('video-call:timeout', (data) => {
            vcLog(LOG_LEVEL.INFO, 'Call timed out');
            this.hideCallingUI();
            this.showNotification('No answer', 'warning');
            this.cleanup();
        });

        this.socket.on('video-call:error', (data) => {
            vcLog(LOG_LEVEL.ERROR, ' Call error:', data);
            this.hideAllUI();
            this.showNotification(data.error || 'Call failed', 'error');
            this.cleanup();
        });

        // WebRTC signaling
        this.socket.on('video-call:offer', async (data) => {
            vcLog(LOG_LEVEL.DEBUG, 'Received offer from:', data.from);
            await this.handleOffer(data);
        });

        this.socket.on('video-call:answer', async (data) => {
            vcLog(LOG_LEVEL.DEBUG, 'Received answer');
            await this.handleAnswer(data);
        });

        this.socket.on('video-call:ice-candidate', async (data) => {
            vcLog(LOG_LEVEL.DEBUG, 'Received ICE candidate');
            await this.handleIceCandidate(data);
        });

        vcLog(LOG_LEVEL.DEBUG, 'Socket listeners setup complete');
    }

    async initiateCall(friendId, friendName, friendAvatar) {
        try {
            vcLog(LOG_LEVEL.INFO, `Initiating call to ${friendName}`);
            
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
                vcLog(LOG_LEVEL.DEBUG, 'Requesting user media...');
                await this.getUserMedia();
                vcLog(LOG_LEVEL.INFO, 'Got user media successfully');
            } catch (mediaError) {
                vcLog(LOG_LEVEL.ERROR, ' Failed to get user media:', mediaError);
                this.showNotification('Camera/microphone access denied', 'error');
                this.currentCall = null;
                return;
            }

            // Show calling UI after we have the stream
            this.showCallingUI(friendName, friendAvatar);

            // Send call initiation via new system only
            vcLog(LOG_LEVEL.DEBUG, 'Sending call initiation to server with callId:', callId);
            
            this.socket.emit('video-call:initiate', {
                targetUserId: parseInt(friendId),
                callId: callId,
                callerInfo: {
                    id: this.currentUserId,
                    name: window.currentUser?.name || window.currentUserName || 'User',
                    avatar: window.currentUser?.avatar || window.currentUserAvatar || '/img/default-avatar.png'
                }
            });

            vcLog(LOG_LEVEL.INFO, `Call sent to ${friendName}`);
            this.isCallActive = true;

        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error initiating call:', error);
            this.showNotification('Failed to start call', 'error');
            this.hideCallingUI();
            this.cleanup();
        }
    }

    async getUserMedia() {
        try {
            vcLog(LOG_LEVEL.DEBUG, 'Requesting user media with constraints...');
            
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
            
            vcLog(LOG_LEVEL.DEBUG, 'Got media stream:', {
                videoTracks: this.localStream.getVideoTracks().length,
                audioTracks: this.localStream.getAudioTracks().length,
                videoTrackState: this.localStream.getVideoTracks()[0]?.readyState,
                audioTrackState: this.localStream.getAudioTracks()[0]?.readyState
            });

            // Verify tracks are active
            const videoTrack = this.localStream.getVideoTracks()[0];
            const audioTrack = this.localStream.getAudioTracks()[0];
            
            if (videoTrack && videoTrack.readyState === 'live') {
                vcLog(LOG_LEVEL.DEBUG, 'Video track is live');
            } else {
                vcLog(LOG_LEVEL.WARN, 'Video track not live:', videoTrack?.readyState);
            }
            
            if (audioTrack && audioTrack.readyState === 'live') {
                vcLog(LOG_LEVEL.DEBUG, 'Audio track is live');
            } else {
                vcLog(LOG_LEVEL.WARN, 'Audio track not live:', audioTrack?.readyState);
            }

            // Assign stream to local video element
            await this.assignLocalStream();

            return this.localStream;

        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error accessing media devices:', error);
            
            // Try audio only as fallback
            if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
                vcLog(LOG_LEVEL.WARN, 'Trying audio-only fallback...');
                try {
                    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    vcLog(LOG_LEVEL.INFO, 'Got audio-only stream');
                    await this.assignLocalStream();
                    return this.localStream;
                } catch (audioError) {
                    vcLog(LOG_LEVEL.ERROR, ' Audio-only fallback also failed:', audioError);
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
                vcLog(LOG_LEVEL.DEBUG, 'Clearing existing local video stream');
                this.localVideo.srcObject = null;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            vcLog(LOG_LEVEL.DEBUG, 'Assigning local stream to video element');
            this.localVideo.srcObject = this.localStream;
            
            // Make video element visible
            this.localVideo.style.display = 'block';
            this.localVideo.style.visibility = 'visible';
            
            // Wait for metadata to load, then play
            if (this.localVideo.readyState >= 2) {
                await this.playLocalVideo();
            }
            // Otherwise, the 'loadedmetadata' event listener will trigger playback
            
            vcLog(LOG_LEVEL.DEBUG, 'Local video stream assigned');
        }
    }

    async assignRemoteStream() {
        if (this.remoteVideo && this.remoteStream) {
            // Clear any existing stream first
            if (this.remoteVideo.srcObject) {
                vcLog(LOG_LEVEL.DEBUG, 'Clearing existing remote video stream');
                this.remoteVideo.srcObject = null;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            vcLog(LOG_LEVEL.DEBUG, 'Assigning remote stream to video element');
            this.remoteVideo.srcObject = this.remoteStream;
            
            // Make video element visible
            this.remoteVideo.style.display = 'block';
            this.remoteVideo.style.visibility = 'visible';
            
            // Wait for metadata to load, then play
            if (this.remoteVideo.readyState >= 2) {
                await this.playRemoteVideo();
            }
            // Otherwise, the 'loadedmetadata' event listener will trigger playback
            
            vcLog(LOG_LEVEL.DEBUG, 'Remote video stream assigned');
        }
    }

    handleIncomingCall(data) {
        vcLog(LOG_LEVEL.INFO, 'Processing incoming call:', data);
        
        if (this.isCallActive) {
            vcLog(LOG_LEVEL.INFO, 'Already in a call, auto-declining');
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
            vcLog(LOG_LEVEL.INFO, 'Accepting call...');
            this.hideIncomingCallUI();
            this.stopRingtone();

            // Get user media first
            try {
                await this.getUserMedia();
                vcLog(LOG_LEVEL.INFO, 'Got user media for accepting call');
            } catch (mediaError) {
                vcLog(LOG_LEVEL.ERROR, ' Failed to get user media:', mediaError);
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
                vcLog(LOG_LEVEL.INFO, 'Receiver starting WebRTC after accepting');
                await this.startWebRTC(false);
            } else {
                vcLog(LOG_LEVEL.WARN, 'WebRTC already initialized, skipping duplicate initialization');
            }

        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error accepting call:', error);
            this.showNotification('Failed to accept call', 'error');
            this.cleanup();
        }
    }

    declineCall() {
        vcLog(LOG_LEVEL.INFO, 'Declining call...');
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
        vcLog(LOG_LEVEL.INFO, 'Ending call...');
        
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
            vcLog(LOG_LEVEL.WARN, 'WebRTC already initialized, skipping duplicate initialization');
            return;
        }
        
        vcLog(LOG_LEVEL.DEBUG, `Starting WebRTC (initiator: ${isInitiator})`);
        
        try {
            // Ensure we have local stream
            if (!this.localStream) {
                vcLog(LOG_LEVEL.WARN, 'No local stream available, getting media...');
                await this.getUserMedia();
            }

            // Create peer connection ONCE
            this.peerConnection = new RTCPeerConnection(this.iceServers);
            vcLog(LOG_LEVEL.DEBUG, 'Peer connection created');
            
            // Mark as initialized BEFORE any async operations
            this.webrtcInitialized = true;
            
            // Add local stream tracks BEFORE creating offer/answer
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                    vcLog(LOG_LEVEL.DEBUG, `Added local ${track.kind} track`);
                });
            } else {
                vcLog(LOG_LEVEL.ERROR, ' No local stream to add to peer connection');
            }

            // Handle remote stream
            this.peerConnection.ontrack = async (event) => {
                vcLog(LOG_LEVEL.DEBUG, 'Received remote track:', event.track.kind, 'state:', event.track.readyState);
                
                // Create remote stream if it doesn't exist
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                    vcLog(LOG_LEVEL.DEBUG, 'Created remote stream');
                }
                
                // Add track to remote stream
                this.remoteStream.addTrack(event.track);
                vcLog(LOG_LEVEL.DEBUG, `Added remote ${event.track.kind} track`);
                
                // Assign remote stream to video element (only once)
                if (this.remoteVideo && !this.remoteVideo.srcObject) {
                    await this.assignRemoteStream();
                }
            };

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    vcLog(LOG_LEVEL.DEBUG, 'Sending ICE candidate');
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
                vcLog(LOG_LEVEL.DEBUG, 'Connection state:', this.peerConnection.connectionState);
                
                if (this.peerConnection.connectionState === 'connected') {
                    vcLog(LOG_LEVEL.INFO, 'WebRTC connected successfully!');
                    this.showNotification('Connected', 'success');
                } else if (this.peerConnection.connectionState === 'failed') {
                    vcLog(LOG_LEVEL.ERROR, ' WebRTC connection failed');
                    this.showNotification('Connection failed', 'error');
                    this.endCall();
                } else if (this.peerConnection.connectionState === 'disconnected') {
                    vcLog(LOG_LEVEL.WARN, 'WebRTC connection disconnected');
                }
            };

            // ICE connection state changes
            this.peerConnection.oniceconnectionstatechange = () => {
                vcLog(LOG_LEVEL.DEBUG, 'ICE connection state:', this.peerConnection.iceConnectionState);
            };

            // Signaling state changes (for debugging)
            this.peerConnection.onsignalingstatechange = () => {
                vcLog(LOG_LEVEL.DEBUG, 'Signaling state:', this.peerConnection.signalingState);
            };

            // Create offer if initiator (after tracks are added)
            if (isInitiator) {
                // Wait a moment to ensure all tracks are fully added
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.createOffer();
            } else {
                vcLog(LOG_LEVEL.DEBUG, 'Receiver ready, waiting for offer...');
            }
            
        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error in startWebRTC:', error);
            this.webrtcInitialized = false; // Reset on error
            this.showNotification('Failed to establish connection', 'error');
            throw error;
        }
    }

    async createOffer() {
        try {
            vcLog(LOG_LEVEL.DEBUG, 'Creating offer...');
            
            // Verify signaling state before creating offer
            if (this.peerConnection.signalingState !== 'stable') {
                vcLog(LOG_LEVEL.ERROR, ' Cannot create offer, signaling state not stable:', this.peerConnection.signalingState);
                return;
            }
            
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            
            await this.peerConnection.setLocalDescription(offer);
            vcLog(LOG_LEVEL.DEBUG, 'Local description set (offer), signaling state:', this.peerConnection.signalingState);
            
            this.socket.emit('video-call:offer', {
                targetUserId: this.currentCall.targetUserId,
                offer: offer,
                callId: this.currentCall.callId
            });
            
            vcLog(LOG_LEVEL.DEBUG, 'Offer sent to server');
        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error creating offer:', error);
            throw error;
        }
    }

    async handleOffer(data) {
        try {
            vcLog(LOG_LEVEL.DEBUG, 'Processing offer from user:', data.from);
            
            // CRITICAL FIX: Don't call startWebRTC if already initialized
            if (!this.peerConnection) {
                vcLog(LOG_LEVEL.ERROR, ' No peer connection available - this should not happen. Call acceptCall first.');
                return;
            }
            
            // Verify signaling state before setting remote description
            if (this.peerConnection.signalingState !== 'stable') {
                vcLog(LOG_LEVEL.WARN, 'Signaling state not stable when receiving offer:', this.peerConnection.signalingState);
            }
            
            // Set remote description
            vcLog(LOG_LEVEL.DEBUG, 'Setting remote description (offer)...');
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            vcLog(LOG_LEVEL.DEBUG, 'Remote description set (offer), signaling state:', this.peerConnection.signalingState);
            
            // Create answer
            vcLog(LOG_LEVEL.DEBUG, 'Creating answer...');
            const answer = await this.peerConnection.createAnswer();
            
            await this.peerConnection.setLocalDescription(answer);
            vcLog(LOG_LEVEL.DEBUG, 'Local description set (answer), signaling state:', this.peerConnection.signalingState);
            
            // Send answer back
            this.socket.emit('video-call:answer', {
                targetUserId: data.from,
                answer: answer,
                callId: data.callId || this.currentCall?.callId
            });
            
            vcLog(LOG_LEVEL.DEBUG, 'Answer sent to server');
        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error handling offer:', error);
            this.showNotification('Connection error', 'error');
        }
    }

    async handleAnswer(data) {
        // CRITICAL FIX: Prevent processing duplicate answers
        if (this.isProcessingAnswer) {
            vcLog(LOG_LEVEL.WARN, 'Already processing an answer, ignoring duplicate');
            return;
        }
        
        try {
            this.isProcessingAnswer = true;
            vcLog(LOG_LEVEL.DEBUG, 'Processing answer...');
            
            if (!this.peerConnection) {
                vcLog(LOG_LEVEL.ERROR, ' No peer connection available to handle answer');
                return;
            }
            
            const currentState = this.peerConnection.signalingState;
            vcLog(LOG_LEVEL.DEBUG, 'Current signaling state:', currentState);
            
            // CRITICAL FIX: Only set remote description if we're in the correct state
            if (currentState === 'have-local-offer') {
                vcLog(LOG_LEVEL.DEBUG, 'Setting remote description (answer)...');
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                vcLog(LOG_LEVEL.DEBUG, 'Remote description set (answer), signaling state:', this.peerConnection.signalingState);
            } else if (currentState === 'stable') {
                vcLog(LOG_LEVEL.WARN, 'Already in stable state, ignoring answer (connection already established)');
            } else {
                vcLog(LOG_LEVEL.ERROR, ' Cannot set remote description, wrong state:', currentState);
            }
        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error handling answer:', error);
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
                vcLog(LOG_LEVEL.WARN, 'No peer connection available for ICE candidate');
                return;
            }
            
            if (data.candidate) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                vcLog(LOG_LEVEL.DEBUG, 'ICE candidate added');
            }
        } catch (error) {
            vcLog(LOG_LEVEL.ERROR, ' Error handling ICE candidate:', error);
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
                vcLog(LOG_LEVEL.DEBUG, 'Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
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
                vcLog(LOG_LEVEL.DEBUG, 'Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
            }
        }
    }

    cleanup() {
        vcLog(LOG_LEVEL.DEBUG, 'Cleaning up video call...');
        
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
                vcLog(LOG_LEVEL.DEBUG, `Stopped ${track.kind} track`);
            });
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
            vcLog(LOG_LEVEL.DEBUG, 'Peer connection closed');
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
        
        vcLog(LOG_LEVEL.DEBUG, 'Cleanup complete');
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
            
            vcLog(LOG_LEVEL.DEBUG, 'Showing video UI, checking video elements...');
            
            // Ensure video elements are visible (don't overwrite all styles with cssText)
            if (this.localVideo) {
                this.localVideo.style.display = 'block';
                this.localVideo.style.visibility = 'visible';
                this.localVideo.style.opacity = '1';
                
                const localComputedStyle = getComputedStyle(this.localVideo);
                vcLog(LOG_LEVEL.DEBUG, 'Local video element state:', {
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
                vcLog(LOG_LEVEL.ERROR, ' Local video element not found!');
            }
            
            if (this.remoteVideo) {
                this.remoteVideo.style.display = 'block';
                this.remoteVideo.style.visibility = 'visible';
                this.remoteVideo.style.opacity = '1';
                
                const remoteComputedStyle = getComputedStyle(this.remoteVideo);
                vcLog(LOG_LEVEL.DEBUG, 'Remote video element state:', {
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
                vcLog(LOG_LEVEL.ERROR, ' Remote video element not found!');
            }
            
            // Log video container state
            const videoContainer = videoUI.querySelector('.video-container');
            if (videoContainer) {
                const containerStyle = getComputedStyle(videoContainer);
                vcLog(LOG_LEVEL.DEBUG, 'Video container state:', {
                    width: containerStyle.width,
                    height: containerStyle.height,
                    position: containerStyle.position,
                    display: containerStyle.display,
                    zIndex: containerStyle.zIndex
                });
            }
            
            // Log video UI container state
            const videoUIStyle = getComputedStyle(videoUI);
            vcLog(LOG_LEVEL.DEBUG, 'VIDEO UI CONTAINER DEBUG:', {
                containerDisplay: videoUIStyle.display,
                containerVisibility: videoUIStyle.visibility,
                containerZIndex: videoUIStyle.zIndex,
                containerPosition: videoUIStyle.position,
                containerWidth: videoUIStyle.width,
                containerHeight: videoUIStyle.height,
                containerTop: videoUIStyle.top,
                containerLeft: videoUIStyle.left
            });
            
            vcLog(LOG_LEVEL.DEBUG, 'Video UI shown with proper styling');
        } else {
            vcLog(LOG_LEVEL.ERROR, ' Video UI element not found!');
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
            // Modern Gen Z-style notification sound using Web Audio API
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            vcLog(LOG_LEVEL.DEBUG, 'Playing modern ringtone...');
            
            // Create a trendy lo-fi / synthwave notification sound
            const playModernRingtone = () => {
                const ctx = this.audioContext;
                const now = ctx.currentTime;
                
                // Create a filter for that lo-fi vibe
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 2000;
                filter.Q.value = 1;
                
                // Main gain node
                const mainGain = ctx.createGain();
                mainGain.connect(filter);
                filter.connect(ctx.destination);
                
                // First note (C5 - 523 Hz) - short and punchy
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.connect(gain1);
                gain1.connect(mainGain);
                osc1.type = 'sine';
                osc1.frequency.value = 523;
                gain1.gain.setValueAtTime(0.3, now);
                gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc1.start(now);
                osc1.stop(now + 0.15);
                
                // Second note (E5 - 659 Hz) - slightly delayed
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(mainGain);
                osc2.type = 'sine';
                osc2.frequency.value = 659;
                gain2.gain.setValueAtTime(0, now + 0.12);
                gain2.gain.setValueAtTime(0.3, now + 0.13);
                gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
                osc2.start(now + 0.12);
                osc2.stop(now + 0.28);
                
                // Third note (G5 - 784 Hz) - the hook
                const osc3 = ctx.createOscillator();
                const gain3 = ctx.createGain();
                osc3.connect(gain3);
                gain3.connect(mainGain);
                osc3.type = 'sine';
                osc3.frequency.value = 784;
                gain3.gain.setValueAtTime(0, now + 0.24);
                gain3.gain.setValueAtTime(0.35, now + 0.25);
                gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                osc3.start(now + 0.24);
                osc3.stop(now + 0.5);
                
                // Add a subtle bass note for depth
                const bassOsc = ctx.createOscillator();
                const bassGain = ctx.createGain();
                bassOsc.connect(bassGain);
                bassGain.connect(mainGain);
                bassOsc.type = 'sine';
                bassOsc.frequency.value = 130; // C3
                bassGain.gain.setValueAtTime(0.15, now);
                bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                bassOsc.start(now);
                bassOsc.stop(now + 0.4);
            };
            
            // Play immediately
            playModernRingtone();
            
            // Repeat every 2 seconds (not too annoying)
            this.ringtoneInterval = setInterval(() => {
                if (this.audioContext) {
                    playModernRingtone();
                }
            }, 2000);
            
        } catch (e) {
            vcLog(LOG_LEVEL.DEBUG, 'Ringtone not available:', e);
        }
    }

    stopRingtone() {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
        if (this.audioContext) {
            this.audioContext.close().catch(e => vcLog(LOG_LEVEL.WARN, 'Error closing audio context:', e));
            this.audioContext = null;
        }
    }

    showNotification(message, type = 'info') {
        vcLog(LOG_LEVEL.INFO, `${type.toUpperCase()}: ${message}`);
        
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
                vcLog(LOG_LEVEL.DEBUG, 'Set window.currentUserId from window.currentUser:', window.currentUserId);
            }
            
            vcLog(LOG_LEVEL.INFO, 'Initializing Video Call System');
            window.videoCallSystem = new VideoCallSystem();
            window.videoCallManager = window.videoCallSystem; // Alias for compatibility
            return true;
        }
        return false;
    };
    
    // Try to initialize immediately
    if (!initVideoCall()) {
        vcLog(LOG_LEVEL.DEBUG, 'Waiting for socket and user ID...');
        // Keep trying until successful
        const checkInterval = setInterval(() => {
            if (initVideoCall()) {
                clearInterval(checkInterval);
            }
        }, 500);
    }
}
