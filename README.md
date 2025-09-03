# Moustache Plucker Bot

- minimal discord RNG bot that "plucks" random winners from reactions
- optimized for rapid reactions via concurrency
- this bot uses the Web Crypto API's crypto.getRandomValues() which generates cryptographically secure random numbers. the [Fisher-Yates shuffle algorithm](https://youtu.be/gt0Ro1PqFTk) then ensures every participant has an exactly [equal chance of winning](https://bost.ocks.org/mike/shuffle/), making manipulation mathematically impossible.

## Quick Start

### Invite

```md
https://discord.com/oauth2/authorize?client_id=1411869206575583352&permissions=76864&scope=bot%20applications.commands
```
should be ready for usage out of the box


### Clone & run (self-hosted)

```bash
deno task init && deno task dev
```

## Features

- react-to-enter flash sale
- secure random selection
- multiple winners per flash sale
- persistent storage across restarts
- real-time participant tracking

## Commands (Admin Only)

All commands require admin permissions (Manage Server) to use:

- `/fs` - Create a new flash sale
  - Format: `/fs {item} {duration} {winners}`
  - Example: `/fs Keycap Set $75 5m 3`
- `/cancel` - Cancel an active flash sale (optional message ID, defaults to last)
- `/end` - Manually end a flash sale early (optional message ID, defaults to last)
- `/sync` - Sync flash sale to web report
- `/ping` - Test bot responsiveness
- `/hello` - sends garlic/tomato HELLO emoji art

## dev scripts + testing

- `deno task dev` - start development bot
- `deno task test` - run quick tests
- `deno task test:full` - run all tests
- `deno task build` - build for production
- `deno task init` - init database
