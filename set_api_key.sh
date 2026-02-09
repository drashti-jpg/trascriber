#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================"
echo "  🔑 Set OpenAI API Key"
echo -e "========================================${NC}"
echo ""

# Check if API key is provided as argument
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./set_api_key.sh YOUR_API_KEY"
    echo ""
    echo "Example:"
    echo "  ./set_api_key.sh sk-proj-abc123..."
    echo ""
    echo -e "${BLUE}Get your API key from:${NC}"
    echo "  https://platform.openai.com/api-keys"
    echo ""
    exit 1
fi

API_KEY="$1"

# Validate API key format (basic check)
if [[ ! $API_KEY =~ ^sk- ]]; then
    echo -e "${YELLOW}⚠️  Warning: API key should start with 'sk-'${NC}"
    echo "Are you sure this is correct? (y/n)"
    read -r response
    if [[ ! $response =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

# Update .dev.vars file
echo "OPENAI_API_KEY=$API_KEY" > .dev.vars

echo -e "${GREEN}✅ API key updated successfully!${NC}"
echo ""
echo "Updated .dev.vars:"
cat .dev.vars | sed 's/\(sk-[^[:space:]]*\)/\1.../' # Mask the key for display
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Restart the server:"
echo "   pm2 restart webapp --update-env"
echo ""
echo "2. Verify the key is loaded:"
echo "   curl http://localhost:3000/api/health | jq ."
echo ""
echo "3. Test transcription:"
echo "   Visit https://3000-inw9v4akyow5sac4ewxk7-b32ec7bb.sandbox.novita.ai"
echo ""
