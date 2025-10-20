const fs = require('fs');

const filePath = '/Users/silviutimaru/Desktop/Mivton/public/js/video-call-fixed.js';
let content = fs.readFileSync(filePath, 'utf8');

// Define which logs should be at which level
const logReplacements = [
    // DEBUG level (verbose, only show when troubleshooting)
    { pattern: /console\.log\('📹 Local video metadata loaded'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Local video metadata loaded');" },
    { pattern: /console\.log\('📹 Remote video metadata loaded'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote video metadata loaded');" },
    { pattern: /console\.log\('✅ Local video is playing'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Local video is playing');" },
    { pattern: /console\.log\('✅ Remote video is playing'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote video is playing');" },
    { pattern: /console\.log\('⏸️ Local video paused'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Local video paused');" },
    { pattern: /console\.log\('⏸️ Remote video paused'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote video paused');" },
    { pattern: /console\.log\('✅ Local video play started'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Local video play started');" },
    { pattern: /console\.log\('✅ Remote video play started'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote video play started');" },
    { pattern: /console\.log\('🧊 Sending ICE candidate'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Sending ICE candidate');" },
    { pattern: /console\.log\('🧊 Received ICE candidate'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Received ICE candidate');" },
    { pattern: /console\.log\('✅ ICE candidate added'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'ICE candidate added');" },
    { pattern: /console\.log\('📡 Connection state:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Connection state:'," },
    { pattern: /console\.log\('🧊 ICE connection state:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'ICE connection state:'," },
    { pattern: /console\.log\('📡 Signaling state:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Signaling state:'," },
    { pattern: /console\.log\('📹 Requesting user media/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Requesting user media" },
    { pattern: /console\.log\('🔄 Clearing existing/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Clearing existing" },
    { pattern: /console\.log\('📹 Assigning/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Assigning" },
    { pattern: /console\.log\('✅ Got media stream:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Got media stream:'," },
    { pattern: /console\.log\('✅ Video track is live'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Video track is live');" },
    { pattern: /console\.log\('✅ Audio track is live'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Audio track is live');" },
    { pattern: /console\.log\('✅ Local video stream assigned'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Local video stream assigned');" },
    { pattern: /console\.log\('✅ Remote video stream assigned'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote video stream assigned');" },
    { pattern: /console\.log\('📥 Received offer/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Received offer" },
    { pattern: /console\.log\('📥 Received answer'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Received answer');" },
    { pattern: /console\.log\('📥 Processing offer/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Processing offer" },
    { pattern: /console\.log\('📥 Processing answer/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Processing answer" },
    { pattern: /console\.log\('📥 Setting remote description/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Setting remote description" },
    { pattern: /console\.log\('✅ Remote description set/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote description set" },
    { pattern: /console\.log\('📤 Creating offer/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Creating offer" },
    { pattern: /console\.log\('📤 Creating answer/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Creating answer" },
    { pattern: /console\.log\('✅ Local description set/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Local description set" },
    { pattern: /console\.log\('✅ Offer sent/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Offer sent" },
    { pattern: /console\.log\('✅ Answer sent/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Answer sent" },
    { pattern: /console\.log\('✅ Added local/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Added local" },
    { pattern: /console\.log\('📥 Received remote track:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Received remote track:'," },
    { pattern: /console\.log\('✅ Created remote stream'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Created remote stream');" },
    { pattern: /console\.log\('✅ Added remote/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Added remote" },
    { pattern: /console\.log\('✅ Peer connection created'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Peer connection created');" },
    { pattern: /console\.log\('🔍 /g, replacement: "vcLog(LOG_LEVEL.DEBUG, '" },
    { pattern: /console\.log\('📹 Local video element/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Local video element" },
    { pattern: /console\.log\('📹 Remote video element/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote video element" },
    { pattern: /console\.log\('📦 Video container/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Video container" },
    { pattern: /console\.log\('🎥 VIDEO UI CONTAINER/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'VIDEO UI CONTAINER" },
    { pattern: /console\.log\('🎬 Showing video UI/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Showing video UI" },
    { pattern: /console\.log\('✅ Video UI shown/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Video UI shown" },
    { pattern: /console\.log\('🧹 Cleaning up/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Cleaning up" },
    { pattern: /console\.log\('🛑 Stopped/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Stopped" },
    { pattern: /console\.log\('🔌 Peer connection closed'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Peer connection closed');" },
    { pattern: /console\.log\('✅ Cleanup complete'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Cleanup complete');" },
    { pattern: /console\.log\('🎤 Audio toggled:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Audio toggled:'," },
    { pattern: /console\.log\('📹 Video toggled:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Video toggled:'," },
    
    // INFO level (important state changes)
    { pattern: /console\.log\('📞 Video call button clicked/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Video call button clicked" },
    { pattern: /console\.log\('🎥 Initiating call/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Initiating call" },
    { pattern: /console\.log\('✅ Call initiation sent/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Call initiation sent" },
    { pattern: /console\.log\('✅ Got user media/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Got user media" },
    { pattern: /console\.log\('✅ Accepting call/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Accepting call" },
    { pattern: /console\.log\('❌ Declining call/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Declining call" },
    { pattern: /console\.log\('📴 Ending call/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Ending call" },
    { pattern: /console\.log\('✅ WebRTC connected successfully!'\);?/g, replacement: "vcLog(LOG_LEVEL.INFO, 'WebRTC connected successfully!');" },
    { pattern: /console\.log\('🔔 Call is ringing:',/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Call is ringing:'," },
    { pattern: /console\.log\('📞 \[New\] Incoming video call:',/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Incoming video call:'," },
    { pattern: /console\.log\('📥 Processing incoming call:',/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Processing incoming call:'," },
    { pattern: /console\.log\('🎵 Playing modern ringtone/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Playing modern ringtone" },
    { pattern: /console\.log\('🔌 Setting up socket listeners/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Setting up socket listeners" },
    { pattern: /console\.log\('✅ Socket listeners setup complete'\);?/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Socket listeners setup complete');" },
    { pattern: /console\.log\('🔄 Starting WebRTC/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Starting WebRTC" },
    { pattern: /console\.log\('🔄 Initiator starting WebRTC/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Initiator starting WebRTC" },
    { pattern: /console\.log\('🔄 Receiver starting WebRTC/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Receiver starting WebRTC" },
    { pattern: /console\.log\('🚀 Initializing Video Call System'\);?/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Initializing Video Call System');" },
    { pattern: /console\.log\('🔧 Set window\.currentUserId/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Set window.currentUserId" },
    { pattern: /console\.log\('⏳ Waiting for socket/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Waiting for socket" },
    
    // WARN level
    { pattern: /console\.warn\('⚠️ Local video play failed/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Local video play failed" },
    { pattern: /console\.warn\('⚠️ Remote video play failed/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Remote video play failed" },
    { pattern: /console\.warn\('⚠️ Video track not live:',/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Video track not live:'," },
    { pattern: /console\.warn\('⚠️ Audio track not live:',/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Audio track not live:'," },
    { pattern: /console\.warn\('⚠️ DOM event listeners already setup/g, replacement: "vcLog(LOG_LEVEL.WARN, 'DOM event listeners already setup" },
    { pattern: /console\.warn\('⚠️ Socket event listeners already setup/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Socket event listeners already setup" },
    { pattern: /console\.warn\('⚠️ WebRTC already initialized/g, replacement: "vcLog(LOG_LEVEL.WARN, 'WebRTC already initialized" },
    { pattern: /console\.warn\('⚠️ Already processing an answer/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Already processing an answer" },
    { pattern: /console\.warn\('⚠️ Cannot set remote description, wrong state:',/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Cannot set remote description, wrong state:'," },
    { pattern: /console\.warn\('⚠️ Already in stable state/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Already in stable state" },
    { pattern: /console\.warn\('⚠️ No peer connection available/g, replacement: "vcLog(LOG_LEVEL.WARN, 'No peer connection available" },
    { pattern: /console\.warn\('⚠️ Already in a call/g, replacement: "vcLog(LOG_LEVEL.INFO, 'Already in a call" },
    { pattern: /console\.warn\('⚠️ No local stream available/g, replacement: "vcLog(LOG_LEVEL.WARN, 'No local stream available" },
    { pattern: /console\.warn\('⚠️ Signaling state not stable/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Signaling state not stable" },
    { pattern: /console\.warn\('⚠️ Cannot register user/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Cannot register user" },
    
    // ERROR level (always show)
    { pattern: /console\.error\('❌/g, replacement: "vcLog(LOG_LEVEL.ERROR, '" },
    { pattern: /console\.log\('❌/g, replacement: "vcLog(LOG_LEVEL.ERROR, '" },
    
    // INFO level (user-facing state changes)
    { pattern: /console\.log\('📢 /g, replacement: "vcLog(LOG_LEVEL.INFO, '" },
    { pattern: /console\.log\('Ringtone not available:',/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Ringtone not available:'," },
    { pattern: /console\.log\('Error closing audio context:',/g, replacement: "vcLog(LOG_LEVEL.WARN, 'Error closing audio context:'," },
    { pattern: /console\.log\('Video play error:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Video play error:'," },
    { pattern: /console\.log\('Remote video play error:',/g, replacement: "vcLog(LOG_LEVEL.DEBUG, 'Remote video play error:'," }
];

// Apply all replacements
logReplacements.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
});

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Log replacements complete!');
console.log('📊 Replaced console.log/warn/error with vcLog function');

