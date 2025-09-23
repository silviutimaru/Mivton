// Simplified friendship status loading for dashboard.js

// Replace the existing loadFriendshipStatuses method with this:
async loadFriendshipStatuses(users) {
    try {
        console.log('🔎 Loading friendship statuses for', users.length, 'users');
        
        // Filter out current user
        const otherUsers = users.filter(user => {
            const currentUserId = this.currentUser?.id;
            return !(currentUserId && (user.id === currentUserId || parseInt(user.id) === parseInt(currentUserId)));
        });
        
        if (otherUsers.length === 0) {
            console.log('🔎 No other users to check friendship status for');
            return;
        }
        
        console.log('🔎 Checking friendship status for', otherUsers.length, 'users (excluding self)');
        
        // Load current user's friends list and friend requests once
        await this.loadCurrentUserRelationships();
        
        // Match users against known relationships
        otherUsers.forEach(user => {
            user.relationshipStatus = this.determineRelationshipStatus(user.id);
            console.log(`🔍 User ${user.username} (${user.id}): ${user.relationshipStatus}`);
        });
        
        console.log('✅ Updated users with relationship statuses');
        
    } catch (error) {
        console.error('❌ Error loading friendship statuses:', error);
        // Set all to 'none' as fallback
        users.forEach(user => {
            if (user.id !== this.currentUser?.id) {
                user.relationshipStatus = 'none';
            }
        });
    }
}

async loadCurrentUserRelationships() {
    try {
        // Load friends list
        if (!this.currentUserFriends) {
            const friendsResponse = await fetch('/api/friends', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (friendsResponse.ok) {
                const friendsData = await friendsResponse.json();
                this.currentUserFriends = new Set(
                    (friendsData.friends || []).map(friend => parseInt(friend.id))
                );
                console.log('✅ Loaded friends:', Array.from(this.currentUserFriends));
            } else {
                this.currentUserFriends = new Set();
            }
        }
        
        // Load sent friend requests
        if (!this.currentUserSentRequests) {
            const sentResponse = await fetch('/api/friend-requests/sent', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (sentResponse.ok) {
                const sentData = await sentResponse.json();
                this.currentUserSentRequests = new Set(
                    (sentData.requests || []).map(req => parseInt(req.receiver_id))
                );
                console.log('✅ Loaded sent requests:', Array.from(this.currentUserSentRequests));
            } else {
                this.currentUserSentRequests = new Set();
            }
        }
        
        // Load received friend requests
        if (!this.currentUserReceivedRequests) {
            const receivedResponse = await fetch('/api/friend-requests/received', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (receivedResponse.ok) {
                const receivedData = await receivedResponse.json();
                this.currentUserReceivedRequests = new Set(
                    (receivedData.requests || []).map(req => parseInt(req.sender_id))
                );
                console.log('✅ Loaded received requests:', Array.from(this.currentUserReceivedRequests));
            } else {
                this.currentUserReceivedRequests = new Set();
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading current user relationships:', error);
        this.currentUserFriends = new Set();
        this.currentUserSentRequests = new Set();
        this.currentUserReceivedRequests = new Set();
    }
}

determineRelationshipStatus(userId) {
    const userIdInt = parseInt(userId);
    
    if (this.currentUserFriends?.has(userIdInt)) {
        return 'friends';
    }
    
    if (this.currentUserSentRequests?.has(userIdInt)) {
        return 'pending_sent';
    }
    
    if (this.currentUserReceivedRequests?.has(userIdInt)) {
        return 'pending_received';
    }
    
    return 'none';
}

// Instructions:
// 1. Copy the above methods and replace the existing loadFriendshipStatuses method in your dashboard.js
// 2. Add the loadCurrentUserRelationships and determineRelationshipStatus methods to your Dashboard class
// 3. Clear the friendship cache when needed by setting these to null:
//    - this.currentUserFriends = null;
//    - this.currentUserSentRequests = null;
//    - this.currentUserReceivedRequests = null;
// 4. This should be done when accepting/declining friend requests or sending new ones
