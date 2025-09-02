#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { REST, Routes } from "discord.js";
import { load } from "@std/dotenv";

// Load environment variables
await load({ export: true });

const token = Deno.env.get("DISCORD_TOKEN");
const clientId = Deno.env.get("DISCORD_CLIENT_ID");

if (!token || !clientId) {
  console.error("❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID");
  Deno.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

console.log("🔍 Fetching existing global commands...");

try {
  // Get current global commands
  const commands = await rest.get(Routes.applicationCommands(clientId)) as any[];
  
  if (commands.length === 0) {
    console.log("No global commands found.");
  } else {
    console.log(`Found ${commands.length} global commands:`);
    for (const cmd of commands) {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    }
    
    // Ask for confirmation
    console.log("\n⚠️  Do you want to DELETE all global commands? (yes/no)");
    const response = prompt(">");
    
    if (response?.toLowerCase() === "yes") {
      console.log("\n🗑️  Deleting all global commands...");
      
      // Delete all commands
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      
      console.log("✅ All global commands deleted!");
      console.log("\nNow run 'deno task register:global' to re-register fresh commands.");
    } else {
      console.log("❌ Cancelled. No commands were deleted.");
    }
  }
} catch (error) {
  console.error("Error:", error);
}