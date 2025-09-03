#!/bin/bash

# Tmux session management script for Mustache Plucker Bot
# This script creates/attaches to a tmux session for the bot

SESSION_NAME="mustache-bot"
PROJECT_DIR="$HOME/wokege-rng-bot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🤖 Mustache Plucker Bot - Tmux Manager${NC}"
echo "========================================"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}❌ tmux is not installed!${NC}"
    echo "Install it with: sudo dnf install tmux"
    exit 1
fi

# Check if Docker is running
if ! systemctl is-active --quiet docker; then
    echo -e "${YELLOW}⚠️  Docker is not running. Starting Docker...${NC}"
    sudo systemctl start docker
    sleep 2
fi

# Check if session exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}📍 Session '$SESSION_NAME' already exists${NC}"
    echo "Attaching to existing session..."
    tmux attach-session -t "$SESSION_NAME"
else
    echo -e "${GREEN}🚀 Creating new tmux session '$SESSION_NAME'${NC}"
    
    # Create new session and set up windows
    tmux new-session -d -s "$SESSION_NAME" -n "bot" -c "$PROJECT_DIR"
    
    # Window 1: Bot logs
    tmux send-keys -t "$SESSION_NAME:bot" "cd $PROJECT_DIR" C-m
    tmux send-keys -t "$SESSION_NAME:bot" "echo '📋 Bot Logs Window'" C-m
    tmux send-keys -t "$SESSION_NAME:bot" "echo '=================='" C-m
    tmux send-keys -t "$SESSION_NAME:bot" "docker-compose logs -f --tail=50" C-m
    
    # Window 2: System monitoring
    tmux new-window -t "$SESSION_NAME" -n "monitor" -c "$PROJECT_DIR"
    tmux send-keys -t "$SESSION_NAME:monitor" "echo '📊 System Monitor'" C-m
    tmux send-keys -t "$SESSION_NAME:monitor" "echo '================'" C-m
    tmux send-keys -t "$SESSION_NAME:monitor" "watch -n 5 'docker stats --no-stream && echo && docker-compose ps'" C-m
    
    # Window 3: Shell for management
    tmux new-window -t "$SESSION_NAME" -n "shell" -c "$PROJECT_DIR"
    tmux send-keys -t "$SESSION_NAME:shell" "echo '🔧 Management Shell'" C-m
    tmux send-keys -t "$SESSION_NAME:shell" "echo '=================='" C-m
    tmux send-keys -t "$SESSION_NAME:shell" "echo 'Commands:'" C-m
    tmux send-keys -t "$SESSION_NAME:shell" "echo '  deno run scripts/deploy.ts     # Deploy latest'" C-m
    tmux send-keys -t "$SESSION_NAME:shell" "echo '  docker-compose restart         # Restart bot'" C-m
    tmux send-keys -t "$SESSION_NAME:shell" "echo '  docker-compose down            # Stop bot'" C-m
    tmux send-keys -t "$SESSION_NAME:shell" "echo '  docker-compose exec bot sh     # Shell into container'" C-m
    tmux send-keys -t "$SESSION_NAME:shell" "echo ''" C-m
    
    # Set default window
    tmux select-window -t "$SESSION_NAME:bot"
    
    echo -e "${GREEN}✅ Session created successfully!${NC}"
    echo ""
    echo "Windows:"
    echo "  1. bot     - Docker logs (following)"
    echo "  2. monitor - System stats"
    echo "  3. shell   - Management commands"
    echo ""
    echo "Shortcuts:"
    echo "  Ctrl+B, N     - Next window"
    echo "  Ctrl+B, P     - Previous window"
    echo "  Ctrl+B, D     - Detach session"
    echo "  Ctrl+B, [     - Scroll mode (q to exit)"
    echo ""
    
    # Attach to session
    tmux attach-session -t "$SESSION_NAME"
fi