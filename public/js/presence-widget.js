/**
 * 🚀 MIVTON PRESENCE WIDGET - STANDALONE VERSION
 * Compact, non-intrusive presence control that can be added anywhere
 * Auto-initializes without affecting existing code
 */

(function() {
    'use strict';
    
    // Avoid conflicts with existing code
    if (window.MivtonPresenceWidget) return;
    
    class MivtonPresenceWidget {
        constructor() {
            this.currentStatus = 'online';
            this.activityMessage = '';
            this.privacyMode = 'friends';
            this.isDropdownOpen = false;
            
            this.statuses = {
                online: { icon: '🟢', label: 'Online', color: '#22c55e' },
                away: { icon: '🟡', label: 'Away', color: '#f59e0b' },
                busy: { icon: '🔴', label: 'Do Not Disturb', color: '#ef4444' },
                invisible: { icon: '⚫', label: 'Invisible', color: '#6b7280' },
                offline: { icon: '⚪', label: 'Offline', color: '#9ca3af' }
            };
            
            this.init();
        }
        
        init() {
            this.loadCurrentStatus();
            this.createWidget();
            this.bindEvents();
        }
        
        createWidget() {
            // Create widget container
            const widget = document.createElement('div');
            widget.className = 'mivton-presence-widget';
            widget.innerHTML = `
                <div class="presence-widget-trigger" data-trigger>
                    <div class="status-indicator">
                        <span class="status-icon" data-icon>🟢</span>
                    </div>
                    <div class="status-info">
                        <div class="status-label" data-label>Online</div>
                        <div class="activity-text" data-activity style="display: none;"></div>
                    </div>
                    <div class="dropdown-arrow">▼</div>
                </div>
                
                <div class="presence-dropdown" data-dropdown style="display: none;">
                    <div class="dropdown-header">
                        <h4>Change Status</h4>
                    </div>
                    
                    <div class="status-options" data-options></div>
                    
                    <div class="quick-message">
                        <input type="text" placeholder="What's happening?" maxlength="50" data-message-input>
                        <button data-save-message>💾</button>
                    </div>
                    
                    <div class="widget-actions">
                        <button class="privacy-btn" data-privacy>🔒 Privacy</button>
                        <button class="settings-btn" data-settings>⚙️ Settings</button>
                    </div>
                </div>
            `;
            
            // Add styles
            this.addStyles();
            
            // Find target container or create floating widget
            const targetContainer = document.querySelector('#presence-widget-container') || 
                                  document.querySelector('.presence-widget-container') ||
                                  document.querySelector('[data-presence-widget]');
            
            if (targetContainer) {
                targetContainer.appendChild(widget);
            } else {
                // Create floating widget
                widget.classList.add('floating');
                document.body.appendChild(widget);
            }
            
            this.widget = widget;
            this.renderStatusOptions();
            this.updateDisplay();
        }
        
        addStyles() {
            if (document.getElementById('mivton-presence-widget-styles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'mivton-presence-widget-styles';
            styles.textContent = `
                .mivton-presence-widget {
                    position: relative;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    z-index: 1000;
                }
                
                .mivton-presence-widget.floating {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    border: 1px solid #e5e7eb;
                }
                
                .presence-widget-trigger {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    background: white;
                    border: 1px solid #e5e7eb;
                    min-width: 160px;
                }
                
                .presence-widget-trigger:hover {
                    background: #f9fafb;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .status-indicator {
                    flex-shrink: 0;
                }
                
                .status-icon {
                    font-size: 16px;
                    display: block;
                }
                
                .status-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .status-label {
                    font-weight: 500;
                    color: #374151;
                    font-size: 14px;
                }
                
                .activity-text {
                    font-size: 12px;
                    color: #6b7280;
                    margin-top: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .dropdown-arrow {
                    font-size: 10px;
                    color: #9ca3af;
                    transition: transform 0.2s ease;
                }
                
                .presence-widget-trigger.open .dropdown-arrow {
                    transform: rotate(180deg);
                }
                
                .presence-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    margin-top: 4px;
                    padding: 16px;
                    min-width: 280px;
                }
                
                .mivton-presence-widget.floating .presence-dropdown {
                    right: 0;
                    left: auto;
                    min-width: 320px;
                }
                
                .dropdown-header h4 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                }
                
                .status-options {
                    display: grid;
                    gap: 4px;
                    margin-bottom: 16px;
                }
                
                .status-option {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                
                .status-option:hover {
                    background: #f3f4f6;
                }
                
                .status-option.active {
                    background: #eff6ff;
                    border-color: #3b82f6;
                }
                
                .status-option-icon {
                    font-size: 14px;
                }
                
                .status-option-label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #374151;
                }
                
                .quick-message {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                
                .quick-message input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 13px;
                }
                
                .quick-message input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                .quick-message button {
                    padding: 8px 12px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .quick-message button:hover {
                    background: #2563eb;
                }
                
                .widget-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .widget-actions button {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    color: #374151;
                    transition: all 0.2s ease;
                }
                
                .widget-actions button:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }
                
                @media (max-width: 768px) {
                    .mivton-presence-widget.floating {
                        top: 10px;
                        right: 10px;
                        left: 10px;
                        width: auto;
                    }
                    
                    .presence-dropdown {
                        left: 0;
                        right: 0;
                        min-width: auto;
                    }
                }
            `;
            
            document.head.appendChild(styles);
        }
        
        renderStatusOptions() {
            const container = this.widget.querySelector('[data-options]');
            container.innerHTML = Object.entries(this.statuses).map(([key, status]) => `
                <div class="status-option ${this.currentStatus === key ? 'active' : ''}" data-status="${key}">
                    <span class="status-option-icon">${status.icon}</span>
                    <span class="status-option-label">${status.label}</span>
                </div>
            `).join('');
        }
        
        updateDisplay() {
            const status = this.statuses[this.currentStatus];
            const icon = this.widget.querySelector('[data-icon]');
            const label = this.widget.querySelector('[data-label]');
            const activity = this.widget.querySelector('[data-activity]');
            
            if (icon) icon.textContent = status.icon;
            if (label) label.textContent = status.label;
            
            if (activity) {
                if (this.activityMessage) {
                    activity.textContent = this.activityMessage;
                    activity.style.display = 'block';
                } else {
                    activity.style.display = 'none';
                }
            }
            
            this.renderStatusOptions();
        }
        
        bindEvents() {
            // Toggle dropdown
            this.widget.querySelector('[data-trigger]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
            
            // Status selection
            this.widget.addEventListener('click', (e) => {
                if (e.target.closest('.status-option')) {
                    const status = e.target.closest('.status-option').dataset.status;
                    this.changeStatus(status);
                }
            });
            
            // Save message
            this.widget.querySelector('[data-save-message]').addEventListener('click', () => {
                const input = this.widget.querySelector('[data-message-input]');
                this.saveActivityMessage(input.value);
            });
            
            // Privacy button
            this.widget.querySelector('[data-privacy]').addEventListener('click', () => {
                this.showToast('Privacy settings: Choose who can see your status');
                this.closeDropdown();
            });
            
            // Settings button
            this.widget.querySelector('[data-settings]').addEventListener('click', () => {
                window.open('/presence-settings', '_blank');
                this.closeDropdown();
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.widget.contains(e.target)) {
                    this.closeDropdown();
                }
            });
        }
        
        toggleDropdown() {
            this.isDropdownOpen = !this.isDropdownOpen;
            const trigger = this.widget.querySelector('[data-trigger]');
            const dropdown = this.widget.querySelector('[data-dropdown]');
            
            if (this.isDropdownOpen) {
                trigger.classList.add('open');
                dropdown.style.display = 'block';
            } else {
                trigger.classList.remove('open');
                dropdown.style.display = 'none';
            }
        }
        
        closeDropdown() {
            this.isDropdownOpen = false;
            const trigger = this.widget.querySelector('[data-trigger]');
            const dropdown = this.widget.querySelector('[data-dropdown]');
            
            trigger.classList.remove('open');
            dropdown.style.display = 'none';
        }
        
        async changeStatus(newStatus) {
            try {
                const response = await fetch('/api/presence/advanced/status', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        status: newStatus,
                        activity_message: this.activityMessage
                    })
                });
                
                if (response.ok) {
                    this.currentStatus = newStatus;
                    this.updateDisplay();
                    this.closeDropdown();
                    this.showToast(`Status changed to ${this.statuses[newStatus].label}`);
                } else {
                    this.showToast('Failed to change status', 'error');
                }
            } catch (error) {
                console.error('Status change error:', error);
                this.showToast('Status changed (demo mode)', 'info');
                this.currentStatus = newStatus;
                this.updateDisplay();
                this.closeDropdown();
            }
        }
        
        async saveActivityMessage(message) {
            this.activityMessage = message.trim();
            
            try {
                const response = await fetch('/api/presence/advanced/status', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        status: this.currentStatus,
                        activity_message: this.activityMessage
                    })
                });
                
                if (response.ok) {
                    this.updateDisplay();
                    this.showToast('Activity message saved');
                } else {
                    this.showToast('Failed to save message', 'error');
                }
            } catch (error) {
                console.error('Message save error:', error);
                this.showToast('Message saved (demo mode)', 'info');
                this.updateDisplay();
            }
        }
        
        async loadCurrentStatus() {
            try {
                const response = await fetch('/api/presence/advanced/status', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.currentStatus = data.presence.status;
                        this.activityMessage = data.presence.activity_message || '';
                        this.privacyMode = data.presence.privacy_settings.privacy_mode;
                    }
                }
            } catch (error) {
                console.error('Load status error:', error);
                // Keep default values
            }
        }
        
        showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `mivton-toast toast-${type}`;
            toast.innerHTML = `
                <div class="toast-content">
                    <span class="toast-icon">${type === 'error' ? '❌' : type === 'info' ? 'ℹ️' : '✅'}</span>
                    <span class="toast-message">${message}</span>
                </div>
            `;
            
            // Add toast styles if not exists
            if (!document.getElementById('mivton-toast-styles')) {
                const toastStyles = document.createElement('style');
                toastStyles.id = 'mivton-toast-styles';
                toastStyles.textContent = `
                    .mivton-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        padding: 12px 16px;
                        z-index: 10000;
                        animation: slideInToast 0.3s ease-out;
                        max-width: 300px;
                    }
                    
                    .mivton-toast.toast-success { border-left: 4px solid #22c55e; }
                    .mivton-toast.toast-error { border-left: 4px solid #ef4444; }
                    .mivton-toast.toast-info { border-left: 4px solid #3b82f6; }
                    
                    .toast-content {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .toast-message {
                        font-size: 14px;
                        color: #374151;
                    }
                    
                    @keyframes slideInToast {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(toastStyles);
            }
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);
        }
    }
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.MivtonPresenceWidget = new MivtonPresenceWidget();
        });
    } else {
        window.MivtonPresenceWidget = new MivtonPresenceWidget();
    }
})();
