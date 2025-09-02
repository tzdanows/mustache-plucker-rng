# Setup Guide

## Initial Setup

### 1. Configure Environment
```bash
# Create .env file
DISCORD_TOKEN=your_token_here
DISCORD_CLIENT_ID=your_client_id_here
```

### 2. Register Commands Globally
```bash
deno task register:global
# Wait ~1 hour for propagation
```

### 3. Start Bot
```bash
deno task dev   # Development
deno task start # Production
```

Bot now works in ALL servers.

---

## Adding to New Server

**Invite link:**
```
https://discord.com/oauth2/authorize?client_id=1411869206575583352
```

1. Click link
2. Select server
3. Authorize
4. Done

Commands work immediately after global propagation.

---

## Commands

```
/fs Prize $50 5m 3    # Create flash sale
/cancel               # Cancel last flash sale
/end                  # End last flash sale early
/sync                 # Sync to web
/ping                 # Test bot
```