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

console.log("🗑️  Force clearing all global commands...");

try {
  // Delete all global commands
  await rest.put(Routes.applicationCommands(clientId), { body: [] });
  
  console.log("✅ All global commands cleared!");
  console.log("\n📝 Now registering fresh commands...");
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log("\nRun 'deno task register:global' to register the new commands.");
  
} catch (error) {
  console.error("Error:", error);
}