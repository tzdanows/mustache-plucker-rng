#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read

// Quick test script to create a 10-second giveaway for testing the embed update fix
console.log(`
🌙 Quick Giveaway Test Instructions:
=====================================
1. Start the bot: deno task dev
2. In Discord, use: /giveaway Test Item $5 10s 1
3. React with 🌙 to enter
4. Wait 10 seconds for it to end
5. Check that the embed updates to show the winner

The embed should:
- Show "Ending..." briefly
- Update to gray color
- Display the winner mention
- Include the giveaway results link

If the embed stays stuck on "Ending..." or doesn't show the winner, the fix didn't work.
`);