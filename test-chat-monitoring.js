/**
 * Chat System Monitoring Test Script
 * Quick test to verify monitoring system is working
 */

const { chatMonitor } = require('./utils/chat-monitor');

async function testChatMonitoring() {
    console.log('🧪 Testing Chat Monitoring System...\n');

    // Test logging functions
    console.log('1. Testing log functions...');
    chatMonitor.log('info', 'TEST', 'Test info message');
    chatMonitor.logMessageSent(1, 2, 'Hello test message', 123);
    chatMonitor.logMessageReceived(2, 1, 'Hello test response', 124);
    chatMonitor.logTypingEvent(1, 2, true);
    chatMonitor.logTypingEvent(1, 2, false);
    chatMonitor.logReadReceipt(2, 1, 1);
    chatMonitor.logConnection('socket123', 1, 'connected');
    chatMonitor.logError('TEST', new Error('Test error'), { test: true });

    console.log('\n2. Testing metrics...');
    const metrics = chatMonitor.getMetrics();
    console.log('Metrics:', JSON.stringify(metrics, null, 2));

    console.log('\n3. Testing health status...');
    const health = chatMonitor.getHealthStatus();
    console.log('Health:', JSON.stringify(health, null, 2));

    console.log('\n4. Testing log retrieval...');
    const recentLogs = chatMonitor.getRecentLogs(5);
    console.log('Recent logs count:', recentLogs.length);
    console.log('Latest log:', recentLogs[recentLogs.length - 1]);

    console.log('\n5. Testing category filtering...');
    const messageLogs = chatMonitor.getLogsByCategory('MESSAGE_SENT', 3);
    console.log('Message sent logs:', messageLogs.length);

    console.log('\n6. Testing level filtering...');
    const errorLogs = chatMonitor.getLogsByLevel('error', 3);
    console.log('Error logs:', errorLogs.length);

    console.log('\n✅ Chat monitoring system test completed!');
    console.log('\n📊 Summary:');
    console.log(`- Total logs: ${metrics.logsCount}`);
    console.log(`- Messages sent: ${metrics.messagesSent}`);
    console.log(`- Messages received: ${metrics.messagesReceived}`);
    console.log(`- Typing events: ${metrics.typingEvents}`);
    console.log(`- Read receipts: ${metrics.readReceipts}`);
    console.log(`- Connections: ${metrics.connections}`);
    console.log(`- Errors: ${metrics.errors}`);
    console.log(`- Health status: ${health.status}`);

    return {
        success: true,
        metrics,
        health,
        logsCount: metrics.logsCount
    };
}

// Run test if this file is executed directly
if (require.main === module) {
    testChatMonitoring()
        .then(result => {
            console.log('\n🎉 Test result:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testChatMonitoring };
