// Comprehensive Video Call Test
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

async function testVideoCallSystem() {
    console.log('🎥 Starting comprehensive video call test...');
    
    let browser;
    let page;
    
    try {
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: false, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] 
        });
        
        page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log(`📱 Browser: ${msg.text()}`);
        });
        
        // Navigate to dashboard
        console.log('🌐 Navigating to dashboard...');
        await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
        
        // Wait for video call system to initialize
        console.log('⏳ Waiting for video call system to initialize...');
        await page.waitForFunction(() => window.videoCallSystem !== undefined, { timeout: 10000 });
        console.log('✅ Video call system initialized');
        
        // Test camera access
        console.log('📹 Testing camera access...');
        const cameraResult = await page.evaluate(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                return {
                    success: true,
                    videoTracks: stream.getVideoTracks().length,
                    audioTracks: stream.getAudioTracks().length
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        if (cameraResult.success) {
            console.log(`✅ Camera access successful: ${cameraResult.videoTracks} video, ${cameraResult.audioTracks} audio tracks`);
        } else {
            console.log(`❌ Camera access failed: ${cameraResult.error}`);
        }
        
        // Test video call system getUserMedia
        console.log('🎥 Testing video call system getUserMedia...');
        const videoCallResult = await page.evaluate(async () => {
            try {
                await window.videoCallSystem.getUserMedia();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        if (videoCallResult.success) {
            console.log('✅ Video call system getUserMedia successful');
        } else {
            console.log(`❌ Video call system getUserMedia failed: ${videoCallResult.error}`);
        }
        
        // Test video elements
        console.log('📺 Testing video elements...');
        const videoElements = await page.evaluate(() => {
            const localVideo = document.getElementById('localVideo');
            const remoteVideo = document.getElementById('remoteVideo');
            return {
                localVideo: localVideo ? 'exists' : 'missing',
                remoteVideo: remoteVideo ? 'exists' : 'missing',
                localVideoSrc: localVideo?.srcObject ? 'has stream' : 'no stream',
                remoteVideoSrc: remoteVideo?.srcObject ? 'has stream' : 'no stream'
            };
        });
        
        console.log('📺 Video elements:', videoElements);
        
        // Test WebRTC peer connection
        console.log('🔄 Testing WebRTC peer connection...');
        const webrtcResult = await page.evaluate(async () => {
            try {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                
                // Add a dummy track
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
                
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                pc.close();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        if (webrtcResult.success) {
            console.log('✅ WebRTC peer connection test successful');
        } else {
            console.log(`❌ WebRTC peer connection test failed: ${webrtcResult.error}`);
        }
        
        // Test video call button
        console.log('🔘 Testing video call button...');
        const buttonTest = await page.evaluate(() => {
            const buttons = document.querySelectorAll('.video-call-btn');
            return {
                buttonsFound: buttons.length,
                firstButton: buttons[0] ? 'exists' : 'missing'
            };
        });
        
        console.log('🔘 Video call buttons:', buttonTest);
        
        console.log('✅ Comprehensive video call test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
testVideoCallSystem().catch(console.error);
