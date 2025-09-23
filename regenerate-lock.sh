#!/bin/bash

# Remove the incomplete package-lock.json
rm -f package-lock.json

# Remove node_modules to start fresh
rm -rf node_modules

# Generate a proper package-lock.json from package.json
npm install

echo "✅ Package-lock.json regenerated successfully"
