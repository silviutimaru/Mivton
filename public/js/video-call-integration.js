/**
 * 🎥 VIDEO CALL INTEGRATION FOR FRIENDS LIST
 * Adds video call buttons to friends in the friends manager
 */

(function() {
    let isProcessing = false;
    let processedFriends = new Set();

    // Wait for the video call manager and friends system to be ready
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.mivtonVideoCallManager && window.socket?.connected) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);

            // Max wait time: 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    }

    async function initializeVideoCallIntegration() {
        await waitForDependencies();

        console.log('🎥 Initializing video call integration...');

        // Debounced observer to prevent infinite loops
        let observerTimeout;
        const observer = new MutationObserver(() => {
            clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                if (!isProcessing) {
                    addVideoCallButtonsToFriends();
                }
            }, 500); // Wait 500ms after mutations stop before processing
        });

        // Start observing the friends container
        const friendsContainer = document.querySelector('[data-component="friends-manager"]') || 
                               document.getElementById('friendsManager');
        
        if (friendsContainer) {
            observer.observe(friendsContainer, {
                childList: true,
                subtree: true,
                characterData: false,
                attributes: false // Don't trigger on attribute changes
            });
            console.log('✅ Watching for friends list updates');
        }

        // Also add buttons to existing friends
        addVideoCallButtonsToFriends();
    }

    function addVideoCallButtonsToFriends() {
        if (isProcessing) {
            return; // Prevent concurrent processing
        }

        isProcessing = true;

        try {
            // Find all friend items
            const friendItems = document.querySelectorAll('[data-friend-id], .friend-item, .friend-card');

            friendItems.forEach(friendItem => {
                // Skip if already has video call button
                if (friendItem.querySelector('.video-call-trigger')) {
                    return;
                }

                // Get friend info from various possible selectors
                let friendId = friendItem.dataset.friendId ||
                             friendItem.dataset.userId ||
                             friendItem.querySelector('[data-friend-id]')?.dataset.friendId;

                // Create a unique identifier to prevent duplicate processing
                if (!friendId) {
                    // Try to extract ID from other sources
                    const userLink = friendItem.querySelector('[href*="/profile/"], [data-user-id]');
                    if (userLink) {
                        friendId = userLink.dataset.userId || 
                                  userLink.href.split('/').pop();
                    }
                }

                // Skip if we already processed this friend recently
                if (!friendId || processedFriends.has(`button-${friendId}`)) {
                    return;
                }

                let friendName = friendItem.dataset.friendName ||
                               friendItem.querySelector('.friend-name')?.textContent ||
                               friendItem.querySelector('h3')?.textContent ||
                               'Friend';

                let friendAvatar = friendItem.dataset.friendAvatar ||
                                 friendItem.dataset.avatar ||
                                 friendItem.querySelector('img')?.src ||
                                 '/images/default-avatar.svg';

                if (friendId) {
                    // Create video call button
                    const videoCallBtn = document.createElement('button');
                    videoCallBtn.className = 'video-call-trigger';
                    videoCallBtn.dataset.friendId = friendId;
                    videoCallBtn.dataset.friendName = friendName;
                    videoCallBtn.dataset.friendAvatar = friendAvatar;
                    videoCallBtn.title = `Call ${friendName}`;
                    videoCallBtn.innerHTML = `
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z"/>
                        </svg>
                    `;

                    // Style the button
                    videoCallBtn.style.cssText = `
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                        width: 40px;
                        height: 40px;
                        min-width: 40px;
                        min-height: 40px;
                    `;

                    videoCallBtn.addEventListener('mouseenter', () => {
                        videoCallBtn.style.transform = 'scale(1.1)';
                        videoCallBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    });

                    videoCallBtn.addEventListener('mouseleave', () => {
                        videoCallBtn.style.transform = 'scale(1)';
                        videoCallBtn.style.boxShadow = 'none';
                    });

                    // Find where to insert the button
                    const actionsBtns = friendItem.querySelector('.friend-actions, .friend-buttons, .actions');
                    if (actionsBtns) {
                        actionsBtns.insertBefore(videoCallBtn, actionsBtns.firstChild);
                    } else {
                        // Insert at the end of the friend item
                        friendItem.appendChild(videoCallBtn);
                    }

                    // Mark this friend as processed
                    processedFriends.add(`button-${friendId}`);

                    console.log(`✅ Added video call button for friend: ${friendName} (${friendId})`);
                }
            });

        } finally {
            isProcessing = false;
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeVideoCallIntegration);
    } else {
        initializeVideoCallIntegration();
    }

    console.log('✅ Video call integration script loaded');
})();
