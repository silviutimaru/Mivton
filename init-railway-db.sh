#!/bin/bash
# Initialize Railway database after PostgreSQL is added

echo "Initializing Railway database..."
railway run npm run init:db
railway run npm run init:friends
railway run npm run init:realtime

echo "Database initialization complete!"
