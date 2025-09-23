/**
 * Advanced Social UI Components - Phase 3.3 Advanced Social Features
 * Main orchestrator for all Phase 3.3 advanced social features
 */

class AdvancedSocialUI extends MivtonComponents.BaseComponent {
  constructor() {
    super();
    this.components = {};
    this.currentView = 'overview';
    this.isLoading = false;
    
    this.init();
  }

  async init() {
    this.createHTML();
    this.attachEventListeners();
    this.initializeComponents();
    this.render();
  }

  createHTML() {
    this.container = document.createElement('div');
    this.container.className = 'advanced-social-ui';
    this.container.innerHTML = `
      <div class="social-navigation">
        <div class="nav-header">
          <h2>
            <i class="icon-users"></i>
            Advanced Social
          </h2>
        </div>

        <nav class="social-nav">
          <button class="nav-item active" data-view="overview">
            <i class="icon-home"></i>
            <span>Overview</span>
          </button>
          
          <button class="nav-item" data-view="friend-groups">
            <i class="icon-users"></i>
            <span>Friend Groups</span>
          </button>
          
          <button class="nav-item" data-view="analytics">
            <i class="icon-chart-bar"></i>
            <span>Analytics</span>
          </button>
          
          <button class="nav-item" data-view="recommendations">
            <i class="icon-user-plus"></i>
            <span>Recommendations</span>
          </button>
          
          <button class="nav-item" data-view="conversations">
            <i class="icon-message-square"></i>
            <span>Conversations</span>
          </button>
          
          <button class="nav-item" data-view="privacy">
            <i class="icon-shield"></i>
            <span>Privacy</span>
          </button>
        </nav>

        <div class="nav-footer">
          <button class="btn btn-secondary help-btn" id="helpBtn">
            <i class="icon-help-circle"></i>
            Help
          </button>
        </div>
      </div>

      <div class="social-content">
        <div class="content-header" id="contentHeader">
          <div class="breadcrumb">
            <span class="breadcrumb-item">Advanced Social</span>
            <i class="icon-chevron-right"></i>
            <span class="breadcrumb-current">Overview</span>
          </div>
          
          <div class="content-actions" id="contentActions">
            <!-- Actions populated based on current view -->
          </div>
        </div>

        <div class="content-body" id="contentBody">
          <!-- Overview View -->
          <div class="view-container overview-view" data-view="overview">
            <div class="social-overview">
              <div class="overview-header">
                <h3>Welcome to Advanced Social Features</h3>
                <p>Manage your friendships, analyze your social patterns, and discover new connections.</p>
              </div>

              <div class="overview-cards">
                <div class="overview-card" data-navigate="friend-groups">
                  <div class="card-icon">
                    <i class="icon-users"></i>
                  </div>
                  <div class="card-content">
                    <h4>Friend Groups</h4>
                    <p>Organize your friends into custom groups</p>
                    <div class="card-stats" id="groupsStats">
                      <span class="stat">Loading...</span>
                    </div>
                  </div>
                  <div class="card-action">
                    <i class="icon-arrow-right"></i>
                  </div>
                </div>

                <div class="overview-card" data-navigate="analytics">
                  <div class="card-icon">
                    <i class="icon-chart-bar"></i>
                  </div>
                  <div class="card-content">
                    <h4>Social Analytics</h4>
                    <p>Insights into your social interactions</p>
                    <div class="card-stats" id="analyticsStats">
                      <span class="stat">Loading...</span>
                    </div>
                  </div>
                  <div class="card-action">
                    <i class="icon-arrow-right"></i>
                  </div>
                </div>

                <div class="overview-card" data-navigate="recommendations">
                  <div class="card-icon">
                    <i class="icon-user-plus"></i>
                  </div>
                  <div class="card-content">
                    <h4>Friend Recommendations</h4>
                    <p>AI-powered friend suggestions</p>
                    <div class="card-stats" id="recommendationsStats">
                      <span class="stat">Loading...</span>
                    </div>
                  </div>
                  <div class="card-action">
                    <i class="icon-arrow-right"></i>
                  </div>
                </div>

                <div class="overview-card" data-navigate="conversations">
                  <div class="card-icon">
                    <i class="icon-message-square"></i>
                  </div>
                  <div class="card-content">
                    <h4>Conversations</h4>
                    <p>Manage your conversations and messages</p>
                    <div class="card-stats" id="conversationsStats">
                      <span class="stat">Loading...</span>
                    </div>
                  </div>
                  <div class="card-action">
                    <i class="icon-arrow-right"></i>
                  </div>
                </div>

                <div class="overview-card" data-navigate="privacy">
                  <div class="card-icon">
                    <i class="icon-shield"></i>
                  </div>
                  <div class="card-content">
                    <h4>Privacy Controls</h4>
                    <p>Advanced privacy settings and controls</p>
                    <div class="card-stats" id="privacyStats">
                      <span class="stat">Loading...</span>
                    </div>
                  </div>
                  <div class="card-action">
                    <i class="icon-arrow-right"></i>
                  </div>
                </div>
              </div>

              <div class="recent-activity" id="recentActivity">
                <h4>Recent Social Activity</h4>
                <div class="activity-list">
                  <div class="loading-placeholder">
                    <div class="loading-spinner"></div>
                    <p>Loading recent activity...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Component Views -->
          <div class="view-container" data-view="friend-groups">
            <div id="friendGroupsContainer"></div>
          </div>

          <div class="view-container" data-view="analytics">
            <div id="analyticsContainer"></div>
          </div>

          <div class="view-container" data-view="recommendations">
            <div id="recommendationsContainer"></div>
          </div>

          <div class="view-container" data-view="conversations">
            <div id="conversationsContainer"></div>
          </div>

          <div class="view-container" data-view="privacy">
            <div id="privacyContainer"></div>
          </div>
        </div>
      </div>

      <!-- Help Modal -->
      <div class="modal help-modal" id="helpModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Advanced Social Features Help</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="help-content">
              <div class="help-section">
                <h4>Friend Groups</h4>
                <p>Organize your friends into custom groups like "Close Friends", "Work", or "Family". You can set different privacy settings for each group and manage them easily.</p>
                <ul>
                  <li>Create unlimited custom groups</li>
                  <li>Assign friends to multiple groups</li>
                  <li>Set group-specific privacy controls</li>
                  <li>Bulk manage group members</li>
                </ul>
              </div>

              <div class="help-section">
                <h4>Social Analytics</h4>
                <p>Get insights into your social interactions and friendship patterns. See who you interact with most, when you're most active, and track your social health.</p>
                <ul>
                  <li>Interaction trends and patterns</li>
                  <li>Friend engagement rankings</li>
                  <li>Activity heatmaps</li>
                  <li>Social health scoring</li>
                </ul>
              </div>

              <div class="help-section">
                <h4>Friend Recommendations</h4>
                <p>Our AI suggests new friends based on mutual connections, shared interests, and compatibility. Review recommendations and send friend requests easily.</p>
                <ul>
                  <li>AI-powered suggestions</li>
                  <li>Confidence scoring</li>
                  <li>Multiple recommendation reasons</li>
                  <li>Easy accept/dismiss actions</li>
                </ul>
              </div>

              <div class="help-section">
                <h4>Conversation Management</h4>
                <p>Quick overview of all your conversations with friends. See unread messages, priority conversations, and manage your communication efficiently.</p>
                <ul>
                  <li>Conversation previews</li>
                  <li>Unread message tracking</li>
                  <li>Priority marking</li>
                  <li>Bulk conversation actions</li>
                </ul>
              </div>

              <div class="help-section">
                <h4>Privacy Controls</h4>
                <p>Fine-tune your privacy settings with granular controls. Set different privacy levels for different friend groups and control what information is shared.</p>
                <ul>
                  <li>Global privacy settings</li>
                  <li>Group-specific overrides</li>
                  <li>Activity visibility controls</li>
                  <li>Bulk privacy management</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary close-help-btn">Got it!</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Navigation
    this.container.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        this.navigateToView(view);
      });
    });

    // Overview cards navigation
    this.container.querySelectorAll('.overview-card').forEach(card => {
      card.addEventListener('click', () => {
        const view = card.dataset.navigate;
        if (view) {
          this.navigateToView(view);
        }
      });
    });

    // Help button
    this.container.querySelector('#helpBtn').addEventListener('click', () => {
      this.openHelpModal();
    });

    // Modal close
    this.container.querySelectorAll('.modal-close, .close-help-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeHelpModal();
      });
    });

    // Click outside modal to close
    this.container.querySelector('#helpModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeHelpModal();
      }
    });
  }

  async initializeComponents() {
    try {
      // Initialize all Phase 3.3 components
      if (window.MivtonComponents.FriendGroupsManager) {
        this.components.friendGroups = new window.MivtonComponents.FriendGroupsManager();
        this.container.querySelector('#friendGroupsContainer').appendChild(
          this.components.friendGroups.render()
        );
      }

      if (window.MivtonComponents.SocialAnalytics) {
        this.components.analytics = new window.MivtonComponents.SocialAnalytics();
        this.container.querySelector('#analyticsContainer').appendChild(
          this.components.analytics.render()
        );
      }

      if (window.MivtonComponents.FriendRecommendations) {
        this.components.recommendations = new window.MivtonComponents.FriendRecommendations();
        this.container.querySelector('#recommendationsContainer').appendChild(
          this.components.recommendations.render()
        );
      }

      if (window.MivtonComponents.ConversationPreviews) {
        this.components.conversations = new window.MivtonComponents.ConversationPreviews();
        this.container.querySelector('#conversationsContainer').appendChild(
          this.components.conversations.render()
        );
      }

      if (window.MivtonComponents.PrivacyControls) {
        this.components.privacy = new window.MivtonComponents.PrivacyControls();
        this.container.querySelector('#privacyContainer').appendChild(
          this.components.privacy.render()
        );
      }

      // Load overview data
      await this.loadOverviewData();

    } catch (error) {
      console.error('Error initializing advanced social components:', error);
      this.showError('Failed to initialize advanced social features');
    }
  }

  async loadOverviewData() {
    try {
      // Load statistics for overview cards
      const [groupsData, analyticsData, recommendationsData, conversationsData] = await Promise.all([
        this.fetchOverviewStats('/api/friend-groups'),
        this.fetchOverviewStats('/api/social-analytics/overview'),
        this.fetchOverviewStats('/api/friend-recommendations'),
        this.fetchOverviewStats('/api/conversation-previews/summary')
      ]);

      this.updateOverviewStats(groupsData, analyticsData, recommendationsData, conversationsData);
      await this.loadRecentActivity();

    } catch (error) {
      console.error('Error loading overview data:', error);
    }
  }

  async fetchOverviewStats(endpoint) {
    try {
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      return null;
    }
  }

  updateOverviewStats(groupsData, analyticsData, recommendationsData, conversationsData) {
    // Friend Groups stats
    const groupsStatsEl = this.container.querySelector('#groupsStats');
    if (groupsData?.data) {
      const totalGroups = groupsData.data.length;
      const totalMembers = groupsData.data.reduce((sum, group) => sum + (group.member_count || 0), 0);
      groupsStatsEl.innerHTML = `
        <span class="stat">${totalGroups} groups</span>
        <span class="stat">${totalMembers} total members</span>
      `;
    } else {
      groupsStatsEl.innerHTML = '<span class="stat">No data</span>';
    }

    // Analytics stats
    const analyticsStatsEl = this.container.querySelector('#analyticsStats');
    if (analyticsData?.data) {
      const interactions = analyticsData.data.total_interactions || 0;
      const healthScore = Math.round(analyticsData.data.social_health_score || 0);
      analyticsStatsEl.innerHTML = `
        <span class="stat">${interactions} interactions</span>
        <span class="stat">${healthScore}% health score</span>
      `;
    } else {
      analyticsStatsEl.innerHTML = '<span class="stat">No data</span>';
    }

    // Recommendations stats
    const recommendationsStatsEl = this.container.querySelector('#recommendationsStats');
    if (recommendationsData?.data) {
      const total = recommendationsData.data.length;
      const highConfidence = recommendationsData.data.filter(r => r.confidence_score >= 0.7).length;
      recommendationsStatsEl.innerHTML = `
        <span class="stat">${total} suggestions</span>
        <span class="stat">${highConfidence} high confidence</span>
      `;
    } else {
      recommendationsStatsEl.innerHTML = '<span class="stat">No data</span>';
    }

    // Conversations stats
    const conversationsStatsEl = this.container.querySelector('#conversationsStats');
    if (conversationsData?.data) {
      const total = conversationsData.data.total || 0;
      const unread = conversationsData.data.unread || 0;
      conversationsStatsEl.innerHTML = `
        <span class="stat">${total} conversations</span>
        <span class="stat">${unread} unread</span>
      `;
    } else {
      conversationsStatsEl.innerHTML = '<span class="stat">No data</span>';
    }

    // Privacy stats (placeholder)
    const privacyStatsEl = this.container.querySelector('#privacyStats');
    privacyStatsEl.innerHTML = `
      <span class="stat">Privacy configured</span>
      <span class="stat">Settings active</span>
    `;
  }

  async loadRecentActivity() {
    try {
      const response = await fetch('/api/social-analytics/interactions?limit=10', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load recent activity');

      const data = await response.json();
      const activities = data.data || [];

      const activityContainer = this.container.querySelector('.activity-list');
      
      if (activities.length === 0) {
        activityContainer.innerHTML = `
          <div class="no-activity">
            <p>No recent social activity to display.</p>
          </div>
        `;
        return;
      }

      activityContainer.innerHTML = activities.slice(0, 5).map(activity => `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="icon-${this.getActivityIcon(activity.interaction_type)}"></i>
          </div>
          <div class="activity-content">
            <p>
              <strong>${activity.interaction_type}</strong> with 
              <strong>${activity.friend_full_name}</strong>
            </p>
            <span class="activity-time">${this.getTimeAgo(activity.created_at)}</span>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('Error loading recent activity:', error);
      const activityContainer = this.container.querySelector('.activity-list');
      activityContainer.innerHTML = '<p>Failed to load recent activity.</p>';
    }
  }

  navigateToView(view) {
    // Update navigation
    this.container.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === view);
    });

    // Update views
    this.container.querySelectorAll('.view-container').forEach(container => {
      container.classList.toggle('active', container.dataset.view === view);
    });

    // Update breadcrumb
    const breadcrumbCurrent = this.container.querySelector('.breadcrumb-current');
    breadcrumbCurrent.textContent = this.getViewTitle(view);

    // Update content actions
    this.updateContentActions(view);

    this.currentView = view;
  }

  updateContentActions(view) {
    const actionsContainer = this.container.querySelector('#contentActions');
    
    switch (view) {
      case 'overview':
        actionsContainer.innerHTML = `
          <button class="btn btn-primary refresh-overview-btn" id="refreshOverview">
            <i class="icon-refresh"></i>
            Refresh
          </button>
        `;
        
        this.container.querySelector('#refreshOverview').addEventListener('click', () => {
          this.loadOverviewData();
        });
        break;
      
      case 'friend-groups':
        actionsContainer.innerHTML = `
          <button class="btn btn-primary" onclick="window.MivtonComponents.FriendGroupsManager && new window.MivtonComponents.FriendGroupsManager().openCreateGroupModal()">
            <i class="icon-plus"></i>
            New Group
          </button>
        `;
        break;
      
      case 'analytics':
        actionsContainer.innerHTML = `
          <button class="btn btn-secondary" onclick="window.MivtonComponents.SocialAnalytics && window.MivtonComponents.SocialAnalytics.refreshAnalytics && window.MivtonComponents.SocialAnalytics.refreshAnalytics()">
            <i class="icon-refresh"></i>
            Refresh Data
          </button>
        `;
        break;
      
      case 'recommendations':
        actionsContainer.innerHTML = `
          <button class="btn btn-primary" onclick="window.MivtonComponents.FriendRecommendations && window.MivtonComponents.FriendRecommendations.generateNewRecommendations && window.MivtonComponents.FriendRecommendations.generateNewRecommendations()">
            <i class="icon-refresh"></i>
            Generate New
          </button>
        `;
        break;
      
      case 'conversations':
        actionsContainer.innerHTML = `
          <button class="btn btn-primary" onclick="window.MivtonComponents.ConversationPreviews && window.MivtonComponents.ConversationPreviews.openNewConversationModal && window.MivtonComponents.ConversationPreviews.openNewConversationModal()">
            <i class="icon-plus"></i>
            New Message
          </button>
        `;
        break;
      
      case 'privacy':
        actionsContainer.innerHTML = `
          <button class="btn btn-secondary" onclick="window.MivtonComponents.PrivacyControls && window.MivtonComponents.PrivacyControls.resetToDefaults && window.MivtonComponents.PrivacyControls.resetToDefaults()">
            <i class="icon-refresh"></i>
            Reset Defaults
          </button>
        `;
        break;
      
      default:
        actionsContainer.innerHTML = '';
    }
  }

  getViewTitle(view) {
    const titles = {
      'overview': 'Overview',
      'friend-groups': 'Friend Groups',
      'analytics': 'Social Analytics',
      'recommendations': 'Friend Recommendations',
      'conversations': 'Conversations',
      'privacy': 'Privacy Controls'
    };
    return titles[view] || 'Advanced Social';
  }

  getActivityIcon(type) {
    const iconMap = {
      'message': 'message-circle',
      'call': 'phone',
      'video_call': 'video',
      'profile_view': 'eye',
      'group_add': 'user-plus'
    };
    return iconMap[type] || 'activity';
  }

  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  openHelpModal() {
    this.container.querySelector('#helpModal').classList.add('active');
  }

  closeHelpModal() {
    this.container.querySelector('#helpModal').classList.remove('active');
  }

  setLoading(loading) {
    this.isLoading = loading;
    // Add global loading states
  }

  render() {
    return this.container;
  }
}

// Auto-initialize when component dependencies are loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for all Phase 3.3 components to be available
  const checkComponents = () => {
    const requiredComponents = [
      'FriendGroupsManager',
      'SocialAnalytics', 
      'FriendRecommendations',
      'ConversationPreviews',
      'PrivacyControls'
    ];

    const allLoaded = requiredComponents.every(component => 
      window.MivtonComponents && window.MivtonComponents[component]
    );

    if (allLoaded) {
      // Initialize the main advanced social UI
      window.MivtonComponents.AdvancedSocialUI = AdvancedSocialUI;
      console.log('✅ Phase 3.3 Advanced Social Features fully loaded');
    } else {
      // Check again in 100ms
      setTimeout(checkComponents, 100);
    }
  };

  checkComponents();
});

// Initialize and export
window.MivtonComponents = window.MivtonComponents || {};
window.MivtonComponents.AdvancedSocialUI = AdvancedSocialUI;
