# Moustache Plucker Bot

minimal discord RNG giveaway bot that "plucks" random winners from participants

## Quick Start

```bash
deno task init && deno task dev
```

## Features

- react-to-enter giveaways
- secure random selection
- Multiple winners per giveaway
- persistent storage across restarts
- real-time participant tracking

## Commands

- `/giveaway` - Create a new giveaway
  - Format: `/giveaway {item} {duration} {winners}`
  - Example: `/giveaway Keycap Set $75 5m 3`
- `/cancel` - Cancel an active giveaway by message ID
- `/end` - Manually end a giveaway early
- `/sync` - Sync giveaway to web report

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