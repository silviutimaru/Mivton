/**
 * 🔧 MIVTON CHAT CLIENT - Basic Socket.IO connection for testing
 * Task 4.1 - Simple Socket.IO setup with ping-pong test
 */

class ChatClient {
    constructor() {
        this.socket = null;
        this.init();
    }

    init() {
        // Check if Socket.IO is available
        if (typeof io === 'undefined') {
            console.error('❌ Socket.IO not loaded');
            return;
        }

        // Connect to the server
        this.connect();
    }

    connect() {
        try {
            console.log('🔌 Connecting to Socket.IO server...');
            
            // Create socket connection
            this.socket = io();

            // Connection established
            this.socket.on('connect', () => {
                console.log('🟢 Socket connected successfully!');
                console.log('🆔 Socket ID:', this.socket.id);
                
                // Make socket available globally for testing
                window.socket = this.socket;
            });

            // Handle disconnection
            this.socket.on('disconnect', (reason) => {
                console.log('🔴 Socket disconnected:', reason);
            });

            // Handle connection errors
            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error);
            });

            // Listen for pong responses
            this.socket.on('pong', (data) => {
                console.log('🏓 Received pong:', data);
                const responseTime = Date.now() - data.timestamp;
                console.log(`⏱️ Round-trip time: ${responseTime}ms`);
            });

        } catch (error) {
            console.error('❌ Socket connection failed:', error);
        }
    }

    // Method to send ping (for testing)
    ping() {
        if (this.socket && this.socket.connected) {
            const pingData = { timestamp: Date.now() };
            console.log('🏓 Sending ping:', pingData);
            this.socket.emit('ping', pingData);
        } else {
            console.error('❌ Socket not connected');
        }
    }

    // Cleanup method
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('🔌 Socket disconnected');
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatClient = new ChatClient();
    console.log('✅ Chat client initialized');
});

console.log('✅ Chat client script loaded');
