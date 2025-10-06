# Quick Fix: Railway Database Connection

## The Issue
Login fails with 500 error because the app can't connect to PostgreSQL.

## Immediate Steps

### 1. Check PostgreSQL Service Status
1. Go to Railway Dashboard → Your Project
2. Look for "PostgreSQL" service
3. Status should be "Active" (green)
4. If missing or stopped, add/restart it

### 2. Verify DATABASE_URL
1. Railway Dashboard → Your App Service → Variables
2. Confirm `DATABASE_URL` exists and starts with `postgresql://`
3. If missing, your PostgreSQL service isn't linked

### 3. Deploy These Fixes
```bash
git add .
git commit -m "Add database error logging and diagnostic endpoint"
git push
```

### 4. Check Diagnostic Endpoint
After deployment, visit:
```
https://www.mivton.com/api/debug/database
```

Look for:
- `DATABASE_URL_EXISTS: true`
- `connection.status: "connected"`
- `usersTableExists: true`

### 5. Check Railway Logs
```bash
railway logs
```

Look for:
- `✅ Database connected successfully`
- `❌ Query error:` or `❌ Login error:` with details

## Most Likely Issues

### A. PostgreSQL Not Running
**Fix:** Start/restart PostgreSQL service in Railway

### B. Tables Don't Exist
**Fix:** Run database initialization
```bash
railway run npm run init:db
```

### C. Wrong DATABASE_URL
**Fix:** Delete and re-add PostgreSQL service in Railway
