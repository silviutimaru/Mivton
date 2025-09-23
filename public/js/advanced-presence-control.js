/**
 * 🚀 MIVTON ADVANCED PRESENCE CONTROL COMPONENT
 * Enhanced presence management with granular privacy controls
 */

class MivtonAdvancedPresenceControl {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            autoRefreshInterval: 30000,
            autoAwayCheckInterval: 60000,
            activityTimeout: 5 * 60 * 1000,
            ...options
        };

        this.state = {
            currentStatus: 'offline',
            activityMessage: '',
            privacyMode: 'friends',
            allowedContacts: [],
            autoAwayEnabled: true,
            autoAwayMinutes: 5,
            showActivityToFriends: true,
            allowUrgentOverride: true,
            blockUnknownUsers: false,
            friends: [],
            isDropdownOpen: false,
            isSettingsOpen: false,
            lastActivity: Date.now()
        };

        this.presenceStatuses = [
            { value: 'online', label: 'Online', icon: '🟢', description: 'Available and active' },
            { value: 'away', label: 'Away', icon: '🟡', description: 'Away from keyboard' },
            { value: 'busy', label: 'Do Not Disturb', icon: '🔴', description: 'Only urgent messages or active chats' },
            { value: 'invisible', label: 'Invisible', icon: '⚫', description: 'Appear offline to others' },
            { value: 'offline', label: 'Offline', icon: '⚪', description: 'Not available' }
        ];

        this.privacyModes = [
            { value: 'everyone', label: 'Everyone', icon: 'fas fa-globe', description: 'Visible to all users' },
            { value: 'friends', label: 'Friends Only', icon: 'fas fa-users', description: 'Visible only to friends' },
            { value: 'active_chats', label: 'Active Chats Only', icon: 'fas fa-comment-dots', description: 'Only users with active conversations' },
            { value: 'selected', label: 'Selected Contacts', icon: 'fas fa-user-check', description: 'Only chosen contacts can see status' },
            { value: 'nobody', label: 'Nobody', icon: 'fas fa-eye-slash', description: 'Completely private' }
        ];

        this.autoAwayTimer = null;
        this.activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Advanced Presence Control...');
            
            this.createAdvancedPresenceInterface();
            this.bindEvents();
            await this.loadCurrentPresence();
            await this.loadFriends();
            this.setupActivityTracking();
            this.startAutoRefresh();

            console.log('✅ Advanced Presence Control initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Advanced Presence Control:', error);
            this.showError('Failed to initialize presence system');
        }
    }

    createAdvancedPresenceInterface() {
        this.element.innerHTML = `
            <div class="advanced-presence-control" data-component="advanced-presence">
                <!-- Current Status Display -->
                <div class="presence-status-display">
                    <div class="current-status-card" data-current-status>
                        <div class="status-indicator-large">
                            <span class="status-icon" data-status-icon>🟢</span>
                        </div>
                        
                        <div class="status-info">
                            <h3 class="status-label" data-status-label>Online</h3>
                            <p class="status-description" data-status-description>Available and active</p>
                            <div class="activity-message" data-activity-display style="display: none;"></div>
                        </div>
                        
                        <button class="btn-status-dropdown" data-toggle-dropdown>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>

                <!-- Status Selection Dropdown -->
                <div class="status-dropdown" data-status-dropdown style="display: none;">
                    <div class="dropdown-header">
                        <h4>Change Your Status</h4>
                        <button class="btn-close" data-close-dropdown>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="status-options" data-status-options>
                        <!-- Status options will be rendered here -->
                    </div>
                    
                    <div class="activity-message-section">
                        <label class="activity-label">Activity Message</label>
                        <div class="activity-input-group">
                            <input type="text" 
                                   class="activity-input" 
                                   data-activity-input
                                   placeholder="What are you up to?"
                                   maxlength="100">
                            <button class="btn-save-activity" data-save-activity>
                                <i class="fas fa-check"></i>
                            </button>
                        </div>
                        <div class="activity-counter">
                            <span data-activity-counter>0</span>/100
                        </div>
                    </div>
                </div>

                <!-- Privacy Settings Panel -->
                <div class="privacy-settings-panel">
                    <div class="settings-header">
                        <h3>Privacy & Visibility</h3>
                        <button class="btn-toggle-settings" data-toggle-settings>
                            <i class="fas fa-cog"></i>
                            Settings
                        </button>
                    </div>
                    
                    <div class="privacy-quick-info">
                        <div class="privacy-current">
                            <span class="privacy-label">Visible to:</span>
                            <span class="privacy-value" data-privacy-display>Friends Only</span>
                        </div>
                        
                        <div class="dnd-status" data-dnd-status style="display: none;">
                            <i class="fas fa-moon"></i>
                            <span>Do Not Disturb active</span>
                        </div>
                    </div>
                </div>

                <!-- Settings Modal -->
                <div class="settings-modal" data-settings-modal style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Advanced Presence Settings</h3>
                            <button class="modal-close" data-close-settings>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="settings-section">
                                <h4>Who Can See Your Status</h4>
                                <div class="privacy-options" data-privacy-options></div>
                            </div>
                            
                            <div class="settings-section" data-selected-contacts-section style="display: none;">
                                <h4>Selected Contacts</h4>
                                <div class="selected-contacts-list" data-selected-contacts></div>
                            </div>
                            
                            <div class="settings-section">
                                <h4>Auto-Away</h4>
                                <div class="setting-item">
                                    <label class="setting-toggle">
                                        <input type="checkbox" data-auto-away-enabled>
                                        <span class="toggle-slider"></span>
                                        <span class="toggle-label">Auto-away when inactive</span>
                                    </label>
                                </div>
                                
                                <div class="setting-item" data-auto-away-time-setting>
                                    <label>Set to Away after:</label>
                                    <select data-auto-away-minutes>
                                        <option value="1">1 minute</option>
                                        <option value="5">5 minutes</option>
                                        <option value="10">10 minutes</option>
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="settings-section">
                                <h4>Advanced Privacy</h4>
                                
                                <div class="setting-item">
                                    <label class="setting-toggle">
                                        <input type="checkbox" data-show-activity-to-friends>
                                        <span class="toggle-slider"></span>
                                        <span class="toggle-label">Show activity message to friends</span>
                                    </label>
                                </div>
                                
                                <div class="setting-item">
                                    <label class="setting-toggle">
                                        <input type="checkbox" data-allow-urgent-override>
                                        <span class="toggle-slider"></span>
                                        <span class="toggle-label">Allow urgent messages in DND mode</span>
                                    </label>
                                </div>
                                
                                <div class="setting-item">
                                    <label class="setting-toggle">
                                        <input type="checkbox" data-block-unknown-users>
                                        <span class="toggle-slider"></span>
                                        <span class="toggle-label">Block messages from non-friends</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-close-settings>Cancel</button>
                            <button class="btn btn-primary" data-save-settings>Save Settings</button>
                        </div>
                    </div>
                </div>

                <!-- Friends List -->
                <div class="friends-presence-section">
                    <h3>Friends Status</h3>
                    <div class="friends-presence-list" data-friends-list></div>
                </div>

                <!-- Status Explanations -->
                <div class="status-explanation" data-status-explanation></div>
            </div>
        `;

        this.element.classList.add('mivton-advanced-presence');
        this.renderStatusOptions();
        this.renderPrivacyOptions();
    }

    renderStatusOptions() {
        const container = this.element.querySelector('[data-status-options]');
        if (!container) return;

        container.innerHTML = this.presenceStatuses.map(status => `
            <div class="status-option ${this.state.currentStatus === status.value ? 'active' : ''}" 
                 data-status="${status.value}">
                <div class="status-option-icon">
                    <span class="status-emoji">${status.icon}</span>
                </div>
                <div class="status-option-info">
                    <h5>${status.label}</h5>
                    <p>${status.description}</p>
                </div>
                <div class="status-option-action">
                    <button class="btn btn-sm" data-select-status="${status.value}">
                        ${this.state.currentStatus === status.value ? 'Current' : 'Select'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderPrivacyOptions() {
        const container = this.element.querySelector('[data-privacy-options]');
        if (!container) return;

        container.innerHTML = this.privacyModes.map(mode => `
            <label class="privacy-option ${this.state.privacyMode === mode.value ? 'selected' : ''}">
                <input type="radio" 
                       name="privacyMode" 
                       value="${mode.value}"
                       ${this.state.privacyMode === mode.value ? 'checked' : ''}>
                <div class="privacy-option-content">
                    <div class="privacy-option-icon">
                        <i class="${mode.icon}"></i>
                    </div>
                    <div class="privacy-option-text">
                        <h5>${mode.label}</h5>
                        <p>${mode.description}</p>
                    </div>
                </div>
            </label>
        `).join('');
    }

    bindEvents() {
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('[data-toggle-dropdown]')) {
                this.toggleStatusDropdown();
            }
            if (e.target.closest('[data-close-dropdown]')) {
                this.closeStatusDropdown();
            }
            if (e.target.closest('[data-select-status]')) {
                const status = e.target.closest('[data-select-status]').dataset.selectStatus;
                this.changeStatus(status);
            }
            if (e.target.closest('[data-save-activity]')) {
                this.saveActivityMessage();
            }
            if (e.target.closest('[data-toggle-settings]')) {
                this.toggleSettings();
            }
            if (e.target.closest('[data-close-settings]')) {
                this.closeSettings();
            }
            if (e.target.closest('[data-save-settings]')) {
                this.saveSettings();
            }
        });

        this.element.addEventListener('change', (e) => {
            if (e.target.name === 'privacyMode') {
                this.handlePrivacyModeChange(e.target.value);
            }
        });

        const activityInput = this.element.querySelector('[data-activity-input]');
        if (activityInput) {
            activityInput.addEventListener('input', (e) => {
                this.updateActivityCounter(e.target.value.length);
            });
        }
    }

    async loadCurrentPresence() {
        try {
            const response = await fetch('/api/presence/advanced/status', {
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                const presence = data.presence;
                this.state.currentStatus = presence.status;
                this.state.activityMessage = presence.activity_message || '';
                this.state.privacyMode = presence.privacy_settings.privacy_mode;
                this.updateStatusDisplay();
                this.updatePrivacyDisplay();
            }
        } catch (error) {
            console.error('❌ Error loading current presence:', error);
        }
    }

    async changeStatus(newStatus) {
        try {
            const response = await fetch('/api/presence/advanced/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    status: newStatus,
                    activity_message: this.state.activityMessage
                })
            });

            const data = await response.json();
            if (data.success) {
                this.state.currentStatus = newStatus;
                this.updateStatusDisplay();
                this.closeStatusDropdown();
                this.showStatusExplanation(newStatus);
            }
        } catch (error) {
            console.error('❌ Error changing status:', error);
        }
    }

    updateStatusDisplay() {
        const statusObj = this.presenceStatuses.find(s => s.value === this.state.currentStatus);
        if (!statusObj) return;

        const statusIcon = this.element.querySelector('[data-status-icon]');
        const statusLabel = this.element.querySelector('[data-status-label]');
        const statusDescription = this.element.querySelector('[data-status-description]');
        const activityDisplay = this.element.querySelector('[data-activity-display]');

        if (statusIcon) statusIcon.textContent = statusObj.icon;
        if (statusLabel) statusLabel.textContent = statusObj.label;
        if (statusDescription) statusDescription.textContent = statusObj.description;
        
        if (activityDisplay) {
            if (this.state.activityMessage) {
                activityDisplay.textContent = this.state.activityMessage;
                activityDisplay.style.display = 'block';
            } else {
                activityDisplay.style.display = 'none';
            }
        }

        this.renderStatusOptions();
    }

    updatePrivacyDisplay() {
        const privacyDisplay = this.element.querySelector('[data-privacy-display]');
        const dndStatus = this.element.querySelector('[data-dnd-status]');
        
        if (privacyDisplay) {
            const privacyObj = this.privacyModes.find(p => p.value === this.state.privacyMode);
            privacyDisplay.textContent = privacyObj ? privacyObj.label : 'Unknown';
        }
        
        if (dndStatus) {
            dndStatus.style.display = this.state.currentStatus === 'busy' ? 'flex' : 'none';
        }
    }

    handlePrivacyModeChange(newMode) {
        this.state.privacyMode = newMode;
        const selectedContactsSection = this.element.querySelector('[data-selected-contacts-section]');
        if (selectedContactsSection) {
            selectedContactsSection.style.display = newMode === 'selected' ? 'block' : 'none';
        }
        this.renderPrivacyOptions();
    }

    showStatusExplanation(status) {
        const container = this.element.querySelector('[data-status-explanation]');
        if (!container) return;

        let explanation = '';
        
        if (status === 'busy') {
            explanation = `
                <div class="status-explanation busy">
                    <div class="explanation-icon">🚫</div>
                    <div class="explanation-content">
                        <h4>Do Not Disturb Mode Active</h4>
                        <p>You'll only receive messages from users with active chats or selected contacts.</p>
                    </div>
                </div>
            `;
        } else if (status === 'invisible') {
            explanation = `
                <div class="status-explanation invisible">
                    <div class="explanation-icon">👻</div>
                    <div class="explanation-content">
                        <h4>Invisible Mode Active</h4>
                        <p>You appear offline to others but can still receive messages.</p>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = explanation;
        
        if (explanation) {
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }
    }

    updateActivityCounter(length) {
        const counter = this.element.querySelector('[data-activity-counter]');
        if (counter) {
            counter.textContent = length;
        }
    }

    toggleStatusDropdown() {
        const dropdown = this.element.querySelector('[data-status-dropdown]');
        if (dropdown) {
            const isOpen = dropdown.style.display !== 'none';
            dropdown.style.display = isOpen ? 'none' : 'block';
            this.state.isDropdownOpen = !isOpen;
        }
    }

    closeStatusDropdown() {
        const dropdown = this.element.querySelector('[data-status-dropdown]');
        if (dropdown) {
            dropdown.style.display = 'none';
            this.state.isDropdownOpen = false;
        }
    }

    toggleSettings() {
        const modal = this.element.querySelector('[data-settings-modal]');
        if (modal) {
            const isOpen = modal.style.display !== 'none';
            modal.style.display = isOpen ? 'none' : 'flex';
            this.state.isSettingsOpen = !isOpen;
        }
    }

    closeSettings() {
        const modal = this.element.querySelector('[data-settings-modal]');
        if (modal) {
            modal.style.display = 'none';
            this.state.isSettingsOpen = false;
        }
    }

    async saveActivityMessage() {
        const input = this.element.querySelector('[data-activity-input]');
        if (!input) return;

        const message = input.value.trim();
        this.state.activityMessage = message;
        
        try {
            await fetch('/api/presence/advanced/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    status: this.state.currentStatus,
                    activity_message: message
                })
            });
            
            this.updateStatusDisplay();
        } catch (error) {
            console.error('❌ Error saving activity message:', error);
        }
    }

    async saveSettings() {
        try {
            await fetch('/api/presence/advanced/privacy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    privacy_mode: this.state.privacyMode,
                    auto_away_enabled: this.state.autoAwayEnabled,
                    auto_away_minutes: this.state.autoAwayMinutes
                })
            });
            
            this.closeSettings();
            this.updatePrivacyDisplay();
        } catch (error) {
            console.error('❌ Error saving settings:', error);
        }
    }

    async loadFriends() {
        // Placeholder for loading friends with their contact permissions
        this.state.friends = [];
    }

    setupActivityTracking() {
        this.activityEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }

    updateLastActivity() {
        this.state.lastActivity = Date.now();
    }

    startAutoRefresh() {
        setInterval(async () => {
            if (!this.state.isDropdownOpen && !this.state.isSettingsOpen) {
                await this.loadFriends();
            }
        }, this.options.autoRefreshInterval);
    }

    showError(message) {
        console.error('Presence Error:', message);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    const presenceElements = document.querySelectorAll('[data-component="advanced-presence"]');
    presenceElements.forEach(element => {
        if (!element.mivtonComponent) {
            element.mivtonComponent = new MivtonAdvancedPresenceControl(element);
        }
    });
});

if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.AdvancedPresenceControl = MivtonAdvancedPresenceControl;
}
