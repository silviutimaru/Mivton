#!/bin/bash

# 🛟 EMERGENCY DATA EXTRACTION SCRIPT
# This script runs INSIDE the PostgreSQL container to extract data directly from files
# Use this when PostgreSQL authentication fails but you have SSH access

echo "🚨 EMERGENCY DATA EXTRACTION FROM POSTGRESQL DATA DIRECTORY"
echo "============================================================"

# PostgreSQL data directory
DATA_DIR="/var/lib/postgresql/data/pgdata"
BACKUP_DIR="/tmp/data_extraction"

echo "📁 Creating backup directory..."
mkdir -p "$BACKUP_DIR"

echo "🔍 Checking PostgreSQL data directory..."
if [ -d "$DATA_DIR" ]; then
    echo "✅ Found PostgreSQL data directory: $DATA_DIR"
    ls -la "$DATA_DIR"
else
    echo "❌ PostgreSQL data directory not found!"
    echo "🔍 Searching for PostgreSQL data..."
    find /var/lib/postgresql -name "postgresql.conf" 2>/dev/null
    find /var/lib/postgresql -name "base" -type d 2>/dev/null
    exit 1
fi

echo ""
echo "📊 Checking database files..."
if [ -d "$DATA_DIR/base" ]; then
    echo "✅ Found database files in $DATA_DIR/base"
    echo "📋 Database directories:"
    ls -la "$DATA_DIR/base/"
else
    echo "❌ No database files found"
    exit 1
fi

echo ""
echo "🔧 Attempting to start PostgreSQL in single-user mode..."
# Try to start PostgreSQL in single-user mode to bypass authentication
su - postgres -c "postgres --single -D $DATA_DIR railway" <<EOF
\l
\dt
SELECT * FROM pg_database;
\q
EOF

echo ""
echo "📤 Attempting to extract data using pg_dump from local socket..."
# Try to use local Unix socket (bypasses network authentication)
export PGHOST=/var/run/postgresql
export PGUSER=postgres
export PGDATABASE=railway

echo "🔌 Testing local socket connection..."
if su - postgres -c "psql -h /var/run/postgresql -U postgres -d railway -c 'SELECT version();'" 2>/dev/null; then
    echo "✅ Local socket connection successful!"
    
    echo "📤 Extracting complete database..."
    su - postgres -c "pg_dump -h /var/run/postgresql -U postgres railway > $BACKUP_DIR/complete_dump.sql"
    
    echo "📤 Extracting individual tables..."
    for table in users messages friendships friend_requests user_presence session; do
        echo "  📊 Extracting $table..."
        su - postgres -c "pg_dump -h /var/run/postgresql -U postgres railway --table=$table --data-only --inserts > $BACKUP_DIR/${table}_data.sql" 2>/dev/null || echo "    ⚠️ $table not found or error"
    done
    
else
    echo "❌ Local socket connection failed"
    echo "🔧 Trying to create manual data extraction..."
    
    # Manual file-level extraction
    echo "📂 Copying critical PostgreSQL files..."
    cp -r "$DATA_DIR/base" "$BACKUP_DIR/raw_database_files/" 2>/dev/null
    cp "$DATA_DIR/postgresql.conf" "$BACKUP_DIR/" 2>/dev/null
    cp "$DATA_DIR/pg_hba.conf" "$BACKUP_DIR/" 2>/dev/null
    
    echo "📝 Creating database file inventory..."
    find "$DATA_DIR" -type f -name "*.conf" > "$BACKUP_DIR/config_files.txt"
    find "$DATA_DIR/base" -type f | head -20 > "$BACKUP_DIR/data_files_sample.txt"
fi

echo ""
echo "📋 Extraction Summary:"
echo "====================="
if [ -d "$BACKUP_DIR" ]; then
    ls -la "$BACKUP_DIR"
    
    echo ""
    echo "💾 Files created:"
    find "$BACKUP_DIR" -type f -exec ls -lh {} \;
    
    echo ""
    echo "🔄 To download these files, you can:"
    echo "1. Copy them to a web-accessible location"
    echo "2. Use railway's file transfer capabilities"
    echo "3. Base64 encode and paste them out"
    
    echo ""
    echo "📤 Base64 encoded files (small files only):"
    for file in "$BACKUP_DIR"/*.sql; do
        if [ -f "$file" ] && [ $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null) -lt 100000 ]; then
            echo "=== $(basename $file) ==="
            base64 "$file" | head -10
            echo "... (truncated)"
            echo ""
        fi
    done
fi

echo "✅ Emergency extraction complete!"
echo "📁 Files are in: $BACKUP_DIR"