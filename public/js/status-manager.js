/**
 * ==============================================
 * MIVTON - STATUS MANAGER COMPONENT
 * Phase 2.3 - User Interface Polish
 * User status management with presence indicators
 * ==============================================
 */

/**
 * Status Manager Component
 * Handles user status updates, indicators, and presence management
 */
class MivtonStatusManager extends MivtonBaseComponent {
    constructor(element, options = {}) {
        const defaultOptions = {
            currentStatus: 'online',
            enableAutoStatus: true,
            autoAwayTime: 300000, // 5 minutes
            autoOfflineTime: 900000, // 15 minutes
            enableCustomMessages: true,
            maxMessageLength: 100,
            showStatusHistory: true,
            statusUpdateInterval: 30000, // 30 seconds
            apiEndpoint: '/api/user/status',
            ...options
        };
        
        super(element, defaultOptions);
        
        // Component state
        this.statusState = {
            currentStatus: this.options.currentStatus,
            customMessage: '',
            autoStatus: this.options.enableAutoStatus,
            lastActivity: Date.now(),
            statusHistory: [],
            isUpdating: false,
            selectorOpen: false
        };
        
        // Intervals and timeouts
        this.activityTimer = null;
        this.updateInterval = null;
        this.awayTimeout = null;
        this.offlineTimeout = null;
        
        // Initialize component
        this.initializeStatusManager();
    }
    
    /**
     * Initialize status manager
     */
    initializeStatusManager() {
        try {
            this.createStatusElements();
            this.setupEventListeners();
            this.startActivityTracking();
            this.startStatusUpdates();
            this.loadStatusHistory();
            
            this.log('Status manager initialized successfully');
        } catch (error) {
            this.handleError(error, 'initializeStatusManager');
        }
    }
    
    /**
     * Create status UI elements
     */
    createStatusElements() {
        if (!this.element) return;
        
        this.element.innerHTML = `
            <div class="status-manager">
                <div class="user-status-card">
                    <div class="user-status-header">
                        <div class="user-status-avatar">
                            <span id="userInitials">?</span>
                            <div class="status-indicator ${this.statusState.currentStatus} pulse" id="mainStatusIndicator"></div>
                        </div>
                        <div class="user-status-info">
                            <div class="user-status-name" id="userName">User</div>
                            <div class="user-status-time" id="statusTime">Online now</div>
                        </div>
                        <button class="status-selector-btn" id="statusSelectorBtn" aria-label="Change status">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    
                    <div class="user-status-message ${this.statusState.customMessage ? '' : 'empty'}" id="statusMessage">
                        ${this.statusState.customMessage || 'No status message'}
                    </div>
                </div>
                
                <div class="status-selector" id="statusSelector" style="display: none;">
                    <div class="status-selector-header">
                        <i class="fas fa-circle"></i>
                        Set Status
                    </div>
                    
                    <div class="status-options">
                        ${this.createStatusOptions()}
                    </div>
                    
                    ${this.options.enableCustomMessages ? this.createCustomMessageSection() : ''}
                    
                    <div class="status-settings">
                        <label class="status-setting-item">
                            <input type="checkbox" id="autoStatusToggle" ${this.statusState.autoStatus ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <div class="setting-info">
                                <div class="setting-title">Auto Status</div>
                                <div class="setting-description">Automatically set status based on activity</div>
                            </div>
                        </label>
                    </div>
                    
                    ${this.options.showStatusHistory ? this.createStatusHistorySection() : ''}
                    
                    <div class="status-selector-actions">
                        <button class="status-action-btn secondary" id="cancelStatusBtn">
                            Cancel
                        </button>
                        <button class="status-action-btn primary" id="saveStatusBtn">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Cache DOM elements
        this.statusCard = this.element.querySelector('.user-status-card');
        this.statusIndicator = this.element.querySelector('#mainStatusIndicator');
        this.statusMessage = this.element.querySelector('#statusMessage');
        this.statusSelector = this.element.querySelector('#statusSelector');
        this.statusSelectorBtn = this.element.querySelector('#statusSelectorBtn');
        this.statusOptions = this.element.querySelectorAll('.status-option');
        this.customMessageInput = this.element.querySelector('#customMessage');
        this.autoStatusToggle = this.element.querySelector('#autoStatusToggle');
        this.cancelBtn = this.element.querySelector('#cancelStatusBtn');
        this.saveBtn = this.element.querySelector('#saveStatusBtn');
    }
    
    /**
     * Create status options HTML
     */
    createStatusOptions() {
        const statuses = [
            {
                value: 'online',
                title: 'Online',
                description: 'Available for chat',
                icon: '🟢'
            },
            {
                value: 'away',
                title: 'Away',
                description: 'Away from computer',
                icon: '🟡'
            },
            {
                value: 'busy',
                title: 'Busy',
                description: 'Do not disturb',
                icon: '🔴'
            },
            {
                value: 'offline',
                title: 'Offline',
                description: 'Appear offline',
                icon: '⚫'
            }
        ];
        
        return statuses.map(status => `
            <div class="status-option ${status.value === this.statusState.currentStatus ? 'selected' : ''}" 
                 data-status="${status.value}"
                 role="radio"
                 aria-checked="${status.value === this.statusState.currentStatus}"
                 tabindex="0">
                <div class="status-option-indicator">
                    <div class="status-indicator ${status.value}"></div>
                </div>
                <div class="status-option-info">
                    <div class="status-option-title">${status.title}</div>
                    <div class="status-option-description">${status.description}</div>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Create custom message section HTML
     */
    createCustomMessageSection() {
        return `
            <div class="custom-status-section">
                <label class="custom-status-label">Status Message</label>
                <input type="text" 
                       class="custom-status-input" 
                       id="customMessage"
                       placeholder="What's on your mind?"
                       maxlength="${this.options.maxMessageLength}"
                       value="${this.statusState.customMessage}">
                <div class="custom-message-counter">
                    <span id="messageCounter">${this.statusState.customMessage.length}</span>/${this.options.maxMessageLength}
                </div>
            </div>
        `;
    }
    
    /**
     * Create status history section HTML
     */
    createStatusHistorySection() {
        return `
            <div class="status-history">
                <div class="status-history-title">Recent Status Changes</div>
                <div class="status-history-list" id="statusHistoryList">
                    <div class="status-history-empty">No recent status changes</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Status selector button
        if (this.statusSelectorBtn) {
            this.statusSelectorBtn.addEventListener('click', () => {
                this.toggleStatusSelector();
            });
        }
        
        // Status options
        this.element.addEventListener('click', (e) => {
            const statusOption = e.target.closest('.status-option');
            if (statusOption) {
                this.selectStatus(statusOption.dataset.status);
            }
        });
        
        // Custom message input
        if (this.customMessageInput) {
            this.customMessageInput.addEventListener('input', (e) => {
                this.updateMessageCounter(e.target.value);
            });
            
            this.customMessageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveStatus();
                }
            });
        }
        
        // Auto status toggle
        if (this.autoStatusToggle) {
            this.autoStatusToggle.addEventListener('change', (e) => {
                this.statusState.autoStatus = e.target.checked;
                if (e.target.checked) {
                    this.startActivityTracking();
                } else {
                    this.stopActivityTracking();
                }
            });
        }
        
        // Action buttons
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => {
                this.cancelStatusChange();
            });
        }
        
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                this.saveStatus();
            });
        }
        
        // Close selector on outside click
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && this.statusState.selectorOpen) {
                this.closeStatusSelector();
            }
        });
        
        // Keyboard navigation
        this.element.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
        
        // Activity tracking events
        this.setupActivityTracking();
    }
    
    /**
     * Setup activity tracking
     */
    setupActivityTracking() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const updateActivity = () => {
            this.updateActivity();
        };
        
        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });
        
        // Store reference for cleanup
        this.activityHandler = updateActivity;
        this.activityEvents = activityEvents;
    }
    
    /**
     * Start activity tracking
     */
    startActivityTracking() {
        if (!this.options.enableAutoStatus || !this.statusState.autoStatus) return;
        
        this.resetActivityTimers();
    }
    
    /**
     * Stop activity tracking
     */
    stopActivityTracking() {
        this.clearActivityTimers();
    }
    
    /**
     * Update activity timestamp
     */
    updateActivity() {
        if (!this.statusState.autoStatus) return;
        
        const now = Date.now();
        this.statusState.lastActivity = now;
        
        // If user was away/offline and becomes active, set to online
        if (['away', 'offline'].includes(this.statusState.currentStatus) && this.statusState.autoStatus) {
            this.setStatus('online', null, true);
        }
        
        // Reset timers
        this.resetActivityTimers();
    }
    
    /**
     * Reset activity timers
     */
    resetActivityTimers() {
        this.clearActivityTimers();
        
        if (!this.statusState.autoStatus) return;
        
        // Set away timer
        this.awayTimeout = setTimeout(() => {
            if (this.statusState.currentStatus === 'online' && this.statusState.autoStatus) {
                this.setStatus('away', null, true);
            }
        }, this.options.autoAwayTime);
        
        // Set offline timer
        this.offlineTimeout = setTimeout(() => {
            if (['online', 'away'].includes(this.statusState.currentStatus) && this.statusState.autoStatus) {
                this.setStatus('offline', null, true);
            }
        }, this.options.autoOfflineTime);
    }
    
    /**
     * Clear activity timers
     */
    clearActivityTimers() {
        if (this.awayTimeout) {
            clearTimeout(this.awayTimeout);
            this.awayTimeout = null;
        }
        
        if (this.offlineTimeout) {
            clearTimeout(this.offlineTimeout);
            this.offlineTimeout = null;
        }
    }
    
    /**
     * Toggle status selector
     */
    toggleStatusSelector() {
        if (this.statusState.selectorOpen) {
            this.closeStatusSelector();
        } else {
            this.openStatusSelector();
        }
    }
    
    /**
     * Open status selector
     */
    openStatusSelector() {
        this.statusState.selectorOpen = true;
        this.statusSelector.style.display = 'block';
        this.element.classList.add('selector-open');
        
        // Animate in
        setTimeout(() => {
            this.statusSelector.classList.add('visible');
        }, 10);
        
        // Focus first option
        const firstOption = this.statusSelector.querySelector('.status-option');
        if (firstOption) {
            firstOption.focus();
        }
        
        this.emit('status-selector-opened');
    }
    
    /**
     * Close status selector
     */
    closeStatusSelector() {
        this.statusState.selectorOpen = false;
        this.statusSelector.classList.remove('visible');
        this.element.classList.remove('selector-open');
        
        // Hide after animation
        setTimeout(() => {
            if (!this.statusState.selectorOpen) {
                this.statusSelector.style.display = 'none';
            }
        }, 300);
        
        this.emit('status-selector-closed');
    }
    
    /**
     * Select status option
     */
    selectStatus(status) {
        if (!status) return;
        
        // Update UI selection
        this.element.querySelectorAll('.status-option').forEach(option => {
            const isSelected = option.dataset.status === status;
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-checked', isSelected);
        });
        
        // Update temporary status (not saved yet)
        this.statusState.tempStatus = status;
        
        this.emit('status-option-selected', { status });
    }
    
    /**
     * Update message counter
     */
    updateMessageCounter(message) {
        const counter = this.element.querySelector('#messageCounter');
        if (counter) {
            counter.textContent = message.length;
        }
        
        // Update temp message
        this.statusState.tempMessage = message;
    }
    
    /**
     * Cancel status change
     */
    cancelStatusChange() {
        // Reset selections
        this.selectStatus(this.statusState.currentStatus);
        
        if (this.customMessageInput) {
            this.customMessageInput.value = this.statusState.customMessage;
            this.updateMessageCounter(this.statusState.customMessage);
        }
        
        // Reset temp values
        delete this.statusState.tempStatus;
        delete this.statusState.tempMessage;
        
        this.closeStatusSelector();
        this.emit('status-change-cancelled');
    }
    
    /**
     * Save status changes
     */
    async saveStatus() {
        try {
            this.setStatusUpdating(true);
            
            const newStatus = this.statusState.tempStatus || this.statusState.currentStatus;
            const newMessage = this.statusState.tempMessage || this.statusState.customMessage;
            
            // Call API to save status
            const response = await fetch(this.options.apiEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus,
                    message: newMessage,
                    autoStatus: this.statusState.autoStatus
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update status');
            }
            
            // Update local state
            this.setStatus(newStatus, newMessage, false);
            
            // Close selector
            this.closeStatusSelector();
            
            // Show success message
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.success('Status updated successfully');
            }
            
            this.emit('status-saved', {
                status: newStatus,
                message: newMessage
            });
            
        } catch (error) {
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.error('Failed to update status');
            }
            
            this.handleError(error, 'saveStatus');
        } finally {
            this.setStatusUpdating(false);
        }
    }
    
    /**
     * Set status
     */
    setStatus(status, message = null, isAutomatic = false) {
        const oldStatus = this.statusState.currentStatus;
        
        // Update state
        this.statusState.currentStatus = status;
        if (message !== null) {
            this.statusState.customMessage = message;
        }
        
        // Update UI
        this.updateStatusDisplay();
        
        // Add to history
        this.addToStatusHistory({
            status,
            message: message || this.statusState.customMessage,
            timestamp: Date.now(),
            isAutomatic
        });
        
        // Reset activity timers for new status
        if (this.statusState.autoStatus) {
            this.resetActivityTimers();
        }
        
        this.emit('status-changed', {
            oldStatus,
            newStatus: status,
            message: this.statusState.customMessage,
            isAutomatic
        });
    }
    
    /**
     * Update status display
     */
    updateStatusDisplay() {
        const status = this.statusState.currentStatus;
        const message = this.statusState.customMessage;
        
        // Update status indicator
        if (this.statusIndicator) {
            this.statusIndicator.className = `status-indicator ${status} ${['online', 'away', 'busy'].includes(status) ? 'pulse' : ''}`;
        }
        
        // Update status message
        if (this.statusMessage) {
            if (message) {
                this.statusMessage.textContent = message;
                this.statusMessage.classList.remove('empty');
            } else {
                this.statusMessage.textContent = 'No status message';
                this.statusMessage.classList.add('empty');
            }
        }
        
        // Update status time
        const statusTime = this.element.querySelector('#statusTime');
        if (statusTime) {
            statusTime.textContent = this.getStatusTimeText();
        }
        
        // Update card styling
        if (this.statusCard) {
            this.statusCard.className = `user-status-card ${status}`;
        }
    }
    
    /**
     * Get status time text
     */
    getStatusTimeText() {
        const status = this.statusState.currentStatus;
        
        switch (status) {
            case 'online':
                return 'Online now';
            case 'away':
                return 'Away';
            case 'busy':
                return 'Busy - Do not disturb';
            case 'offline':
                return 'Last seen recently';
            default:
                return 'Unknown status';
        }
    }
    
    /**
     * Add to status history
     */
    addToStatusHistory(entry) {
        this.statusState.statusHistory.unshift(entry);
        
        // Keep only last 10 entries
        this.statusState.statusHistory = this.statusState.statusHistory.slice(0, 10);
        
        this.updateStatusHistoryDisplay();
    }
    
    /**
     * Load status history
     */
    loadStatusHistory() {
        // In a real implementation, this would load from server
        this.statusState.statusHistory = [];
        this.updateStatusHistoryDisplay();
    }
    
    /**
     * Update status history display
     */
    updateStatusHistoryDisplay() {
        const historyList = this.element.querySelector('#statusHistoryList');
        if (!historyList) return;
        
        if (this.statusState.statusHistory.length === 0) {
            historyList.innerHTML = '<div class="status-history-empty">No recent status changes</div>';
            return;
        }
        
        const historyHTML = this.statusState.statusHistory.map(entry => `
            <div class="status-history-item">
                <div class="status-history-indicator">
                    <div class="status-indicator ${entry.status} small"></div>
                </div>
                <div class="status-history-text">
                    ${this.capitalizeFirst(entry.status)}${entry.message ? `: "${entry.message}"` : ''}
                    ${entry.isAutomatic ? ' (auto)' : ''}
                </div>
                <div class="status-history-time">
                    ${this.formatRelativeTime(entry.timestamp)}
                </div>
            </div>
        `).join('');
        
        historyList.innerHTML = historyHTML;
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(event) {
        if (!this.statusState.selectorOpen) return;
        
        const focusedElement = document.activeElement;
        
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.cancelStatusChange();
                break;
            case 'Enter':
                if (focusedElement.classList.contains('status-option')) {
                    event.preventDefault();
                    this.selectStatus(focusedElement.dataset.status);
                }
                break;
            case 'ArrowDown':
            case 'ArrowUp':
                event.preventDefault();
                this.navigateStatusOptions(event.key === 'ArrowDown' ? 1 : -1);
                break;
        }
    }
    
    /**
     * Navigate status options
     */
    navigateStatusOptions(direction) {
        const options = Array.from(this.element.querySelectorAll('.status-option'));
        const currentIndex = options.findIndex(option => option === document.activeElement);
        
        let nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = options.length - 1;
        if (nextIndex >= options.length) nextIndex = 0;
        
        options[nextIndex].focus();
    }
    
    /**
     * Start status updates
     */
    startStatusUpdates() {
        if (this.options.statusUpdateInterval > 0) {
            this.updateInterval = setInterval(() => {
                this.syncStatusWithServer();
            }, this.options.statusUpdateInterval);
        }
    }
    
    /**
     * Sync status with server
     */
    async syncStatusWithServer() {
        try {
            const response = await fetch(`${this.options.apiEndpoint}/sync`);
            if (!response.ok) return;
            
            const data = await response.json();
            
            if (data.status && data.status !== this.statusState.currentStatus) {
                // Status changed on another device
                this.setStatus(data.status, data.message, false);
            }
            
        } catch (error) {
            this.log('Failed to sync status:', error);
        }
    }
    
    /**
     * Set status updating state
     */
    setStatusUpdating(updating) {
        this.statusState.isUpdating = updating;
        
        if (this.saveBtn) {
            this.saveBtn.disabled = updating;
            this.saveBtn.innerHTML = updating ? 
                '<i class="fas fa-spinner fa-spin"></i> Updating...' : 
                'Save';
        }
        
        if (updating) {
            this.element.classList.add('updating');
        } else {
            this.element.classList.remove('updating');
        }
    }
    
    /**
     * Public API: Set user info
     */
    setUserInfo(userInfo) {
        const userName = this.element.querySelector('#userName');
        const userInitials = this.element.querySelector('#userInitials');
        
        if (userName && userInfo.name) {
            userName.textContent = userInfo.name;
        }
        
        if (userInitials && userInfo.name) {
            const initials = userInfo.name
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);
            userInitials.textContent = initials;
        }
    }
    
    /**
     * Public API: Get current status
     */
    getCurrentStatus() {
        return {
            status: this.statusState.currentStatus,
            message: this.statusState.customMessage,
            autoStatus: this.statusState.autoStatus,
            lastActivity: this.statusState.lastActivity
        };
    }
    
    /**
     * Public API: Set status programmatically
     */
    setStatusProgrammatically(status, message = null) {
        this.setStatus(status, message, false);
    }
    
    /**
     * Public API: Force status sync
     */
    forceSync() {
        this.syncStatusWithServer();
    }
    
    /**
     * Utility functions
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return new Date(timestamp).toLocaleDateString();
    }
    
    /**
     * Component cleanup
     */
    onDestroy() {
        // Clear intervals and timeouts
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.clearActivityTimers();
        
        // Remove activity listeners
        if (this.activityHandler && this.activityEvents) {
            this.activityEvents.forEach(event => {
                document.removeEventListener(event, this.activityHandler);
            });
        }
        
        // Clear state
        this.statusState = null;
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.StatusManager = MivtonStatusManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonStatusManager;
}
