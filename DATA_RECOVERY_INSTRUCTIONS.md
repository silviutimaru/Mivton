# 🚨 DATA RECOVERY INSTRUCTIONS - PostgreSQL Version Incompatibility

## Current Situation
- **Your data**: Trapped in `acceptable-volume` (120MB) on old `Postgres` service
- **Problem**: PostgreSQL 17.6 container cannot read PostgreSQL 16 data files
- **Solution**: Temporarily downgrade to PostgreSQL 16 to access data

## 🔧 RECOVERY STEPS

### Step 1: Downgrade PostgreSQL Service (Railway Dashboard)
**⚠️ CRITICAL: Do this in Railway Dashboard, NOT CLI**

1. Go to [railway.app](https://railway.app)
2. Open your **Mivton** project
3. Click on the **Postgres** service (the old one, not Postgres-3CDg)
4. Go to **Settings** tab
5. Find **Source** section
6. Change the **Docker Image** from:
   - ❌ `postgres:17` or `postgres:latest`
   - ✅ `postgres:16` 
7. Click **Deploy** to apply changes
8. Wait for service to restart (should work now with PostgreSQL 16)

### Step 2: Verify Data Access
Once the service is running PostgreSQL 16:
```bash
# Test connection
psql "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway" -c "SELECT version();"

# Check your data
psql "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway" -c "SELECT COUNT(*) FROM users;"
```

### Step 3: Export All Data
```bash
# Create backup directory
mkdir -p ~/mivton-backup
cd ~/mivton-backup

# Export complete database (schema + data)
pg_dump "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway" > mivton_complete_backup.sql

# Export individual tables (as insurance)
pg_dump "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway" --table=users --data-only --inserts > users_data.sql
pg_dump "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway" --table=messages --data-only --inserts > messages_data.sql
pg_dump "postgresql://postgres:ZwUZqOUTTsweQXocYfTLfWpeVrnVTXpT@ballast.proxy.rlwy.net:45867/railway" --table=friendships --data-only --inserts > friendships_data.sql
```

### Step 4: Import to New Database
```bash
# Import to the new PostgreSQL 17.6 service
psql "postgresql://postgres:hEeONrVrZyxYiVOtfLxXVbqoLcslSCgM@tramway.proxy.rlwy.net:12014/railway" < mivton_complete_backup.sql
```

### Step 5: Alternative Reliable Databases

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL locally (macOS)
brew install postgresql
brew services start postgresql

# Create local database
createdb mivton_local

# Import your data
psql mivton_local < mivton_complete_backup.sql
```

#### Option B: Supabase (More Reliable)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection string from Settings > Database
4. Import: `psql "supabase_connection_string" < mivton_complete_backup.sql`

#### Option C: PlanetScale/Neon (PostgreSQL-compatible)
- **Neon**: [neon.tech](https://neon.tech) - PostgreSQL-compatible, generous free tier
- **Supabase**: More reliable than Railway for databases

## 🛠️ Automated Recovery Script

I'll create a script that automates the export once you downgrade the service:

```bash
# Run this after downgrading to PostgreSQL 16
node export-data-backup.js
```

## ⚠️ Important Notes

1. **Do the Docker image change in Railway Dashboard** - CLI cannot change Docker images
2. **Keep both services** until migration is complete
3. **Test thoroughly** before deleting old service
4. **Download backups locally** as insurance

## 🔄 Next Steps After Data Recovery
1. ✅ Export data from PostgreSQL 16 service
2. ✅ Import to reliable database (local/Supabase/new service)
3. ✅ Update app configuration
4. ✅ Test application thoroughly
5. ✅ Delete old Railway PostgreSQL services
6. ✅ Keep local backup files safe

Would you like me to create the automated export script for Step 3?