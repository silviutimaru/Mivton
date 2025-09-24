/**
 * 🔍 COMPREHENSIVE DEBUG SYSTEM
 * 
 * This system provides clear, organized debugging information
 * to help identify issues quickly and efficiently.
 */

class DebugSystem {
    constructor() {
        this.isEnabled = true;
        this.logs = [];
        this.maxLogs = 100;
        this.startTime = Date.now();
        
        // Create debug panel
        this.createDebugPanel();
        
        console.log('🔍 DEBUG SYSTEM: Initialized');
    }
    
    createDebugPanel() {
        // Create debug panel HTML
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.innerHTML = `
            <div class="debug-header">
                <h3>🔍 Debug System</h3>
                <div class="debug-controls">
                    <button onclick="window.debugSystem.toggle()">Toggle</button>
                    <button onclick="window.debugSystem.clear()">Clear</button>
                    <button onclick="window.debugSystem.export()">Export</button>
                </div>
            </div>
            <div class="debug-content" id="debug-content"></div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #debug-panel {
                position: fixed;
                top: 10px;
                right: 10px;
                width: 400px;
                max-height: 500px;
                background: #1a1a2e;
                border: 1px solid #333;
                border-radius: 8px;
                color: white;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            }
            .debug-header {
                background: #16213e;
                padding: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #333;
            }
            .debug-header h3 {
                margin: 0;
                font-size: 14px;
            }
            .debug-controls button {
                background: #667eea;
                color: white;
                border: none;
                padding: 4px 8px;
                margin: 0 2px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 10px;
            }
            .debug-controls button:hover {
                background: #764ba2;
            }
            .debug-content {
                padding: 10px;
                max-height: 400px;
                overflow-y: auto;
            }
            .debug-log {
                margin: 2px 0;
                padding: 2px 4px;
                border-radius: 3px;
                word-wrap: break-word;
            }
            .debug-log.error { background: rgba(255,0,0,0.2); }
            .debug-log.warning { background: rgba(255,165,0,0.2); }
            .debug-log.success { background: rgba(0,255,0,0.2); }
            .debug-log.info { background: rgba(0,0,255,0.2); }
            .debug-log.chat { background: rgba(138,43,226,0.2); }
            .debug-log.api { background: rgba(0,255,255,0.2); }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(debugPanel);
        
        this.panel = debugPanel;
        this.content = document.getElementById('debug-content');
    }
    
    log(message, type = 'info', data = null) {
        if (!this.isEnabled) return;
        
        const timestamp = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const logEntry = {
            timestamp,
            message,
            type,
            data,
            time: new Date().toLocaleTimeString()
        };
        
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Console log
        const emoji = this.getEmoji(type);
        console.log(`${emoji} [${timestamp}s] ${message}`, data || '');
        
        // Panel log
        this.addToPanel(logEntry);
    }
    
    getEmoji(type) {
        const emojis = {
            error: '❌',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️',
            chat: '💬',
            api: '🌐',
            button: '🔘',
            system: '⚙️'
        };
        return emojis[type] || '📝';
    }
    
    addToPanel(logEntry) {
        if (!this.content) return;
        
        const logDiv = document.createElement('div');
        logDiv.className = `debug-log ${logEntry.type}`;
        logDiv.innerHTML = `
            <strong>[${logEntry.timestamp}s]</strong> ${logEntry.message}
            ${logEntry.data ? `<br><small>${JSON.stringify(logEntry.data, null, 2)}</small>` : ''}
        `;
        
        this.content.appendChild(logDiv);
        this.content.scrollTop = this.content.scrollHeight;
    }
    
    // Specific debug methods
    chat(message, data = null) {
        this.log(`💬 CHAT: ${message}`, 'chat', data);
    }
    
    api(message, data = null) {
        this.log(`🌐 API: ${message}`, 'api', data);
    }
    
    button(message, data = null) {
        this.log(`🔘 BUTTON: ${message}`, 'button', data);
    }
    
    system(message, data = null) {
        this.log(`⚙️ SYSTEM: ${message}`, 'system', data);
    }
    
    error(message, data = null) {
        this.log(`❌ ERROR: ${message}`, 'error', data);
    }
    
    success(message, data = null) {
        this.log(`✅ SUCCESS: ${message}`, 'success', data);
    }
    
    warning(message, data = null) {
        this.log(`⚠️ WARNING: ${message}`, 'warning', data);
    }
    
    // Utility methods
    toggle() {
        this.isEnabled = !this.isEnabled;
        this.panel.style.display = this.isEnabled ? 'block' : 'none';
        console.log(`🔍 DEBUG SYSTEM: ${this.isEnabled ? 'Enabled' : 'Disabled'}`);
    }
    
    clear() {
        this.logs = [];
        this.content.innerHTML = '';
        console.log('🔍 DEBUG SYSTEM: Cleared');
    }
    
    export() {
        const data = {
            timestamp: new Date().toISOString(),
            logs: this.logs,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('🔍 DEBUG SYSTEM: Exported logs');
    }
    
    // Quick access methods
    static log(message, type = 'info', data = null) {
        if (window.debugSystem) {
            window.debugSystem.log(message, type, data);
        } else {
            console.log(`🔍 ${message}`, data || '');
        }
    }
    
    static chat(message, data = null) {
        if (window.debugSystem) {
            window.debugSystem.chat(message, data);
        }
    }
    
    static api(message, data = null) {
        if (window.debugSystem) {
            window.debugSystem.api(message, data);
        }
    }
    
    static button(message, data = null) {
        if (window.debugSystem) {
            window.debugSystem.button(message, data);
        }
    }
    
    static error(message, data = null) {
        if (window.debugSystem) {
            window.debugSystem.error(message, data);
        }
    }
}

// Initialize debug system
window.debugSystem = new DebugSystem();

// Make static methods available globally
window.Debug = DebugSystem;

console.log('🔍 DEBUG SYSTEM: Ready');
