#!/bin/bash

# Install PostgreSQL client tools on macOS
echo "🔧 Installing PostgreSQL client tools..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install Homebrew first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# Install PostgreSQL (includes psql)
echo "📦 Installing PostgreSQL client..."
brew install postgresql

# Verify installation
if command -v psql &> /dev/null; then
    echo "✅ psql installed successfully!"
    echo "📋 Version: $(psql --version)"
    
    echo ""
    echo "🔗 Now you can connect to your Railway database:"
    echo "   psql \"\$DATABASE_URL\" -f database/friendship-sync-functions.sql"
    
    echo ""
    echo "🎯 Or connect interactively:"
    echo "   psql \"\$DATABASE_URL\""
else
    echo "❌ psql installation failed"
    exit 1
fi
