/**
 * 📹 WEBRTC HANDLER - Peer-to-Peer Video Chat
 * Handles video/audio streaming between users
 */

class WebRTCHandler {
    constructor(socket, roomId) {
        this.socket = socket;
        this.roomId = roomId;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isInitiator = false;

        // ICE servers for NAT traversal
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        this.setupSignaling();
    }

    setupSignaling() {
        // Listen for WebRTC signaling events for both friend calls and random chat
        
        // Friend video call signaling
        this.socket.on('friend:webrtc_offer', async (data) => {
            console.log('📥 Received WebRTC offer from friend');
            await this.handleOffer(data.signal);
        });

        this.socket.on('friend:webrtc_answer', async (data) => {
            console.log('📥 Received WebRTC answer from friend');
            await this.handleAnswer(data.signal);
        });

        this.socket.on('friend:webrtc_ice_candidate', async (data) => {
            console.log('📥 Received ICE candidate from friend');
            await this.handleIceCandidate(data.signal);
        });

        // Random chat signaling (for backward compatibility)
        this.socket.on('random_chat:webrtc_offer', async (data) => {
            console.log('📥 Received WebRTC offer');
            await this.handleOffer(data.signal);
        });

        this.socket.on('random_chat:webrtc_answer', async (data) => {
            console.log('📥 Received WebRTC answer');
            await this.handleAnswer(data.signal);
        });

        this.socket.on('random_chat:webrtc_ice_candidate', async (data) => {
            console.log('📥 Received ICE candidate');
            await this.handleIceCandidate(data.signal);
        });
    }

    async startVideo(localVideoElement, remoteVideoElement) {
        try {
            console.log('📹 Starting video...');

            // Check for WebRTC support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('WebRTC is not supported in this browser');
            }

            // Get user media (camera + microphone)
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
            if (localVideoElement) {
                localVideoElement.srcObject = this.localStream;
                localVideoElement.muted = true; // Mute own audio to prevent echo
                
                // Ensure video plays
                localVideoElement.onloadedmetadata = () => {
                    localVideoElement.play().catch(e => {
                        console.warn('⚠️ Autoplay prevented:', e);
                    });
                };
            }

            // Store remote video element reference
            this.remoteVideoElement = remoteVideoElement;

            console.log('✅ Local video stream started');
            return true;

        } catch (error) {
            console.error('❌ Error starting video:', error);

            // Show user-friendly error messages
            if (error.name === 'NotAllowedError') {
                throw new Error('Camera/microphone permission denied. Please allow access and try again.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No camera or microphone found. Please check your devices.');
            } else if (error.name === 'NotSupportedError') {
                throw new Error('Your browser does not support video calling.');
            } else if (error.name === 'OverconstrainedError') {
                throw new Error('Camera settings not supported. Trying with default settings...');
            } else {
                throw new Error('Failed to start video: ' + (error.message || 'Unknown error'));
            }
        }
    }

    async initiatePeerConnection() {
        try {
            console.log('🤝 Initiating peer connection...');
            this.isInitiator = true;

            // Create peer connection
            this.createPeerConnection();

            // Add local stream tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }

            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            // Send offer to remote peer
            const eventName = this.friendId ? 'friend:webrtc_offer' : 'random_chat:webrtc_offer';
            const eventData = this.friendId
                ? { friendId: this.friendId, signal: offer }
                : { roomId: this.roomId, signal: offer };

            this.socket.emit(eventName, eventData);

            console.log('📤 Sent WebRTC offer');

        } catch (error) {
            console.error('❌ Error initiating peer connection:', error);
            throw error;
        }
    }

    createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.peerConnection = new RTCPeerConnection(this.iceServers);

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📤 Sending ICE candidate');
                const eventName = this.friendId ? 'friend:webrtc_ice_candidate' : 'random_chat:webrtc_ice_candidate';
                const eventData = this.friendId
                    ? { friendId: this.friendId, signal: event.candidate }
                    : { roomId: this.roomId, signal: event.candidate };

                this.socket.emit(eventName, eventData);
            }
        };

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📥 Received remote stream');

            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();

                if (this.remoteVideoElement) {
                    this.remoteVideoElement.srcObject = this.remoteStream;
                }
            }

            this.remoteStream.addTrack(event.track);
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔄 Connection state:', this.peerConnection.connectionState);

            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(this.peerConnection.connectionState);
            }

            switch (this.peerConnection.connectionState) {
                case 'connected':
                    console.log('✅ Peer connection established successfully');
                    break;
                case 'disconnected':
                    console.warn('⚠️ Peer connection disconnected, attempting reconnection...');
                    break;
                case 'failed':
                    console.error('❌ Peer connection failed');
                    this.reconnect();
                    break;
                case 'closed':
                    console.log('📴 Peer connection closed');
                    break;
            }
        };

        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('🔄 ICE connection state:', this.peerConnection.iceConnectionState);

            if (this.peerConnection.iceConnectionState === 'disconnected') {
                console.warn('⚠️ ICE connection disconnected');
            }
        };
    }

    async handleOffer(offer) {
        try {
            console.log('📥 Handling WebRTC offer');

            // Create peer connection
            this.createPeerConnection();

            // Add local stream tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    this.peerConnection.addTrack(track, this.localStream);
                });
            }

            // Set remote description
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            // Create and send answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            const eventName = this.friendId ? 'friend:webrtc_answer' : 'random_chat:webrtc_answer';
            const eventData = this.friendId
                ? { friendId: this.friendId, signal: answer }
                : { roomId: this.roomId, signal: answer };

            this.socket.emit(eventName, eventData);

            console.log('📤 Sent WebRTC answer');

        } catch (error) {
            console.error('❌ Error handling offer:', error);
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            console.log('📥 Handling WebRTC answer');

            if (!this.peerConnection) {
                console.error('❌ Peer connection not initialized');
                return;
            }

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ Remote description set');

        } catch (error) {
            console.error('❌ Error handling answer:', error);
            throw error;
        }
    }

    async handleIceCandidate(candidate) {
        try {
            if (!this.peerConnection) {
                console.error('❌ Peer connection not initialized');
                return;
            }

            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ ICE candidate added');

        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    async reconnect() {
        console.log('🔄 Attempting to reconnect...');

        try {
            this.createPeerConnection();

            if (this.isInitiator) {
                await this.initiatePeerConnection();
            }
        } catch (error) {
            console.error('❌ Reconnection failed:', error);
        }
    }

    toggleVideo(enabled) {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = enabled;
                console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`);
                return true;
            }
        }
        return false;
    }

    toggleAudio(enabled) {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = enabled;
                console.log(`🎤 Audio ${enabled ? 'enabled' : 'disabled'}`);
                return true;
            }
        }
        return false;
    }

    getVideoEnabled() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            return videoTrack ? videoTrack.enabled : false;
        }
        return false;
    }

    getAudioEnabled() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            return audioTrack ? audioTrack.enabled : false;
        }
        return false;
    }

    async switchCamera() {
        try {
            if (!this.localStream) return false;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return false;

            // Get current facing mode
            const currentFacingMode = videoTrack.getSettings().facingMode || 'user';
            const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

            // Stop current track
            videoTrack.stop();

            // Get new stream with new facing mode
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: newFacingMode
                },
                audio: false
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Replace track in peer connection
            if (this.peerConnection) {
                const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(newVideoTrack);
                }
            }

            // Update local stream
            this.localStream.removeTrack(videoTrack);
            this.localStream.addTrack(newVideoTrack);

            console.log(`📹 Switched camera to ${newFacingMode}`);
            return true;

        } catch (error) {
            console.error('❌ Error switching camera:', error);
            return false;
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up WebRTC...');

        // Stop all tracks
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

        console.log('✅ WebRTC cleanup complete');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCHandler;
}
