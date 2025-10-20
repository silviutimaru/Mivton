const fs = require('fs');

const filePath = '/Users/silviutimaru/Desktop/Mivton/public/js/video-call-fixed.js';
let content = fs.readFileSync(filePath, 'utf8');

// Map of all remaining console statements to their proper log levels
const replacements = [
    // Keep the vcLog function itself as-is (lines 21-23)
    // Don't modify those
    
    // Register user - DEBUG
    { from: "console.log(`📝 Registered user ${this.currentUserId} for video calls in room user_${this.currentUserId}`);", 
      to: "vcLog(LOG_LEVEL.DEBUG, `Registered user ${this.currentUserId} for video calls`);" },
    
    // Already setup warnings - DEBUG (they prevent issues, not important to show)
    { from: "console.log('⚠️ DOM event listeners already setup, skipping...');", 
      to: "vcLog(LOG_LEVEL.DEBUG, 'DOM event listeners already setup, skipping...');" },
    { from: "console.log('⚠️ Socket event listeners already setup, skipping...');", 
      to: "vcLog(LOG_LEVEL.DEBUG, 'Socket event listeners already setup, skipping...');" },
    
    // Button clicked - INFO (user action)
    { from: "console.log(`📞 Video call button clicked for ${friendName} (ID: ${friendId})`);", 
      to: "vcLog(LOG_LEVEL.INFO, `Video call initiated to ${friendName}`);" },
    
    // Call state changes - INFO
    { from: "console.log('✅ Call accepted:', data);", 
      to: "vcLog(LOG_LEVEL.INFO, 'Call accepted', data);" },
    { from: "console.log('📴 Call ended by remote:', data);", 
      to: "vcLog(LOG_LEVEL.INFO, 'Call ended by remote');" },
    { from: "console.log('⏱️ Call timed out:', data);", 
      to: "vcLog(LOG_LEVEL.INFO, 'Call timed out');" },
    
    // Initiating call - INFO
    { from: "console.log(`🎥 Initiating call to ${friendName} (${friendId})`);", 
      to: "vcLog(LOG_LEVEL.INFO, `Initiating call to ${friendName}`);" },
    { from: "console.log('📤 Sending call initiation to server with callId:', callId);", 
      to: "vcLog(LOG_LEVEL.DEBUG, 'Sending call initiation to server with callId:', callId);" },
    { from: "console.log(`✅ Call initiation sent to ${friendName}`);", 
      to: "vcLog(LOG_LEVEL.INFO, `Call sent to ${friendName}`);" },
    
    // Audio fallback - WARN
    { from: "console.log('🎤 Trying audio-only fallback...');", 
      to: "vcLog(LOG_LEVEL.WARN, 'Trying audio-only fallback...');" },
    { from: "console.log('✅ Got audio-only stream');", 
      to: "vcLog(LOG_LEVEL.INFO, 'Got audio-only stream');" },
    
    // Already in call - INFO
    { from: "console.log('⚠️ Already in a call, auto-declining');", 
      to: "vcLog(LOG_LEVEL.INFO, 'Already in a call, auto-declining');" },
    
    // WebRTC start - DEBUG
    { from: "console.log(`🔄 Starting WebRTC (initiator: ${isInitiator})`);", 
      to: "vcLog(LOG_LEVEL.DEBUG, `Starting WebRTC (initiator: ${isInitiator})`);" },
    { from: "console.log(`✅ Added local ${track.kind} track (${track.readyState})`);", 
      to: "vcLog(LOG_LEVEL.DEBUG, `Added local ${track.kind} track`);" },
    { from: "console.log(`✅ Added remote ${event.track.kind} track to stream`);", 
      to: "vcLog(LOG_LEVEL.DEBUG, `Added remote ${event.track.kind} track`);" },
    { from: "console.warn('⚠️ WebRTC connection disconnected');", 
      to: "vcLog(LOG_LEVEL.WARN, 'WebRTC connection disconnected');" },
    { from: "console.log('📥 Receiver ready, waiting for offer...');", 
      to: "vcLog(LOG_LEVEL.DEBUG, 'Receiver ready, waiting for offer...');" }
];

// Apply all replacements
replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
        content = content.replace(from, to);
        console.log(`✅ Replaced: ${from.substring(0, 50)}...`);
    } else {
        console.log(`⚠️  Not found: ${from.substring(0, 50)}...`);
    }
});

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ All log replacements complete!');

