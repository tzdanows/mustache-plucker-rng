# Moustache Plucker Bot

Discord RNG giveaway bot that "plucks" random winners from participants.

## Quick Start

```bash
deno task init && deno task dev
```

## Features

- React-to-enter giveaways
- Cryptographically secure random selection
- Multiple winners per giveaway
- Persistent storage across restarts
- Real-time participant tracking

## Commands

- `/giveaway create` - Start a new giveaway
- `/giveaway end` - Manually end and draw winners
- `/giveaway list` - View active giveaways
- `/giveaway cancel` - Cancel a giveaway

## Development

- `deno task dev` - Start development bot
- `deno task test` - Run tests
- `deno task build` - Build for production
- `deno task deploy` - Deploy to production