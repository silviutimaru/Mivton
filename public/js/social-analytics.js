/**
 * Social Analytics Dashboard - Phase 3.3 Advanced Social Features
 * Comprehensive social interaction analytics and insights
 */

class SocialAnalytics extends MivtonComponents.BaseComponent {
  constructor() {
    super();
    this.analyticsData = null;
    this.currentPeriod = 30;
    this.isLoading = false;
    this.charts = {};
    
    this.init();
  }

  async init() {
    this.createHTML();
    this.attachEventListeners();
    await this.loadAnalytics();
    this.render();
  }

  createHTML() {
    this.container = document.createElement('div');
    this.container.className = 'social-analytics';
    this.container.innerHTML = `
      <div class="analytics-header">
        <div class="header-content">
          <h2 class="section-title">
            <i class="icon-chart-bar"></i>
            Social Analytics
          </h2>
          <div class="period-selector">
            <select class="period-select" id="periodSelect">
              <option value="7">Last 7 days</option>
              <option value="30" selected>Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button class="btn btn-secondary refresh-btn" id="refreshAnalytics">
              <i class="icon-refresh"></i>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div class="analytics-content">
        <!-- Overview Cards -->
        <div class="analytics-overview">
          <div class="overview-card">
            <div class="card-icon total-interactions">
              <i class="icon-message-circle"></i>
            </div>
            <div class="card-content">
              <h3 class="card-value" id="totalInteractions">-</h3>
              <p class="card-label">Total Interactions</p>
              <span class="card-change" id="interactionsChange">-</span>
            </div>
          </div>

          <div class="overview-card">
            <div class="card-icon active-friends">
              <i class="icon-users"></i>
            </div>
            <div class="card-content">
              <h3 class="card-value" id="activeFriends">-</h3>
              <p class="card-label">Active Friends</p>
              <span class="card-change" id="friendsChange">-</span>
            </div>
          </div>

          <div class="overview-card">
            <div class="card-icon social-score">
              <i class="icon-heart"></i>
            </div>
            <div class="card-content">
              <h3 class="card-value" id="socialScore">-</h3>
              <p class="card-label">Social Health Score</p>
              <span class="card-change" id="scoreChange">-</span>
            </div>
          </div>

          <div class="overview-card">
            <div class="card-icon response-time">
              <i class="icon-clock"></i>
            </div>
            <div class="card-content">
              <h3 class="card-value" id="responseTime">-</h3>
              <p class="card-label">Avg Response Time</p>
              <span class="card-change" id="responseChange">-</span>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div class="analytics-charts">
          <!-- Interaction Trends Chart -->
          <div class="chart-container">
            <div class="chart-header">
              <h3>Interaction Trends</h3>
              <div class="chart-controls">
                <div class="chart-legend">
                  <span class="legend-item">
                    <span class="legend-color messages"></span>
                    Messages
                  </span>
                  <span class="legend-item">
                    <span class="legend-color calls"></span>
                    Calls
                  </span>
                  <span class="legend-item">
                    <span class="legend-color video-calls"></span>
                    Video Calls
                  </span>
                </div>
              </div>
            </div>
            <div class="chart-canvas-container">
              <canvas id="interactionTrendsChart"></canvas>
            </div>
          </div>

          <!-- Activity Heatmap -->
          <div class="chart-container">
            <div class="chart-header">
              <h3>Activity Heatmap</h3>
              <p class="chart-subtitle">When you're most active with friends</p>
            </div>
            <div class="heatmap-container" id="activityHeatmap">
              <div class="heatmap-loading">
                <div class="loading-spinner"></div>
                <p>Loading activity patterns...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Friend Engagement Section -->
        <div class="analytics-section">
          <div class="section-header">
            <h3>Friend Engagement</h3>
            <button class="btn btn-secondary view-all-btn" id="viewAllFriends">
              View All Friends
            </button>
          </div>
          <div class="engagement-list" id="friendEngagementList">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Loading friend engagement data...</p>
            </div>
          </div>
        </div>

        <!-- Social Insights -->
        <div class="analytics-section">
          <div class="section-header">
            <h3>Personalized Insights</h3>
          </div>
          <div class="insights-container" id="socialInsights">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Generating insights...</p>
            </div>
          </div>
        </div>

        <!-- Weekly Summary -->
        <div class="analytics-section">
          <div class="section-header">
            <h3>Weekly Summary</h3>
            <p class="section-subtitle">Your social activity over the past weeks</p>
          </div>
          <div class="weekly-summary-container" id="weeklySummary">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Loading weekly data...</p>
            </div>
          </div>
        </div>

        <!-- Conversation Health -->
        <div class="analytics-section">
          <div class="section-header">
            <h3>Conversation Health</h3>
            <p class="section-subtitle">Overview of your active conversations</p>
          </div>
          <div class="conversation-health-grid" id="conversationHealth">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Analyzing conversations...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Period selector
    this.container.querySelector('#periodSelect').addEventListener('change', (e) => {
      this.currentPeriod = parseInt(e.target.value);
      this.loadAnalytics();
    });

    // Refresh button
    this.container.querySelector('#refreshAnalytics').addEventListener('click', () => {
      this.refreshAnalytics();
    });

    // View all friends button
    this.container.querySelector('#viewAllFriends').addEventListener('click', () => {
      this.showAllFriendsEngagement();
    });
  }

  async loadAnalytics() {
    try {
      this.setLoading(true);
      
      // Load multiple analytics endpoints in parallel
      const [overview, engagement, insights, weekly, conversations, heatmap] = await Promise.all([
        this.fetchOverviewData(),
        this.fetchFriendEngagement(),
        this.fetchSocialInsights(),
        this.fetchWeeklySummary(),
        this.fetchConversationHealth(),
        this.fetchActivityHeatmap()
      ]);

      this.analyticsData = {
        overview,
        engagement,
        insights,
        weekly,
        conversations,
        heatmap
      };

      this.renderAnalytics();
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      this.showError('Failed to load analytics data');
    } finally {
      this.setLoading(false);
    }
  }

  async fetchOverviewData() {
    const response = await fetch(`/api/social-analytics/overview?period_days=${this.currentPeriod}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch overview data');
    return response.json();
  }

  async fetchFriendEngagement() {
    const response = await fetch('/api/social-analytics/friends/engagement?limit=10', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch friend engagement');
    return response.json();
  }

  async fetchSocialInsights() {
    const response = await fetch('/api/social-analytics/insights', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch social insights');
    return response.json();
  }

  async fetchWeeklySummary() {
    const response = await fetch('/api/social-analytics/weekly-summary', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch weekly summary');
    return response.json();
  }

  async fetchConversationHealth() {
    const response = await fetch('/api/social-analytics/conversation-health', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch conversation health');
    return response.json();
  }

  async fetchActivityHeatmap() {
    const response = await fetch('/api/social-analytics/activity/heatmap', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch activity heatmap');
    return response.json();
  }

  renderAnalytics() {
    this.renderOverviewCards();
    this.renderInteractionTrends();
    this.renderActivityHeatmap();
    this.renderFriendEngagement();
    this.renderSocialInsights();
    this.renderWeeklySummary();
    this.renderConversationHealth();
  }

  renderOverviewCards() {
    if (!this.analyticsData.overview?.data) return;

    const data = this.analyticsData.overview.data;
    
    // Total Interactions
    this.container.querySelector('#totalInteractions').textContent = 
      this.formatNumber(data.total_interactions || 0);
    this.container.querySelector('#interactionsChange').textContent = 
      this.formatChange(data.interactions_change_percent);
    this.container.querySelector('#interactionsChange').className = 
      `card-change ${this.getChangeClass(data.interactions_change_percent)}`;

    // Active Friends
    this.container.querySelector('#activeFriends').textContent = 
      this.formatNumber(data.active_friends || 0);
    this.container.querySelector('#friendsChange').textContent = 
      this.formatChange(data.friends_change_percent);
    this.container.querySelector('#friendsChange').className = 
      `card-change ${this.getChangeClass(data.friends_change_percent)}`;

    // Social Score
    this.container.querySelector('#socialScore').textContent = 
      Math.round(data.social_health_score || 0);
    this.container.querySelector('#scoreChange').textContent = 
      this.formatChange(data.score_change_percent);
    this.container.querySelector('#scoreChange').className = 
      `card-change ${this.getChangeClass(data.score_change_percent)}`;

    // Response Time
    this.container.querySelector('#responseTime').textContent = 
      this.formatDuration(data.avg_response_time_minutes || 0);
    this.container.querySelector('#responseChange').textContent = 
      this.formatChange(data.response_time_change_percent);
    this.container.querySelector('#responseChange').className = 
      `card-change ${this.getChangeClass(data.response_time_change_percent, true)}`;
  }

  renderInteractionTrends() {
    if (!this.analyticsData.overview?.data?.daily_trends) return;

    const canvas = this.container.querySelector('#interactionTrendsChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const trends = this.analyticsData.overview.data.daily_trends;

    // Destroy existing chart if it exists
    if (this.charts.trends) {
      this.charts.trends.destroy();
    }

    this.charts.trends = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trends.map(day => this.formatChartDate(day.date)),
        datasets: [
          {
            label: 'Messages',
            data: trends.map(day => day.messages || 0),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Calls',
            data: trends.map(day => day.calls || 0),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Video Calls',
            data: trends.map(day => day.video_calls || 0),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#9ca3af'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#9ca3af'
            }
          }
        }
      }
    });
  }

  renderActivityHeatmap() {
    if (!this.analyticsData.heatmap?.data) return;

    const heatmapContainer = this.container.querySelector('#activityHeatmap');
    const data = this.analyticsData.heatmap.data;
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({length: 24}, (_, i) => i);

    // Find max value for normalization
    let maxValue = 0;
    Object.values(data).forEach(day => {
      Object.values(day).forEach(hourData => {
        maxValue = Math.max(maxValue, hourData.interaction_count || 0);
      });
    });

    heatmapContainer.innerHTML = `
      <div class="heatmap-grid">
        <div class="heatmap-hours">
          ${hours.map(hour => `
            <div class="hour-label">${hour === 0 ? '12 AM' : hour <= 12 ? hour + ' AM' : (hour - 12) + ' PM'}</div>
          `).join('')}
        </div>
        <div class="heatmap-days">
          ${days.map((day, dayIndex) => `
            <div class="day-column">
              <div class="day-label">${day}</div>
              <div class="day-cells">
                ${hours.map(hour => {
                  const cellData = data[dayIndex]?.[hour] || { interaction_count: 0 };
                  const intensity = maxValue > 0 ? cellData.interaction_count / maxValue : 0;
                  const className = this.getHeatmapCellClass(intensity);
                  return `
                    <div class="heatmap-cell ${className}" 
                         title="${day} ${hour}:00 - ${cellData.interaction_count} interactions"
                         data-intensity="${intensity}">
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="heatmap-legend">
        <span>Less</span>
        <div class="legend-scale">
          <div class="legend-cell intensity-0"></div>
          <div class="legend-cell intensity-1"></div>
          <div class="legend-cell intensity-2"></div>
          <div class="legend-cell intensity-3"></div>
          <div class="legend-cell intensity-4"></div>
        </div>
        <span>More</span>
      </div>
    `;
  }

  renderFriendEngagement() {
    if (!this.analyticsData.engagement?.data) return;

    const engagementList = this.container.querySelector('#friendEngagementList');
    const friends = this.analyticsData.engagement.data;

    if (friends.length === 0) {
      engagementList.innerHTML = `
        <div class="no-engagement-data">
          <div class="no-data-icon">
            <i class="icon-users"></i>
          </div>
          <h4>No Engagement Data</h4>
          <p>Start interacting with friends to see engagement analytics</p>
        </div>
      `;
      return;
    }

    engagementList.innerHTML = friends.map((friend, index) => `
      <div class="engagement-item" data-rank="${index + 1}">
        <div class="engagement-rank">#${index + 1}</div>
        <div class="friend-avatar">
          <img src="${friend.profile_picture_url || '/images/default-avatar.png'}" 
               alt="${this.escapeHtml(friend.full_name)}">
          <div class="status-indicator ${friend.status || 'offline'}"></div>
        </div>
        <div class="engagement-info">
          <h4>${this.escapeHtml(friend.full_name)}</h4>
          <p>@${this.escapeHtml(friend.username)}</p>
        </div>
        <div class="engagement-stats">
          <div class="stat">
            <span class="stat-value">${friend.total_interactions || 0}</span>
            <span class="stat-label">Interactions</span>
          </div>
          <div class="stat">
            <span class="stat-value">${Math.round((friend.friendship_strength || 0) * 100)}%</span>
            <span class="stat-label">Strength</span>
          </div>
        </div>
        <div class="engagement-strength">
          <div class="strength-bar">
            <div class="strength-fill" style="width: ${(friend.friendship_strength || 0) * 100}%"></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  renderSocialInsights() {
    if (!this.analyticsData.insights?.data) return;

    const insightsContainer = this.container.querySelector('#socialInsights');
    const insights = this.analyticsData.insights.data;

    if (!insights.insights || insights.insights.length === 0) {
      insightsContainer.innerHTML = `
        <div class="no-insights">
          <div class="no-insights-icon">
            <i class="icon-lightbulb"></i>
          </div>
          <h4>Generating Insights</h4>
          <p>We're analyzing your social patterns to provide personalized insights</p>
        </div>
      `;
      return;
    }

    insightsContainer.innerHTML = `
      <div class="insights-grid">
        ${insights.insights.map(insight => `
          <div class="insight-card ${insight.type}">
            <div class="insight-icon">
              <i class="icon-${this.getInsightIcon(insight.type)}"></i>
            </div>
            <div class="insight-content">
              <h4>${insight.title}</h4>
              <p>${insight.message}</p>
              ${insight.action ? `
                <button class="insight-action-btn" data-action="${insight.action}">
                  ${insight.action_text || 'Take Action'}
                </button>
              ` : ''}
            </div>
            <div class="insight-priority ${insight.priority}">
              ${insight.priority}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Attach action button listeners
    insightsContainer.querySelectorAll('.insight-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleInsightAction(btn.dataset.action);
      });
    });
  }

  renderWeeklySummary() {
    if (!this.analyticsData.weekly?.data) return;

    const summaryContainer = this.container.querySelector('#weeklySummary');
    const weeks = this.analyticsData.weekly.data;

    if (weeks.length === 0) {
      summaryContainer.innerHTML = `
        <div class="no-weekly-data">
          <div class="no-data-icon">
            <i class="icon-calendar"></i>
          </div>
          <h4>No Weekly Data</h4>
          <p>Weekly summaries will appear as you interact with friends</p>
        </div>
      `;
      return;
    }

    summaryContainer.innerHTML = `
      <div class="weekly-timeline">
        ${weeks.map(week => `
          <div class="week-card">
            <div class="week-header">
              <h4>Week of ${this.formatDate(week.week_start)}</h4>
              <span class="week-total">${week.total_interactions || 0} interactions</span>
            </div>
            <div class="week-stats">
              <div class="week-stat">
                <span class="stat-icon">💬</span>
                <span class="stat-value">${week.total_messages || 0}</span>
                <span class="stat-label">Messages</span>
              </div>
              <div class="week-stat">
                <span class="stat-icon">📞</span>
                <span class="stat-value">${week.total_calls || 0}</span>
                <span class="stat-label">Calls</span>
              </div>
              <div class="week-stat">
                <span class="stat-icon">🎥</span>
                <span class="stat-value">${week.total_video_calls || 0}</span>
                <span class="stat-label">Video</span>
              </div>
              <div class="week-stat">
                <span class="stat-icon">👥</span>
                <span class="stat-value">${week.unique_friends || 0}</span>
                <span class="stat-label">Friends</span>
              </div>
            </div>
            <div class="week-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(100, (week.total_interactions / 50) * 100)}%"></div>
              </div>
              <span class="progress-label">${Math.round((week.total_interactions / 50) * 100)}% of target</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderConversationHealth() {
    if (!this.analyticsData.conversations?.data) return;

    const healthContainer = this.container.querySelector('#conversationHealth');
    const health = this.analyticsData.conversations.data;

    const healthStatus = this.getHealthStatus(health.health_status);

    healthContainer.innerHTML = `
      <div class="health-overview-card ${health.health_status}">
        <div class="health-icon">
          <i class="icon-${healthStatus.icon}"></i>
        </div>
        <div class="health-content">
          <h3>Conversation Health: ${healthStatus.label}</h3>
          <p>${healthStatus.description}</p>
        </div>
      </div>

      <div class="health-stats-grid">
        <div class="health-stat-card">
          <div class="stat-icon">💬</div>
          <div class="stat-content">
            <h4>${health.total_conversations || 0}</h4>
            <p>Total Conversations</p>
          </div>
        </div>

        <div class="health-stat-card">
          <div class="stat-icon">📬</div>
          <div class="stat-content">
            <h4>${health.total_unread_messages || 0}</h4>
            <p>Unread Messages</p>
          </div>
        </div>

        <div class="health-stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <h4>${health.priority_conversations || 0}</h4>
            <p>Priority Conversations</p>
          </div>
        </div>

        <div class="health-stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-content">
            <h4>${health.active_today || 0}</h4>
            <p>Active Today</p>
          </div>
        </div>

        <div class="health-stat-card">
          <div class="stat-icon">📆</div>
          <div class="stat-content">
            <h4>${health.active_this_week || 0}</h4>
            <p>Active This Week</p>
          </div>
        </div>

        <div class="health-stat-card">
          <div class="stat-icon">😴</div>
          <div class="stat-content">
            <h4>${health.inactive_conversations || 0}</h4>
            <p>Inactive Conversations</p>
          </div>
        </div>
      </div>
    `;
  }

  async refreshAnalytics() {
    try {
      // Refresh analytics cache on the server
      await fetch('/api/social-analytics/refresh-cache', {
        method: 'POST',
        credentials: 'include'
      });

      // Reload analytics data
      await this.loadAnalytics();
      this.showSuccess('Analytics refreshed successfully');
      
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      this.showError('Failed to refresh analytics');
    }
  }

  showAllFriendsEngagement() {
    // TODO: Open modal or navigate to detailed friends engagement view
    console.log('Show all friends engagement');
  }

  handleInsightAction(action) {
    switch (action) {
      case 'create_group':
        // Open friend groups manager
        if (window.MivtonComponents.FriendGroupsManager) {
          // TODO: Integrate with friend groups manager
        }
        break;
      case 'message_friend':
        // Open messaging interface
        console.log('Open messaging interface');
        break;
      case 'set_goals':
        // Open social goals interface
        console.log('Open social goals interface');
        break;
      default:
        console.log('Unknown insight action:', action);
    }
  }

  getInsightIcon(type) {
    const iconMap = {
      'expand_network': 'user-plus',
      'increase_activity': 'trending-up',
      'organize_friends': 'folder',
      'improve_responsiveness': 'clock'
    };
    return iconMap[type] || 'lightbulb';
  }

  getHealthStatus(status) {
    const statusMap = {
      'excellent': {
        label: 'Excellent',
        description: 'Your conversations are very healthy and active!',
        icon: 'heart'
      },
      'good': {
        label: 'Good',
        description: 'Your conversation health is good with room for improvement.',
        icon: 'thumbs-up'
      },
      'fair': {
        label: 'Fair',
        description: 'Some conversations need attention to stay healthy.',
        icon: 'alert-circle'
      },
      'poor': {
        label: 'Needs Attention',
        description: 'Many conversations are inactive or have unread messages.',
        icon: 'alert-triangle'
      },
      'no_data': {
        label: 'No Data',
        description: 'Start conversations to see your conversation health.',
        icon: 'message-circle'
      }
    };
    return statusMap[status] || statusMap['no_data'];
  }

  getHeatmapCellClass(intensity) {
    if (intensity === 0) return 'intensity-0';
    if (intensity <= 0.2) return 'intensity-1';
    if (intensity <= 0.4) return 'intensity-2';
    if (intensity <= 0.7) return 'intensity-3';
    return 'intensity-4';
  }

  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  formatChange(percent) {
    if (percent == null) return '-';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  }

  getChangeClass(percent, inverse = false) {
    if (percent == null) return 'neutral';
    const positive = inverse ? percent < 0 : percent > 0;
    return positive ? 'positive' : percent === 0 ? 'neutral' : 'negative';
  }

  formatDuration(minutes) {
    if (minutes < 60) return Math.round(minutes) + 'm';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }

  formatChartDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  setLoading(loading) {
    this.isLoading = loading;
    // Update loading states in UI
    if (loading) {
      this.container.querySelector('#refreshAnalytics').innerHTML = '<i class="icon-loading spin"></i> Loading...';
    } else {
      this.container.querySelector('#refreshAnalytics').innerHTML = '<i class="icon-refresh"></i> Refresh';
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

// Initialize Chart.js if not already loaded
if (typeof Chart === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  document.head.appendChild(script);
}

// Initialize and export
window.MivtonComponents = window.MivtonComponents || {};
window.MivtonComponents.SocialAnalytics = SocialAnalytics;
