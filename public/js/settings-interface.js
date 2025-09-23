/**
 * ==============================================
 * MIVTON - SETTINGS INTERFACE COMPONENT
 * Phase 2.3 - User Interface Polish
 * Enhanced settings panel using Phase 2.2 components
 * ==============================================
 */

/**
 * Settings Interface Component
 * Provides enhanced settings interface with modern toggles and animations
 */
class MivtonSettingsInterface extends MivtonBaseComponent {
    constructor(element, options = {}) {
        const defaultOptions = {
            enableAutoSave: true,
            autoSaveDelay: 1000,
            showUnsavedIndicator: true,
            animateChanges: true,
            validateOnChange: true,
            apiEndpoint: '/api/user/preferences',
            sections: ['profile', 'privacy', 'notifications', 'appearance'],
            ...options
        };
        
        super(element, defaultOptions);
        
        // Component state
        this.settingsState = {
            currentValues: {},
            originalValues: {},
            changedValues: {},
            hasUnsavedChanges: false,
            isLoading: false,
            isSaving: false,
            validationErrors: {},
            activeSection: this.options.sections[0]
        };
        
        // Auto-save timeout
        this.autoSaveTimeout = null;
        
        // Initialize component
        this.initializeSettings();
    }
    
    /**
     * Initialize settings interface
     */
    initializeSettings() {
        try {
            this.createSettingsElements();
            this.setupEventListeners();
            this.loadSettings();
            
            this.log('Settings interface initialized successfully');
        } catch (error) {
            this.handleError(error, 'initializeSettings');
        }
    }
    
    /**
     * Create settings UI elements - Basic structure
     */
    createSettingsElements() {
        if (!this.element) return;
        
        this.element.innerHTML = `
            <div class="settings-interface">
                <div class="settings-header">
                    <div class="settings-title">
                        <i class="fas fa-cog"></i>
                        Settings
                    </div>
                    <div class="settings-actions">
                        <div class="unsaved-indicator" id="unsavedIndicator" style="display: none;">
                            <i class="fas fa-circle"></i>
                            Unsaved changes
                        </div>
                        <button class="settings-action-btn secondary" id="resetBtn">
                            <i class="fas fa-undo"></i>
                            Reset
                        </button>
                        <button class="settings-action-btn primary" id="saveBtn" disabled>
                            <i class="fas fa-save"></i>
                            Save Changes
                        </button>
                    </div>
                </div>
                
                <div class="settings-navigation">
                    ${this.createNavigationTabs()}
                </div>
                
                <div class="settings-content">
                    ${this.createBasicSettingsSections()}
                </div>
                
                <div class="settings-footer">
                    <div class="settings-info">
                        <i class="fas fa-info-circle"></i>
                        Changes are ${this.options.enableAutoSave ? 'automatically saved' : 'saved manually'}
                    </div>
                </div>
            </div>
        `;
        
        // Cache DOM elements
        this.unsavedIndicator = this.element.querySelector('#unsavedIndicator');
        this.resetBtn = this.element.querySelector('#resetBtn');
        this.saveBtn = this.element.querySelector('#saveBtn');
        this.navigationTabs = this.element.querySelectorAll('.settings-nav-tab');
        this.settingSections = this.element.querySelectorAll('.settings-section');
    }
    
    /**
     * Create navigation tabs
     */
    createNavigationTabs() {
        const tabConfig = {
            profile: { icon: 'fas fa-user', title: 'Profile' },
            privacy: { icon: 'fas fa-shield-alt', title: 'Privacy' },
            notifications: { icon: 'fas fa-bell', title: 'Notifications' },
            appearance: { icon: 'fas fa-palette', title: 'Appearance' }
        };
        
        return this.options.sections.map(section => {
            const config = tabConfig[section] || { icon: 'fas fa-cog', title: section };
            const isActive = section === this.settingsState.activeSection;
            
            return `
                <button class="settings-nav-tab ${isActive ? 'active' : ''}"
                        data-section="${section}"
                        aria-selected="${isActive}"
                        role="tab">
                    <i class="${config.icon}"></i>
                    <span>${config.title}</span>
                </button>
            `;
        }).join('');
    }
    
    /**
     * Create basic settings sections
     */
    createBasicSettingsSections() {
        return this.options.sections.map(section => {
            const isActive = section === this.settingsState.activeSection;
            
            return `
                <div class="settings-section ${isActive ? 'active' : ''}" 
                     data-section="${section}"
                     role="tabpanel"
                     aria-hidden="${!isActive}">
                    <div class="settings-section-header">
                        <h3>${section.charAt(0).toUpperCase() + section.slice(1)} Settings</h3>
                        <p>Manage your ${section} preferences</p>
                    </div>
                    <div class="settings-groups">
                        <div class="settings-group">
                            <div class="settings-group-title">${section.charAt(0).toUpperCase() + section.slice(1)} Options</div>
                            <div class="setting-item">
                                <div class="setting-info">
                                    <div class="setting-title">Sample Setting</div>
                                    <div class="setting-description">This is a sample setting for ${section}</div>
                                </div>
                                <div class="setting-control">
                                    <label class="setting-toggle">
                                        <input type="checkbox" class="toggle-input" data-setting="sample_${section}">
                                        <span class="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Setup basic event listeners
     */
    setupEventListeners() {
        // Navigation tabs
        this.element.addEventListener('click', (e) => {
            const tab = e.target.closest('.settings-nav-tab');
            if (tab) {
                this.switchSection(tab.dataset.section);
            }
        });
        
        // Setting controls
        this.element.addEventListener('change', (e) => {
            if (e.target.dataset.setting) {
                this.handleSettingChange(e.target.dataset.setting, this.getControlValue(e.target));
            }
        });
        
        // Action buttons
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }
        
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }
    }
    
    /**
     * Switch settings section
     */
    switchSection(sectionName) {
        if (sectionName === this.settingsState.activeSection) return;
        
        // Update navigation
        this.navigationTabs.forEach(tab => {
            const isActive = tab.dataset.section === sectionName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive);
        });
        
        // Update sections
        this.settingSections.forEach(section => {
            const isActive = section.dataset.section === sectionName;
            section.classList.toggle('active', isActive);
            section.setAttribute('aria-hidden', !isActive);
        });
        
        // Update state
        this.settingsState.activeSection = sectionName;
        
        // Emit event
        this.emit('section-changed', { section: sectionName });
    }
    
    /**
     * Handle setting change
     */
    handleSettingChange(settingKey, value) {
        // Update state
        this.settingsState.currentValues[settingKey] = value;
        this.settingsState.changedValues[settingKey] = value;
        
        // Check for changes
        this.updateUnsavedState();
        
        // Auto-save if enabled
        if (this.options.enableAutoSave) {
            this.scheduleAutoSave();
        }
        
        // Emit change event
        this.emit('setting-changed', {
            key: settingKey,
            value,
            hasUnsavedChanges: this.settingsState.hasUnsavedChanges
        });
    }
    
    /**
     * Get control value
     */
    getControlValue(control) {
        switch (control.type) {
            case 'checkbox':
                return control.checked;
            case 'radio':
                return control.checked ? control.value : null;
            case 'range':
                return parseInt(control.value);
            case 'number':
                return parseFloat(control.value);
            default:
                return control.value;
        }
    }
    
    /**
     * Update unsaved state
     */
    updateUnsavedState() {
        const hasChanges = Object.keys(this.settingsState.changedValues).length > 0;
        
        if (hasChanges !== this.settingsState.hasUnsavedChanges) {
            this.settingsState.hasUnsavedChanges = hasChanges;
            
            // Update UI
            if (this.options.showUnsavedIndicator && this.unsavedIndicator) {
                this.unsavedIndicator.style.display = hasChanges ? 'flex' : 'none';
            }
            
            if (this.saveBtn) {
                this.saveBtn.disabled = !hasChanges;
            }
            
            // Add class to element
            this.element.classList.toggle('has-unsaved-changes', hasChanges);
        }
    }
    
    /**
     * Schedule auto-save
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            this.saveSettings();
        }, this.options.autoSaveDelay);
    }
    
    /**
     * Load settings from server
     */
    async loadSettings() {
        try {
            this.setLoadingState(true);
            
            const response = await fetch(this.options.apiEndpoint);
            if (!response.ok) {
                throw new Error(`Failed to load settings: ${response.status}`);
            }
            
            const data = await response.json();
            this.settingsState.currentValues = data.preferences || this.getDefaultSettings();
            this.settingsState.originalValues = { ...this.settingsState.currentValues };
            
            this.populateSettings();
            this.emit('settings-loaded', { settings: this.settingsState.currentValues });
            
        } catch (error) {
            this.handleLoadError(error);
        } finally {
            this.setLoadingState(false);
        }
    }
    
    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            // Sample settings for each section
            sample_profile: true,
            sample_privacy: true,
            sample_notifications: true,
            sample_appearance: true
        };
    }
    
    /**
     * Populate settings UI with values
     */
    populateSettings() {
        Object.entries(this.settingsState.currentValues).forEach(([key, value]) => {
            const control = this.element.querySelector(`[data-setting="${key}"]`);
            if (!control) return;
            
            this.setControlValue(control, value);
        });
    }
    
    /**
     * Set control value
     */
    setControlValue(control, value) {
        switch (control.type) {
            case 'checkbox':
                control.checked = Boolean(value);
                break;
            case 'radio':
                control.checked = control.value === value;
                break;
            default:
                control.value = value;
                break;
        }
    }
    
    /**
     * Save settings
     */
    async saveSettings() {
        if (Object.keys(this.settingsState.changedValues).length === 0) {
            return;
        }
        
        try {
            this.setSavingState(true);
            
            const response = await fetch(this.options.apiEndpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    preferences: this.settingsState.currentValues
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save settings');
            }
            
            // Update original values
            this.settingsState.originalValues = { ...this.settingsState.currentValues };
            this.settingsState.changedValues = {};
            
            this.updateUnsavedState();
            
            // Show success message
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.success('Settings saved successfully');
            }
            
            this.emit('settings-saved', {
                settings: this.settingsState.currentValues
            });
            
        } catch (error) {
            if (window.MivtonComponents?.Toast) {
                window.MivtonComponents.Toast.error('Failed to save settings');
            }
            
            this.handleError(error, 'saveSettings');
        } finally {
            this.setSavingState(false);
        }
    }
    
    /**
     * Reset settings
     */
    resetSettings() {
        // Reset to original values
        this.settingsState.currentValues = { ...this.settingsState.originalValues };
        this.settingsState.changedValues = {};
        
        // Re-populate UI
        this.populateSettings();
        this.updateUnsavedState();
        
        // Show message
        if (window.MivtonComponents?.Toast) {
            window.MivtonComponents.Toast.info('Settings reset to last saved values');
        }
        
        this.emit('settings-reset');
    }
    
    /**
     * Set loading state
     */
    setLoadingState(loading) {
        this.settingsState.isLoading = loading;
        
        if (loading) {
            this.element.classList.add('loading');
        } else {
            this.element.classList.remove('loading');
        }
    }
    
    /**
     * Set saving state
     */
    setSavingState(saving) {
        this.settingsState.isSaving = saving;
        
        if (this.saveBtn) {
            this.saveBtn.disabled = saving || !this.settingsState.hasUnsavedChanges;
            this.saveBtn.innerHTML = saving ? 
                '<i class="fas fa-spinner fa-spin"></i> Saving...' : 
                '<i class="fas fa-save"></i> Save Changes';
        }
        
        if (saving) {
            this.element.classList.add('saving');
        } else {
            this.element.classList.remove('saving');
        }
    }
    
    /**
     * Handle load error
     */
    handleLoadError(error) {
        this.log('Failed to load settings:', error);
        
        // Use default settings
        this.settingsState.currentValues = this.getDefaultSettings();
        this.settingsState.originalValues = { ...this.settingsState.currentValues };
        
        this.populateSettings();
        
        if (window.MivtonComponents?.Toast) {
            window.MivtonComponents.Toast.warning('Using default settings');
        }
    }
    
    /**
     * Public API: Get current settings
     */
    getCurrentSettings() {
        return { ...this.settingsState.currentValues };
    }
    
    /**
     * Public API: Update setting programmatically
     */
    updateSetting(key, value) {
        this.handleSettingChange(key, value);
        
        const control = this.element.querySelector(`[data-setting="${key}"]`);
        if (control) {
            this.setControlValue(control, value);
        }
    }
    
    /**
     * Public API: Force save
     */
    forceSave() {
        return this.saveSettings();
    }
    
    /**
     * Component cleanup
     */
    onDestroy() {
        // Clear auto-save timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
        
        // Clear state
        this.settingsState = null;
    }
}

/**
 * Register component globally
 */
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.SettingsInterface = MivtonSettingsInterface;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MivtonSettingsInterface;
}
