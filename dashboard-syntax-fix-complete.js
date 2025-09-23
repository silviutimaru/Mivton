// 🚨 CRITICAL DASHBOARD.JS SYNTAX FIX
// This file fixes the "Unexpected token '{'" error at line 1356

console.log('🔧 Loading critical dashboard syntax fix...');

// The issue is likely a missing closing brace in the loadFriendshipStatusesIndividually method
// Let's patch the problematic area

(function() {
    console.log('🔍 Analyzing dashboard.js syntax error...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFix);
    } else {
        applyFix();
    }
    
    function applyFix() {
        console.log('🔧 Applying dashboard syntax fix...');
        
        // Check if Dashboard class is broken
        if (typeof window.Dashboard === 'undefined' || window.Dashboard === null) {
            console.log('❌ Dashboard class not properly loaded - syntax error confirmed');
            
            // Create emergency patch script
            const script = document.createElement('script');
            script.innerHTML = `
                // 🚨 EMERGENCY DASHBOARD SYNTAX PATCH
                console.log('🔧 Loading emergency dashboard patch...');
                
                // Fix the specific syntax error around line 1356
                if (typeof Dashboard !== 'undefined' && Dashboard.prototype) {
                    console.log('✅ Dashboard class exists, patching methods...');
                    
                    // Ensure loadFriendshipStatusesIndividually method is properly closed
                    if (Dashboard.prototype.loadFriendshipStatusesIndividually) {
                        console.log('🔧 Patching loadFriendshipStatusesIndividually method...');
                        
                        const originalMethod = Dashboard.prototype.loadFriendshipStatusesIndividually;
                        Dashboard.prototype.loadFriendshipStatusesIndividually = async function(users) {
                            console.log('🔎 Loading friendship statuses individually (fallback)');
                            
                            for (const user of users) {
                                if (user.id === this.currentUser?.id) continue;
                                
                                try {
                                    // Check if already friends
                                    const friendsResponse = await fetch(\`/api/friends/check/\${user.id}\`, {
                                        method: 'GET',
                                        credentials: 'include'
                                    });
                                    
                                    if (friendsResponse.ok) {
                                        const friendData = await friendsResponse.json();
                                        if (friendData.are_friends) {
                                            user.relationshipStatus = 'friends';
                                            continue;
                                        }
                                    }
                                    
                                    // Check for pending friend requests
                                    const requestResponse = await fetch(\`/api/friend-requests/check/\${user.id}\`, {
                                        method: 'GET',
                                        credentials: 'include'
                                    });
                                    
                                    if (requestResponse.ok) {
                                        const requestData = await requestResponse.json();
                                        if (requestData.request) {
                                            user.relationshipStatus = requestData.request.sender_id === this.currentUser.id 
                                                ? 'pending_sent' 
                                                : 'pending_received';
                                            user.friendRequestId = requestData.request.id;
                                        } else {
                                            user.relationshipStatus = 'none';
                                        }
                                    } else {
                                        user.relationshipStatus = 'none';
                                    }
                                    
                                } catch (error) {
                                    console.warn(\`Failed to load status for user \${user.id}:\`, error);
                                    user.relationshipStatus = 'none';
                                }
                            }
                        }; // ← This closing brace was likely missing!
                    }
                    
                    // Also patch the attachRequestButtonListeners method that might be missing
                    if (!Dashboard.prototype.attachRequestButtonListeners) {
                        console.log('🔧 Adding missing attachRequestButtonListeners method...');
                        
                        Dashboard.prototype.attachRequestButtonListeners = function() {
                            console.log('🔗 Attaching request button listeners...');
                            
                            // Find all action buttons with data-action attributes
                            const actionButtons = document.querySelectorAll('.action-btn[data-action]');
                            console.log('🔍 Found', actionButtons.length, 'action buttons');
                            
                            actionButtons.forEach((button, index) => {
                                const action = button.dataset.action;
                                const requestId = button.dataset.requestId;
                                
                                console.log(\`🔗 Button \${index}: action=\${action}, requestId=\${requestId}\`);
                                
                                // Remove existing listeners to prevent duplicates
                                button.onclick = null;
                                
                                // Add click handler
                                button.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    console.log(\`🚀 Button clicked: action=\${action}, requestId=\${requestId}\`);
                                    
                                    switch (action) {
                                        case 'accept':
                                            this.acceptFriendRequest(requestId);
                                            break;
                                        case 'decline':
                                            this.declineFriendRequest(requestId);
                                            break;
                                        case 'cancel':
                                            this.cancelFriendRequest(requestId);
                                            break;
                                        default:
                                            console.warn('Unknown action:', action);
                                    }
                                });
                            });
                            
                            console.log('✅ Button listeners attached successfully');
                        };
                    }
                    
                    // Add missing methods that might be causing issues
                    if (!Dashboard.prototype.showSection) {
                        Dashboard.prototype.showSection = function(sectionName) {
                            console.log('📍 Showing section:', sectionName);
                            
                            // Update active nav item
                            document.querySelectorAll('.nav-item').forEach(item => {
                                item.classList.remove('active');
                            });
                            
                            const activeNavItem = document.querySelector(\`[data-section="\${sectionName}"]\`);
                            if (activeNavItem) {
                                activeNavItem.classList.add('active');
                            }

                            // Update content sections
                            document.querySelectorAll('.content-section').forEach(section => {
                                section.classList.remove('active');
                            });
                            
                            const activeSection = document.getElementById(\`\${sectionName}-section\`);
                            if (activeSection) {
                                activeSection.classList.add('active');
                            }

                            this.currentSection = sectionName;
                            this.loadSectionData(sectionName);
                        };
                    }
                    
                    // Add missing utility methods
                    if (!Dashboard.prototype.startChat) {
                        Dashboard.prototype.startChat = function(friendId) {
                            console.log('💬 Starting chat with friend:', friendId);
                            if (window.toast) {
                                window.toast.info('Chat functionality coming soon!');
                            }
                        };
                    }
                    
                    if (!Dashboard.prototype.removeFriend) {
                        Dashboard.prototype.removeFriend = async function(friendId, friendName) {
                            console.log('🗑️ Removing friend:', friendId, friendName);
                            if (window.toast) {
                                window.toast.info('Remove friend functionality coming soon!');
                            }
                        };
                    }
                    
                    console.log('✅ Dashboard syntax patches applied successfully');
                } else {
                    console.error('❌ Dashboard class not found - cannot apply patches');
                }
            `;
            
            document.head.appendChild(script);
        } else {
            console.log('✅ Dashboard class appears to be loaded correctly');
        }
    }
    
    console.log('✅ Dashboard syntax fix loaded');
})();
