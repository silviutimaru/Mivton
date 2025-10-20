/**
 * 🎥 MIVTON VIDEO CALLING SYSTEM - COMPLETE INTEGRATION
 * Production-ready video calling with WebRTC peer-to-peer
 * 
 * Features:
 * - One-on-one video calls
 * - Audio/video controls
 * - Beautiful responsive UI
 * - Security (friends only)
 * - Mobile compatible
 */

class MivtonVideoCallManager {
    constructor() {
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.socket = window.socket;
        this.userId = window.currentUserId || window.currentUser?.id;
        this.isCallActive = false;
        this.isMuted = false;
        this.isVideoOff = false;
        this.callStartTime = null;
        this.callDurationInterval = null;

        // ICE servers for NAT traversal
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        console.log('🎥 Mivton Video Call Manager initialized', {
            userId: this.userId,
            socketConnected: this.socket?.connected
        });

        this.initialize();
    }

    async initialize() {
        console.log('🚀 Initializing video call manager...');

        // Create UI elements
        this.createVideoUI();
        this.attachEventListeners();
        this.setupSocketListeners();

        // Register for calls if socket is connected
        if (this.socket?.connected && this.userId) {
            this.registerForCalls();
        }

        // Also handle future connections
        if (this.socket) {
            this.socket.on('connect', () => {
                console.log('✅ Socket reconnected, registering for video calls');
                this.registerForCalls();
            });
        }

        console.log('✅ Video call manager ready');
    }

    registerForCalls() {
        if (this.userId && this.socket) {
            // Register user for receiving calls
            this.socket.emit('chat:register', this.userId);
            console.log(`📝 Registered user ${this.userId} for video calls`);
        }
    }

    createVideoUI() {
        // Create main video call container
        const container = document.createElement('div');
        container.id = 'mivton-video-call-container';
        container.className = 'mivton-video-call-container';
        container.innerHTML = `
            <!-- Incoming Call Modal -->
            <div id="mivton-incoming-call" class="mivton-incoming-call" style="display: none;">
                <div class="incoming-call-content">
                    <div class="caller-info">
                        <img id="callerAvatar" src="/images/default-avatar.svg" alt="Caller" class="caller-avatar">
                        <div class="caller-details">
                            <h2 id="callerName">Friend Name</h2>
                            <p class="calling-text">Incoming video call...</p>
                        </div>
                    </div>
                    <div class="call-buttons">
                        <button id="mivton-decline-call" class="btn-call decline-btn">
                            <span>✕</span>
                            <p>Decline</p>
                        </button>
                        <button id="mivton-accept-call" class="btn-call accept-btn">
                            <span>✓</span>
                            <p>Accept</p>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Calling (Initiating) Modal -->
            <div id="mivton-calling" class="mivton-calling" style="display: none;">
                <div class="calling-content">
                    <div class="calling-info">
                        <img id="calleeAvatar" src="/images/default-avatar.svg" alt="Friend" class="callee-avatar">
                        <div class="calling-details">
                            <h2 id="calleeName">Friend Name</h2>
                            <p class="calling-text">Initiating call...</p>
                        </div>
                    </div>
                    <div class="calling-animation">
                        <div class="pulse"></div>
                        <div class="pulse"></div>
                        <div class="pulse"></div>
                    </div>
                    <div class="call-buttons">
                        <button id="mivton-cancel-call" class="btn-call cancel-btn">
                            <span>✕</span>
                            <p>Cancel</p>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Active Video Call -->
            <div id="mivton-video-call" class="mivton-video-call" style="display: none;">
                <div class="video-streams">
                    <video id="mivton-remote-video" class="video remote-video" autoplay playsinline></video>
                    <video id="mivton-local-video" class="video local-video" autoplay playsinline muted></video>
                </div>

                <div class="call-info-bar">
                    <span id="mivton-call-duration" class="call-duration">00:00</span>
                    <span id="mivton-call-status" class="call-status">Connected</span>
                </div>

                <div class="video-controls">
                    <button id="mivton-toggle-audio" class="control-btn mic-btn" title="Toggle Microphone">
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                            <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
                        </svg>
                    </button>
                    <button id="mivton-toggle-video" class="control-btn video-btn" title="Toggle Camera">
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z"/>
                        </svg>
                    </button>
                    <button id="mivton-end-call" class="control-btn end-btn" title="End Call">
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(container);

        // Store video element references
        this.elements = {
            container: container,
            incomingCall: document.getElementById('mivton-incoming-call'),
            calling: document.getElementById('mivton-calling'),
            videoCall: document.getElementById('mivton-video-call'),
            localVideo: document.getElementById('mivton-local-video'),
            remoteVideo: document.getElementById('mivton-remote-video'),
            toggleAudio: document.getElementById('mivton-toggle-audio'),
            toggleVideo: document.getElementById('mivton-toggle-video'),
            endCall: document.getElementById('mivton-end-call'),
            acceptCall: document.getElementById('mivton-accept-call'),
            declineCall: document.getElementById('mivton-decline-call'),
            cancelCall: document.getElementById('mivton-cancel-call'),
            callDuration: document.getElementById('mivton-call-duration'),
            callerName: document.getElementById('callerName'),
            callerAvatar: document.getElementById('callerAvatar'),
            calleeName: document.getElementById('calleeName'),
            calleeAvatar: document.getElementById('calleeAvatar')
        };

        console.log('✅ Video UI created');
    }

    attachEventListeners() {
        // Call buttons
        this.elements.acceptCall.addEventListener('click', () => this.acceptCall());
        this.elements.declineCall.addEventListener('click', () => this.declineCall());
        this.elements.cancelCall.addEventListener('click', () => this.cancelCall());
        this.elements.endCall.addEventListener('click', () => this.endCall());

        // Control buttons
        this.elements.toggleAudio.addEventListener('click', () => this.toggleAudio());
        this.elements.toggleVideo.addEventListener('click', () => this.toggleVideo());

        // Delegate click events for initiating calls from friends list
        document.addEventListener('click', (e) => {
            const videoCallBtn = e.target.closest('.video-call-trigger');
            if (videoCallBtn) {
                const friendId = videoCallBtn.dataset.friendId;
                const friendName = videoCallBtn.dataset.friendName || 'Friend';
                const friendAvatar = videoCallBtn.dataset.friendAvatar || '/images/default-avatar.svg';

                this.initiateCall(friendId, friendName, friendAvatar);
            }
        });

        console.log('✅ Event listeners attached');
    }

    setupSocketListeners() {
        if (!this.socket) {
            console.warn('⚠️ Socket not available');
            return;
        }

        // Incoming call
        this.socket.on('video-call:incoming', (data) => {
            console.log('📞 Incoming call:', data);
            this.handleIncomingCall(data);
        });

        // Call accepted
        this.socket.on('video-call:accepted', async (data) => {
            console.log('✅ Call accepted');
            this.hideCallingUI();
            this.showVideoCallUI();
            await this.startWebRTC(true);
        });

        // Call declined
        this.socket.on('video-call:declined', (data) => {
            console.log('❌ Call declined');
            this.hideAllUI();
            this.showNotification('Call declined', 'error');
            this.cleanup();
        });

        // Call ended
        this.socket.on('video-call:ended', (data) => {
            console.log('📴 Call ended');
            this.endCallInternal(false);
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
            await this.handleICECandidate(data);
        });

        // Errors
        this.socket.on('video-call:error', (data) => {
            console.error('❌ Video call error:', data);
            this.hideAllUI();
            this.showNotification(data.error || 'Call failed', 'error');
            this.cleanup();
        });

        console.log('✅ Socket listeners attached');
    }

    async initiateCall(friendId, friendName, friendAvatar) {
        if (this.isCallActive) {
            this.showNotification('Already in a call', 'warning');
            return;
        }

        console.log(`📞 Initiating call to ${friendName} (${friendId})`);

        this.currentCall = {
            friendId: parseInt(friendId),
            friendName,
            friendAvatar: friendAvatar || '/images/default-avatar.svg',
            isInitiator: true,
            callId: `call_${this.userId}_${friendId}_${Date.now()}`
        };

        // Request media
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });

            this.showCallingUI(friendName, friendAvatar);
            this.isCallActive = true;

            // Emit initiate call
            this.socket.emit('video-call:initiate', {
                targetUserId: parseInt(friendId),
                callerInfo: {
                    id: this.userId,
                    name: window.currentUserName || 'User',
                    avatar: window.currentUserAvatar || '/images/default-avatar.svg'
                }
            });

        } catch (error) {
            console.error('❌ Error accessing media:', error);
            this.showNotification('Camera/microphone access denied', 'error');
        }
    }

    handleIncomingCall(data) {
        if (this.isCallActive) {
            console.log('⚠️ Already in a call, declining');
            if (this.socket) {
                this.socket.emit('video-call:decline', {
                    callId: data.callId,
                    callerId: data.caller?.id
                });
            }
            return;
        }

        console.log('📥 Processing incoming call');

        this.currentCall = {
            callId: data.callId,
            callerId: data.caller?.id,
            friendName: data.caller?.name || 'Friend',
            friendAvatar: data.caller?.avatar || '/images/default-avatar.svg',
            isInitiator: false
        };

        this.showIncomingCallUI(this.currentCall.friendName, this.currentCall.friendAvatar);
    }

    async acceptCall() {
        try {
            console.log('✅ Accepting call...');

            // Get media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });

            this.hideIncomingCallUI();
            this.showVideoCallUI();
            this.isCallActive = true;

            // Emit accept
            this.socket.emit('video-call:accept', {
                callId: this.currentCall.callId,
                callerId: this.currentCall.callerId
            });

            // Start WebRTC
            await this.startWebRTC(false);

        } catch (error) {
            console.error('❌ Error accepting call:', error);
            this.showNotification('Failed to accept call', 'error');
            this.cleanup();
        }
    }

    declineCall() {
        console.log('❌ Declining call');
        if (this.socket) {
            this.socket.emit('video-call:decline', {
                callId: this.currentCall.callId,
                callerId: this.currentCall.callerId
            });
        }
        this.hideIncomingCallUI();
        this.cleanup();
    }

    cancelCall() {
        console.log('❌ Canceling call');
        this.hideCallingUI();
        this.cleanup();
    }

    async startWebRTC(isInitiator) {
        console.log(`🔄 Starting WebRTC (initiator: ${isInitiator})`);

        try {
            this.peerConnection = new RTCPeerConnection(this.iceServers);

            // Add local tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }

            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                console.log('📹 Received remote track:', event.track.kind);
                if (!this.remoteStream) {
                    this.remoteStream = new MediaStream();
                    this.elements.remoteVideo.srcObject = this.remoteStream;
                }
                this.remoteStream.addTrack(event.track);
            };

            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('video-call:ice-candidate', {
                        targetUserId: this.currentCall.friendId || this.currentCall.callerId,
                        candidate: event.candidate,
                        callId: this.currentCall.callId
                    });
                }
            };

            // Connection state
            this.peerConnection.onconnectionstatechange = () => {
                console.log('📡 Connection state:', this.peerConnection.connectionState);
                if (this.peerConnection.connectionState === 'connected') {
                    console.log('✅ WebRTC connected!');
                    this.startCallDurationTimer();
                    this.showNotification('Connected', 'success');
                }
            };

            // Set local video
            if (this.localStream) {
                this.elements.localVideo.srcObject = this.localStream;
            }

            // Create offer if initiator
            if (isInitiator) {
                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);

                this.socket.emit('video-call:offer', {
                    targetUserId: this.currentCall.friendId,
                    offer: offer,
                    callId: this.currentCall.callId
                });
            }

        } catch (error) {
            console.error('❌ WebRTC error:', error);
            this.showNotification('Connection failed', 'error');
            this.endCall();
        }
    }

    async handleOffer(data) {
        try {
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

        } catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    }

    async handleAnswer(data) {
        try {
            if (this.peerConnection && this.peerConnection.signalingState === 'have-local-offer') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        } catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    }

    async handleICECandidate(data) {
        try {
            if (this.peerConnection && data.candidate) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                this.isMuted = !this.isMuted;
                audioTrack.enabled = !this.isMuted;
                this.elements.toggleAudio.classList.toggle('muted', this.isMuted);
            }
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.isVideoOff = !this.isVideoOff;
                videoTrack.enabled = !this.isVideoOff;
                this.elements.toggleVideo.classList.toggle('off', this.isVideoOff);
            }
        }
    }

    endCall() {
        if (this.isCallActive && this.currentCall) {
            this.socket.emit('video-call:end', {
                callId: this.currentCall.callId,
                otherUserId: this.currentCall.friendId || this.currentCall.callerId
            });
        }
        this.endCallInternal();
    }

    endCallInternal(notifyUser = true) {
        this.hideAllUI();
        this.cleanup();
        if (notifyUser) {
            this.showNotification('Call ended', 'info');
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up...');

        // Stop media
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

        // Clear video elements
        this.elements.localVideo.srcObject = null;
        this.elements.remoteVideo.srcObject = null;

        // Stop timer
        if (this.callDurationInterval) {
            clearInterval(this.callDurationInterval);
            this.callDurationInterval = null;
        }

        // Reset state
        this.currentCall = null;
        this.isCallActive = false;
        this.isMuted = false;
        this.isVideoOff = false;
    }

    startCallDurationTimer() {
        this.callStartTime = Date.now();
        this.callDurationInterval = setInterval(() => {
            const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            this.elements.callDuration.textContent = 
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    showIncomingCallUI(name, avatar) {
        this.hideAllUI();
        this.elements.callerName.textContent = name;
        this.elements.callerAvatar.src = avatar;
        this.elements.incomingCall.style.display = 'flex';
    }

    showCallingUI(name, avatar) {
        this.hideAllUI();
        this.elements.calleeName.textContent = name;
        this.elements.calleeAvatar.src = avatar;
        this.elements.calling.style.display = 'flex';
    }

    showVideoCallUI() {
        this.hideAllUI();
        this.elements.videoCall.style.display = 'flex';
    }

    hideIncomingCallUI() {
        this.elements.incomingCall.style.display = 'none';
    }

    hideCallingUI() {
        this.elements.calling.style.display = 'none';
    }

    hideVideoCallUI() {
        this.elements.videoCall.style.display = 'none';
    }

    hideAllUI() {
        this.hideIncomingCallUI();
        this.hideCallingUI();
        this.hideVideoCallUI();
    }

    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize on document ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.mivtonVideoCallManager) {
            window.mivtonVideoCallManager = new MivtonVideoCallManager();
        }
    });
} else {
    if (!window.mivtonVideoCallManager) {
        window.mivtonVideoCallManager = new MivtonVideoCallManager();
    }
}

console.log('✅ Mivton Video Call Manager loaded');
