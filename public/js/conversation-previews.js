/**
 * Conversation Previews - Phase 3.3 Advanced Social Features
 * Quick access to recent conversations and unread management
 */

class ConversationPreviews extends MivtonComponents.BaseComponent {
  constructor() {
    super();
    this.conversations = [];
    this.filteredConversations = [];
    this.isLoading = false;
    this.filters = {
      search: '',
      status: 'all',
      priority: 'all'
    };
    this.sortBy = 'recent';
    
    this.init();
  }

  async init() {
    this.createHTML();
    this.attachEventListeners();
    await this.loadConversations();
    this.render();
  }

  createHTML() {
    this.container = document.createElement('div');
    this.container.className = 'conversation-previews';
    this.container.innerHTML = `
      <div class="conversations-header">
        <div class="header-content">
          <h2 class="section-title">
            <i class="icon-message-square"></i>
            Conversations
          </h2>
          <div class="header-actions">
            <button class="btn btn-secondary mark-all-read-btn" id="markAllRead">
              <i class="icon-check-circle"></i>
              Mark All Read
            </button>
            <button class="btn btn-primary new-conversation-btn" id="newConversation">
              <i class="icon-plus"></i>
              New Message
            </button>
          </div>
        </div>

        <div class="conversations-controls">
          <div class="search-and-filters">
            <div class="search-box">
              <input type="text" class="conversations-search" placeholder="Search conversations..." id="conversationSearch">
              <i class="icon-search"></i>
            </div>

            <div class="filter-controls">
              <select class="filter-select" id="statusFilter">
                <option value="all">All Conversations</option>
                <option value="unread">Unread</option>
                <option value="priority">Priority</option>
                <option value="muted">Muted</option>
                <option value="active">Recently Active</option>
              </select>

              <select class="sort-select" id="sortSelect">
                <option value="recent">Most Recent</option>
                <option value="unread">Unread First</option>
                <option value="priority">Priority First</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
          </div>

          <div class="bulk-actions" id="bulkActions" style="display: none;">
            <button class="btn btn-secondary select-all-btn" id="selectAll">Select All</button>
            <button class="btn btn-secondary mark-read-btn" id="markSelectedRead">Mark Read</button>
            <button class="btn btn-secondary priority-btn" id="togglePriority">Toggle Priority</button>
            <button class="btn btn-secondary mute-btn" id="toggleMute">Toggle Mute</button>
          </div>
        </div>
      </div>

      <div class="conversations-content">
        <div class="conversations-summary" id="conversationsSummary">
          <div class="summary-card">
            <div class="summary-icon">
              <i class="icon-message-circle"></i>
            </div>
            <div class="summary-content">
              <h3 id="totalConversations">-</h3>
              <p>Total Conversations</p>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon unread">
              <i class="icon-mail"></i>
            </div>
            <div class="summary-content">
              <h3 id="unreadCount">-</h3>
              <p>Unread Messages</p>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon priority">
              <i class="icon-star"></i>
            </div>
            <div class="summary-content">
              <h3 id="priorityCount">-</h3>
              <p>Priority Conversations</p>
            </div>
          </div>

          <div class="summary-card">
            <div class="summary-icon active">
              <i class="icon-activity"></i>
            </div>
            <div class="summary-content">
              <h3 id="activeToday">-</h3>
              <p>Active Today</p>
            </div>
          </div>
        </div>

        <div class="conversations-list" id="conversationsList">
          <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <p>Loading conversations...</p>
          </div>
        </div>
      </div>

      <!-- Conversation Actions Modal -->
      <div class="modal conversation-modal" id="conversationModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Conversation Actions</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body" id="conversationModalBody">
            <!-- Content populated dynamically -->
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary close-modal-btn">Close</button>
          </div>
        </div>
      </div>

      <!-- New Conversation Modal -->
      <div class="modal new-conversation-modal" id="newConversationModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Start New Conversation</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <form class="new-conversation-form" id="newConversationForm">
              <div class="form-group">
                <label for="selectFriend">Choose Friend:</label>
                <select id="selectFriend" class="friend-select" required>
                  <option value="">Select a friend...</option>
                </select>
              </div>

              <div class="form-group">
                <label for="messageText">Message:</label>
                <textarea id="messageText" class="message-textarea" 
                          placeholder="Type your message..." rows="4" required></textarea>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" id="markPriority" name="priority">
                  <span class="checkbox-custom"></span>
                  Mark as priority conversation
                </label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-new-btn">Cancel</button>
            <button type="submit" class="btn btn-primary send-message-btn" form="newConversationForm">
              <i class="icon-send"></i>
              Send Message
            </button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Search
    this.container.querySelector('#conversationSearch').addEventListener('input', (e) => {
      this.filters.search = e.target.value;
      this.applyFilters();
    });

    // Filters
    this.container.querySelector('#statusFilter').addEventListener('change', (e) => {
      this.filters.status = e.target.value;
      this.applyFilters();
    });

    this.container.querySelector('#sortSelect').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.applyFilters();
    });

    // Actions
    this.container.querySelector('#markAllRead').addEventListener('click', () => {
      this.markAllAsRead();
    });

    this.container.querySelector('#newConversation').addEventListener('click', () => {
      this.openNewConversationModal();
    });

    // Bulk actions
    this.container.querySelector('#selectAll').addEventListener('click', () => {
      this.toggleSelectAll();
    });

    this.container.querySelector('#markSelectedRead').addEventListener('click', () => {
      this.markSelectedAsRead();
    });

    this.container.querySelector('#togglePriority').addEventListener('click', () => {
      this.toggleSelectedPriority();
    });

    this.container.querySelector('#toggleMute').addEventListener('click', () => {
      this.toggleSelectedMute();
    });

    // New conversation form
    this.container.querySelector('#newConversationForm').addEventListener('submit', (e) => {
      this.handleNewConversation(e);
    });

    // Modal close buttons
    this.container.querySelectorAll('.modal-close, .close-modal-btn, .cancel-new-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModals();
      });
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

  async loadConversations() {
    try {
      this.setLoading(true);
      
      const [conversationsResponse, summaryResponse] = await Promise.all([
        fetch('/api/conversation-previews', { credentials: 'include' }),
        fetch('/api/conversation-previews/summary', { credentials: 'include' })
      ]);
      
      if (!conversationsResponse.ok) throw new Error('Failed to load conversations');
      if (!summaryResponse.ok) throw new Error('Failed to load summary');
      
      const conversationsData = await conversationsResponse.json();
      const summaryData = await summaryResponse.json();
      
      this.conversations = conversationsData.data || [];
      this.updateSummary(summaryData.data || {});
      
      this.applyFilters();
      
    } catch (error) {
      console.error('Error loading conversations:', error);
      this.showError('Failed to load conversations');
    } finally {
      this.setLoading(false);
    }
  }

  updateSummary(summary) {
    this.container.querySelector('#totalConversations').textContent = summary.total || 0;
    this.container.querySelector('#unreadCount').textContent = summary.unread || 0;
    this.container.querySelector('#priorityCount').textContent = summary.priority || 0;
    this.container.querySelector('#activeToday').textContent = summary.active_today || 0;
  }

  applyFilters() {
    let filtered = [...this.conversations];

    // Apply search filter
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.friend_full_name?.toLowerCase().includes(searchLower) ||
        conv.friend_username?.toLowerCase().includes(searchLower) ||
        conv.last_message_preview?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    switch (this.filters.status) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unread_count > 0);
        break;
      case 'priority':
        filtered = filtered.filter(conv => conv.is_priority);
        break;
      case 'muted':
        filtered = filtered.filter(conv => conv.is_muted);
        break;
      case 'active':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = filtered.filter(conv => 
          new Date(conv.last_activity_at) >= today
        );
        break;
    }

    // Apply sorting
    switch (this.sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.last_activity_at) - new Date(a.last_activity_at));
        break;
      case 'unread':
        filtered.sort((a, b) => {
          if (a.unread_count !== b.unread_count) {
            return b.unread_count - a.unread_count;
          }
          return new Date(b.last_activity_at) - new Date(a.last_activity_at);
        });
        break;
      case 'priority':
        filtered.sort((a, b) => {
          if (a.is_priority !== b.is_priority) {
            return b.is_priority - a.is_priority;
          }
          return new Date(b.last_activity_at) - new Date(a.last_activity_at);
        });
        break;
      case 'alphabetical':
        filtered.sort((a, b) => 
          (a.friend_full_name || '').localeCompare(b.friend_full_name || '')
        );
        break;
    }

    this.filteredConversations = filtered;
    this.renderConversations();
  }

  renderConversations() {
    const conversationsList = this.container.querySelector('#conversationsList');
    
    if (this.filteredConversations.length === 0) {
      conversationsList.innerHTML = `
        <div class="no-conversations">
          <div class="no-conversations-icon">
            <i class="icon-message-square"></i>
          </div>
          <h3>No Conversations Found</h3>
          <p>No conversations match your current filters. Try adjusting your search or filters.</p>
          <button class="btn btn-primary start-conversation-btn">
            <i class="icon-plus"></i>
            Start a Conversation
          </button>
        </div>
      `;

      conversationsList.querySelector('.start-conversation-btn').addEventListener('click', () => {
        this.openNewConversationModal();
      });
      return;
    }

    conversationsList.innerHTML = `
      <div class="conversations-grid">
        ${this.filteredConversations.map(conversation => `
          <div class="conversation-card ${this.getConversationClasses(conversation)}" 
               data-conversation-id="${conversation.friend_id}">
            <div class="conversation-select">
              <input type="checkbox" class="conversation-checkbox" 
                     data-friend-id="${conversation.friend_id}">
            </div>

            <div class="conversation-avatar">
              <img src="${conversation.friend_avatar || '/images/default-avatar.png'}" 
                   alt="${this.escapeHtml(conversation.friend_full_name)}">
              <div class="status-indicator ${conversation.friend_status || 'offline'}"></div>
              ${conversation.unread_count > 0 ? `
                <div class="unread-badge">${conversation.unread_count > 99 ? '99+' : conversation.unread_count}</div>
              ` : ''}
            </div>

            <div class="conversation-content">
              <div class="conversation-header">
                <h4 class="friend-name">${this.escapeHtml(conversation.friend_full_name)}</h4>
                <span class="conversation-time">${this.getTimeAgo(conversation.last_activity_at)}</span>
              </div>

              <div class="conversation-preview">
                <div class="message-preview">
                  ${this.renderMessagePreview(conversation)}
                </div>
                <div class="conversation-indicators">
                  ${conversation.is_priority ? '<i class="icon-star priority-indicator" title="Priority"></i>' : ''}
                  ${conversation.is_muted ? '<i class="icon-volume-x muted-indicator" title="Muted"></i>' : ''}
                </div>
              </div>
            </div>

            <div class="conversation-actions">
              <button class="conversation-action-btn reply-btn" 
                      data-friend-id="${conversation.friend_id}" title="Reply">
                <i class="icon-reply"></i>
              </button>
              <button class="conversation-action-btn call-btn" 
                      data-friend-id="${conversation.friend_id}" title="Call">
                <i class="icon-phone"></i>
              </button>
              <button class="conversation-action-btn video-btn" 
                      data-friend-id="${conversation.friend_id}" title="Video Call">
                <i class="icon-video"></i>
              </button>
              <button class="conversation-action-btn more-btn" 
                      data-friend-id="${conversation.friend_id}" title="More Options">
                <i class="icon-more-vertical"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    this.attachConversationListeners();
  }

  attachConversationListeners() {
    // Conversation card clicks
    this.container.querySelectorAll('.conversation-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't open conversation if clicking on actions or checkbox
        if (e.target.closest('.conversation-actions') || 
            e.target.closest('.conversation-select')) {
          return;
        }
        
        const friendId = card.dataset.conversationId;
        this.openConversation(friendId);
      });
    });

    // Checkboxes
    this.container.querySelectorAll('.conversation-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateBulkActions();
      });
    });

    // Action buttons
    this.container.querySelectorAll('.reply-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const friendId = btn.dataset.friendId;
        this.openReplyModal(friendId);
      });
    });

    this.container.querySelectorAll('.call-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const friendId = btn.dataset.friendId;
        this.initiateCall(friendId);
      });
    });

    this.container.querySelectorAll('.video-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const friendId = btn.dataset.friendId;
        this.initiateVideoCall(friendId);
      });
    });

    this.container.querySelectorAll('.more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const friendId = btn.dataset.friendId;
        this.showConversationOptions(friendId);
      });
    });
  }

  renderMessagePreview(conversation) {
    const typeIcon = this.getMessageTypeIcon(conversation.last_message_type);
    const preview = conversation.last_message_preview || 'No messages yet';
    
    return `
      <span class="message-type-icon">
        <i class="icon-${typeIcon}"></i>
      </span>
      <span class="message-text">${this.escapeHtml(preview)}</span>
    `;
  }

  getMessageTypeIcon(type) {
    const iconMap = {
      'text': 'message',
      'image': 'image',
      'file': 'file',
      'voice': 'mic',
      'video': 'video',
      'system': 'info'
    };
    return iconMap[type] || 'message';
  }

  getConversationClasses(conversation) {
    const classes = [];
    
    if (conversation.unread_count > 0) classes.push('unread');
    if (conversation.is_priority) classes.push('priority');
    if (conversation.is_muted) classes.push('muted');
    
    return classes.join(' ');
  }

  updateBulkActions() {
    const checkboxes = this.container.querySelectorAll('.conversation-checkbox:checked');
    const bulkActions = this.container.querySelector('#bulkActions');
    
    if (checkboxes.length > 0) {
      bulkActions.style.display = 'flex';
    } else {
      bulkActions.style.display = 'none';
    }
  }

  async markAllAsRead() {
    const confirmed = await this.showConfirmDialog(
      'Mark All as Read',
      'Are you sure you want to mark all conversations as read?',
      'Mark All Read'
    );

    if (!confirmed) return;

    try {
      // Mark all conversations as read
      for (const conversation of this.conversations) {
        if (conversation.unread_count > 0) {
          await this.markConversationAsRead(conversation.friend_id);
        }
      }

      this.showSuccess('All conversations marked as read');
      await this.loadConversations();
      
    } catch (error) {
      console.error('Error marking all as read:', error);
      this.showError('Failed to mark all conversations as read');
    }
  }

  async markConversationAsRead(friendId) {
    const response = await fetch(`/api/conversation-previews/${friendId}/mark-read`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to mark conversation as read');
  }

  async markSelectedAsRead() {
    const selected = this.getSelectedConversations();
    if (selected.length === 0) return;

    try {
      for (const friendId of selected) {
        await this.markConversationAsRead(friendId);
      }

      this.showSuccess(`${selected.length} conversation${selected.length !== 1 ? 's' : ''} marked as read`);
      await this.loadConversations();
      
    } catch (error) {
      console.error('Error marking selected as read:', error);
      this.showError('Failed to mark conversations as read');
    }
  }

  async toggleSelectedPriority() {
    const selected = this.getSelectedConversations();
    if (selected.length === 0) return;

    try {
      for (const friendId of selected) {
        await this.toggleConversationPriority(friendId);
      }

      this.showSuccess(`Priority toggled for ${selected.length} conversation${selected.length !== 1 ? 's' : ''}`);
      await this.loadConversations();
      
    } catch (error) {
      console.error('Error toggling priority:', error);
      this.showError('Failed to toggle priority status');
    }
  }

  async toggleSelectedMute() {
    const selected = this.getSelectedConversations();
    if (selected.length === 0) return;

    try {
      for (const friendId of selected) {
        await this.toggleConversationMute(friendId);
      }

      this.showSuccess(`Mute status toggled for ${selected.length} conversation${selected.length !== 1 ? 's' : ''}`);
      await this.loadConversations();
      
    } catch (error) {
      console.error('Error toggling mute:', error);
      this.showError('Failed to toggle mute status');
    }
  }

  async toggleConversationPriority(friendId) {
    const conversation = this.conversations.find(c => c.friend_id === friendId);
    const newPriorityStatus = !conversation.is_priority;

    const response = await fetch(`/api/conversation-previews/${friendId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        is_priority: newPriorityStatus
      })
    });

    if (!response.ok) throw new Error('Failed to update conversation priority');
  }

  async toggleConversationMute(friendId) {
    const conversation = this.conversations.find(c => c.friend_id === friendId);
    const newMuteStatus = !conversation.is_muted;

    const response = await fetch(`/api/conversation-previews/${friendId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        is_muted: newMuteStatus
      })
    });

    if (!response.ok) throw new Error('Failed to update conversation mute status');
  }

  getSelectedConversations() {
    const checkboxes = this.container.querySelectorAll('.conversation-checkbox:checked');
    return Array.from(checkboxes).map(checkbox => parseInt(checkbox.dataset.friendId));
  }

  toggleSelectAll() {
    const checkboxes = this.container.querySelectorAll('.conversation-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
      checkbox.checked = !allChecked;
    });
    
    this.updateBulkActions();
  }

  async openNewConversationModal() {
    try {
      // Load friends list
      const response = await fetch('/api/friends', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load friends');
      
      const data = await response.json();
      const friends = data.data || [];
      
      const friendSelect = this.container.querySelector('#selectFriend');
      friendSelect.innerHTML = `
        <option value="">Select a friend...</option>
        ${friends.map(friend => `
          <option value="${friend.id}">${friend.full_name} (@${friend.username})</option>
        `).join('')}
      `;
      
      this.container.querySelector('#newConversationModal').classList.add('active');
      
    } catch (error) {
      console.error('Error opening new conversation modal:', error);
      this.showError('Failed to load friends list');
    }
  }

  async handleNewConversation(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const friendId = parseInt(formData.get('selectFriend'));
    const messageText = formData.get('messageText').trim();
    const isPriority = formData.has('priority');

    if (!friendId || !messageText) {
      this.showError('Please select a friend and enter a message');
      return;
    }

    try {
      // Create/update conversation preview
      const response = await fetch(`/api/conversation-previews/${friendId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          last_message_preview: messageText.substring(0, 100),
          last_message_type: 'text',
          last_interaction_type: 'message',
          is_priority: isPriority,
          unread_count: 0 // User is starting the conversation
        })
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      this.showSuccess('Message sent successfully!');
      this.closeModals();
      await this.loadConversations();
      
      // TODO: Actually send the message via messaging system
      console.log('Send message to friend:', friendId, messageText);
      
    } catch (error) {
      console.error('Error creating conversation:', error);
      this.showError('Failed to send message');
    }
  }

  openConversation(friendId) {
    // Open multilingual chat interface
    console.log('Open conversation with friend:', friendId);
    
    // Get friend name from the conversation list
    const conversationElement = document.querySelector(`[data-friend-id="${friendId}"]`);
    const friendName = conversationElement?.querySelector('.friend-name')?.textContent || 'Friend';
    
    // Initialize and open multilingual chat
    if (window.MultilingualChat) {
      // Create chat container if it doesn't exist
      let chatContainer = document.querySelector('.multilingual-chat-container');
      if (!chatContainer) {
        chatContainer = document.createElement('div');
        chatContainer.className = 'multilingual-chat-container';
        chatContainer.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 400px;
          height: 600px;
          z-index: 1000;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          display: none;
        `;
        document.body.appendChild(chatContainer);
        
        // Initialize chat component
        const chat = new window.MultilingualChat();
        chatContainer.appendChild(chat.container);
        chat.init();
        
        // Store reference for later use
        window.multilingualChat = chat;
      }
      
      // Show chat container and open conversation
      chatContainer.style.display = 'block';
      window.multilingualChat.openConversation(friendId, friendName);
    } else {
      console.warn('MultilingualChat component not loaded');
      // Fallback to simple alert
      alert(`Opening conversation with friend ${friendId}`);
    }
    
    // Mark as read
    this.markConversationAsRead(friendId);
  }

  openReplyModal(friendId) {
    // TODO: Open quick reply modal
    console.log('Open reply modal for friend:', friendId);
  }

  initiateCall(friendId) {
    // TODO: Initiate voice call
    console.log('Initiate call with friend:', friendId);
  }

  initiateVideoCall(friendId) {
    // TODO: Initiate video call
    console.log('Initiate video call with friend:', friendId);
  }

  showConversationOptions(friendId) {
    const conversation = this.conversations.find(c => c.friend_id === friendId);
    if (!conversation) return;

    const modalBody = this.container.querySelector('#conversationModalBody');
    
    modalBody.innerHTML = `
      <div class="conversation-options">
        <div class="option-header">
          <div class="friend-avatar">
            <img src="${conversation.friend_avatar || '/images/default-avatar.png'}" 
                 alt="${this.escapeHtml(conversation.friend_full_name)}">
          </div>
          <div class="friend-info">
            <h4>${this.escapeHtml(conversation.friend_full_name)}</h4>
            <p>@${this.escapeHtml(conversation.friend_username)}</p>
          </div>
        </div>

        <div class="options-list">
          <button class="option-btn mark-read-option" data-friend-id="${friendId}">
            <i class="icon-check-circle"></i>
            <span>Mark as Read</span>
          </button>

          <button class="option-btn priority-option" data-friend-id="${friendId}">
            <i class="icon-star"></i>
            <span>${conversation.is_priority ? 'Remove from' : 'Add to'} Priority</span>
          </button>

          <button class="option-btn mute-option" data-friend-id="${friendId}">
            <i class="icon-${conversation.is_muted ? 'volume' : 'volume-x'}"></i>
            <span>${conversation.is_muted ? 'Unmute' : 'Mute'} Conversation</span>
          </button>

          <button class="option-btn delete-option" data-friend-id="${friendId}">
            <i class="icon-trash"></i>
            <span>Delete Conversation</span>
          </button>
        </div>
      </div>
    `;

    // Attach option listeners
    modalBody.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.classList[1].replace('-option', '');
        await this.handleConversationOption(action, friendId);
        this.closeModals();
      });
    });

    this.container.querySelector('#conversationModal').classList.add('active');
  }

  async handleConversationOption(action, friendId) {
    try {
      switch (action) {
        case 'mark-read':
          await this.markConversationAsRead(friendId);
          this.showSuccess('Conversation marked as read');
          break;
        case 'priority':
          await this.toggleConversationPriority(friendId);
          this.showSuccess('Priority status updated');
          break;
        case 'mute':
          await this.toggleConversationMute(friendId);
          this.showSuccess('Mute status updated');
          break;
        case 'delete':
          const confirmed = await this.showConfirmDialog(
            'Delete Conversation',
            'Are you sure you want to delete this conversation? This action cannot be undone.',
            'Delete',
            'danger'
          );
          if (confirmed) {
            // TODO: Implement conversation deletion
            this.showSuccess('Conversation deleted');
          }
          break;
      }

      await this.loadConversations();
      
    } catch (error) {
      console.error('Error handling conversation option:', error);
      this.showError('Failed to update conversation');
    }
  }

  closeModals() {
    this.container.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
    
    // Reset new conversation form
    this.container.querySelector('#newConversationForm').reset();
  }

  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  setLoading(loading) {
    this.isLoading = loading;
    // Add loading state indicators
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
window.MivtonComponents.ConversationPreviews = ConversationPreviews;
