/**
 * Test the complete live chat flow
 */

const puppeteer = require('puppeteer');

async function testLiveChatFlow() {
    console.log('🧪 Testing live chat flow on mivton.com...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Browser Error:', msg.text());
            } else if (msg.text().includes('Chat') || msg.text().includes('chat')) {
                console.log('💬 Browser Log:', msg.text());
            }
        });
        
        // Navigate to the site
        console.log('🌐 Navigating to mivton.com...');
        await page.goto('https://www.mivton.com', { waitUntil: 'networkidle2' });
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Check if we can see the dashboard
        const dashboardVisible = await page.$('.dashboard-container');
        if (dashboardVisible) {
            console.log('✅ Dashboard is visible');
        } else {
            console.log('❌ Dashboard not visible');
        }
        
        // Look for chat buttons
        const chatButtons = await page.$$('.chat-button');
        console.log(`🔍 Found ${chatButtons.length} chat buttons`);
        
        // Look for friends list
        const friendsList = await page.$$('.friend-card, .friend-item');
        console.log(`👥 Found ${friendsList.length} friend items`);
        
        // Check if chat system is initialized
        const chatSystemStatus = await page.evaluate(() => {
            return {
                bulletproofChat: typeof window.bulletproofChat,
                openChat: typeof window.openChat,
                startChat: typeof window.startChat,
                startDirectChat: typeof window.startDirectChat
            };
        });
        
        console.log('🔍 Chat System Status:', chatSystemStatus);
        
        // Wait a bit more to see any console logs
        await page.waitForTimeout(5000);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

testLiveChatFlow();
