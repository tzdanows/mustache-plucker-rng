# Moustache Plucker - Deno Deploy

Dynamic giveaway report pages for the Moustache Plucker Discord bot.

## Quick Deploy

```bash
# Install Deno Deploy CLI
deno install -Arf jsr:@deno/deployctl

# Login to Deno Deploy
deployctl login

# Deploy to production
cd deploy
deployctl deploy --project=mustache-plucker app.ts
```

## Environment Variables

Set these in Deno Deploy dashboard:
- `BOT_SECRET` - Secret token for bot authentication

## Local Development

```bash
# Run locally (port 8432)
cd deploy
deno task dev

# Test with curl
curl -X POST http://localhost:8432/api/giveaway \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "giveawayId": "test-123",
    "itemName": "Test Item",
    "status": "ended",
    "participants": [],
    "winners": []
  }'

# View report
open http://localhost:8432/report/test-123
```

## API Endpoints

- `GET /` - Homepage
- `GET /report/{giveaway-id}` - View giveaway report
- `POST /api/giveaway` - Update giveaway data (requires auth)

## Deployment Notes

- Uses Deno KV for data storage (automatic)
- No database setup required
- Scales automatically
- SSL/HTTPS included