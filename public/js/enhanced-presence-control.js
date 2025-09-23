/**
 * 🚀 MIVTON ENHANCED PRESENCE VISIBILITY CONTROL
 * Advanced presence management with granular visibility controls
 * Integrates with existing advanced presence system
 */

class MivtonEnhancedPresenceControl {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            autoRefreshInterval: 30000,
            autoAwayCheckInterval: 60000,
            enableQuickActions: true,
            showFriendsPresence: true,
            enableCustomStatuses: true,
            ...options
        };

        this.state = {
            currentStatus: 'offline',
            activityMessage: '',
            privacyMode: 'friends',
            allowedContacts: [],
            customStatuses: [],
            autoAwayEnabled: true,
            autoAwayMinutes: 5,
            showActivityToFriends: true,
            allowUrgentOverride: true,  
            blockUnknownUsers: false,
            showLastSeen: 'friends',
            showOnlineStatus: 'friends',
            dndExceptions: [],
            quietHours: null,
            friends: [],
            isDropdownOpen: false,
            isSettingsOpen: false,
            lastActivity: Date.now()
        };

        this.presenceStatuses = [
            { 
                value: 'online', 
                label: 'Online', 
                icon: '🟢', 
                color: '#22c55e',
                description: 'Available and active',
                allowsInteraction: true,
                canReceiveMessages: true,
                showActivity: true
            },
            { 
                value: 'away', 
                label: 'Away', 
                icon: '🟡', 
                color: '#f59e0b',
                description: 'Away from keyboard - may respond later',
                allowsInteraction: true,
                canReceiveMessages: true,
                showActivity: false
            },
            { 
                value: 'busy', 
                label: 'Do Not Disturb', 
                icon: '🔴', 
                color: '#ef4444',
                description: 'Only urgent messages, active chats, or selected contacts',
                allowsInteraction: false,
                canReceiveMessages: 'restricted',
                showActivity: false
            },
            { 
                value: 'invisible', 
                label: 'Invisible', 
                icon: '⚫', 
                color: '#6b7280',
                description: 'Appear offline while staying connected',
                allowsInteraction: false,
                canReceiveMessages: true,
                showActivity: false
            },
            { 
                value: 'offline', 
                label: 'Offline', 
                icon: '⚪', 
                color: '#9ca3af',
                description: 'Not available - disconnected',
                allowsInteraction: false,
                canReceiveMessages: false,
                showActivity: false
            }
        ];

        this.privacyModes = [
            { 
                value: 'everyone', 
                label: 'Everyone', 
                icon: 'fas fa-globe', 
                color: '#3b82f6',
                description: 'All users can see your status and activity',
                risk: 'low',
                recommended: false
            },
            { 
                value: 'friends', 
                label: 'Friends Only', 
                icon: 'fas fa-users', 
                color: '#22c55e',
                description: 'Only your friends can see your presence',
                risk: 'low',
                recommended: true
            },
            { 
                value: 'active_chats', 
                label: 'Active Conversations', 
                icon: 'fas fa-comment-dots', 
                color: '#f59e0b',
                description: 'Only users you\'re actively chatting with',
                risk: 'medium',
                recommended: false
            },
            { 
                value: 'selected', 
                label: 'Selected Contacts', 
                icon: 'fas fa-user-check', 
                color: '#8b5cf6',
                description: 'Only specific people you choose',
                risk: 'low',
                recommended: false
            },
            { 
                value: 'nobody', 
                label: 'Complete Privacy', 
                icon: 'fas fa-eye-slash', 
                color: '#6b7280',
                description: 'No one can see your presence status',
                risk: 'none',
                recommended: false
            }
        ];

        this.customStatuses = [
            { emoji: '☕', message: 'Coffee break' },
            { emoji: '📚', message: 'Studying' },
            { emoji: '🎵', message: 'Listening to music' },
            { emoji: '💼', message: 'Working' },
            { emoji: '🏋️', message: 'At the gym' },
            { emoji: '🌙', message: 'Do not disturb' },
            { emoji: '🚗', message: 'Commuting' },
            { emoji: '🍽️', message: 'Having lunch' },
            { emoji: '📞', message: 'On a call' },
            { emoji: '🎮', message: 'Gaming' }
        ];

        this.initialize();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Enhanced Presence Control...');
            
            this.createEnhancedInterface();
            this.bindEvents();
            await this.loadCurrentPresence();
            await this.loadFriends();
            this.setupActivityTracking();
            this.startAutoRefresh();
            this.checkAutoAway();

            console.log('✅ Enhanced Presence Control initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Presence Control:', error);
            this.showError('Failed to initialize presence system');
        }
    }

    createEnhancedInterface() {
        this.element.innerHTML = `
            <div class="enhanced-presence-control" data-component="enhanced-presence">
                <!-- Header Section -->
                <div class="presence-header">
                    <div class="header-content">
                        <h2 class="presence-title">
                            <i class="fas fa-user-circle"></i>
                            Your Presence
                        </h2>
                        <div class="privacy-indicator" data-privacy-indicator>
                            <i class="fas fa-shield-alt"></i>
                            <span data-privacy-level>Protected</span>
                        </div>
                    </div>
                </div>

                <!-- Current Status Card -->
                <div class="current-status-card enhanced" data-current-status>
                    <div class="status-main">
                        <div class="status-indicator-enhanced">
                            <div class="status-icon-container">
                                <span class="status-icon-large" data-status-icon>🟢</span>
                                <div class="status-pulse" data-status-pulse></div>
                            </div>
                        </div>
                        
                        <div class="status-details">
                            <div class="status-header">
                                <h3 class="status-label" data-status-label">Online</h3>
                                <div class="status-badges">
                                    <span class="privacy-badge" data-privacy-badge>Friends Only</span>
                                    <span class="auto-away-badge" data-auto-away-badge style="display: none;">Auto-Away</span>
                                </div>
                            </div>
                            
                            <p class="status-description" data-status-description>Available and active</p>
                            
                            <div class="activity-message-display" data-activity-display style="display: none;">
                                <i class="fas fa-comment-dots"></i>
                                <span data-activity-text></span>
                            </div>
                            
                            <div class="visibility-info" data-visibility-info>
                                <small>Visible to <span data-visibility-count">0</span> friends</small>
                            </div>
                        </div>
                        
                        <div class="status-actions">
                            <button class="btn-status-change" data-toggle-status>
                                <i class="fas fa-edit"></i>
                                Change
                            </button>
                            <button class="btn-settings" data-toggle-settings>
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Quick Status Actions -->
                <div class="quick-actions-panel" data-quick-actions>
                    <h4>Quick Actions</h4>
                    <div class="quick-actions-grid">
                        <button class="quick-action" data-quick-status="busy">
                            <span class="quick-icon">🔴</span>
                            <span>Do Not Disturb</span>
                        </button>
                        <button class="quick-action" data-quick-status="away">
                            <span class="quick-icon">🟡</span>
                            <span>Away</span>
                        </button>
                        <button class="quick-action" data-quick-status="invisible">
                            <span class="quick-icon">⚫</span>
                            <span>Invisible</span>
                        </button>
                        <button class="quick-action" data-add-custom>
                            <span class="quick-icon">➕</span>
                            <span>Custom Status</span>
                        </button>
                    </div>
                </div>

                <!-- Status Selection Modal -->
                <div class="status-modal" data-status-modal style="display: none;">
                    <div class="modal-overlay" data-modal-overlay></div>
                    <div class="modal-content enhanced">
                        <div class="modal-header">
                            <h3>Change Your Status</h3>
                            <button class="modal-close" data-close-status-modal>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="status-options-enhanced" data-status-options></div>
                            
                            <div class="custom-status-section">
                                <h4>Custom Status Message</h4>
                                
                                <div class="custom-status-presets">
                                    <div class="preset-buttons" data-preset-buttons></div>
                                </div>
                                
                                <div class="activity-input-section">
                                    <div class="input-with-emoji">
                                        <select class="emoji-selector" data-emoji-selector>
                                            <option value="">😊</option>
                                            <option value="☕">☕</option>
                                            <option value="📚">📚</option>
                                            <option value="🎵">🎵</option>
                                            <option value="💼">💼</option>
                                            <option value="🏋️">🏋️</option>
                                            <option value="🌙">🌙</option>
                                            <option value="🚗">🚗</option>
                                            <option value="🍽️">🍽️</option>
                                            <option value="📞">📞</option>
                                            <option value="🎮">🎮</option>
                                        </select>
                                        <input type="text" 
                                               class="activity-input enhanced" 
                                               data-activity-input
                                               placeholder="What's happening?"
                                               maxlength="100">
                                    </div>
                                    <div class="input-footer">
                                        <div class="character-counter">
                                            <span data-activity-counter>0</span>/100
                                        </div>
                                        <button class="btn btn-sm btn-clear" data-clear-activity>
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-close-status-modal>Cancel</button>
                            <button class="btn btn-primary" data-save-status>Save Status</button>
                        </div>
                    </div>
                </div>

                <!-- Privacy Settings Modal -->
                <div class="settings-modal enhanced" data-settings-modal style="display: none;">
                    <div class="modal-overlay" data-settings-overlay></div>
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h3>Presence & Privacy Settings</h3>
                            <button class="modal-close" data-close-settings>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="settings-tabs">
                                <button class="tab-button active" data-tab="visibility">
                                    <i class="fas fa-eye"></i>
                                    Visibility
                                </button>
                                <button class="tab-button" data-tab="privacy">
                                    <i class="fas fa-shield-alt"></i>
                                    Privacy
                                </button>
                                <button class="tab-button" data-tab="automation">
                                    <i class="fas fa-robot"></i>
                                    Automation
                                </button>
                                <button class="tab-button" data-tab="notifications">
                                    <i class="fas fa-bell"></i>
                                    Notifications
                                </button>
                            </div>
                            
                            <!-- Visibility Tab -->
                            <div class="tab-content active" data-tab-content="visibility">
                                <div class="settings-section">
                                    <h4>Who Can See Your Status</h4>
                                    <p class="section-description">Control who can see when you're online, away, or busy</p>
                                    <div class="privacy-options-enhanced" data-privacy-options></div>
                                </div>
                                
                                <div class="settings-section" data-selected-contacts-section style="display: none;">
                                    <h4>Selected Contacts</h4>
                                    <p class="section-description">Choose specific friends who can see your status</p>
                                    <div class="selected-contacts-manager" data-selected-contacts></div>
                                </div>
                                
                                <div class="settings-section">
                                    <h4>Activity Information</h4>
                                    <div class="setting-item">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-show-activity-to-friends>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Show activity message to friends</span>
                                                <small>Friends can see custom status messages you set</small>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-item">
                                        <label class="setting-select">
                                            <span class="select-label">Show "last seen" to:</span>
                                            <select data-show-last-seen>
                                                <option value="everyone">Everyone</option>
                                                <option value="friends">Friends only</option>
                                                <option value="nobody">Nobody</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Privacy Tab -->
                            <div class="tab-content" data-tab-content="privacy">
                                <div class="settings-section">
                                    <h4>Message Permissions</h4>
                                    
                                    <div class="setting-item">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-block-unknown-users>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Block messages from non-friends</span>
                                                <small>Only friends can send you messages</small>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-item">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-allow-urgent-override>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Allow urgent message override</span>
                                                <small>Friends can bypass Do Not Disturb for urgent messages</small>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="settings-section">
                                    <h4>Do Not Disturb Exceptions</h4>
                                    <p class="section-description">Add exceptions for when you're in Do Not Disturb mode</p>
                                    <div class="dnd-exceptions" data-dnd-exceptions>
                                        <button class="btn btn-outline" data-add-exception>
                                            <i class="fas fa-plus"></i>
                                            Add Exception
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="settings-section">
                                    <h4>Quiet Hours</h4>
                                    <div class="quiet-hours-setting">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-enable-quiet-hours>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Enable quiet hours</span>
                                                <small>Automatically set to Do Not Disturb during specific times</small>
                                            </div>
                                        </label>
                                        
                                        <div class="quiet-hours-times" data-quiet-hours-times style="display: none;">
                                            <div class="time-inputs">
                                                <label>
                                                    From:
                                                    <input type="time" data-quiet-start>
                                                </label>
                                                <label>
                                                    To:
                                                    <input type="time" data-quiet-end>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Automation Tab -->
                            <div class="tab-content" data-tab-content="automation">
                                <div class="settings-section">
                                    <h4>Auto-Away</h4>
                                    <div class="setting-item">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-auto-away-enabled>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Auto-away when inactive</span>
                                                <small>Automatically set status to away when you're not active</small>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-item" data-auto-away-time-setting>
                                        <label class="setting-select">
                                            <span class="select-label">Set to Away after:</span>
                                            <select data-auto-away-minutes>
                                                <option value="1">1 minute</option>
                                                <option value="5">5 minutes</option>
                                                <option value="10">10 minutes</option>
                                                <option value="15">15 minutes</option>
                                                <option value="30">30 minutes</option>
                                                <option value="60">1 hour</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>
                                
                                <div class="settings-section">
                                    <h4>Smart Status</h4>
                                    <div class="setting-item">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-smart-status>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Smart status detection</span>
                                                <small>Automatically detect when you're in a meeting or busy</small>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Notifications Tab -->
                            <div class="tab-content" data-tab-content="notifications">
                                <div class="settings-section">
                                    <h4>Presence Notifications</h4>
                                    <div class="setting-item">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-notify-friends-online>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Notify when friends come online</span>
                                                <small>Get notified when your friends become available</small>
                                            </div>
                                        </label>
                                    </div>
                                    
                                    <div class="setting-item">
                                        <label class="setting-toggle advanced">
                                            <input type="checkbox" data-status-change-sound>
                                            <span class="toggle-slider"></span>
                                            <div class="toggle-content">
                                                <span class="toggle-label">Play sound for status changes</span>
                                                <small>Hear a sound when friends change their status</small>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-close-settings>Cancel</button>
                            <button class="btn btn-primary" data-save-all-settings>Save All Settings</button>
                        </div>
                    </div>
                </div>

                <!-- Friends Presence Section -->
                <div class="friends-presence-section enhanced" data-friends-section>
                    <div class="section-header">
                        <h3>Friends Status</h3>
                        <div class="friends-controls">
                            <select class="status-filter" data-status-filter>
                                <option value="">All Friends</option>
                                <option value="online">Online</option>
                                <option value="away">Away</option>
                                <option value="busy">Busy</option>
                                <option value="offline">Offline</option>
                            </select>
                            <button class="btn-refresh" data-refresh-friends>
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="friends-stats" data-friends-stats>
                        <div class="stat-item">
                            <span class="stat-icon">🟢</span>
                            <span class="stat-count" data-online-count>0</span>
                            <span class="stat-label">Online</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🟡</span>
                            <span class="stat-count" data-away-count>0</span>
                            <span class="stat-label">Away</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-icon">🔴</span>
                            <span class="stat-count" data-busy-count>0</span>
                            <span class="stat-label">Busy</span>
                        </div>
                    </div>
                    
                    <div class="friends-list enhanced" data-friends-list></div>
                </div>

                <!-- Status Explanation -->
                <div class="status-explanation-panel" data-status-explanation></div>
                
                <!-- Toast Notifications -->
                <div class="toast-container" data-toast-container></div>
            </div>
        `;

        this.element.classList.add('mivton-enhanced-presence');
        this.renderStatusOptions();
        this.renderPrivacyOptions();
        this.renderPresetButtons();
        this.setupTabs();
    }

    renderStatusOptions() {
        const container = this.element.querySelector('[data-status-options]');
        if (!container) return;

        container.innerHTML = this.presenceStatuses.map(status => `
            <div class="status-option enhanced ${this.state.currentStatus === status.value ? 'active' : ''}" 
                 data-status="${status.value}">
                <div class="status-option-content">
                    <div class="status-option-icon" style="color: ${status.color}">
                        <span class="status-emoji">${status.icon}</span>
                    </div>
                    <div class="status-option-info">
                        <h5>${status.label}</h5>
                        <p>${status.description}</p>
                        <div class="status-features">
                            ${status.canReceiveMessages === true ? '<small class="feature-tag positive"><i class="fas fa-check"></i> Receives messages</small>' : ''}
                            ${status.canReceiveMessages === 'restricted' ? '<small class="feature-tag warning"><i class="fas fa-exclamation"></i> Limited messages</small>' : ''}
                            ${status.canReceiveMessages === false ? '<small class="feature-tag negative"><i class="fas fa-times"></i> No messages</small>' : ''}
                        </div>
                    </div>
                    <div class="status-option-action">
                        <button class="btn btn-status-select ${this.state.currentStatus === status.value ? 'selected' : ''}" 
                                data-select-status="${status.value}">
                            ${this.state.currentStatus === status.value ? 'Current' : 'Select'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPrivacyOptions() {
        const container = this.element.querySelector('[data-privacy-options]');
        if (!container) return;

        container.innerHTML = this.privacyModes.map(mode => `
            <div class="privacy-option enhanced ${this.state.privacyMode === mode.value ? 'selected' : ''}">
                <label class="privacy-option-content">
                    <input type="radio" 
                           name="privacyMode" 
                           value="${mode.value}"
                           ${this.state.privacyMode === mode.value ? 'checked' : ''}>
                    <div class="privacy-option-visual">
                        <div class="privacy-option-icon" style="color: ${mode.color}">
                            <i class="${mode.icon}"></i>
                        </div>
                        <div class="privacy-option-text">
                            <div class="privacy-option-header">
                                <h5>${mode.label}</h5>
                                ${mode.recommended ? '<span class="recommended-badge">Recommended</span>' : ''}
                            </div>
                            <p>${mode.description}</p>
                            <div class="privacy-risk">
                                <span class="risk-indicator risk-${mode.risk}"></span>
                                <small>Privacy level: ${mode.risk}</small>
                            </div>
                        </div>
                    </div>
                </label>
            </div>
        `).join('');
    }

    renderPresetButtons() {
        const container = this.element.querySelector('[data-preset-buttons]');
        if (!container) return;

        container.innerHTML = this.customStatuses.map(preset => `
            <button class="preset-button" data-preset-emoji="${preset.emoji}" data-preset-message="${preset.message}">
                <span class="preset-emoji">${preset.emoji}</span>
                <span class="preset-text">${preset.message}</span>
            </button>
        `).join('');
    }

    setupTabs() {
        const tabButtons = this.element.querySelectorAll('[data-tab]');
        const tabContents = this.element.querySelectorAll('[data-tab-content]');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                
                // Update active tab button
                tabButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.dataset.tabContent === tabName) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    bindEvents() {
        // Status change events
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('[data-toggle-status]')) {
                this.openStatusModal();
            }
            if (e.target.closest('[data-close-status-modal]') || e.target.matches('[data-modal-overlay]')) {
                this.closeStatusModal();
            }
            if (e.target.closest('[data-select-status]')) {
                const status = e.target.closest('[data-select-status]').dataset.selectStatus;
                this.selectStatus(status);
            }
            if (e.target.closest('[data-save-status]')) {
                this.saveStatusChanges();
            }
            
            // Quick actions
            if (e.target.closest('[data-quick-status]')) {
                const status = e.target.closest('[data-quick-status]').dataset.quickStatus;
                this.quickStatusChange(status);
            }
            if (e.target.closest('[data-add-custom]')) {
                this.openStatusModal();
            }
            
            // Settings events
            if (e.target.closest('[data-toggle-settings]')) {
                this.openSettingsModal();
            }
            if (e.target.closest('[data-close-settings]') || e.target.matches('[data-settings-overlay]')) {
                this.closeSettingsModal();
            }
            if (e.target.closest('[data-save-all-settings]')) {
                this.saveAllSettings();
            }
            
            // Preset buttons
            if (e.target.closest('[data-preset-emoji]')) {
                const button = e.target.closest('[data-preset-emoji]');
                this.applyPreset(button.dataset.presetEmoji, button.dataset.presetMessage);
            }
            
            // Clear activity
            if (e.target.closest('[data-clear-activity]')) {
                this.clearActivity();
            }
            
            // Refresh friends
            if (e.target.closest('[data-refresh-friends]')) {
                this.refreshFriends();
            }
        });

        // Privacy mode change
        this.element.addEventListener('change', (e) => {
            if (e.target.name === 'privacyMode') {
                this.handlePrivacyModeChange(e.target.value);
            }
            if (e.target.matches('[data-status-filter]')) {
                this.filterFriends(e.target.value);
            }
            if (e.target.matches('[data-enable-quiet-hours]')) {
                this.toggleQuietHours(e.target.checked);
            }
        });

        // Activity input
        const activityInput = this.element.querySelector('[data-activity-input]');
        if (activityInput) {
            activityInput.addEventListener('input', (e) => {
                this.updateActivityCounter(e.target.value.length);
            });
        }

        // Emoji selector
        const emojiSelector = this.element.querySelector('[data-emoji-selector]');
        if (emojiSelector) {
            emojiSelector.addEventListener('change', (e) => {
                this.updateEmojiInInput(e.target.value);
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
                this.state.allowedContacts = presence.privacy_settings.allowed_contacts || [];
                this.state.autoAwayEnabled = presence.privacy_settings.auto_away_enabled;
                this.state.autoAwayMinutes = presence.privacy_settings.auto_away_minutes;
                this.state.showActivityToFriends = presence.privacy_settings.show_activity_to_friends;
                this.state.allowUrgentOverride = presence.privacy_settings.allow_urgent_override;
                this.state.blockUnknownUsers = presence.privacy_settings.block_unknown_users;
                
                this.updateAllDisplays();
            }
        } catch (error) {
            console.error('❌ Error loading current presence:', error);
            this.showToast('Failed to load presence settings', 'error');
        }
    }

    async changeStatus(newStatus, activityMessage = null) {
        try {
            const response = await fetch('/api/presence/advanced/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    status: newStatus,
                    activity_message: activityMessage || this.state.activityMessage
                })
            });

            const data = await response.json();
            if (data.success) {
                this.state.currentStatus = newStatus;
                if (activityMessage !== null) {
                    this.state.activityMessage = activityMessage;
                }
                this.updateAllDisplays();
                this.showStatusExplanation(newStatus);
                this.showToast(`Status changed to ${this.getStatusLabel(newStatus)}`, 'success');
                return true;
            } else {
                this.showToast(data.error || 'Failed to change status', 'error');
                return false;
            }
        } catch (error) {
            console.error('❌ Error changing status:', error);
            this.showToast('Failed to change status', 'error');
            return false;
        }
    }

    async quickStatusChange(status) {
        const success = await this.changeStatus(status);
        if (success) {
            this.animateQuickAction(status);
        }
    }

    async saveStatusChanges() {
        const activityInput = this.element.querySelector('[data-activity-input]');
        const emojiSelector = this.element.querySelector('[data-emoji-selector]');
        
        let activityMessage = activityInput ? activityInput.value.trim() : '';
        const selectedEmoji = emojiSelector ? emojiSelector.value : '';
        
        if (selectedEmoji && activityMessage) {
            activityMessage = `${selectedEmoji} ${activityMessage}`;
        }

        const success = await this.changeStatus(this.state.currentStatus, activityMessage);
        if (success) {
            this.closeStatusModal();
        }
    }

    async saveAllSettings() {
        try {
            const settingsData = this.gatherAllSettings();
            
            const response = await fetch('/api/presence/advanced/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(settingsData)
            });

            const data = await response.json();
            if (data.success) {
                Object.assign(this.state, settingsData);
                this.closeSettingsModal();
                this.updateAllDisplays();
                this.showToast('Settings saved successfully', 'success');
            } else {
                this.showToast(data.error || 'Failed to save settings', 'error');
            }
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    gatherAllSettings() {
        const settings = {};
        
        // Privacy mode
        const privacyRadio = this.element.querySelector('input[name="privacyMode"]:checked');
        if (privacyRadio) {
            settings.privacy_mode = privacyRadio.value;
        }
        
        // Checkboxes
        const checkboxes = {
            'auto_away_enabled': '[data-auto-away-enabled]',
            'show_activity_to_friends': '[data-show-activity-to-friends]',
            'allow_urgent_override': '[data-allow-urgent-override]',
            'block_unknown_users': '[data-block-unknown-users]'
        };
        
        Object.entries(checkboxes).forEach(([key, selector]) => {
            const checkbox = this.element.querySelector(selector);
            if (checkbox) {
                settings[key] = checkbox.checked;
            }
        });
        
        // Select values
        const autoAwayMinutes = this.element.querySelector('[data-auto-away-minutes]');
        if (autoAwayMinutes) {
            settings.auto_away_minutes = parseInt(autoAwayMinutes.value);
        }
        
        const showLastSeen = this.element.querySelector('[data-show-last-seen]');
        if (showLastSeen) {
            settings.show_last_seen = showLastSeen.value;
        }
        
        return settings;
    }

    updateAllDisplays() {
        this.updateStatusDisplay();
        this.updatePrivacyDisplay();
        this.updateSettingsInputs();
        this.renderStatusOptions();
        this.renderPrivacyOptions();
    }

    updateStatusDisplay() {
        const statusObj = this.presenceStatuses.find(s => s.value === this.state.currentStatus);
        if (!statusObj) return;

        const statusIcon = this.element.querySelector('[data-status-icon]');
        const statusLabel = this.element.querySelector('[data-status-label]');
        const statusDescription = this.element.querySelector('[data-status-description]');
        const activityDisplay = this.element.querySelector('[data-activity-display]');
        const activityText = this.element.querySelector('[data-activity-text]');
        const statusPulse = this.element.querySelector('[data-status-pulse]');

        if (statusIcon) statusIcon.textContent = statusObj.icon;
        if (statusLabel) statusLabel.textContent = statusObj.label;
        if (statusDescription) statusDescription.textContent = statusObj.description;
        
        if (activityDisplay && activityText) {
            if (this.state.activityMessage) {
                activityText.textContent = this.state.activityMessage;
                activityDisplay.style.display = 'flex';
            } else {
                activityDisplay.style.display = 'none';
            }
        }
        
        if (statusPulse) {
            statusPulse.className = `status-pulse pulse-${this.state.currentStatus}`;
        }
    }

    updatePrivacyDisplay() {
        const privacyBadge = this.element.querySelector('[data-privacy-badge]');
        const privacyLevel = this.element.querySelector('[data-privacy-level]');
        const privacyIndicator = this.element.querySelector('[data-privacy-indicator]');
        
        const privacyObj = this.privacyModes.find(p => p.value === this.state.privacyMode);
        
        if (privacyBadge && privacyObj) {
            privacyBadge.textContent = privacyObj.label;
        }
        
        if (privacyLevel && privacyObj) {
            privacyLevel.textContent = privacyObj.label;
        }
        
        if (privacyIndicator && privacyObj) {
            privacyIndicator.className = `privacy-indicator privacy-${privacyObj.risk}`;
        }
    }

    updateSettingsInputs() {
        // Update checkboxes
        const checkboxMappings = {
            '[data-auto-away-enabled]': this.state.autoAwayEnabled,
            '[data-show-activity-to-friends]': this.state.showActivityToFriends,
            '[data-allow-urgent-override]': this.state.allowUrgentOverride,
            '[data-block-unknown-users]': this.state.blockUnknownUsers
        };
        
        Object.entries(checkboxMappings).forEach(([selector, value]) => {
            const checkbox = this.element.querySelector(selector);
            if (checkbox) {
                checkbox.checked = value;
            }
        });
        
        // Update selects
        const autoAwayMinutes = this.element.querySelector('[data-auto-away-minutes]');
        if (autoAwayMinutes) {
            autoAwayMinutes.value = this.state.autoAwayMinutes;
        }
    }

    async loadFriends() {
        try {
            const response = await fetch('/api/presence/advanced/friends-filtered', {
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                this.state.friends = data.friends;
                this.renderFriendsList();
                this.updateFriendsStats(data.stats);
            }
        } catch (error) {
            console.error('❌ Error loading friends:', error);
            this.showToast('Failed to load friends list', 'error');
        }
    }

    renderFriendsList() {
        const container = this.element.querySelector('[data-friends-list]');
        if (!container) return;

        if (this.state.friends.length === 0) {
            container.innerHTML = `
                <div class="empty-friends">
                    <i class="fas fa-user-friends"></i>
                    <p>No friends to show</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.state.friends.map(friend => `
            <div class="friend-item enhanced" data-friend-id="${friend.friend_id}">
                <div class="friend-avatar">
                    <div class="avatar-placeholder">
                        ${friend.friend_full_name.charAt(0).toUpperCase()}
                    </div>
                    <div class="status-indicator-small status-${friend.visible_status}">
                        ${this.getStatusIcon(friend.visible_status)}
                    </div>
                </div>
                
                <div class="friend-info">
                    <div class="friend-name">
                        ${this.escapeHtml(friend.friend_full_name)}
                        ${friend.friend_verified ? '<i class="fas fa-check-circle verified" title="Verified"></i>' : ''}
                    </div>
                    <div class="friend-status">
                        <span class="status-text">${this.getStatusLabel(friend.visible_status)}</span>
                        ${friend.visible_activity_message ? `<span class="activity-message">${this.escapeHtml(friend.visible_activity_message)}</span>` : ''}
                    </div>
                    ${friend.last_seen && friend.visible_status === 'offline' ? 
                        `<div class="last-seen">Last seen ${this.formatLastSeen(friend.last_seen)}</div>` : ''}
                </div>
                
                <div class="friend-actions">
                    ${friend.contact_permissions.can_message ? 
                        `<button class="btn-friend-action" data-message-friend="${friend.friend_id}" title="Send message">
                            <i class="fas fa-comment"></i>
                        </button>` : ''}
                    ${friend.has_active_chat ? 
                        `<span class="active-chat-indicator" title="Active conversation">
                            <i class="fas fa-comment-dots"></i>
                        </span>` : ''}
                </div>
            </div>
        `).join('');
    }

    updateFriendsStats(stats) {
        const onlineCount = this.element.querySelector('[data-online-count]');
        const awayCount = this.element.querySelector('[data-away-count]');
        const busyCount = this.element.querySelector('[data-busy-count]');
        const visibilityCount = this.element.querySelector('[data-visibility-count]');

        if (onlineCount) onlineCount.textContent = stats.online || 0;
        if (awayCount) awayCount.textContent = stats.away || 0;
        if (busyCount) busyCount.textContent = stats.busy || 0;
        if (visibilityCount) {
            const visibleFriends = (stats.online || 0) + (stats.away || 0) + (stats.busy || 0);
            visibilityCount.textContent = visibleFriends;
        }
    }

    filterFriends(statusFilter) {
        const friendItems = this.element.querySelectorAll('.friend-item');
        
        friendItems.forEach(item => {
            const friendId = parseInt(item.dataset.friendId);
            const friend = this.state.friends.find(f => f.friend_id === friendId);
            
            if (!statusFilter || !friend) {
                item.style.display = 'flex';
            } else {
                item.style.display = friend.visible_status === statusFilter ? 'flex' : 'none';
            }
        });
    }

    async refreshFriends() {
        const refreshButton = this.element.querySelector('[data-refresh-friends]');
        if (refreshButton) {
            refreshButton.classList.add('rotating');
            setTimeout(() => refreshButton.classList.remove('rotating'), 1000);
        }
        
        await this.loadFriends();
    }

    handlePrivacyModeChange(newMode) {
        this.state.privacyMode = newMode;
        const selectedContactsSection = this.element.querySelector('[data-selected-contacts-section]');
        if (selectedContactsSection) {
            selectedContactsSection.style.display = newMode === 'selected' ? 'block' : 'none';
        }
        this.renderPrivacyOptions();
    }

    toggleQuietHours(enabled) {
        const timesSection = this.element.querySelector('[data-quiet-hours-times]');
        if (timesSection) {
            timesSection.style.display = enabled ? 'block' : 'none';
        }
    }

    applyPreset(emoji, message) {
        const activityInput = this.element.querySelector('[data-activity-input]');
        const emojiSelector = this.element.querySelector('[data-emoji-selector]');
        
        if (emojiSelector) {
            emojiSelector.value = emoji;
        }
        if (activityInput) {
            activityInput.value = message;
            this.updateActivityCounter(message.length);
        }
    }

    clearActivity() {
        const activityInput = this.element.querySelector('[data-activity-input]');
        const emojiSelector = this.element.querySelector('[data-emoji-selector]');
        
        if (activityInput) {
            activityInput.value = '';
            this.updateActivityCounter(0);
        }
        if (emojiSelector) {
            emojiSelector.value = '';
        }
    }

    updateActivityCounter(length) {
        const counter = this.element.querySelector('[data-activity-counter]');
        if (counter) {
            counter.textContent = length;
            counter.parentElement.classList.toggle('near-limit', length > 80);
        }
    }

    updateEmojiInInput(emoji) {
        const activityInput = this.element.querySelector('[data-activity-input]');
        if (activityInput && emoji) {
            const currentValue = activityInput.value.trim();
            const newValue = currentValue ? `${emoji} ${currentValue}` : emoji;
            activityInput.value = newValue;
            this.updateActivityCounter(newValue.length);
        }
    }

    selectStatus(status) {
        this.state.currentStatus = status;
        this.renderStatusOptions();
    }

    openStatusModal() {
        const modal = this.element.querySelector('[data-status-modal]');
        if (modal) {
            modal.style.display = 'flex';
            // Update activity input with current message
            const activityInput = this.element.querySelector('[data-activity-input]');
            if (activityInput) {
                activityInput.value = this.state.activityMessage;
                this.updateActivityCounter(this.state.activityMessage.length);
            }
        }
    }

    closeStatusModal() {
        const modal = this.element.querySelector('[data-status-modal]');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    openSettingsModal() {
        const modal = this.element.querySelector('[data-settings-modal]');
        if (modal) {
            modal.style.display = 'flex';
            this.updateSettingsInputs();
        }
    }

    closeSettingsModal() {
        const modal = this.element.querySelector('[data-settings-modal]');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showStatusExplanation(status) {
        const container = this.element.querySelector('[data-status-explanation]');
        if (!container) return;

        let explanation = '';
        
        if (status === 'busy') {
            explanation = `
                <div class="status-explanation-card busy">
                    <div class="explanation-icon">🔴</div>
                    <div class="explanation-content">
                        <h4>Do Not Disturb Active</h4>
                        <p>You'll only receive messages from active chats or selected contacts. Friends can still send urgent messages if enabled.</p>
                        <button class="btn-dismiss" onclick="this.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        } else if (status === 'invisible') {
            explanation = `
                <div class="status-explanation-card invisible">
                    <div class="explanation-icon">⚫</div>
                    <div class="explanation-content">
                        <h4>Invisible Mode Active</h4>
                        <p>You appear offline to others but can still receive messages and notifications.</p>
                        <button class="btn-dismiss" onclick="this.parentElement.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = explanation;
        
        if (explanation) {
            setTimeout(() => {
                const card = container.querySelector('.status-explanation-card');
                if (card) card.remove();
            }, 8000);
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = this.element.querySelector('[data-toast-container]');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : ''}
                    ${type === 'error' ? '<i class="fas fa-exclamation-circle"></i>' : ''}
                    ${type === 'info' ? '<i class="fas fa-info-circle"></i>' : ''}
                </div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    animateQuickAction(status) {
        const quickAction = this.element.querySelector(`[data-quick-status="${status}"]`);
        if (quickAction) {
            quickAction.classList.add('quick-action-active');
            setTimeout(() => {
                quickAction.classList.remove('quick-action-active');
            }, 300);
        }
    }

    setupActivityTracking() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        activityEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }

    updateLastActivity() {
        this.state.lastActivity = Date.now();
        
        // Reset auto-away badge if visible
        const autoAwayBadge = this.element.querySelector('[data-auto-away-badge]');
        if (autoAwayBadge && autoAwayBadge.style.display !== 'none') {
            autoAwayBadge.style.display = 'none';
        }
    }

    checkAutoAway() {
        if (!this.state.autoAwayEnabled) return;

        const now = Date.now();
        const inactiveTime = now - this.state.lastActivity;
        const autoAwayThreshold = this.state.autoAwayMinutes * 60 * 1000;

        if (inactiveTime > autoAwayThreshold && this.state.currentStatus === 'online') {
            this.changeStatus('away');
            const autoAwayBadge = this.element.querySelector('[data-auto-away-badge]');
            if (autoAwayBadge) {
                autoAwayBadge.style.display = 'inline-block';
            }
        }

        // Check again in 1 minute
        setTimeout(() => this.checkAutoAway(), 60000);
    }

    startAutoRefresh() {
        setInterval(async () => {
            if (!this.element.querySelector('[data-settings-modal]')?.style.display?.includes('flex')) {
                await this.loadFriends();
            }
        }, this.options.autoRefreshInterval);
    }

    // Helper functions
    getStatusLabel(status) {
        const statusObj = this.presenceStatuses.find(s => s.value === status);
        return statusObj ? statusObj.label : 'Unknown';
    }

    getStatusIcon(status) {
        const statusObj = this.presenceStatuses.find(s => s.value === status);
        return statusObj ? statusObj.icon : '⚪';
    }

    formatLastSeen(lastSeen) {
        const date = new Date(lastSeen);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showToast(message, 'error');
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    const presenceElements = document.querySelectorAll('[data-component="enhanced-presence"]');
    presenceElements.forEach(element => {
        if (!element.mivtonComponent) {
            element.mivtonComponent = new MivtonEnhancedPresenceControl(element);
        }
    });
});

// Export for global use
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.EnhancedPresenceControl = MivtonEnhancedPresenceControl;
}
