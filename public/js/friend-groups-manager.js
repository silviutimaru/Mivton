/**
 * Friend Groups Manager - Phase 3.3 Advanced Social Features
 * Manages friend group creation, editing, and member management
 */

class FriendGroupsManager extends MivtonComponents.BaseComponent {
  constructor() {
    super();
    this.groups = [];
    this.selectedGroup = null;
    this.availableFriends = [];
    this.isLoading = false;
    this.selectedFriends = new Set();
    
    this.init();
  }

  async init() {
    this.createHTML();
    this.attachEventListeners();
    await this.loadFriendGroups();
    this.render();
  }

  createHTML() {
    this.container = document.createElement('div');
    this.container.className = 'friend-groups-manager';
    this.container.innerHTML = `
      <div class="friend-groups-header">
        <div class="header-content">
          <h2 class="section-title">
            <i class="icon-users"></i>
            Friend Groups
          </h2>
          <button class="btn btn-primary create-group-btn">
            <i class="icon-plus"></i>
            Create Group
          </button>
        </div>
        <div class="groups-search">
          <input type="text" class="groups-search-input" placeholder="Search groups...">
          <i class="icon-search"></i>
        </div>
      </div>

      <div class="friend-groups-content">
        <div class="groups-sidebar">
          <div class="groups-list" id="groupsList">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Loading groups...</p>
            </div>
          </div>
        </div>

        <div class="group-details-panel" id="groupDetailsPanel">
          <div class="no-group-selected">
            <div class="no-group-icon">
              <i class="icon-users"></i>
            </div>
            <h3>Select a Group</h3>
            <p>Choose a friend group to view and manage its members</p>
          </div>
        </div>
      </div>

      <!-- Create/Edit Group Modal -->
      <div class="modal friend-group-modal" id="friendGroupModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Create Friend Group</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form class="friend-group-form" id="friendGroupForm">
              <div class="form-group">
                <label for="groupName">Group Name *</label>
                <input type="text" id="groupName" name="name" required maxlength="100" 
                       placeholder="e.g., Close Friends, Work, Family">
                <div class="form-error" id="nameError"></div>
              </div>

              <div class="form-group">
                <label for="groupDescription">Description</label>
                <textarea id="groupDescription" name="description" rows="3" 
                          placeholder="Optional description for this group"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="groupColor">Color</label>
                  <div class="color-picker">
                    <input type="color" id="groupColor" name="color" value="#6366f1">
                    <div class="color-presets">
                      <button type="button" class="color-preset" data-color="#6366f1" style="background: #6366f1"></button>
                      <button type="button" class="color-preset" data-color="#ec4899" style="background: #ec4899"></button>
                      <button type="button" class="color-preset" data-color="#10b981" style="background: #10b981"></button>
                      <button type="button" class="color-preset" data-color="#f59e0b" style="background: #f59e0b"></button>
                      <button type="button" class="color-preset" data-color="#8b5cf6" style="background: #8b5cf6"></button>
                      <button type="button" class="color-preset" data-color="#06b6d4" style="background: #06b6d4"></button>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label for="groupIcon">Icon</label>
                  <select id="groupIcon" name="icon">
                    <option value="users">👥 Users</option>
                    <option value="heart">❤️ Heart</option>
                    <option value="briefcase">💼 Work</option>
                    <option value="home">🏠 Family</option>
                    <option value="gamepad">🎮 Gaming</option>
                    <option value="graduation-cap">🎓 School</option>
                    <option value="coffee">☕ Coffee</option>
                    <option value="star">⭐ Star</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary save-group-btn" form="friendGroupForm">
              <i class="icon-save"></i>
              Save Group
            </button>
          </div>
        </div>
      </div>

      <!-- Add Members Modal -->
      <div class="modal add-members-modal" id="addMembersModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add Friends to Group</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="friends-search">
              <input type="text" class="friends-search-input" placeholder="Search friends...">
              <i class="icon-search"></i>
            </div>
            <div class="available-friends-list" id="availableFriendsList">
              <div class="loading-placeholder">
                <div class="loading-spinner"></div>
                <p>Loading friends...</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-add-btn">Cancel</button>
            <button type="button" class="btn btn-primary add-selected-btn" disabled>
              <i class="icon-plus"></i>
              Add Selected (<span class="selected-count">0</span>)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Create group button
    this.container.querySelector('.create-group-btn').addEventListener('click', () => {
      this.openCreateGroupModal();
    });

    // Groups search
    this.container.querySelector('.groups-search-input').addEventListener('input', (e) => {
      this.filterGroups(e.target.value);
    });

    // Group form submission
    this.container.querySelector('#friendGroupForm').addEventListener('submit', (e) => {
      this.handleGroupFormSubmit(e);
    });

    // Color presets
    this.container.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        this.container.querySelector('#groupColor').value = color;
        this.updateColorPreview(color);
      });
    });

    // Modal close buttons
    this.container.querySelectorAll('.modal-close, .cancel-btn, .cancel-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModals();
      });
    });

    // Add members functionality
    this.container.querySelector('.add-selected-btn').addEventListener('click', () => {
      this.addSelectedFriendsToGroup();
    });

    // Friends search in add modal
    this.container.querySelector('.friends-search-input').addEventListener('input', (e) => {
      this.filterAvailableFriends(e.target.value);
    });

    // Click outside modal to close
    this.container.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModals();
        }
      });
    });
  }

  async loadFriendGroups() {
    try {
      this.setLoading(true);
      const response = await fetch('/api/friend-groups', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load friend groups');
      
      const data = await response.json();
      this.groups = data.data || [];
      this.renderGroupsList();
      
    } catch (error) {
      console.error('Error loading friend groups:', error);
      this.showError('Failed to load friend groups');
    } finally {
      this.setLoading(false);
    }
  }

  renderGroupsList() {
    const groupsList = this.container.querySelector('#groupsList');
    
    if (this.groups.length === 0) {
      groupsList.innerHTML = `
        <div class="no-groups">
          <div class="no-groups-icon">
            <i class="icon-users"></i>
          </div>
          <h3>No Groups Yet</h3>
          <p>Create your first friend group to organize your connections</p>
          <button class="btn btn-primary create-first-group-btn">
            <i class="icon-plus"></i>
            Create Your First Group
          </button>
        </div>
      `;
      
      groupsList.querySelector('.create-first-group-btn').addEventListener('click', () => {
        this.openCreateGroupModal();
      });
      return;
    }

    groupsList.innerHTML = this.groups.map(group => `
      <div class="group-item ${this.selectedGroup?.id === group.id ? 'active' : ''}" 
           data-group-id="${group.id}">
        <div class="group-color" style="background-color: ${group.color}"></div>
        <div class="group-content">
          <div class="group-header">
            <h4 class="group-name">${this.escapeHtml(group.name)}</h4>
            <span class="member-count">${group.member_count || 0}</span>
          </div>
          <div class="group-meta">
            ${group.is_default ? '<span class="default-badge">Default</span>' : ''}
            <span class="group-icon">${this.getIconEmoji(group.icon)}</span>
          </div>
        </div>
        <div class="group-actions">
          <button class="group-action-btn edit-group-btn" title="Edit Group">
            <i class="icon-edit"></i>
          </button>
          ${!group.is_default ? `
            <button class="group-action-btn delete-group-btn" title="Delete Group">
              <i class="icon-trash"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    // Attach group item event listeners
    groupsList.querySelectorAll('.group-item').forEach(item => {
      const groupId = parseInt(item.dataset.groupId);
      
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.group-actions')) {
          this.selectGroup(groupId);
        }
      });

      const editBtn = item.querySelector('.edit-group-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEditGroupModal(groupId);
        });
      }

      const deleteBtn = item.querySelector('.delete-group-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.confirmDeleteGroup(groupId);
        });
      }
    });
  }

  async selectGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    this.selectedGroup = group;
    this.updateGroupSelection();
    await this.loadGroupDetails(groupId);
  }

  updateGroupSelection() {
    this.container.querySelectorAll('.group-item').forEach(item => {
      item.classList.toggle('active', 
        parseInt(item.dataset.groupId) === this.selectedGroup?.id);
    });
  }

  async loadGroupDetails(groupId) {
    try {
      const response = await fetch(`/api/friend-groups/${groupId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load group details');
      
      const data = await response.json();
      this.renderGroupDetails(data.data);
      
    } catch (error) {
      console.error('Error loading group details:', error);
      this.showError('Failed to load group details');
    }
  }

  renderGroupDetails(group) {
    const detailsPanel = this.container.querySelector('#groupDetailsPanel');
    
    detailsPanel.innerHTML = `
      <div class="group-details-header">
        <div class="group-title">
          <div class="group-color-large" style="background-color: ${group.color}"></div>
          <div class="group-title-content">
            <h3>${this.escapeHtml(group.name)}</h3>
            <p class="group-description">${group.description || 'No description'}</p>
            <div class="group-stats">
              <span class="stat">
                <i class="icon-users"></i>
                ${group.member_count || 0} members
              </span>
              <span class="stat">
                <i class="icon-calendar"></i>
                Created ${this.formatDate(group.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div class="group-actions-header">
          <button class="btn btn-secondary add-members-btn">
            <i class="icon-user-plus"></i>
            Add Members
          </button>
          ${!group.is_default ? `
            <button class="btn btn-secondary edit-group-header-btn">
              <i class="icon-edit"></i>
              Edit Group
            </button>
          ` : ''}
        </div>
      </div>

      <div class="group-members-section">
        <div class="members-header">
          <h4>Group Members</h4>
          <div class="members-search">
            <input type="text" class="members-search-input" placeholder="Search members...">
            <i class="icon-search"></i>
          </div>
        </div>
        <div class="members-list" id="membersList">
          ${this.renderMembersList(group.members || [])}
        </div>
      </div>
    `;

    // Attach event listeners for group details
    detailsPanel.querySelector('.add-members-btn').addEventListener('click', () => {
      this.openAddMembersModal(group.id);
    });

    const editHeaderBtn = detailsPanel.querySelector('.edit-group-header-btn');
    if (editHeaderBtn) {
      editHeaderBtn.addEventListener('click', () => {
        this.openEditGroupModal(group.id);
      });
    }

    // Members search
    detailsPanel.querySelector('.members-search-input').addEventListener('input', (e) => {
      this.filterMembers(e.target.value, group.members || []);
    });

    // Member removal listeners
    this.attachMemberActionListeners(group.id);
  }

  renderMembersList(members) {
    if (members.length === 0) {
      return `
        <div class="no-members">
          <div class="no-members-icon">
            <i class="icon-user-plus"></i>
          </div>
          <h4>No Members Yet</h4>
          <p>Add friends to this group to get started</p>
        </div>
      `;
    }

    return members.map(member => `
      <div class="member-item" data-member-id="${member.id}">
        <div class="member-avatar">
          <img src="${member.profile_picture_url || '/images/default-avatar.png'}" 
               alt="${this.escapeHtml(member.full_name)}">
          <div class="status-indicator ${member.status || 'offline'}"></div>
        </div>
        <div class="member-info">
          <h5>${this.escapeHtml(member.full_name)}</h5>
          <p>@${this.escapeHtml(member.username)}</p>
          <span class="member-status">${this.getStatusText(member.status)}</span>
        </div>
        <div class="member-actions">
          <button class="member-action-btn message-btn" title="Send Message">
            <i class="icon-message"></i>
          </button>
          <button class="member-action-btn remove-btn" title="Remove from Group">
            <i class="icon-user-minus"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  attachMemberActionListeners(groupId) {
    const membersList = this.container.querySelector('#membersList');
    
    membersList.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberItem = btn.closest('.member-item');
        const memberId = parseInt(memberItem.dataset.memberId);
        this.confirmRemoveMember(groupId, memberId);
      });
    });

    membersList.querySelectorAll('.message-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const memberItem = btn.closest('.member-item');
        const memberId = parseInt(memberItem.dataset.memberId);
        // TODO: Open messaging interface
        console.log('Open message for member:', memberId);
      });
    });
  }

  async openAddMembersModal(groupId) {
    try {
      // Load available friends
      const response = await fetch(`/api/friend-groups/available-friends/${groupId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load available friends');
      
      const data = await response.json();
      this.availableFriends = data.data || [];
      this.selectedFriends.clear();
      
      this.renderAvailableFriends();
      this.container.querySelector('#addMembersModal').classList.add('active');
      
    } catch (error) {
      console.error('Error loading available friends:', error);
      this.showError('Failed to load available friends');
    }
  }

  renderAvailableFriends() {
    const friendsList = this.container.querySelector('#availableFriendsList');
    
    if (this.availableFriends.length === 0) {
      friendsList.innerHTML = `
        <div class="no-available-friends">
          <div class="no-friends-icon">
            <i class="icon-users"></i>
          </div>
          <h4>All Friends Added</h4>
          <p>All your friends are already in this group</p>
        </div>
      `;
      return;
    }

    friendsList.innerHTML = this.availableFriends.map(friend => `
      <div class="available-friend-item" data-friend-id="${friend.id}">
        <label class="friend-checkbox">
          <input type="checkbox" name="selectedFriends" value="${friend.id}">
          <span class="checkbox-custom"></span>
        </label>
        <div class="friend-avatar">
          <img src="${friend.profile_picture_url || '/images/default-avatar.png'}" 
               alt="${this.escapeHtml(friend.full_name)}">
          <div class="status-indicator ${friend.status || 'offline'}"></div>
        </div>
        <div class="friend-info">
          <h5>${this.escapeHtml(friend.full_name)}</h5>
          <p>@${this.escapeHtml(friend.username)}</p>
          <div class="friendship-strength">
            <div class="strength-bar">
              <div class="strength-fill" style="width: ${(friend.friendship_strength || 0.5) * 100}%"></div>
            </div>
            <span class="strength-text">${this.getStrengthText(friend.friendship_strength)}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Attach checkbox listeners
    friendsList.querySelectorAll('input[name="selectedFriends"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateSelectedFriends();
      });
    });
  }

  updateSelectedFriends() {
    const checkboxes = this.container.querySelectorAll('input[name="selectedFriends"]:checked');
    this.selectedFriends.clear();
    
    checkboxes.forEach(checkbox => {
      this.selectedFriends.add(parseInt(checkbox.value));
    });

    const addBtn = this.container.querySelector('.add-selected-btn');
    const count = this.selectedFriends.size;
    
    addBtn.disabled = count === 0;
    this.container.querySelector('.selected-count').textContent = count;
  }

  async addSelectedFriendsToGroup() {
    if (this.selectedFriends.size === 0) return;

    try {
      const response = await fetch(`/api/friend-groups/${this.selectedGroup.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          friendIds: Array.from(this.selectedFriends)
        })
      });

      if (!response.ok) throw new Error('Failed to add friends to group');

      const data = await response.json();
      
      this.showSuccess(`Added ${data.data.total_added} friends to group`);
      this.closeModals();
      
      // Refresh the group details and groups list
      await this.loadGroupDetails(this.selectedGroup.id);
      await this.loadFriendGroups();
      
    } catch (error) {
      console.error('Error adding friends to group:', error);
      this.showError('Failed to add friends to group');
    }
  }

  openCreateGroupModal() {
    this.container.querySelector('#friendGroupModal .modal-title').textContent = 'Create Friend Group';
    this.container.querySelector('#friendGroupForm').reset();
    this.container.querySelector('#groupColor').value = '#6366f1';
    this.container.querySelector('#friendGroupModal').classList.add('active');
    this.isEditing = false;
  }

  openEditGroupModal(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    this.container.querySelector('#friendGroupModal .modal-title').textContent = 'Edit Friend Group';
    
    const form = this.container.querySelector('#friendGroupForm');
    form.elements.name.value = group.name;
    form.elements.description.value = group.description || '';
    form.elements.color.value = group.color;
    form.elements.icon.value = group.icon;
    
    this.container.querySelector('#friendGroupModal').classList.add('active');
    this.isEditing = true;
    this.editingGroupId = groupId;
  }

  async handleGroupFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const groupData = {
      name: formData.get('name').trim(),
      description: formData.get('description').trim(),
      color: formData.get('color'),
      icon: formData.get('icon')
    };

    try {
      const url = this.isEditing 
        ? `/api/friend-groups/${this.editingGroupId}`
        : '/api/friend-groups';
      
      const method = this.isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save group');
      }

      const data = await response.json();
      
      this.showSuccess(this.isEditing ? 'Group updated successfully' : 'Group created successfully');
      this.closeModals();
      
      // Refresh groups list
      await this.loadFriendGroups();
      
      // If editing, refresh details
      if (this.isEditing && this.selectedGroup?.id === this.editingGroupId) {
        await this.loadGroupDetails(this.editingGroupId);
      } else if (!this.isEditing) {
        // Select the newly created group
        this.selectGroup(data.data.id);
      }
      
    } catch (error) {
      console.error('Error saving group:', error);
      this.showError(error.message);
    }
  }

  async confirmDeleteGroup(groupId) {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    const confirmed = await this.showConfirmDialog(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      'Delete',
      'danger'
    );

    if (confirmed) {
      await this.deleteGroup(groupId);
    }
  }

  async deleteGroup(groupId) {
    try {
      const response = await fetch(`/api/friend-groups/${groupId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete group');

      this.showSuccess('Group deleted successfully');
      
      // Clear selection if deleted group was selected
      if (this.selectedGroup?.id === groupId) {
        this.selectedGroup = null;
        this.container.querySelector('#groupDetailsPanel').innerHTML = `
          <div class="no-group-selected">
            <div class="no-group-icon">
              <i class="icon-users"></i>
            </div>
            <h3>Select a Group</h3>
            <p>Choose a friend group to view and manage its members</p>
          </div>
        `;
      }
      
      // Refresh groups list
      await this.loadFriendGroups();
      
    } catch (error) {
      console.error('Error deleting group:', error);
      this.showError('Failed to delete group');
    }
  }

  async confirmRemoveMember(groupId, memberId) {
    const confirmed = await this.showConfirmDialog(
      'Remove Member',
      'Are you sure you want to remove this friend from the group?',
      'Remove',
      'danger'
    );

    if (confirmed) {
      await this.removeMemberFromGroup(groupId, memberId);
    }
  }

  async removeMemberFromGroup(groupId, memberId) {
    try {
      const response = await fetch(`/api/friend-groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to remove member');

      this.showSuccess('Member removed from group');
      
      // Refresh group details and groups list
      await this.loadGroupDetails(groupId);
      await this.loadFriendGroups();
      
    } catch (error) {
      console.error('Error removing member:', error);
      this.showError('Failed to remove member');
    }
  }

  filterGroups(searchTerm) {
    const groupItems = this.container.querySelectorAll('.group-item');
    const term = searchTerm.toLowerCase();
    
    groupItems.forEach(item => {
      const groupName = item.querySelector('.group-name').textContent.toLowerCase();
      const matches = groupName.includes(term);
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  filterAvailableFriends(searchTerm) {
    const friendItems = this.container.querySelectorAll('.available-friend-item');
    const term = searchTerm.toLowerCase();
    
    friendItems.forEach(item => {
      const friendName = item.querySelector('h5').textContent.toLowerCase();
      const username = item.querySelector('p').textContent.toLowerCase();
      const matches = friendName.includes(term) || username.includes(term);
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  filterMembers(searchTerm, members) {
    const memberItems = this.container.querySelectorAll('.member-item');
    const term = searchTerm.toLowerCase();
    
    memberItems.forEach(item => {
      const memberName = item.querySelector('h5').textContent.toLowerCase();
      const username = item.querySelector('p').textContent.toLowerCase();
      const matches = memberName.includes(term) || username.includes(term);
      item.style.display = matches ? 'flex' : 'none';
    });
  }

  closeModals() {
    this.container.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
    this.selectedFriends.clear();
  }

  updateColorPreview(color) {
    // Update color preview in modal
    const colorPresets = this.container.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
      preset.classList.toggle('active', preset.dataset.color === color);
    });
  }

  setLoading(loading) {
    this.isLoading = loading;
    // You can add loading states here
  }

  getIconEmoji(icon) {
    const iconMap = {
      'users': '👥',
      'heart': '❤️',
      'briefcase': '💼',
      'home': '🏠',
      'gamepad': '🎮',
      'graduation-cap': '🎓',
      'coffee': '☕',
      'star': '⭐'
    };
    return iconMap[icon] || '👥';
  }

  getStatusText(status) {
    const statusMap = {
      'online': 'Online',
      'away': 'Away',
      'busy': 'Busy',
      'offline': 'Offline',
      'invisible': 'Offline'
    };
    return statusMap[status] || 'Offline';
  }

  getStrengthText(strength) {
    if (strength >= 0.8) return 'Very Strong';
    if (strength >= 0.6) return 'Strong';
    if (strength >= 0.4) return 'Moderate';
    if (strength >= 0.2) return 'Weak';
    return 'New';
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
window.MivtonComponents.FriendGroupsManager = FriendGroupsManager;
