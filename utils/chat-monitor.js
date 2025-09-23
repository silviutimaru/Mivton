/**
 * Chat System Monitoring Utilities
 * Comprehensive logging and monitoring for chat functionality
 */

class ChatMonitor {
    constructor() {
        this.logs = [];
        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            typingEvents: 0,
            readReceipts: 0,
            errors: 0,
            connections: 0,
            apiCalls: 0
        };
        this.startTime = new Date();
    }

    /**
     * Log chat events with structured data
     */
    log(level, category, message, data = null) {
        const logEntry = {
            timestamp: new Date(),
            level: level.toUpperCase(),
            category,
            message,
            data,
            id: this.generateLogId()
        };

        this.logs.push(logEntry);

        // Keep only last 1000 logs
        if (this.logs.length > 1000) {
            this.logs = this.logs.slice(-1000);
        }

        // Update metrics
        this.updateMetrics(category, level);

        // Console output with colors
        this.consoleOutput(logEntry);

        return logEntry;
    }

    /**
     * Log message sending events
     */
    logMessageSent(senderId, recipientId, message, messageId) {
        return this.log('info', 'MESSAGE_SENT', `Message sent from ${senderId} to ${recipientId}`, {
            senderId,
            recipientId,
            message: message.substring(0, 100),
            messageId,
            timestamp: new Date()
        });
    }

    /**
     * Log message receiving events
     */
    logMessageReceived(senderId, recipientId, message, messageId) {
        return this.log('info', 'MESSAGE_RECEIVED', `Message received by ${recipientId} from ${senderId}`, {
            senderId,
            recipientId,
            message: message.substring(0, 100),
            messageId,
            timestamp: new Date()
        });
    }

    /**
     * Log typing indicator events
     */
    logTypingEvent(userId, targetUserId, isTyping) {
        return this.log('info', 'TYPING_EVENT', `User ${userId} ${isTyping ? 'started' : 'stopped'} typing to ${targetUserId}`, {
            userId,
            targetUserId,
            isTyping,
            timestamp: new Date()
        });
    }

    /**
     * Log read receipt events
     */
    logReadReceipt(readerId, senderId, messageCount) {
        return this.log('info', 'READ_RECEIPT', `User ${readerId} read ${messageCount} messages from ${senderId}`, {
            readerId,
            senderId,
            messageCount,
            timestamp: new Date()
        });
    }

    /**
     * Log Socket.IO connection events
     */
    logConnection(socketId, userId, event) {
        return this.log('info', 'CONNECTION', `Socket ${socketId} ${event} for user ${userId || 'anonymous'}`, {
            socketId,
            userId,
            event,
            timestamp: new Date()
        });
    }

    /**
     * Log API calls
     */
    logApiCall(method, endpoint, status, duration) {
        return this.log('info', 'API_CALL', `${method} ${endpoint} - ${status} (${duration}ms)`, {
            method,
            endpoint,
            status,
            duration,
            timestamp: new Date()
        });
    }

    /**
     * Log errors with context
     */
    logError(category, error, context = null) {
        return this.log('error', 'ERROR', `${category}: ${error.message}`, {
            category,
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date()
        });
    }

    /**
     * Log chat system status
     */
    logStatus(component, status, details = null) {
        return this.log('info', 'STATUS', `${component}: ${status}`, {
            component,
            status,
            details,
            timestamp: new Date()
        });
    }

    /**
     * Update metrics based on log category
     */
    updateMetrics(category, level) {
        switch (category) {
            case 'MESSAGE_SENT':
                this.metrics.messagesSent++;
                break;
            case 'MESSAGE_RECEIVED':
                this.metrics.messagesReceived++;
                break;
            case 'TYPING_EVENT':
                this.metrics.typingEvents++;
                break;
            case 'READ_RECEIPT':
                this.metrics.readReceipts++;
                break;
            case 'CONNECTION':
                this.metrics.connections++;
                break;
            case 'API_CALL':
                this.metrics.apiCalls++;
                break;
            case 'ERROR':
                this.metrics.errors++;
                break;
        }
    }

    /**
     * Console output with colors
     */
    consoleOutput(logEntry) {
        const colors = {
            INFO: '\x1b[36m',    // Cyan
            SUCCESS: '\x1b[32m', // Green
            WARNING: '\x1b[33m', // Yellow
            ERROR: '\x1b[31m',   // Red
            CHAT: '\x1b[35m'     // Magenta
        };

        const reset = '\x1b[0m';
        const timestamp = logEntry.timestamp.toISOString();
        const color = colors[logEntry.level] || '\x1b[37m';

        console.log(
            `${color}[${timestamp}] ${logEntry.level} [${logEntry.category}]${reset} ${logEntry.message}`
        );

        if (logEntry.data) {
            console.log(`${color}Data:${reset}`, logEntry.data);
        }
    }

    /**
     * Generate unique log ID
     */
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get logs by category
     */
    getLogsByCategory(category, limit = 50) {
        return this.logs
            .filter(log => log.category === category)
            .slice(-limit);
    }

    /**
     * Get logs by level
     */
    getLogsByLevel(level, limit = 50) {
        return this.logs
            .filter(log => log.level === level.toUpperCase())
            .slice(-limit);
    }

    /**
     * Get recent logs
     */
    getRecentLogs(limit = 100) {
        return this.logs.slice(-limit);
    }

    /**
     * Get system metrics
     */
    getMetrics() {
        const uptime = Date.now() - this.startTime.getTime();
        
        return {
            ...this.metrics,
            uptime: Math.floor(uptime / 1000), // seconds
            logsCount: this.logs.length,
            startTime: this.startTime,
            errors: this.logs.filter(log => log.level === 'ERROR').length,
            warnings: this.logs.filter(log => log.level === 'WARNING').length
        };
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        const recentErrors = this.logs
            .filter(log => log.level === 'ERROR' && 
                          (Date.now() - log.timestamp.getTime()) < 60000) // Last minute
            .length;

        const recentMessages = this.logs
            .filter(log => log.category === 'MESSAGE_SENT' && 
                          (Date.now() - log.timestamp.getTime()) < 60000) // Last minute
            .length;

        return {
            status: recentErrors > 5 ? 'unhealthy' : recentErrors > 0 ? 'degraded' : 'healthy',
            recentErrors,
            recentMessages,
            uptime: Date.now() - this.startTime.getTime(),
            metrics: this.metrics
        };
    }

    /**
     * Clear logs
     */
    clearLogs() {
        const clearedCount = this.logs.length;
        this.logs = [];
        this.log('info', 'SYSTEM', `Cleared ${clearedCount} log entries`);
        return clearedCount;
    }

    /**
     * Export logs as JSON
     */
    exportLogs(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.logs, null, 2);
        }
        
        // CSV format
        const headers = ['timestamp', 'level', 'category', 'message'];
        const csv = [
            headers.join(','),
            ...this.logs.map(log => 
                headers.map(header => 
                    typeof log[header] === 'string' ? 
                        `"${log[header].replace(/"/g, '""')}"` : 
                        log[header]
                ).join(',')
            )
        ].join('\n');
        
        return csv;
    }
}

// Create global instance
const chatMonitor = new ChatMonitor();

module.exports = {
    ChatMonitor,
    chatMonitor
};
