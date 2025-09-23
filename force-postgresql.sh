#!/bin/bash

# Force PostgreSQL usage for local development
# This ensures we use the same database as production

echo "🔧 Forcing PostgreSQL usage for local development..."

# Set environment variables to force PostgreSQL
export FORCE_POSTGRESQL=true
export NODE_ENV=production

# Check if we have a local PostgreSQL connection string
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  No DATABASE_URL found. Setting up local PostgreSQL connection..."
    
    # Default local PostgreSQL connection
    export DATABASE_URL="postgresql://postgres:password@localhost:5432/mivton"
    
    echo "📝 Using local PostgreSQL: $DATABASE_URL"
    echo "💡 Make sure PostgreSQL is running on localhost:5432"
    echo "💡 Database 'mivton' should exist with user 'postgres'"
else
    echo "✅ Using existing DATABASE_URL: $DATABASE_URL"
fi

echo "🚀 Starting server with PostgreSQL..."
node server.js
