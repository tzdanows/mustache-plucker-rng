# Moustache Plucker Bot - Setup Guide

## Prerequisites

- [Deno](https://deno.land/) installed (v1.37+ recommended)
- A Discord account
- Basic knowledge of Discord bots

## Step 1: Create a Discord Application & Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "Moustache Plucker")
3. Go to the "Bot" section in the left sidebar
4. Click "Reset Token" to get your bot token (save this securely!)
5. Under "Privileged Gateway Intents", enable:
   - **MESSAGE CONTENT INTENT** (required for reaction tracking)
   - Server Members Intent (optional, for better user info)

## Step 2: Configure Bot Permissions

1. In the "OAuth2" → "URL Generator" section
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select bot permissions:
   - Send Messages
   - Embed Links
   - Add Reactions
   - Read Message History
   - Use Slash Commands
   - Manage Messages (optional, for cleaning up)
4. Copy the generated URL - this is your bot invite link

## Step 3: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in your values:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
DISCORD_GUILD_ID=your_test_server_id_here  # For development

# Database Configuration  
DATABASE_PATH=./data/moustache_plucker.db

# Bot Configuration
BOT_PREFIX=!
DEFAULT_WINNER_COUNT=3
MAX_GIVEAWAY_DURATION_DAYS=30

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Where to find these values:
- **DISCORD_TOKEN**: Bot section → Token (after resetting)
- **DISCORD_CLIENT_ID**: General Information → Application ID
- **DISCORD_GUILD_ID**: Right-click your test server → Copy Server ID (enable Developer Mode in Discord settings)

## Step 4: Install and Run the Bot

1. Install dependencies and initialize database:
```bash
deno task init
```

2. Run the bot in development mode:
```bash
deno task dev
```

You should see:
```
[INFO] Configuration validated successfully
[INFO] Database initialized successfully
[INFO] 🎩 Moustache Plucker Bot is ready! Logged in as YourBot#1234
[INFO] Serving 1 guild(s)
[INFO] Giveaway manager started
[INFO] Slash commands deployed successfully
```

## Step 5: Invite Bot to Your Server

1. Use the invite URL from Step 2
2. Select your server and authorize the bot
3. The bot should appear online in your server

## Step 6: Test the Bot

1. **Test basic connectivity:**
```
/ping
```
Should respond with latency information

2. **Check statistics:**
```
/stats
```
Shows bot statistics and database info

3. **Create a test giveaway:**
```
/giveaway create item:"Discord Nitro" duration:5 winners:1
```
This creates a 5-minute giveaway for Discord Nitro

4. **List active giveaways:**
```
/giveaway list
```

5. **React to enter:** Click the 🎉 reaction on the giveaway message

## Available Commands

### Public Commands
- `/ping` - Check bot responsiveness
- `/stats` - View bot statistics

### Giveaway Commands
- `/giveaway create` - Create a new giveaway
  - `item` (required): Prize name
  - `duration` (required): Duration in minutes
  - `winners`: Number of winners (default: 3)
  - `quantity`: Item quantity (default: 1)
  - `price`: Item value (optional)
- `/giveaway list` - List active giveaways
- `/giveaway end <message_id>` - End a giveaway early
- `/giveaway cancel <message_id>` - Cancel a giveaway

## Troubleshooting

### Bot is offline
- Check your token is correct in `.env`
- Ensure the bot is running (`deno task dev`)
- Check console for error messages

### Commands not showing
- Wait 1-2 minutes for Discord to update
- Try refreshing Discord (Ctrl+R)
- For guild commands, ensure you're in the right server

### Can't add reactions
- Check bot has "Add Reactions" permission
- Ensure MESSAGE CONTENT INTENT is enabled
- Verify the bot can see the channel

### Database errors
- Delete `data/` folder and restart to recreate database
- Check write permissions in project directory

## Production Deployment

For production deployment:

1. Change `NODE_ENV` to `production` in `.env`
2. Remove `DISCORD_GUILD_ID` to deploy commands globally
3. Use `deno task build` to compile the bot
4. Run with: `./moustache-plucker` or use `deno task start`

## Development Commands

```bash
# Run tests
deno task test

# Format code
deno task fmt

# Lint code
deno task lint

# Type check
deno task check

# Seed database with test data
deno task db:seed
```

## Security Notes

- **NEVER** commit your `.env` file
- Keep your bot token secret
- Regularly rotate your token if exposed
- Use environment variables for all sensitive data

## Need Help?

- Check the logs for detailed error messages
- Ensure all prerequisites are installed
- Verify Discord permissions are correct
- Test in a private server first

---

Bot created with 🎩 by Moustache Plucker v1.0.0