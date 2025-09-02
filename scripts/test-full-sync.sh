#!/bin/bash

echo "🌙 Full Sync Test"
echo "================"
echo ""

# Check if Deno Deploy is accessible
echo "1. Checking Deno Deploy at localhost:8432..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8432 | grep -q "200"; then
    echo "✅ Deno Deploy is running"
else
    echo "❌ Deno Deploy is not running!"
    echo "   Please run: cd deploy && ./deploy.sh (option 3)"
    exit 1
fi

echo ""
echo "2. Creating test giveaway via API..."
TIMESTAMP=$(date +%s)
GIVEAWAY_ID="shell-test-$TIMESTAMP"

# Create the test via the test endpoint
RESPONSE=$(curl -s http://localhost:8432/api/test-giveaway)
echo "Response: $RESPONSE"

# Extract the giveaway ID from response
TEST_ID=$(echo $RESPONSE | grep -o 'test-[0-9]*' | head -1)

echo ""
echo "3. Checking if giveaway is viewable..."
echo "   Visit: http://localhost:8432/report/$TEST_ID"
echo ""

# Try to fetch the report page
REPORT=$(curl -s http://localhost:8432/report/$TEST_ID)
if echo "$REPORT" | grep -q "Giveaway Not Found"; then
    echo "❌ Giveaway report not found!"
    echo ""
    echo "Debugging: Checking what's in KV store..."
    # This will show in the Deno Deploy console logs
else
    echo "✅ Giveaway report is accessible!"
fi

echo ""
echo "4. Testing with your bot's sync..."
echo "   Run this command in Discord: /sync"
echo "   This will sync the most recent giveaway from your bot"
echo ""
echo "5. Manual test:"
echo "   - Create a giveaway: /giveaway 'Test Item $10' 30s 1"
echo "   - Wait 30 seconds for it to end"
echo "   - Check the report URL shown in Discord"
echo "   - OR use /sync to manually sync it"