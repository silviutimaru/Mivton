/**
 * 🚀 MIVTON PHASE 3.1 - FRIEND REQUESTS MANAGER
 * Enterprise-grade friend request system with real-time updates
 * 
 * Features:
 * - Send friend requests with messages
 * - Accept/decline incoming requests
 * - View sent requests with status
 * - Cancel sent requests
 * - Mobile-responsive design
 * - Integration with Phase 2.3 components
 */

class MivtonFriendRequests extends MivtonBaseComponent {
    constructor(element, options = {}) {
        super(element, options);
        
        this.options = {
            pageSize: 10,
            refreshInterval: 60000, // 1 minute
            ...options
        };

        this.state = {
            receivedRequests: [],
            sentRequests: [],
            activeTab: 'received',
            loading: false,
            error: null,
            stats: {
                received: { pending: 0 },
                sent: { pending: 0 }
            }
        };

        this.refreshTimer = null;
        this.targetUser = null;

        this.initialize();
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Friend Requests Manager...');
            
            this.createRequestsInterface();
            this.bindEvents();
            await this.loadRequests();
            this.startAutoRefresh();

            console.log('✅ Friend Requests Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Friend Requests Manager:', error);
            this.showError('Failed to initialize friend requests');
        }
    }

    createRequestsInterface() {
        this.element.innerHTML = `
            <div class="friend-requests-manager" data-component="friend-requests">
                <!-- Header -->
                <div class="requests-header">
                    <h2>
                        <i class="fas fa-inbox"></i>
                        Friend Requests
                    </h2>
                    
                    <div class="requests-actions">
                        <button class="btn btn-primary" data-action="find-friends">
                            <i class="fas fa-search"></i>
                            Find Friends
                        </button>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="requests-tabs">
                    <button class="tab-btn active" data-tab="received">
                        <i class="fas fa-inbox"></i>
                        Received
                        <span class="tab-badge" data-received-count="0" style="display: none;">0</span>
                    </button>
                    
                    <button class="tab-btn" data-tab="sent">
                        <i class="fas fa-paper-plane"></i>
                        Sent
                        <span class="tab-badge" data-sent-count="0" style="display: none;">0</span>
                    </button>
                </div>

                <!-- Content -->
                <div class="requests-content">
                    <!-- Loading State -->
                    <div class="requests-loading" data-loading style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Loading requests...</p>
                    </div>

                    <!-- Error State -->
                    <div class="requests-error" data-error style="display: none;">
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p data-error-message>Something went wrong</p>
                            <button class="btn btn-primary" data-action="retry">Try Again</button>
                        </div>
                    </div>

                    <!-- Received Requests Tab -->
                    <div class="tab-content" data-tab-content="received">
                        <div class="requests-empty" data-received-empty style="display: none;">
                            <div class="empty-state">
                                <i class="fas fa-inbox"></i>
                                <h3>No Friend Requests</h3>
                                <p>You don't have any pending friend requests.</p>
                            </div>
                        </div>
                        
                        <div class="requests-list" data-received-list>
                            <!-- Received requests will be rendered here -->
                        </div>
                    </div>

                    <!-- Sent Requests Tab -->
                    <div class="tab-content" data-tab-content="sent" style="display: none;">
                        <div class="requests-empty" data-sent-empty style="display: none;">
                            <div class="empty-state">
                                <i class="fas fa-paper-plane"></i>
                                <h3>No Sent Requests</h3>
                                <p>You haven't sent any friend requests yet.</p>
                                <button class="btn btn-primary" data-action="find-friends">
                                    <i class="fas fa-search"></i>
                                    Find People to Add
                                </button>
                            </div>
                        </div>
                        
                        <div class="requests-list" data-sent-list>
                            <!-- Sent requests will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Send Request Modal -->
                <div class="modal" data-send-request-modal style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Send Friend Request</h3>
                            <button class="modal-close" data-close-modal>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="modal-body">
                            <div class="user-profile" data-target-user-profile>
                                <!-- Target user profile will be shown here -->
                            </div>
                            
                            <div class="request-form">
                                <label for="request-message">Message (optional)</label>
                                <textarea 
                                    id="request-message" 
                                    data-request-message
                                    placeholder="Say something nice to introduce yourself..."
                                    maxlength="500"
                                    rows="3"
                                ></textarea>
                                <div class="character-count">
                                    <span data-char-count>0</span>/500
                                </div>
                            </div>
                        </div>
                        
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-close-modal>Cancel</button>
                            <button class="btn btn-primary" data-action="send-request">
                                <i class="fas fa-paper-plane"></i>
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.element.classList.add('mivton-friend-requests');
    }

    bindEvents() {
        // Tab switching
        this.element.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('[data-tab]');
            if (tabBtn) {
                this.switchTab(tabBtn.dataset.tab);
            }
        });

        // Action buttons
        this.element.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action) {
                this.handleAction(action, e.target.closest('[data-action]'));
            }
        });

        // Modal events
        const sendModal = this.element.querySelector('[data-send-request-modal]');
        const closeModal = this.element.querySelectorAll('[data-close-modal]');
        
        closeModal.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeSendRequestModal();
            });
        });

        sendModal?.addEventListener('click', (e) => {
            if (e.target === sendModal) {
                this.closeSendRequestModal();
            }
        });

        // Message character count
        const messageTextarea = this.element.querySelector('[data-request-message]');
        const charCount = this.element.querySelector('[data-char-count]');
        
        messageTextarea?.addEventListener('input', (e) => {
            if (charCount) {
                charCount.textContent = e.target.value.length;
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        const tabBtns = this.element.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        const tabContents = this.element.querySelectorAll('[data-tab-content]');
        tabContents.forEach(content => {
            content.style.display = content.dataset.tabContent === tabName ? 'block' : 'none';
        });

        this.setState({ activeTab: tabName });
    }

    async loadRequests() {
        try {
            this.setState({ loading: true, error: null });

            // Load both received and sent requests
            const [receivedResponse, sentResponse, statsResponse] = await Promise.all([
                fetch('/api/friend-requests/received'),
                fetch('/api/friend-requests/sent'),
                fetch('/api/friend-requests/stats')
            ]);

            if (!receivedResponse.ok || !sentResponse.ok || !statsResponse.ok) {
                throw new Error('Failed to load friend requests');
            }

            const [receivedData, sentData, statsData] = await Promise.all([
                receivedResponse.json(),
                sentResponse.json(),
                statsResponse.json()
            ]);

            if (receivedData.success && sentData.success && statsData.success) {
                this.setState({
                    receivedRequests: receivedData.requests || [],
                    sentRequests: sentData.requests || [],
                    stats: statsData.stats || {},
                    loading: false
                });

                this.renderRequests();
                this.updateStats();
            } else {
                throw new Error('Failed to load friend requests data');
            }

        } catch (error) {
            console.error('❌ Error loading requests:', error);
            this.setState({ 
                loading: false, 
                error: error.message || 'Failed to load requests' 
            });
            this.showError(this.state.error);
        }
    }

    renderRequests() {
        const receivedList = this.element.querySelector('[data-received-list]');
        const sentList = this.element.querySelector('[data-sent-list]');
        const receivedEmpty = this.element.querySelector('[data-received-empty]');
        const sentEmpty = this.element.querySelector('[data-sent-empty]');
        const loadingState = this.element.querySelector('[data-loading]');
        const errorState = this.element.querySelector('[data-error]');

        // Hide states
        [receivedEmpty, sentEmpty, loadingState, errorState].forEach(el => {
            if (el) el.style.display = 'none';
        });

        if (this.state.loading) {
            if (loadingState) loadingState.style.display = 'block';
            return;
        }

        if (this.state.error) {
            if (errorState) errorState.style.display = 'block';
            return;
        }

        // Render received requests
        if (receivedList) {
            if (this.state.receivedRequests.length === 0) {
                receivedList.innerHTML = '';
                if (receivedEmpty) receivedEmpty.style.display = 'block';
            } else {
                receivedList.innerHTML = this.state.receivedRequests.map(request => 
                    this.renderReceivedRequest(request)
                ).join('');
            }
        }

        // Render sent requests
        if (sentList) {
            if (this.state.sentRequests.length === 0) {
                sentList.innerHTML = '';
                if (sentEmpty) sentEmpty.style.display = 'block';
            } else {
                sentList.innerHTML = this.state.sentRequests.map(request => 
                    this.renderSentRequest(request)
                ).join('');
            }
        }
    }

    renderReceivedRequest(request) {
        const timeAgo = this.getTimeAgo(request.created_at);
        const languageFlag = this.getLanguageFlag(request.sender_language);
        const expiresIn = this.getExpirationInfo(request.expires_at);
        
        return `
            <div class="request-card received" data-request-id="${request.id}">
                <div class="request-avatar">
                    <i class="fas fa-user"></i>
                    <div class="status-indicator ${request.sender_online_status}"></div>
                </div>
                
                <div class="request-info">
                    <div class="request-header">
                        <h4 class="sender-name">
                            ${this.escapeHtml(request.sender_full_name)}
                            ${request.sender_verified ? '<i class="fas fa-check-circle verified"></i>' : ''}
                        </h4>
                        <span class="sender-username">@${this.escapeHtml(request.sender_username)}</span>
                    </div>
                    
                    <div class="request-meta">
                        <span class="request-time">
                            <i class="fas fa-clock"></i>
                            ${timeAgo}
                        </span>
                        
                        ${languageFlag ? `
                            <span class="sender-language">
                                ${languageFlag} ${request.sender_language}
                            </span>
                        ` : ''}
                        
                        <span class="sender-status ${request.sender_online_status}">
                            <i class="fas fa-circle"></i>
                            ${request.sender_online_status}
                        </span>
                    </div>
                    
                    ${request.message ? `
                        <div class="request-message">
                            <p>"${this.escapeHtml(request.message)}"</p>
                        </div>
                    ` : ''}
                    
                    ${expiresIn ? `
                        <div class="request-expiry">
                            <i class="fas fa-hourglass-half"></i>
                            Expires ${expiresIn}
                        </div>
                    ` : ''}
                </div>
                
                <div class="request-actions">
                    <button class="btn btn-sm btn-success" data-action="accept-request" data-request-id="${request.id}">
                        <i class="fas fa-check"></i>
                        Accept
                    </button>
                    
                    <button class="btn btn-sm btn-danger" data-action="decline-request" data-request-id="${request.id}">
                        <i class="fas fa-times"></i>
                        Decline
                    </button>
                </div>
            </div>
        `;
    }

    renderSentRequest(request) {
        const timeAgo = this.getTimeAgo(request.created_at);
        const languageFlag = this.getLanguageFlag(request.receiver_language);
        const statusInfo = this.getRequestStatusInfo(request.status);
        
        return `
            <div class="request-card sent ${request.status}" data-request-id="${request.id}">
                <div class="request-avatar">
                    <i class="fas fa-user"></i>
                    <div class="status-indicator ${request.receiver_online_status}"></div>
                </div>
                
                <div class="request-info">
                    <div class="request-header">
                        <h4 class="receiver-name">
                            ${this.escapeHtml(request.receiver_full_name)}
                            ${request.receiver_verified ? '<i class="fas fa-check-circle verified"></i>' : ''}
                        </h4>
                        <span class="receiver-username">@${this.escapeHtml(request.receiver_username)}</span>
                    </div>
                    
                    <div class="request-meta">
                        <span class="request-time">
                            <i class="fas fa-clock"></i>
                            ${timeAgo}
                        </span>
                        
                        ${languageFlag ? `
                            <span class="receiver-language">
                                ${languageFlag} ${request.receiver_language}
                            </span>
                        ` : ''}
                        
                        <span class="receiver-status ${request.receiver_online_status}">
                            <i class="fas fa-circle"></i>
                            ${request.receiver_online_status}
                        </span>
                    </div>
                    
                    <div class="request-status ${request.status}">
                        <i class="fas fa-${statusInfo.icon}"></i>
                        ${statusInfo.text}
                    </div>
                    
                    ${request.message ? `
                        <div class="request-message">
                            <p>"${this.escapeHtml(request.message)}"</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="request-actions">
                    ${request.status === 'pending' ? `
                        <button class="btn btn-sm btn-secondary" data-action="cancel-request" data-request-id="${request.id}">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getRequestStatusInfo(status) {
        const statusMap = {
            'pending': { icon: 'clock', text: 'Pending' },
            'accepted': { icon: 'check', text: 'Accepted' },
            'declined': { icon: 'times', text: 'Declined' },
            'cancelled': { icon: 'ban', text: 'Cancelled' },
            'expired': { icon: 'hourglass-end', text: 'Expired' }
        };
        return statusMap[status] || { icon: 'question', text: 'Unknown' };
    }

    getExpirationInfo(expiresAt) {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diffMs = expires - now;
        
        if (diffMs <= 0) return 'expired';
        
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffDays > 0) {
            return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `in ${Math.max(1, diffMinutes)} minute${diffMinutes > 1 ? 's' : ''}`;
        }
    }

    getLanguageFlag(language) {
        const languageFlags = {
            'English': '🇺🇸',
            'Spanish': '🇪🇸', 
            'French': '🇫🇷',
            'German': '🇩🇪',
            'Italian': '🇮🇹',
            'Portuguese': '🇵🇹',
            'Russian': '🇷🇺',
            'Chinese': '🇨🇳',
            'Japanese': '🇯🇵',
            'Korean': '🇰🇷'
        };
        return languageFlags[language] || '🌐';
    }

    updateStats() {
        const receivedCount = this.element.querySelector('[data-received-count]');
        const sentCount = this.element.querySelector('[data-sent-count]');

        if (receivedCount) {
            const count = this.state.stats.received?.pending || 0;
            receivedCount.textContent = count;
            receivedCount.style.display = count > 0 ? 'inline' : 'none';
        }

        if (sentCount) {
            const count = this.state.stats.sent?.pending || 0;
            sentCount.textContent = count;
            sentCount.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    async handleAction(action, element) {
        const requestId = element?.dataset.requestId ? parseInt(element.dataset.requestId) : null;

        switch (action) {
            case 'find-friends':
                this.findFriends();
                break;
            case 'retry':
                await this.loadRequests();
                break;
            case 'accept-request':
                if (requestId) {
                    await this.acceptRequest(requestId);
                }
                break;
            case 'decline-request':
                if (requestId) {
                    await this.declineRequest(requestId);
                }
                break;
            case 'cancel-request':
                if (requestId) {
                    await this.cancelRequest(requestId);
                }
                break;
            case 'send-request':
                await this.sendFriendRequest();
                break;
        }
    }

    async acceptRequest(requestId) {
        try {
            const request = this.state.receivedRequests.find(r => r.id === requestId);
            if (!request) return;

            const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                window.MivtonComponents.Toast?.show(
                    `You are now friends with ${request.sender_full_name}!`,
                    'success'
                );
                
                await this.loadRequests();
            } else {
                throw new Error(data.error || 'Failed to accept friend request');
            }

        } catch (error) {
            console.error('❌ Error accepting request:', error);
            window.MivtonComponents.Toast?.show(
                'Failed to accept friend request',
                'error'
            );
        }
    }

    async declineRequest(requestId) {
        try {
            const request = this.state.receivedRequests.find(r => r.id === requestId);
            if (!request) return;

            const response = await fetch(`/api/friend-requests/${requestId}/decline`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                window.MivtonComponents.Toast?.show(
                    'Friend request declined',
                    'info'
                );
                
                await this.loadRequests();
            } else {
                throw new Error(data.error || 'Failed to decline friend request');
            }

        } catch (error) {
            console.error('❌ Error declining request:', error);
            window.MivtonComponents.Toast?.show(
                'Failed to decline friend request',
                'error'
            );
        }
    }

    async cancelRequest(requestId) {
        try {
            const request = this.state.sentRequests.find(r => r.id === requestId);
            if (!request) return;

            const confirmed = await this.showConfirmDialog(
                'Cancel Request',
                `Are you sure you want to cancel your friend request to ${request.receiver_full_name}?`,
                'Cancel Request'
            );

            if (!confirmed) return;

            const response = await fetch(`/api/friend-requests/${requestId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                window.MivtonComponents.Toast?.show(
                    'Friend request cancelled',
                    'info'
                );
                
                await this.loadRequests();
            } else {
                throw new Error(data.error || 'Failed to cancel friend request');
            }

        } catch (error) {
            console.error('❌ Error cancelling request:', error);
            window.MivtonComponents.Toast?.show(
                'Failed to cancel friend request',
                'error'
            );
        }
    }

    findFriends() {
        // Navigate to user search
        window.location.href = '/dashboard?tab=user-search';
    }

    showSendRequestModal(targetUser) {
        this.targetUser = targetUser;
        
        const modal = this.element.querySelector('[data-send-request-modal]');
        const profileContainer = this.element.querySelector('[data-target-user-profile]');
        const messageTextarea = this.element.querySelector('[data-request-message]');
        const charCount = this.element.querySelector('[data-char-count]');

        // Reset form
        if (messageTextarea) messageTextarea.value = '';
        if (charCount) charCount.textContent = '0';

        // Show target user profile
        if (profileContainer) {
            profileContainer.innerHTML = `
                <div class="user-card">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-info">
                        <h4>${this.escapeHtml(targetUser.full_name)}</h4>
                        <p>@${this.escapeHtml(targetUser.username)}</p>
                    </div>
                </div>
            `;
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('modal-active');
        }
    }

    closeSendRequestModal() {
        const modal = this.element.querySelector('[data-send-request-modal]');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('modal-active');
        }
        this.targetUser = null;
    }

    async sendFriendRequest() {
        try {
            if (!this.targetUser) return;

            const messageTextarea = this.element.querySelector('[data-request-message]');
            const message = messageTextarea?.value.trim() || '';

            const response = await fetch('/api/friend-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiver_id: this.targetUser.id,
                    message: message
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.auto_accepted) {
                    window.MivtonComponents.Toast?.show(
                        data.message || 'You are now friends!',
                        'success'
                    );
                } else {
                    window.MivtonComponents.Toast?.show(
                        data.message || 'Friend request sent!',
                        'success'
                    );
                }
                
                this.closeSendRequestModal();
                await this.loadRequests();
            } else {
                throw new Error(data.error || 'Failed to send friend request');
            }

        } catch (error) {
            console.error('❌ Error sending friend request:', error);
            window.MivtonComponents.Toast?.show(
                error.message || 'Failed to send friend request',
                'error'
            );
        }
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            if (!this.state.loading) {
                this.loadRequests();
            }
        }, this.options.refreshInterval);
    }

    showError(message) {
        const errorState = this.element.querySelector('[data-error]');
        const errorMessage = this.element.querySelector('[data-error-message]');
        
        if (errorMessage) {
            errorMessage.textContent = message;
        }
        
        if (errorState) {
            errorState.style.display = 'block';
        }
    }

    async showConfirmDialog(title, message, confirmText, type = 'primary') {
        return new Promise((resolve) => {
            if (window.MivtonComponents.Modal) {
                const modal = window.MivtonComponents.Modal.create({
                    title: title,
                    content: `<p>${message}</p>`,
                    buttons: [
                        {
                            text: 'Cancel',
                            variant: 'secondary',
                            action: () => {
                                modal.close();
                                resolve(false);
                            }
                        },
                        {
                            text: confirmText,
                            variant: type,
                            action: () => {
                                modal.close();
                                resolve(true);
                            }
                        }
                    ]
                });
                modal.show();
            } else {
                resolve(confirm(`${title}\n\n${message}`));
            }
        });
    }

    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        super.destroy();
    }
}

// Register component globally
if (typeof window !== 'undefined') {
    window.MivtonComponents = window.MivtonComponents || {};
    window.MivtonComponents.FriendRequests = MivtonFriendRequests;
}

// Auto-initialize friend request managers
document.addEventListener('DOMContentLoaded', () => {
    const requestElements = document.querySelectorAll('[data-component="friend-requests"]');
    requestElements.forEach(element => {
        if (!element.mivtonComponent) {
            element.mivtonComponent = new MivtonFriendRequests(element);
        }
    });
});
