# Moustache Plucker Bot

minimal discord RNG flash sale bot that "plucks" random winners from reactions

optimized for rapid reactions via concurrency

this bot uses the Web Crypto API's crypto.getRandomValues() which generates cryptographically secure random numbers. The Fisher-Yates shuffle algorithm then ensures every participant has an exactly equal chance of winning, making manipulation mathematically impossible.

## Quick Start

### Invite

```
https://discord.com/oauth2/authorize?client_id=1411869206575583352
```

### Clone & run

```bash
deno task init && deno task dev
```

## Features

- react-to-enter listings
- secure random selection
- Multiple winners per listing
- persistent storage across restarts
- real-time participant tracking

## Commands

- `/fs` - Create a new flash sale
  - Format: `/fs {item} {duration} {winners}`
  - Example: `/fs Keycap Set $75 5m 3`
- `/cancel` - Cancel an active flash sale (optional message ID, defaults to last)
- `/end` - Manually end a flash sale early (optional message ID, defaults to last)
- `/sync` - Sync flash sale to web report

## Testing

```bash
# fast
deno task test

#full
deno task test:full
```

## Development

- `deno task dev` - Start development bot
- `deno task test` - Run quick tests
- `deno task test:full` - Run all tests
- `deno task build` - Build for production
- `deno task init` - Initialize database