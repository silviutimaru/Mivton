/**
 * Friend Recommendations - Phase 3.3 Advanced Social Features
 * AI-powered friend suggestions with confidence scoring
 */

class FriendRecommendations extends MivtonComponents.BaseComponent {
  constructor() {
    super();
    this.recommendations = [];
    this.isLoading = false;
    this.filters = {
      reason: 'all',
      confidence: 0.0
    };
    
    this.init();
  }

  async init() {
    this.createHTML();
    this.attachEventListeners();
    await this.loadRecommendations();
    this.render();
  }

  createHTML() {
    this.container = document.createElement('div');
    this.container.className = 'friend-recommendations';
    this.container.innerHTML = `
      <div class="recommendations-header">
        <div class="header-content">
          <h2 class="section-title">
            <i class="icon-user-plus"></i>
            Friend Recommendations
          </h2>
          <div class="header-actions">
            <button class="btn btn-primary generate-btn" id="generateRecommendations">
              <i class="icon-refresh"></i>
              Generate New
            </button>
            <button class="btn btn-secondary view-stats-btn" id="viewStats">
              <i class="icon-chart-bar"></i>
              View Stats
            </button>
          </div>
        </div>

        <div class="recommendations-filters">
          <div class="filter-group">
            <label for="reasonFilter">Filter by Reason:</label>
            <select id="reasonFilter" class="filter-select">
              <option value="all">All Reasons</option>
              <option value="mutual_friends">Mutual Friends</option>
              <option value="language_match">Language Match</option>
              <option value="activity_pattern">Activity Pattern</option>
              <option value="location_proximity">Location</option>
              <option value="interest_similarity">Similar Interests</option>
              <option value="ai_generated">AI Suggested</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="confidenceFilter">Min Confidence:</label>
            <div class="confidence-slider">
              <input type="range" id="confidenceFilter" min="0" max="100" value="0" class="slider">
              <span class="confidence-value">0%</span>
            </div>
          </div>

          <div class="filter-actions">
            <button class="btn btn-secondary clear-filters-btn" id="clearFilters">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div class="recommendations-content">
        <div class="recommendations-stats" id="recommendationsStats">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="icon-users"></i>
            </div>
            <div class="stat-content">
              <h3 id="totalRecommendations">-</h3>
              <p>Total Suggestions</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="icon-star"></i>
            </div>
            <div class="stat-content">
              <h3 id="highConfidence">-</h3>
              <p>High Confidence</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="icon-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3 id="acceptedCount">-</h3>
              <p>Accepted</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="icon-clock"></i>
            </div>
            <div class="stat-content">
              <h3 id="pendingCount">-</h3>
              <p>Pending</p>
            </div>
          </div>
        </div>

        <div class="recommendations-list" id="recommendationsList">
          <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <p>Loading friend recommendations...</p>
          </div>
        </div>
      </div>

      <!-- Recommendation Details Modal -->
      <div class="modal recommendation-modal" id="recommendationModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Recommendation Details</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body" id="recommendationDetails">
            <!-- Details populated dynamically -->
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary close-details-btn">Close</button>
            <button type="button" class="btn btn-danger dismiss-recommendation-btn" id="dismissFromModal">
              Dismiss
            </button>
            <button type="button" class="btn btn-primary send-request-btn" id="sendRequestFromModal">
              Send Friend Request
            </button>
          </div>
        </div>
      </div>

      <!-- Stats Modal -->
      <div class="modal stats-modal" id="statsModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Recommendation Statistics</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body" id="statsDetails">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>Loading statistics...</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary close-stats-btn">Close</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Generate new recommendations
    this.container.querySelector('#generateRecommendations').addEventListener('click', () => {
      this.generateNewRecommendations();
    });

    // View stats
    this.container.querySelector('#viewStats').addEventListener('click', () => {
      this.openStatsModal();
    });

    // Filters
    this.container.querySelector('#reasonFilter').addEventListener('change', (e) => {
      this.filters.reason = e.target.value;
      this.applyFilters();
    });

    this.container.querySelector('#confidenceFilter').addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.filters.confidence = value / 100;
      this.container.querySelector('.confidence-value').textContent = value + '%';
      this.applyFilters();
    });

    this.container.querySelector('#clearFilters').addEventListener('click', () => {
      this.clearFilters();
    });

    // Modal close buttons
    this.container.querySelectorAll('.modal-close, .close-details-btn, .close-stats-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModals();
      });
    });

    // Modal actions
    this.container.querySelector('#dismissFromModal').addEventListener('click', () => {
      this.dismissRecommendationFromModal();
    });

    this.container.querySelector('#sendRequestFromModal').addEventListener('click', () => {
      this.sendFriendRequestFromModal();
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

  async loadRecommendations() {
    try {
      this.setLoading(true);
      
      const response = await fetch('/api/friend-recommendations', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load recommendations');
      
      const data = await response.json();
      this.recommendations = data.data || [];
      
      this.updateStats();
      this.renderRecommendations();
      
    } catch (error) {
      console.error('Error loading recommendations:', error);
      this.showError('Failed to load friend recommendations');
    } finally {
      this.setLoading(false);
    }
  }

  updateStats() {
    const total = this.recommendations.length;
    const highConfidence = this.recommendations.filter(r => r.confidence_score >= 0.7).length;
    const accepted = this.recommendations.filter(r => r.is_accepted).length;
    const pending = this.recommendations.filter(r => !r.is_dismissed && !r.is_accepted).length;

    this.container.querySelector('#totalRecommendations').textContent = total;
    this.container.querySelector('#highConfidence').textContent = highConfidence;
    this.container.querySelector('#acceptedCount').textContent = accepted;
    this.container.querySelector('#pendingCount').textContent = pending;
  }

  renderRecommendations() {
    const recommendationsList = this.container.querySelector('#recommendationsList');
    
    // Apply filters
    let filteredRecommendations = this.recommendations.filter(rec => {
      if (this.filters.reason !== 'all' && rec.recommendation_reason !== this.filters.reason) {
        return false;
      }
      if (rec.confidence_score < this.filters.confidence) {
        return false;
      }
      return !rec.is_dismissed; // Don't show dismissed recommendations
    });

    if (filteredRecommendations.length === 0) {
      recommendationsList.innerHTML = `
        <div class="no-recommendations">
          <div class="no-recommendations-icon">
            <i class="icon-user-plus"></i>
          </div>
          <h3>No Recommendations Available</h3>
          <p>We couldn't find any friend recommendations matching your criteria. Try generating new recommendations or adjusting your filters.</p>
          <button class="btn btn-primary generate-first-btn">
            <i class="icon-refresh"></i>
            Generate Recommendations
          </button>
        </div>
      `;

      recommendationsList.querySelector('.generate-first-btn').addEventListener('click', () => {
        this.generateNewRecommendations();
      });
      return;
    }

    // Sort by confidence score
    filteredRecommendations.sort((a, b) => b.confidence_score - a.confidence_score);

    recommendationsList.innerHTML = filteredRecommendations.map(recommendation => `
      <div class="recommendation-card ${this.getConfidenceClass(recommendation.confidence_score)}" 
           data-recommendation-id="${recommendation.id}">
        <div class="recommendation-header">
          <div class="user-avatar">
            <img src="${recommendation.recommended_avatar || '/images/default-avatar.png'}" 
                 alt="${this.escapeHtml(recommendation.recommended_full_name)}">
          </div>
          <div class="user-info">
            <h4>${this.escapeHtml(recommendation.recommended_full_name)}</h4>
            <p>@${this.escapeHtml(recommendation.recommended_username)}</p>
          </div>
          <div class="confidence-badge">
            <span class="confidence-score">${Math.round(recommendation.confidence_score * 100)}%</span>
            <span class="confidence-label">confidence</span>
          </div>
        </div>

        <div class="recommendation-reason">
          <div class="reason-icon">
            <i class="icon-${this.getReasonIcon(recommendation.recommendation_reason)}"></i>
          </div>
          <div class="reason-content">
            <h5>${this.getReasonTitle(recommendation.recommendation_reason)}</h5>
            <p>${this.getReasonDescription(recommendation.recommendation_reason, recommendation.reason_data)}</p>
          </div>
        </div>

        <div class="recommendation-actions">
          <button class="btn btn-secondary dismiss-btn" 
                  data-recommendation-id="${recommendation.id}">
            <i class="icon-x"></i>
            Dismiss
          </button>
          <button class="btn btn-secondary details-btn" 
                  data-recommendation-id="${recommendation.id}">
            <i class="icon-info"></i>
            Details
          </button>
          <button class="btn btn-primary accept-btn" 
                  data-recommendation-id="${recommendation.id}">
            <i class="icon-user-plus"></i>
            Send Request
          </button>
        </div>

        <div class="recommendation-meta">
          <span class="generated-time">
            Suggested ${this.getTimeAgo(recommendation.generated_at)}
          </span>
          <span class="expires-time">
            Expires ${this.getTimeAgo(recommendation.expires_at)}
          </span>
        </div>
      </div>
    `).join('');

    // Attach event listeners for recommendation actions
    this.attachRecommendationListeners();
  }

  attachRecommendationListeners() {
    // Dismiss buttons
    this.container.querySelectorAll('.dismiss-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const recommendationId = parseInt(btn.dataset.recommendationId);
        this.dismissRecommendation(recommendationId);
      });
    });

    // Details buttons
    this.container.querySelectorAll('.details-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const recommendationId = parseInt(btn.dataset.recommendationId);
        this.showRecommendationDetails(recommendationId);
      });
    });

    // Accept buttons
    this.container.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const recommendationId = parseInt(btn.dataset.recommendationId);
        this.sendFriendRequest(recommendationId);
      });
    });
  }

  async generateNewRecommendations() {
    try {
      this.setLoading(true);
      
      const response = await fetch('/api/friend-recommendations/generate', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to generate recommendations');
      
      const data = await response.json();
      
      this.showSuccess(`Generated ${data.data.count} new recommendations`);
      await this.loadRecommendations();
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
      this.showError('Failed to generate new recommendations');
    } finally {
      this.setLoading(false);
    }
  }

  async dismissRecommendation(recommendationId) {
    try {
      const response = await fetch(`/api/friend-recommendations/${recommendationId}/dismiss`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to dismiss recommendation');
      
      // Remove from UI
      const recommendationCard = this.container.querySelector(`[data-recommendation-id="${recommendationId}"]`);
      if (recommendationCard) {
        recommendationCard.remove();
      }
      
      // Update local data
      const recIndex = this.recommendations.findIndex(r => r.id === recommendationId);
      if (recIndex !== -1) {
        this.recommendations[recIndex].is_dismissed = true;
      }
      
      this.updateStats();
      this.showSuccess('Recommendation dismissed');
      
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      this.showError('Failed to dismiss recommendation');
    }
  }

  async sendFriendRequest(recommendationId) {
    try {
      const response = await fetch(`/api/friend-recommendations/${recommendationId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to send friend request');
      
      const data = await response.json();
      
      // Update the recommendation card to show success
      const recommendationCard = this.container.querySelector(`[data-recommendation-id="${recommendationId}"]`);
      if (recommendationCard) {
        recommendationCard.classList.add('accepted');
        const actions = recommendationCard.querySelector('.recommendation-actions');
        actions.innerHTML = `
          <div class="accepted-message">
            <i class="icon-check-circle"></i>
            Friend request sent!
          </div>
        `;
      }
      
      // Update local data
      const recIndex = this.recommendations.findIndex(r => r.id === recommendationId);
      if (recIndex !== -1) {
        this.recommendations[recIndex].is_accepted = true;
      }
      
      this.updateStats();
      this.showSuccess('Friend request sent successfully');
      
    } catch (error) {
      console.error('Error sending friend request:', error);
      this.showError('Failed to send friend request');
    }
  }

  showRecommendationDetails(recommendationId) {
    const recommendation = this.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) return;

    const detailsContainer = this.container.querySelector('#recommendationDetails');
    
    detailsContainer.innerHTML = `
      <div class="recommendation-details">
        <div class="details-header">
          <div class="user-avatar-large">
            <img src="${recommendation.recommended_avatar || '/images/default-avatar.png'}" 
                 alt="${this.escapeHtml(recommendation.recommended_full_name)}">
          </div>
          <div class="user-details">
            <h3>${this.escapeHtml(recommendation.recommended_full_name)}</h3>
            <p>@${this.escapeHtml(recommendation.recommended_username)}</p>
            <div class="confidence-meter">
              <div class="meter-label">Confidence Score</div>
              <div class="meter-bar">
                <div class="meter-fill ${this.getConfidenceClass(recommendation.confidence_score)}" 
                     style="width: ${recommendation.confidence_score * 100}%"></div>
              </div>
              <div class="meter-value">${Math.round(recommendation.confidence_score * 100)}%</div>
            </div>
          </div>
        </div>

        <div class="details-body">
          <div class="detail-section">
            <h4>Why We Recommended This Person</h4>
            <div class="reason-detailed">
              <div class="reason-icon-large">
                <i class="icon-${this.getReasonIcon(recommendation.recommendation_reason)}"></i>
              </div>
              <div class="reason-explanation">
                <h5>${this.getReasonTitle(recommendation.recommendation_reason)}</h5>
                <p>${this.getDetailedReasonDescription(recommendation.recommendation_reason, recommendation.reason_data)}</p>
              </div>
            </div>
          </div>

          ${recommendation.reason_data ? `
            <div class="detail-section">
              <h4>Additional Details</h4>
              <div class="reason-data">
                ${this.renderReasonData(recommendation.recommendation_reason, recommendation.reason_data)}
              </div>
            </div>
          ` : ''}

          <div class="detail-section">
            <h4>Recommendation Timeline</h4>
            <div class="timeline">
              <div class="timeline-item">
                <div class="timeline-icon">
                  <i class="icon-plus"></i>
                </div>
                <div class="timeline-content">
                  <h5>Generated</h5>
                  <p>${this.formatDate(recommendation.generated_at)}</p>
                </div>
              </div>
              <div class="timeline-item">
                <div class="timeline-icon">
                  <i class="icon-clock"></i>
                </div>
                <div class="timeline-content">
                  <h5>Expires</h5>
                  <p>${this.formatDate(recommendation.expires_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Store current recommendation for modal actions
    this.currentModalRecommendation = recommendation;
    
    this.container.querySelector('#recommendationModal').classList.add('active');
  }

  async openStatsModal() {
    try {
      const response = await fetch('/api/friend-recommendations/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to load stats');
      
      const data = await response.json();
      const stats = data.data;
      
      const statsContainer = this.container.querySelector('#statsDetails');
      
      statsContainer.innerHTML = `
        <div class="stats-overview">
          <div class="stats-grid">
            <div class="stat-item">
              <h4>${stats.total_generated || 0}</h4>
              <p>Total Generated</p>
            </div>
            <div class="stat-item">
              <h4>${stats.total_accepted || 0}</h4>
              <p>Total Accepted</p>
            </div>
            <div class="stat-item">
              <h4>${stats.total_dismissed || 0}</h4>
              <p>Total Dismissed</p>
            </div>
            <div class="stat-item">
              <h4>${Math.round((stats.acceptance_rate || 0) * 100)}%</h4>
              <p>Acceptance Rate</p>
            </div>
          </div>
        </div>

        <div class="stats-breakdown">
          <h4>Recommendation Reasons</h4>
          <div class="reason-stats">
            ${Object.entries(stats.by_reason || {}).map(([reason, count]) => `
              <div class="reason-stat">
                <div class="reason-info">
                  <i class="icon-${this.getReasonIcon(reason)}"></i>
                  <span>${this.getReasonTitle(reason)}</span>
                </div>
                <div class="reason-count">${count}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="stats-performance">
          <h4>Performance Metrics</h4>
          <div class="performance-grid">
            <div class="performance-item">
              <h5>Average Confidence</h5>
              <div class="performance-value">${Math.round((stats.avg_confidence || 0) * 100)}%</div>
            </div>
            <div class="performance-item">
              <h5>Best Performing Reason</h5>
              <div class="performance-value">${this.getReasonTitle(stats.best_reason || 'unknown')}</div>
            </div>
            <div class="performance-item">
              <h5>Success Rate</h5>
              <div class="performance-value">${Math.round((stats.success_rate || 0) * 100)}%</div>
            </div>
          </div>
        </div>
      `;
      
      this.container.querySelector('#statsModal').classList.add('active');
      
    } catch (error) {
      console.error('Error loading stats:', error);
      this.showError('Failed to load recommendation statistics');
    }
  }

  dismissRecommendationFromModal() {
    if (this.currentModalRecommendation) {
      this.dismissRecommendation(this.currentModalRecommendation.id);
      this.closeModals();
    }
  }

  sendFriendRequestFromModal() {
    if (this.currentModalRecommendation) {
      this.sendFriendRequest(this.currentModalRecommendation.id);
      this.closeModals();
    }
  }

  applyFilters() {
    this.renderRecommendations();
  }

  clearFilters() {
    this.filters = {
      reason: 'all',
      confidence: 0.0
    };
    
    this.container.querySelector('#reasonFilter').value = 'all';
    this.container.querySelector('#confidenceFilter').value = '0';
    this.container.querySelector('.confidence-value').textContent = '0%';
    
    this.renderRecommendations();
  }

  closeModals() {
    this.container.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
    this.currentModalRecommendation = null;
  }

  getReasonIcon(reason) {
    const iconMap = {
      'mutual_friends': 'users',
      'language_match': 'globe',
      'activity_pattern': 'activity',
      'location_proximity': 'map-pin',
      'interest_similarity': 'heart',
      'ai_generated': 'cpu'
    };
    return iconMap[reason] || 'user-plus';
  }

  getReasonTitle(reason) {
    const titleMap = {
      'mutual_friends': 'Mutual Friends',
      'language_match': 'Language Match',
      'activity_pattern': 'Activity Pattern',
      'location_proximity': 'Location',
      'interest_similarity': 'Similar Interests',
      'ai_generated': 'AI Suggested'
    };
    return titleMap[reason] || 'Unknown';
  }

  getReasonDescription(reason, reasonData) {
    switch (reason) {
      case 'mutual_friends':
        const mutualCount = reasonData?.mutual_count || 0;
        return `You have ${mutualCount} mutual friend${mutualCount !== 1 ? 's' : ''}`;
      case 'language_match':
        const languages = reasonData?.common_languages || [];
        return `Shares ${languages.length} language${languages.length !== 1 ? 's' : ''} with you`;
      case 'activity_pattern':
        return 'Similar activity patterns and online times';
      case 'location_proximity':
        return 'Located in your area or region';
      case 'interest_similarity':
        return 'Similar interests and preferences';
      case 'ai_generated':
        return 'AI-powered compatibility match';
      default:
        return 'Recommended based on compatibility';
    }
  }

  getDetailedReasonDescription(reason, reasonData) {
    switch (reason) {
      case 'mutual_friends':
        const mutualCount = reasonData?.mutual_count || 0;
        const mutualNames = reasonData?.mutual_friends?.slice(0, 3) || [];
        let description = `You share ${mutualCount} mutual friend${mutualCount !== 1 ? 's' : ''} with this person.`;
        if (mutualNames.length > 0) {
          description += ` Including ${mutualNames.join(', ')}`;
          if (mutualCount > mutualNames.length) {
            description += ` and ${mutualCount - mutualNames.length} other${mutualCount - mutualNames.length !== 1 ? 's' : ''}`;
          }
        }
        return description;
      case 'language_match':
        const languages = reasonData?.common_languages || [];
        return `You both speak ${languages.join(', ')}. This makes communication easier and suggests cultural compatibility.`;
      case 'activity_pattern':
        return 'This person has similar online activity patterns to you, suggesting you might be active at the same times and have compatible schedules.';
      case 'location_proximity':
        const location = reasonData?.location || 'your area';
        return `This person is located in ${location}, making it possible to meet in person and share local experiences.`;
      case 'interest_similarity':
        const interests = reasonData?.common_interests || [];
        if (interests.length > 0) {
          return `You share interests in ${interests.join(', ')}, providing great conversation starters and shared activities.`;
        }
        return 'Based on your profiles, you have similar interests and preferences.';
      case 'ai_generated':
        return 'Our AI algorithm has identified this person as a highly compatible potential friend based on multiple factors including personality, interests, and social patterns.';
      default:
        return 'This recommendation is based on compatibility analysis of your profiles and social patterns.';
    }
  }

  renderReasonData(reason, reasonData) {
    if (!reasonData) return '';

    switch (reason) {
      case 'mutual_friends':
        const friends = reasonData.mutual_friends || [];
        if (friends.length === 0) return '';
        return `
          <div class="mutual-friends-list">
            <h6>Mutual Friends:</h6>
            <div class="friends-avatars">
              ${friends.slice(0, 5).map(friend => `
                <div class="friend-avatar-small" title="${friend}">
                  <img src="/images/default-avatar.png" alt="${friend}">
                </div>
              `).join('')}
              ${friends.length > 5 ? `<span class="more-count">+${friends.length - 5}</span>` : ''}
            </div>
          </div>
        `;
      case 'language_match':
        const languages = reasonData.common_languages || [];
        return `
          <div class="common-languages">
            <h6>Shared Languages:</h6>
            <div class="language-tags">
              ${languages.map(lang => `<span class="language-tag">${lang}</span>`).join('')}
            </div>
          </div>
        `;
      case 'interest_similarity':
        const interests = reasonData.common_interests || [];
        return `
          <div class="common-interests">
            <h6>Shared Interests:</h6>
            <div class="interest-tags">
              ${interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('')}
            </div>
          </div>
        `;
      default:
        return '';
    }
  }

  getConfidenceClass(score) {
    if (score >= 0.8) return 'high-confidence';
    if (score >= 0.6) return 'medium-confidence';
    if (score >= 0.4) return 'low-confidence';
    return 'very-low-confidence';
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

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  setLoading(loading) {
    this.isLoading = loading;
    const generateBtn = this.container.querySelector('#generateRecommendations');
    if (loading) {
      generateBtn.innerHTML = '<i class="icon-loading spin"></i> Generating...';
      generateBtn.disabled = true;
    } else {
      generateBtn.innerHTML = '<i class="icon-refresh"></i> Generate New';
      generateBtn.disabled = false;
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
window.MivtonComponents.FriendRecommendations = FriendRecommendations;
