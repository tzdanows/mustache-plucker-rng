#!/bin/bash

echo "🌙 Moustache Plucker - Deno Deploy Setup"
echo "========================================"
echo ""

# Check if deployctl is installed
if ! command -v deployctl &> /dev/null; then
    echo "📦 Installing Deno Deploy CLI..."
    deno install -Arf jsr:@deno/deployctl
    echo "✅ Deno Deploy CLI installed"
    echo ""
fi

# Check if user is logged in
echo "🔐 Checking Deno Deploy login status..."
if ! deployctl whoami &> /dev/null; then
    echo "Please login to Deno Deploy:"
    deployctl login
fi

echo ""
echo "📝 Deployment Options:"
echo "1. Deploy to production"
echo "2. Preview deployment (dry run)"
echo "3. Run locally for testing"
echo ""
read -p "Select option (1-3): " option

case $option in
    1)
        echo ""
        echo "🚀 Deploying to production..."
        deployctl deploy --project=mustache-plucker app.ts
        echo ""
        echo "✅ Deployment complete!"
        echo "📎 Visit: https://mustache-plucker.deno.dev"
        echo ""
        echo "⚠️  Don't forget to set BOT_SECRET in Deno Deploy dashboard!"
        ;;
    2)
        echo ""
        echo "👀 Running preview (dry run)..."
        deployctl deploy --project=mustache-plucker --dry-run app.ts
        ;;
    3)
        echo ""
        echo "🖥️  Starting local server..."
        echo "Visit: http://localhost:8432"
        echo "Press Ctrl+C to stop"
        echo ""
        deno run --allow-net --allow-env --unstable-kv --watch app.ts
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac