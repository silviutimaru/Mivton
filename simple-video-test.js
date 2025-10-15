// Simple Video Call Test
const http = require('http');

function testVideoCallSystem() {
    console.log('🎥 Testing video call system...');
    
    // Test 1: Check if video-call-fixed.js is accessible
    const req = http.get('http://localhost:3000/js/video-call-fixed.js?v=20250115f', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ Video call system file is accessible');
                
                // Check for key components
                const hasVideoCallSystem = data.includes('class VideoCallSystem');
                const hasGetUserMedia = data.includes('getUserMedia');
                const hasWebRTC = data.includes('RTCPeerConnection');
                const hasVideoElements = data.includes('remoteVideo') && data.includes('localVideo');
                
                console.log('📋 Component check:');
                console.log(`  - VideoCallSystem class: ${hasVideoCallSystem ? '✅' : '❌'}`);
                console.log(`  - getUserMedia: ${hasGetUserMedia ? '✅' : '❌'}`);
                console.log(`  - WebRTC: ${hasWebRTC ? '✅' : '❌'}`);
                console.log(`  - Video elements: ${hasVideoElements ? '✅' : '❌'}`);
                
                if (hasVideoCallSystem && hasGetUserMedia && hasWebRTC && hasVideoElements) {
                    console.log('✅ All video call components are present');
                } else {
                    console.log('❌ Some video call components are missing');
                }
            } else {
                console.log(`❌ Video call system file not accessible: ${res.statusCode}`);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log(`❌ Error testing video call system: ${error.message}`);
    });
    
    req.setTimeout(5000, () => {
        console.log('❌ Test timeout');
        req.destroy();
    });
}

// Test 2: Check if dashboard loads properly
function testDashboard() {
    console.log('🌐 Testing dashboard...');
    
    const req = http.get('http://localhost:3000/dashboard', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ Dashboard is accessible');
                
                // Check for video call system script
                const hasVideoCallScript = data.includes('video-call-fixed.js');
                console.log(`  - Video call script loaded: ${hasVideoCallScript ? '✅' : '❌'}`);
                
                // Check for video call CSS
                const hasVideoCallCSS = data.includes('video-call.css');
                console.log(`  - Video call CSS loaded: ${hasVideoCallCSS ? '✅' : '❌'}`);
                
            } else {
                console.log(`❌ Dashboard not accessible: ${res.statusCode}`);
            }
        });
    });
    
    req.on('error', (error) => {
        console.log(`❌ Error testing dashboard: ${error.message}`);
    });
    
    req.setTimeout(5000, () => {
        console.log('❌ Dashboard test timeout');
        req.destroy();
    });
}

// Run tests
console.log('🚀 Starting video call system tests...\n');
testVideoCallSystem();
setTimeout(testDashboard, 1000);
