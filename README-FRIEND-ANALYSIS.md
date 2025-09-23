# 🔍 Mivton Database Friend Analysis Scripts

## Quick Start

To analyze your friend relationships in the Mivton database, run either of these scripts:

### Option 1: Quick Summary
```bash
node quick-friends-check.js
```
This gives you a quick overview of:
- Total users
- Number of friendships (active/total)
- Who is friends with whom
- Pending friend requests
- Blocked users

### Option 2: Detailed Analysis
```bash
node analyze-friendships.js
```
This provides comprehensive analysis including:
- All users with details
- Complete friendship relationships
- Friend request history with messages
- Blocked user relationships
- Friendship network visualization
- Statistics and summaries

## What These Scripts Do

Both scripts connect to your Railway PostgreSQL database using the credentials from your `.env` file and scan the following tables:

- **users** - All registered users
- **friendships** - Active friend connections (user1_id ↔ user2_id)
- **friend_requests** - Pending, accepted, and declined friend requests
- **blocked_users** - Users who have blocked each other
- **friend_groups** - Custom friend groupings (if exists)
- **social_interactions** - Friend activity tracking (if exists)

## Understanding the Output

### Friendship Relationships
The scripts will show you exactly who is friends with whom in this format:
```
John Doe (@john_doe)
🤝 is friends with
Jane Smith (@jane_smith)
📊 Status: active
📅 Friends since: 1/15/2025
```

### Friend Requests
Shows pending and historical friend requests:
```
Alice Brown (@alice_brown)
➡️ sent request to
Bob Wilson (@bob_wilson)
📊 Status: PENDING
💬 Message: "Hi! Let's be friends!"
📅 Sent: 1/20/2025
```

### Network Summary
Shows each user and their complete friend list:
```
John Doe (@john_doe) is friends with:
  • Jane Smith
  • Alice Brown
  • Bob Wilson
```

## Requirements

- Node.js installed
- PostgreSQL client (pg) package installed
- Valid `.env` file with DATABASE_URL

## Database Schema

Your Mivton app uses a sophisticated friends system with:

1. **Ordered Friendships**: Friendships are stored with user1_id < user2_id to prevent duplicates
2. **Status Tracking**: Each friendship has a status (active/inactive)
3. **Request Workflow**: Complete friend request lifecycle (pending → accepted/declined)
4. **Privacy Controls**: Blocking system and privacy settings
5. **Real-time Features**: Socket connections and presence tracking
6. **Analytics**: Interaction tracking and social analytics

## Troubleshooting

If you get connection errors:
1. Check your `.env` file has the correct DATABASE_URL
2. Ensure your Railway database is running
3. Verify network connectivity to Railway

If tables are missing:
1. Run the database initialization scripts in the `/database` folder
2. Check if the friends system has been fully deployed
