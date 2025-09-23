#!/bin/bash

echo "🔧 Mivton Package Lock Sync Fix"
echo "==============================="

# Backup the current lock file just in case
if [ -f "package-lock.json" ]; then
    echo "📋 Backing up current package-lock.json..."
    cp package-lock.json package-lock.json.backup.$(date +%Y%m%d_%H%M%S)
fi

# Remove problematic files
echo "🗑️  Removing conflicting files..."
rm -f package-lock.json
rm -rf node_modules

echo "✅ Cleaned up previous installation"

# Install dependencies with exact versions from package.json
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
    echo ""
    
    # Test the installation
    echo "🧪 Testing installation..."
    node -e "
        console.log('✅ Node.js:', process.version);
        try {
            require('express');
            require('bcrypt');
            require('pg');
            require('socket.io');
            require('helmet');
            require('cors');
            require('express-session');
            require('connect-pg-simple');
            console.log('✅ All critical dependencies loaded successfully');
        } catch (err) {
            console.error('❌ Dependency test failed:', err.message);
            process.exit(1);
        }
    "
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Package lock sync fix complete!"
        echo "================================="
        echo "✅ package-lock.json regenerated"
        echo "✅ All dependencies synchronized"
        echo "✅ Installation verified"
        echo ""
        echo "🚀 Ready for deployment!"
        echo ""
        echo "Next steps:"
        echo "  npm start     # Start production server"
        echo "  npm run dev   # Start development server"
        echo ""
        
        # Show current dependency versions
        echo "📋 Current dependency versions:"
        npm list --depth=0 | grep -E "(express|bcrypt|pg|socket.io|helmet|cors)"
        
    else
        echo "❌ Installation test failed"
        exit 1
    fi
    
else
    echo "❌ npm install failed"
    exit 1
fi
