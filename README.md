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
- toggle on no B2B winners via: `/toggle b2b`

## Commands

- `/giveaway create` - start a new giveaway
  - `giveaway create {item & amount} {time left} {winner(s) quantity}`
  - `giveaway create pumpkin $20 45s 3`
- `/giveaway end` - manually end and draw winners
- `/giveaway list` - view active giveaways
- `/giveaway cancel` - cancel a giveaway (or last by default)

## Development

- `deno task dev` - Start development bot
- `deno task test` - Run tests
- `deno task build` - Build for production
- `deno task deploy` - Deploy to production