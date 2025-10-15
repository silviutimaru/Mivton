# 🔧 Railway PostgreSQL Password Reset Solution

## Problem
Railway PostgreSQL service upgraded from version 16 to 17, causing version incompatibility. After downgrading back to PostgreSQL 16, password authentication fails because the existing data directory uses old authentication methods incompatible with new environment variables.

## Error Message
```
FATAL: password authentication failed for user "postgres"
Connection matched file "/var/lib/postgresql/data/pgdata/pg_hba.conf" line 128: "host all all all scram-sha-256"
```

## ✅ Working Solution

### Prerequisites
- Install Railway CLI: https://docs.railway.com/guides/cli
- Have access to Railway dashboard

### Step-by-Step Fix

1. **SSH into PostgreSQL service**
   ```bash
   # Right-click PostgreSQL service in Railway dashboard to copy SSH command
   railway ssh
   ```

2. **Temporarily disable authentication** 
   ```bash
   # COPY PASTE EXACTLY as written:
   sed -i 's/host all all all scram-sha-256/host all all ::\/0 trust/' /var/lib/postgresql/data/pgdata/pg_hba.conf
   ```

3. **Redeploy the database service** (via Railway dashboard or CLI)

4. **SSH back in and reset password**
   ```bash
   railway ssh
   psql
   ```

5. **Update PostgreSQL password** (replace `my_password` with actual PGPASSWORD from variables tab)
   ```sql
   ALTER USER postgres WITH PASSWORD 'my_password';
   \q
   ```

6. **Re-enable proper authentication**
   ```bash
   sed -i 's/host all all ::\/0 trust/host all all all scram-sha-256/' /var/lib/postgresql/data/pgdata/pg_hba.conf
   ```

7. **Final redeploy** - Database should now accept connections with environment variable password

## Why This Works

- **Step 2**: Temporarily allows connections without password authentication
- **Step 5**: Updates the stored password hash to match environment variables  
- **Step 6**: Restores secure authentication method
- The key insight: PostgreSQL was using old password hash from data directory, not environment variables

## Alternative Prevention

To avoid this issue in the future:
- Use `POSTGRES_HOST_AUTH_METHOD=scram-sha-256` consistently
- Don't upgrade PostgreSQL major versions with existing data
- Consider managed database services (Supabase, Neon) for production

## Credit
Solution discovered and documented by @silviutimaru during PostgreSQL 16/17 compatibility issue resolution.

---

**Status**: ✅ Verified working solution
**Date**: October 7, 2025
**Railway CLI Version**: Latest
**PostgreSQL Version**: 16.x