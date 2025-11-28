#!/bin/bash

# AI Knowledge Nexus CLI - Installation Script

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   AI Knowledge Nexus CLI - Installation                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 14.0.0 or higher from https://nodejs.org"
    exit 1
fi

echo "✓ Node.js found: $node_version"
echo ""

# Check npm
echo "Checking npm..."
npm_version=$(npm -v 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✓ npm found: $npm_version"
echo ""

# Install dependencies
echo "Installing dependencies..."
echo "This may take a few minutes..."
echo ""

npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Dependencies installed successfully!"
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║   Installation Complete! 🎉                              ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Quick Start:"
    echo "  npm start                  # Run the CLI"
    echo "  node src/cli/cli-demo.js   # Run feature demo"
    echo "  npm install -g .           # Install globally as 'nexus'"
    echo ""
    echo "For more information, see: src/cli/README.md"
    echo ""
else
    echo ""
    echo "❌ Installation failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi
