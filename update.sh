
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🤖 Heidi Bot Update Script${NC}"
echo "================================="

# Check if git is available
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
git fetch origin
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to pull changes${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Successfully pulled latest changes${NC}"

# Check if bun is available
if command -v bun &> /dev/null; then
    echo -e "${YELLOW}📦 Installing/updating dependencies with bun...${NC}"
    bun install
else
    echo -e "${YELLOW}📦 Installing/updating dependencies with npm...${NC}"
    npm install
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies updated${NC}"

# Check if Docker is available and Dockerfile exists
if command -v docker &> /dev/null && [ -f "Dockerfile" ]; then
    echo -e "${YELLOW}🐳 Building Docker image...${NC}"
    
    # Stop existing container if running
    if [ "$(docker ps -q -f name=heidi-bot)" ]; then
        echo -e "${YELLOW}🛑 Stopping existing Heidi bot container...${NC}"
        docker stop heidi-bot
    fi
    
    # Remove existing container if exists
    if [ "$(docker ps -aq -f name=heidi-bot)" ]; then
        echo -e "${YELLOW}🗑️ Removing existing Heidi bot container...${NC}"
        docker rm heidi-bot
    fi
    
    # Build new image
    docker build -t heidi-bot:latest .
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to build Docker image${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
    
    # Ask if user wants to start the container
    read -p "🚀 Do you want to start the bot container? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🚀 Starting Heidi bot container...${NC}"
        
        # Check if .env file exists
        if [ ! -f ".env" ]; then
            echo -e "${RED}❌ .env file not found! Please create one with your Slack credentials.${NC}"
            echo -e "${YELLOW}📝 Copy .env.example to .env and fill in your actual values.${NC}"
            exit 1
        fi
        
        # Load environment variables and pass them explicitly
        set -a
        source .env
        set +a
        
        docker run -d --name heidi-bot \
            -e SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN" \
            -e SLACK_SIGNING_SECRET="$SLACK_SIGNING_SECRET" \
            -e SLACK_APP_TOKEN="$SLACK_APP_TOKEN" \
            --restart unless-stopped \
            heidi-bot:latest
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Heidi bot container started successfully${NC}"
            echo -e "${GREEN}📋 Container logs: docker logs -f heidi-bot${NC}"
        else
            echo -e "${RED}❌ Failed to start container${NC}"
        fi
    fi
else
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️ Docker not found, skipping container build${NC}"
    fi
    
    # If not using Docker, just restart the process
    echo -e "${YELLOW}🔄 Restarting bot locally...${NC}"
    
    # Kill existing process if running
    pkill -f "bun src/index.ts" 2>/dev/null || pkill -f "node.*index" 2>/dev/null
    
    # Start the bot
    if command -v bun &> /dev/null; then
        echo -e "${GREEN}🚀 Starting bot with bun...${NC}"
        nohup bun src/index.ts > bot.log 2>&1 &
    else
        echo -e "${GREEN}🚀 Starting bot with npm...${NC}"
        nohup npm start > bot.log 2>&1 &
    fi
    
    echo -e "${GREEN}✅ Bot restarted${NC}"
    echo -e "${GREEN}📋 Logs: tail -f bot.log${NC}"
fi

echo -e "${GREEN}🎉 Update complete!${NC}"
