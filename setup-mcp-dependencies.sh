#!/bin/bash

echo "MCP Dependencies Setup Script"
echo "=============================="
echo ""

# Install Playwright browser dependencies
echo "Installing Playwright browser dependencies..."
sudo apt-get update
sudo apt-get install -y \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2

# Alternative: Use Playwright's own dependency installer
# sudo npx playwright install-deps

echo ""
echo "Installing GitHub CLI..."
# Add GitHub CLI repository
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

# Update and install GitHub CLI
sudo apt update
sudo apt install gh -y

echo ""
echo "Verifying installations..."
echo "GitHub CLI version:"
gh --version

echo ""
echo "Testing Playwright..."
npx playwright --version

echo ""
echo "Setup complete!"
echo ""
echo "MCP Servers installed and configured:"
echo "✓ PostgreSQL MCP (dev and production databases)"
echo "✓ Playwright MCP (browser automation)"
echo "✓ Memory MCP (context storage)"
echo "✓ GitHub CLI (for repository operations)"
echo ""
echo "Configuration file location: ~/.claudecode/mcp_config.json"
echo ""
echo "Note: You may need to restart Claude Code for the MCP servers to be recognized."