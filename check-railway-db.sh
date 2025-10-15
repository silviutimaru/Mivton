#!/bin/bash
echo "🔍 Checking Railway PostgreSQL connection..."
echo ""

# Try to connect using the DATABASE_URL
if railway run psql $DATABASE_URL -c "SELECT COUNT(*) as user_count FROM users;" 2>/dev/null; then
    echo "✅ Database is accessible and contains data!"
    railway run psql $DATABASE_URL -c "SELECT COUNT(*) as user_count FROM users;"
    railway run psql $DATABASE_URL -c "SELECT COUNT(*) as friends FROM friends;" 2>/dev/null || echo "Friends table check skipped"
else
    echo "❌ Cannot connect to database"
    echo ""
    echo "Possible fixes:"
    echo "1. Go to Railway Dashboard → PostgreSQL service → Settings → Restart"
    echo "2. Check if PostgreSQL service shows 'Active' status"
    echo "3. Verify both Mivton app and PostgreSQL are in 'production' environment"
fi
