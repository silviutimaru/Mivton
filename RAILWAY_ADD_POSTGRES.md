# Add PostgreSQL to Railway - Step by Step

## Current Problem
Your Railway project has NO PostgreSQL service, but your app expects one.

## Solution

### Step 1: Add PostgreSQL Service in Railway Dashboard

1. Go to your Railway project dashboard
2. Click **"+ New"** button (you should see it in your project)
3. Select **"Database"**
4. Click **"Add PostgreSQL"**
5. Wait for provisioning (1-2 minutes)

### Step 2: Verify DATABASE_URL

After PostgreSQL is added:
1. Click on your **Mivton** service
2. Go to **Variables** tab
3. You should see `DATABASE_URL` automatically updated to the new PostgreSQL instance
4. It should look like: `postgresql://postgres:xxxxx@postgres.railway.internal:5432/railway`

### Step 3: Initialize Database Schema

From your local terminal, run:

```bash
# This will create all the necessary tables in your new PostgreSQL database
railway run npm run init:db
railway run npm run init:friends  
railway run npm run init:realtime
railway run npm run init:advanced-social
```

### Step 4: Redeploy Your App

```bash
railway up
```

### Step 5: Test Login

1. Go to https://www.mivton.com/login
2. Try logging in
3. Check diagnostic: https://www.mivton.com/api/debug/database

## About Your Data

**If this is a fresh setup:** No data loss - you're starting fresh.

**If you had users before:** The old data might be in a deleted PostgreSQL service. 
- Contact Railway support to see if they can recover the old database
- Or restore from a backup if you have one
