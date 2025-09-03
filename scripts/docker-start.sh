#!/bin/sh

# Docker startup script for Mustache Plucker Bot
# Starts both the health server and the main bot application

echo "Starting Mustache Plucker Bot..."

# Start health server in background
echo "Starting health server on port 3001..."
deno run --allow-net --allow-env --allow-read --allow-write src/health-server.ts &
HEALTH_PID=$!

# Give health server time to start
sleep 2

# Start main bot application
echo "Starting Discord bot and web server..."
exec deno run --allow-net --allow-env --allow-read --allow-write src/main.ts