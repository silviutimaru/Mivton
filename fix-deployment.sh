#!/bin/bash

echo "🔧 Fixing Mivton Phase 2.3 for Railway Deployment..."

# Ensure main entry point is server.js
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found!"
    exit 1
fi

# Remove conflicting files
if [ -f "app.js" ]; then
    echo "🗑️ Moving conflicting app.js to backup..."
    mv app.js app.js.backup
fi

# Ensure package.json uses server.js
echo "📝 Updating package.json..."
jq '.main = "server.js"' package.json > package.json.tmp && mv package.json.tmp package.json

# Ensure proper npm scripts
echo "📝 Fixing npm scripts..."
jq '.scripts.start = "node server.js"' package.json > package.json.tmp && mv package.json.tmp package.json
jq '.scripts.build = "echo \"Build completed\""' package.json > package.json.tmp && mv package.json.tmp package.json

# Create railway.toml if it doesn't exist
if [ ! -f "railway.toml" ]; then
    echo "🚂 Creating railway.toml..."
    cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"

[build.nixpacksConfig]
phases.install = "npm install"
phases.build = "echo 'No build step needed'"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "never"
EOF
fi

# Verify critical files exist
echo "✅ Verifying files..."
files=("server.js" "package.json" "railway.toml")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file exists"
    else
        echo "   ❌ $file missing"
        exit 1
    fi
done

# Check if routes exist
if [ -d "routes" ] && [ -f "routes/users-search.js" ] && [ -f "routes/user-preferences.js" ]; then
    echo "   ✓ Phase 2.3 routes exist"
else
    echo "   ⚠️ Some Phase 2.3 routes missing (will run in demo mode)"
fi

# Check if CSS files exist
if [ -d "public/css" ]; then
    echo "   ✓ CSS directory exists"
else
    echo "   ⚠️ CSS directory missing (Phase 2.3 components may not have styling)"
fi

echo ""
echo "🎉 Railway deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Commit all changes: git add . && git commit -m 'Phase 2.3 Railway deployment'"
echo "   2. Push to repository: git push"
echo "   3. Deploy to Railway: railway up"
echo ""
echo "🔗 After deployment, visit:"
echo "   • Main app: https://your-app.railway.app"
echo "   • Phase 2.3 demo: https://your-app.railway.app/demo"
echo "   • Health check: https://your-app.railway.app/health"
