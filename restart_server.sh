#!/bin/bash

# Auto-restart script for when API key is updated
# This script watches for changes to .dev.vars and restarts the server

echo "🔄 Restarting server with new environment..."

# Kill any existing process on port 3000
fuser -k 3000/tcp 2>/dev/null || true

# Wait a moment
sleep 2

# Restart with PM2
cd /home/user/webapp
pm2 restart webapp --update-env

echo "✅ Server restarted successfully!"
echo "New API key loaded."
