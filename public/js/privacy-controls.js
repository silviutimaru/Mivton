/**
 * Privacy Controls - Phase 3.3 Advanced Social Features
 * Advanced privacy settings with group-based permissions
 */

class PrivacyControls extends MivtonComponents.BaseComponent {
  constructor() {
    super();
    this.privacySettings = {};
    this.friendGroups = [];
    this.isLoading = false;
    this.hasChanges = false;
    
    this.init();
  }

  async init() {
    this.createHTML();
    this.attachEventListeners();
    await this.loadPrivacySettings();
    await this.loadFriendGroups();
    this.render();
  }

  createHTML() {
    this.container = document.createElement('div');
    this.container.className = 'privacy-controls';
    this.container.innerHTML = `
      <div class="privacy-header">
        <div class="header-content">
          <h2 class="section-title">
            <i class="icon-shield"></i>
            Privacy Controls
          </h2>
          <div class="header-actions">
            <button class="btn btn-secondary reset-btn" id="resetDefaults">
              <i class="icon-refresh"></i>
              Reset to Defaults
            </button>
            <button class="btn btn-primary save-btn" id="saveSettings" disabled>
              <i class="icon-save"></i>
              Save Changes
            </button>
          </div>
        </div>
        <p class="privacy-description">
          Control who can see your information and how you interact with different friend groups.
        </p>
      </div>

      <div class="privacy-content">
        <!-- Global Privacy Settings -->
        <div class="privacy-section">
          <div class="section-header">
            <h3>
              <i class="icon-globe"></i>
              Global Privacy Settings
            </h3>
            <p>These settings apply to all friends unless overridden by group-specific rules.</p>
          </div>

          <div class="privacy-settings-grid" id="globalSettings">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Loading privacy settings...</p>
            </div>
          </div>
        </div>

        <!-- Group-Based Privacy -->
        <div class="privacy-section">
          <div class="section-header">
            <h3>
              <i class="icon-users"></i>
              Group-Based Privacy
            </h3>
            <p>Set different privacy levels for specific friend groups.</p>
          </div>

          <div class="group-privacy-container" id="groupPrivacyContainer">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Loading group settings...</p>
            </div>
          </div>
        </div>

        <!-- Privacy Preview -->
        <div class="privacy-section">
          <div class="section-header">
            <h3>
              <i class="icon-eye"></i>
              Privacy Preview
            </h3>
            <p>See how your privacy settings affect what friends can see.</p>
          </div>

          <div class="privacy-preview" id="privacyPreview">
            <div class="preview-selector">
              <label for="previewFriend">Preview as friend:</label>
              <select id="previewFriend" class="preview-select">
                <option value="">Select a friend...</option>
              </select>
            </div>
            <div class="preview-content" id="previewContent">
              <p>Select a friend to see how your privacy settings affect them.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bulk Edit Modal -->
      <div class="modal bulk-edit-modal" id="bulkEditModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Bulk Edit Privacy Settings</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form class="bulk-edit-form" id="bulkEditForm">
              <div class="form-group">
                <label for="bulkGroups">Apply to Groups:</label>
                <div class="checkbox-group" id="bulkGroups">
                  <!-- Groups populated dynamically -->
                </div>
              </div>

              <div class="form-group">
                <label for="bulkSettings">Privacy Settings:</label>
                <div class="bulk-settings" id="bulkSettings">
                  <!-- Settings populated dynamically -->
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-bulk-btn">Cancel</button>
            <button type="submit" class="btn btn-primary apply-bulk-btn" form="bulkEditForm">
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Save settings
    this.container.querySelector('#saveSettings').addEventListener('click', () => {
      this.savePrivacySettings();
    });

    // Reset to defaults
    this.container.querySelector('#resetDefaults').addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Privacy preview
    this.container.querySelector('#previewFriend').addEventListener('change', (e) => {
      this.updatePrivacyPreview(e.target.value);
    });

    // Bulk edit form
    this.container.querySelector('#bulkEditForm').addEventListener('submit', (e) => {
      this.handleBulkEdit(e);
    });

    // Modal close
    this.container.querySelectorAll('.modal-close, .cancel-bulk-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeBulkEditModal();
      });
    });

    // Click outside modal to close
    this.container.querySelector('#bulkEditModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeBulkEditModal();
      }
    });
  }

  async loadPrivacySettings() {
    try {
      this.setLoading(true);
      
      const response = await fetch('/api/privacy-controls', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load privacy settings');
      
      const data = await response.json();
      this.privacySettings = data.data || {};
      
      this.renderGlobalSettings();
      
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      this.showError('Failed to load privacy settings');
    } finally {
      this.setLoading(false);
    }
  }

  async loadFriendGroups() {
    try {
      const response = await fetch('/api/friend-groups', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load friend groups');
      
      const data = await response.json();
      this.friendGroups = data.data || [];
      
      this.renderGroupPrivacy();
      this.loadFriendsForPreview();
      
    } catch (error) {
      console.error('Error loading friend groups:', error);
      this.showError('Failed to load friend groups');
    }
  }

  renderGlobalSettings() {
    const globalContainer = this.container.querySelector('#globalSettings');
    
    const settingsConfig = [
      {
        key: 'profile_visibility',
        title: 'Profile Visibility',
        description: 'Who can see your profile information',
        options: [
          { value: 'public', label: 'Everyone' },
          { value: 'friends', label: 'Friends Only' },
          { value: 'private', label: 'Nobody' }
        ]
      },
      {
        key: 'activity_visibility',
        title: 'Activity Status',
        description: 'Who can see when you\'re online and your activity',
        options: [
          { value: 'friends', label: 'All Friends' },
          { value: 'group_only', label: 'Specific Groups Only' },
          { value: 'private', label: 'Nobody' }
        ]
      },
      {
        key: 'friend_list_visibility',
        title: 'Friend List',
        description: 'Who can see your friends list',
        options: [
          { value: 'friends', label: 'All Friends' },
          { value: 'group_only', label: 'Specific Groups Only' },
          { value: 'private', label: 'Nobody' }
        ]
      },
      {
        key: 'online_status_visibility',
        title: 'Online Status',
        description: 'Who can see when you\'re online',
        options: [
          { value: 'friends', label: 'All Friends' },
          { value: 'group_only', label: 'Specific Groups Only' },
          { value: 'private', label: 'Nobody' }
        ]
      },
      {
        key: 'last_seen_visibility',
        title: 'Last Seen',
        description: 'Who can see when you were last active',
        options: [
          { value: 'friends', label: 'All Friends' },
          { value: 'group_only', label: 'Specific Groups Only' },
          { value: 'private', label: 'Nobody' }
        ]
      },
      {
        key: 'conversation_previews',
        title: 'Conversation Previews',
        description: 'Allow friends to see conversation previews',
        options: [
          { value: 'enabled', label: 'Enabled' },
          { value: 'disabled', label: 'Disabled' }
        ]
      },
      {
        key: 'recommendation_preferences',
        title: 'Friend Recommendations',
        description: 'Participate in friend recommendation system',
        options: [
          { value: 'enabled', label: 'Enabled' },
          { value: 'disabled', label: 'Disabled' }
        ]
      },
      {
        key: 'activity_feed_visibility',
        title: 'Activity Feed',
        description: 'Who can see your activity in their feed',
        options: [
          { value: 'friends', label: 'All Friends' },
          { value: 'group_only', label: 'Specific Groups Only' },
          { value: 'private', label: 'Nobody' }
        ]
      }
    ];

    globalContainer.innerHTML = settingsConfig.map(setting => {
      const currentValue = this.privacySettings[setting.key] || setting.options[0].value;
      
      return `
        <div class="privacy-setting-card">
          <div class="setting-header">
            <h4>${setting.title}</h4>
            <p>${setting.description}</p>
          </div>
          <div class="setting-control">
            <select class="privacy-select" data-setting="${setting.key}" data-group="">
              ${setting.options.map(option => `
                <option value="${option.value}" ${currentValue === option.value ? 'selected' : ''}>
                  ${option.label}
                </option>
              `).join('')}
            </select>
          </div>
        </div>
      `;
    }).join('');

    // Attach change listeners
    globalContainer.querySelectorAll('.privacy-select').forEach(select => {
      select.addEventListener('change', () => {
        this.markAsChanged();
      });
    });
  }

  renderGroupPrivacy() {
    const groupContainer = this.container.querySelector('#groupPrivacyContainer');
    
    if (this.friendGroups.length === 0) {
      groupContainer.innerHTML = `
        <div class="no-groups">
          <div class="no-groups-icon">
            <i class="icon-users"></i>
          </div>
          <h4>No Friend Groups</h4>
          <p>Create friend groups to set group-specific privacy settings.</p>
          <button class="btn btn-primary create-group-btn">
            <i class="icon-plus"></i>
            Create Friend Group
          </button>
        </div>
      `;
      return;
    }

    groupContainer.innerHTML = `
      <div class="group-privacy-header">
        <button class="btn btn-secondary bulk-edit-btn" id="bulkEditBtn">
          <i class="icon-edit"></i>
          Bulk Edit
        </button>
      </div>
      
      <div class="group-privacy-list">
        ${this.friendGroups.map(group => `
          <div class="group-privacy-card" data-group-id="${group.id}">
            <div class="group-header">
              <div class="group-color" style="background-color: ${group.color}"></div>
              <div class="group-info">
                <h4>${this.escapeHtml(group.name)}</h4>
                <p>${group.member_count || 0} member${group.member_count !== 1 ? 's' : ''}</p>
              </div>
              <button class="btn btn-secondary toggle-group-btn" data-group-id="${group.id}">
                <i class="icon-chevron-down"></i>
              </button>
            </div>
            
            <div class="group-privacy-settings" id="groupSettings${group.id}" style="display: none;">
              ${this.renderGroupSpecificSettings(group.id)}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Attach group toggle listeners
    groupContainer.querySelectorAll('.toggle-group-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const groupId = btn.dataset.groupId;
        this.toggleGroupSettings(groupId);
      });
    });

    // Bulk edit button
    groupContainer.querySelector('#bulkEditBtn').addEventListener('click', () => {
      this.openBulkEditModal();
    });
  }

  renderGroupSpecificSettings(groupId) {
    const settingsKeys = [
      'profile_visibility',
      'activity_visibility',
      'friend_list_visibility',
      'online_status_visibility',
      'last_seen_visibility'
    ];

    return `
      <div class="group-settings-grid">
        ${settingsKeys.map(key => {
          const groupSetting = this.getGroupPrivacySetting(key, groupId);
          return `
            <div class="group-setting">
              <label>${this.getSettingLabel(key)}</label>
              <select class="privacy-select" data-setting="${key}" data-group="${groupId}">
                <option value="">Use Global Setting</option>
                <option value="friends" ${groupSetting === 'friends' ? 'selected' : ''}>Allow</option>
                <option value="private" ${groupSetting === 'private' ? 'selected' : ''}>Deny</option>
              </select>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  toggleGroupSettings(groupId) {
    const settingsContainer = this.container.querySelector(`#groupSettings${groupId}`);
    const toggleBtn = this.container.querySelector(`[data-group-id="${groupId}"]`);
    const icon = toggleBtn.querySelector('i');
    
    if (settingsContainer.style.display === 'none') {
      settingsContainer.style.display = 'block';
      icon.className = 'icon-chevron-up';
    } else {
      settingsContainer.style.display = 'none';
      icon.className = 'icon-chevron-down';
    }

    // Attach change listeners to newly visible selects
    settingsContainer.querySelectorAll('.privacy-select').forEach(select => {
      select.addEventListener('change', () => {
        this.markAsChanged();
      });
    });
  }

  async loadFriendsForPreview() {
    try {
      const response = await fetch('/api/friends', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load friends');
      
      const data = await response.json();
      const friends = data.data || [];
      
      const previewSelect = this.container.querySelector('#previewFriend');
      previewSelect.innerHTML = `
        <option value="">Select a friend...</option>
        ${friends.map(friend => `
          <option value="${friend.id}">${friend.full_name} (@${friend.username})</option>
        `).join('')}
      `;
      
    } catch (error) {
      console.error('Error loading friends for preview:', error);
    }
  }

  async updatePrivacyPreview(friendId) {
    const previewContent = this.container.querySelector('#previewContent');
    
    if (!friendId) {
      previewContent.innerHTML = '<p>Select a friend to see how your privacy settings affect them.</p>';
      return;
    }

    try {
      const response = await fetch(`/api/privacy-controls/check/${friendId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to check privacy permissions');
      
      const data = await response.json();
      const permissions = data.data;
      
      previewContent.innerHTML = `
        <div class="preview-results">
          <h4>What this friend can see:</h4>
          <div class="permissions-grid">
            ${Object.entries(permissions).map(([key, value]) => `
              <div class="permission-item ${value ? 'allowed' : 'denied'}">
                <div class="permission-icon">
                  <i class="icon-${value ? 'check' : 'x'}"></i>
                </div>
                <div class="permission-info">
                  <h5>${this.getSettingLabel(key)}</h5>
                  <p class="permission-status">${value ? 'Allowed' : 'Denied'}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error('Error updating privacy preview:', error);
      previewContent.innerHTML = '<p class="error">Failed to load privacy preview.</p>';
    }
  }

  openBulkEditModal() {
    const modal = this.container.querySelector('#bulkEditModal');
    
    // Populate groups
    const groupsContainer = this.container.querySelector('#bulkGroups');
    groupsContainer.innerHTML = this.friendGroups.map(group => `
      <label class="checkbox-label">
        <input type="checkbox" name="bulkGroups" value="${group.id}">
        <span class="checkbox-custom"></span>
        <span class="group-name">
          <span class="group-color-small" style="background-color: ${group.color}"></span>
          ${this.escapeHtml(group.name)}
        </span>
      </label>
    `).join('');

    // Populate settings
    const settingsContainer = this.container.querySelector('#bulkSettings');
    const settingsKeys = [
      'profile_visibility',
      'activity_visibility',
      'friend_list_visibility',
      'online_status_visibility',
      'last_seen_visibility'
    ];

    settingsContainer.innerHTML = settingsKeys.map(key => `
      <div class="bulk-setting">
        <label>${this.getSettingLabel(key)}</label>
        <select name="bulkSetting_${key}">
          <option value="">Don't Change</option>
          <option value="friends">Allow</option>
          <option value="private">Deny</option>
          <option value="">Reset to Global</option>
        </select>
      </div>
    `).join('');

    modal.classList.add('active');
  }

  async handleBulkEdit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const selectedGroups = formData.getAll('bulkGroups');
    
    if (selectedGroups.length === 0) {
      this.showError('Please select at least one group');
      return;
    }

    const bulkChanges = [];
    
    // Collect settings changes
    ['profile_visibility', 'activity_visibility', 'friend_list_visibility', 'online_status_visibility', 'last_seen_visibility'].forEach(key => {
      const value = formData.get(`bulkSetting_${key}`);
      if (value !== '') {
        bulkChanges.push({
          setting_key: key,
          setting_value: value || this.privacySettings[key] || 'friends'
        });
      }
    });

    if (bulkChanges.length === 0) {
      this.showError('Please select at least one setting to change');
      return;
    }

    try {
      // Apply changes to each selected group
      for (const groupId of selectedGroups) {
        for (const change of bulkChanges) {
          await this.updateGroupPrivacySetting(change.setting_key, change.setting_value, groupId);
        }
      }

      this.showSuccess('Bulk changes applied successfully');
      this.closeBulkEditModal();
      this.renderGroupPrivacy();
      
    } catch (error) {
      console.error('Error applying bulk changes:', error);
      this.showError('Failed to apply bulk changes');
    }
  }

  closeBulkEditModal() {
    this.container.querySelector('#bulkEditModal').classList.remove('active');
  }

  async savePrivacySettings() {
    try {
      this.setLoading(true);
      
      // Collect all privacy settings
      const allSettings = [];
      
      // Global settings
      this.container.querySelectorAll('.privacy-select[data-group=""]').forEach(select => {
        allSettings.push({
          setting_key: select.dataset.setting,
          setting_value: select.value,
          applies_to_group_id: null
        });
      });

      // Group-specific settings
      this.container.querySelectorAll('.privacy-select[data-group]:not([data-group=""])').forEach(select => {
        if (select.value) { // Only save if not using global setting
          allSettings.push({
            setting_key: select.dataset.setting,
            setting_value: select.value,
            applies_to_group_id: parseInt(select.dataset.group)
          });
        }
      });

      const response = await fetch('/api/privacy-controls/bulk', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ settings: allSettings })
      });

      if (!response.ok) throw new Error('Failed to save privacy settings');

      this.showSuccess('Privacy settings saved successfully');
      this.markAsUnchanged();
      
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      this.showError('Failed to save privacy settings');
    } finally {
      this.setLoading(false);
    }
  }

  async resetToDefaults() {
    const confirmed = await this.showConfirmDialog(
      'Reset Privacy Settings',
      'Are you sure you want to reset all privacy settings to their default values? This action cannot be undone.',
      'Reset',
      'danger'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/privacy-controls/reset-defaults', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to reset privacy settings');

      this.showSuccess('Privacy settings reset to defaults');
      await this.loadPrivacySettings();
      this.markAsUnchanged();
      
    } catch (error) {
      console.error('Error resetting privacy settings:', error);
      this.showError('Failed to reset privacy settings');
    }
  }

  async updateGroupPrivacySetting(settingKey, settingValue, groupId) {
    const response = await fetch('/api/privacy-controls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        setting_key: settingKey,
        setting_value: settingValue,
        applies_to_group_id: parseInt(groupId)
      })
    });

    if (!response.ok) throw new Error('Failed to update group privacy setting');
  }

  getGroupPrivacySetting(settingKey, groupId) {
    const groupSettings = this.privacySettings.group_settings || {};
    return groupSettings[groupId]?.[settingKey] || '';
  }

  getSettingLabel(key) {
    const labels = {
      'profile_visibility': 'Profile Information',
      'activity_visibility': 'Activity Status',
      'friend_list_visibility': 'Friends List',
      'online_status_visibility': 'Online Status',
      'last_seen_visibility': 'Last Seen',
      'conversation_previews': 'Conversation Previews',
      'recommendation_preferences': 'Friend Recommendations',
      'activity_feed_visibility': 'Activity Feed'
    };
    return labels[key] || key;
  }

  markAsChanged() {
    this.hasChanges = true;
    const saveBtn = this.container.querySelector('#saveSettings');
    saveBtn.disabled = false;
    saveBtn.classList.add('has-changes');
  }

  markAsUnchanged() {
    this.hasChanges = false;
    const saveBtn = this.container.querySelector('#saveSettings');
    saveBtn.disabled = true;
    saveBtn.classList.remove('has-changes');
  }

  setLoading(loading) {
    this.isLoading = loading;
    // Add loading states for save button
    const saveBtn = this.container.querySelector('#saveSettings');
    if (loading) {
      saveBtn.innerHTML = '<i class="icon-loading spin"></i> Saving...';
      saveBtn.disabled = true;
    } else if (this.hasChanges) {
      saveBtn.innerHTML = '<i class="icon-save"></i> Save Changes';
      saveBtn.disabled = false;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    return this.container;
  }
}

// Initialize and export
window.MivtonComponents = window.MivtonComponents || {};
window.MivtonComponents.PrivacyControls = PrivacyControls;
