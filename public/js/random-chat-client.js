/**
 * 🎲 RANDOM CHAT CLIENT - Coomeet Model
 * Client-side chat manager for random video/text chat
 */

class RandomChatClient {
    constructor() {
        this.socket = null;
        this.webrtc = null;
        this.currentRoomId = null;
        this.currentPartnerId = null;
        this.currentPartnerUsername = null;
        this.isInQueue = false;
        this.isInChat = false;
        this.isVideoMode = false;
        this.typingTimeout = null;

        this.init();
    }

    async init() {
        // Initialize Socket.IO
        this.socket = io({
            transports: ['polling', 'websocket'],
            upgrade: true,
            rememberUpgrade: true
        });

        this.setupSocketEvents();
        await this.checkCurrentStatus();
    }

    setupSocketEvents() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('🎲 Connected to random chat server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('🎲 Disconnected from random chat server');
            this.updateConnectionStatus(false);
        });

        // Queue events
        this.socket.on('random_chat:queue_joined', (data) => {
            console.log('👥 Joined queue:', data);
            this.onQueueJoined(data);
        });

        this.socket.on('random_chat:already_in_queue', (data) => {
            console.log('👥 Already in queue:', data);
            this.onQueueJoined(data);
        });

        this.socket.on('random_chat:queue_left', () => {
            console.log('👋 Left queue');
            this.onQueueLeft();
        });

        // Match events
        this.socket.on('random_chat:match_found', async (data) => {
            console.log('🎉 Match found:', data);
            await this.onMatchFound(data);
        });

        // Message events
        this.socket.on('random_chat:new_message', (data) => {
            this.onNewMessage(data);
        });

        this.socket.on('random_chat:system_message', (data) => {
            this.onSystemMessage(data);
        });

        // Typing events
        this.socket.on('random_chat:partner_typing', (data) => {
            this.onPartnerTyping(data);
        });

        // Chat end events
        this.socket.on('random_chat:chat_ended', (data) => {
            this.onChatEnded(data);
        });

        // Report events
        this.socket.on('random_chat:report_submitted', () => {
            this.showNotification('Report submitted successfully', 'success');
        });

        // Error events
        this.socket.on('random_chat:error', (data) => {
            console.error('❌ Random chat error:', data);
            this.showNotification(data.message || 'An error occurred', 'error');
        });
    }

    async checkCurrentStatus() {
        try {
            const response = await fetch('/api/random-chat/status', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to check status');
            }

            const data = await response.json();

            if (data.status === 'in_queue') {
                this.isInQueue = true;
                this.showQueueScreen(data.data);
            } else if (data.status === 'in_chat') {
                this.isInChat = true;
                this.currentRoomId = data.data.room_id;
                this.currentPartnerId = data.data.partner_id;
                this.currentPartnerUsername = data.data.partner_username;
                this.showChatScreen();
            } else {
                this.showStartScreen();
            }

        } catch (error) {
            console.error('❌ Error checking status:', error);
            this.showStartScreen();
        }
    }

    async joinQueue(preferences = {}) {
        try {
            this.socket.emit('random_chat:join_queue', {
                preferences: preferences
            });

        } catch (error) {
            console.error('❌ Error joining queue:', error);
            this.showNotification('Failed to join queue', 'error');
        }
    }

    leaveQueue() {
        this.socket.emit('random_chat:leave_queue');
    }

    sendMessage(message) {
        if (!this.currentRoomId || !message.trim()) return;

        this.socket.emit('random_chat:send_message', {
            roomId: this.currentRoomId,
            message: message.trim()
        });

        // Clear input
        const input = document.getElementById('messageInput');
        if (input) {
            input.value = '';
        }

        // Stop typing indicator
        this.stopTyping();
    }

    startTyping() {
        if (!this.currentRoomId) return;

        this.socket.emit('random_chat:typing', {
            roomId: this.currentRoomId,
            isTyping: true
        });

        // Auto-stop typing after 3 seconds
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 3000);
    }

    stopTyping() {
        if (!this.currentRoomId) return;

        this.socket.emit('random_chat:typing', {
            roomId: this.currentRoomId,
            isTyping: false
        });

        clearTimeout(this.typingTimeout);
    }

    skipPartner() {
        if (confirm('Are you sure you want to skip this person and find someone new?')) {
            this.socket.emit('random_chat:skip_partner');
            this.cleanup();
        }
    }

    endChat() {
        if (confirm('Are you sure you want to end this chat?')) {
            this.socket.emit('random_chat:end_chat');
            this.cleanup();
        }
    }

    reportUser(reason, description = '') {
        this.socket.emit('random_chat:report_user', {
            reportedUserId: this.currentPartnerId,
            roomId: this.currentRoomId,
            reason,
            description
        });
    }

    async startVideo() {
        try {
            this.isVideoMode = true;

            const localVideo = document.getElementById('localVideo');
            const remoteVideo = document.getElementById('remoteVideo');

            // Initialize WebRTC
            this.webrtc = new WebRTCHandler(this.socket, this.currentRoomId);

            // Setup connection state callback
            this.webrtc.onConnectionStateChange = (state) => {
                this.updateVideoConnectionStatus(state);
            };

            // Start local video
            await this.webrtc.startVideo(localVideo, remoteVideo);

            // Initiate peer connection (first user to start video initiates)
            setTimeout(() => {
                this.webrtc.initiatePeerConnection();
            }, 1000);

            this.updateVideoControls();
            this.showNotification('Video started', 'success');

        } catch (error) {
            console.error('❌ Error starting video:', error);
            this.showNotification(error.message || 'Failed to start video', 'error');
            this.isVideoMode = false;
        }
    }

    stopVideo() {
        if (this.webrtc) {
            this.webrtc.cleanup();
            this.webrtc = null;
        }

        this.isVideoMode = false;
        this.updateVideoControls();
    }

    toggleVideo() {
        if (!this.webrtc) return;

        const enabled = this.webrtc.toggleVideo(!this.webrtc.getVideoEnabled());
        this.updateVideoControls();

        return enabled;
    }

    toggleAudio() {
        if (!this.webrtc) return;

        const enabled = this.webrtc.toggleAudio(!this.webrtc.getAudioEnabled());
        this.updateAudioControls();

        return enabled;
    }

    // UI Update Methods
    onQueueJoined(data) {
        this.isInQueue = true;
        this.showQueueScreen(data);
    }

    onQueueLeft() {
        this.isInQueue = false;
        this.showStartScreen();
    }

    async onMatchFound(data) {
        this.isInQueue = false;
        this.isInChat = true;
        this.currentRoomId = data.roomId;
        this.currentPartnerId = data.partner.id;
        this.currentPartnerUsername = data.partner.username;

        this.showChatScreen();
        this.showNotification(`Connected with ${data.partner.username}!`, 'success');
    }

    onNewMessage(data) {
        const isOwn = data.senderId !== this.currentPartnerId;
        this.addMessageToUI(data.message, isOwn, data.createdAt);

        // Stop typing indicator when message received
        if (!isOwn) {
            this.hideTypingIndicator();
        }
    }

    onSystemMessage(data) {
        this.addSystemMessageToUI(data.message);
    }

    onPartnerTyping(data) {
        if (data.isTyping) {
            this.showTypingIndicator();
        } else {
            this.hideTypingIndicator();
        }
    }

    onChatEnded(data) {
        this.showNotification('Chat ended', 'info');
        this.cleanup();
        this.showStartScreen();
    }

    // Screen management
    showStartScreen() {
        document.getElementById('startScreen')?.classList.remove('hidden');
        document.getElementById('queueScreen')?.classList.add('hidden');
        document.getElementById('chatScreen')?.classList.add('hidden');
    }

    showQueueScreen(data) {
        document.getElementById('startScreen')?.classList.add('hidden');
        document.getElementById('queueScreen')?.classList.remove('hidden');
        document.getElementById('chatScreen')?.classList.add('hidden');

        // Update queue info
        const positionEl = document.getElementById('queuePosition');
        if (positionEl) {
            positionEl.textContent = data.position || '...';
        }

        const waitEl = document.getElementById('estimatedWait');
        if (waitEl) {
            waitEl.textContent = `~${data.estimatedWait || 5}s`;
        }
    }

    showChatScreen() {
        document.getElementById('startScreen')?.classList.add('hidden');
        document.getElementById('queueScreen')?.classList.add('hidden');
        document.getElementById('chatScreen')?.classList.remove('hidden');

        // Update partner info
        const partnerNameEl = document.getElementById('partnerName');
        if (partnerNameEl) {
            partnerNameEl.textContent = this.currentPartnerUsername || 'Anonymous';
        }

        // Clear messages
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }

        // Focus on input
        setTimeout(() => {
            document.getElementById('messageInput')?.focus();
        }, 100);
    }

    addMessageToUI(message, isOwn, timestamp) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOwn ? 'message-own' : 'message-other'}`;

        const time = new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div class="message-bubble">
                <div class="message-text">${this.escapeHtml(message)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    addSystemMessageToUI(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = 'message message-system';
        messageEl.innerHTML = `<div class="system-text">${this.escapeHtml(message)}</div>`;

        container.appendChild(messageEl);
        container.scrollTop = container.scrollHeight;
    }

    showTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connectionStatus');
        if (statusEl) {
            statusEl.textContent = connected ? 'Connected' : 'Disconnected';
            statusEl.className = connected ? 'status-connected' : 'status-disconnected';
        }
    }

    updateVideoConnectionStatus(state) {
        const statusEl = document.getElementById('videoConnectionStatus');
        if (statusEl) {
            statusEl.textContent = state;
            statusEl.className = `video-status video-status-${state}`;
        }
    }

    updateVideoControls() {
        const videoBtn = document.getElementById('toggleVideoBtn');
        if (videoBtn && this.webrtc) {
            const enabled = this.webrtc.getVideoEnabled();
            videoBtn.innerHTML = enabled ? '📹 Video On' : '📹 Video Off';
            videoBtn.className = enabled ? 'btn-video-on' : 'btn-video-off';
        }
    }

    updateAudioControls() {
        const audioBtn = document.getElementById('toggleAudioBtn');
        if (audioBtn && this.webrtc) {
            const enabled = this.webrtc.getAudioEnabled();
            audioBtn.innerHTML = enabled ? '🎤 Mic On' : '🎤 Mic Off';
            audioBtn.className = enabled ? 'btn-audio-on' : 'btn-audio-off';
        }
    }

    showNotification(message, type = 'info') {
        // Use existing toast system if available
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        this.stopVideo();
        this.currentRoomId = null;
        this.currentPartnerId = null;
        this.currentPartnerUsername = null;
        this.isInChat = false;
        this.isInQueue = false;
    }
}

// Initialize when DOM is ready
let randomChatClient = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎲 Initializing random chat client...');
    randomChatClient = new RandomChatClient();
    window.randomChatClient = randomChatClient;
});
