#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Script to register slash commands with Discord
 * Run this once to register commands, or when commands change
 */

import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { load } from "@std/dotenv";

// Load environment variables
await load({ export: true });

const token = Deno.env.get("DISCORD_TOKEN");
const clientId = Deno.env.get("DISCORD_CLIENT_ID");
const guildId = Deno.env.get("DISCORD_GUILD_ID"); // Optional - for guild-specific commands

if (!token || !clientId) {
  console.error("❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables");
  Deno.exit(1);
}

// Define all commands
const commands = [
  // Ping command - simple test command
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Test if the bot is responsive (Admin only)")
    .toJSON(),

  // Hello command - garlic and tomato art
  new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Display a garlic rectangle with HELLO in tomatoes (Admin only)")
    .toJSON(),

  // Flash sale command (formerly giveaway)
  new SlashCommandBuilder()
    .setName("fs")
    .setDescription("Create a new flash sale (Admin only)")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("What you're selling (e.g., 'Keycap Set $75')")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("How long the sale runs (e.g., '30s', '5m', '2h', '7d')")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("winners")
        .setDescription("Number of winners to select")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .toJSON(),

  // Cancel command
  new SlashCommandBuilder()
    .setName("cancel")
    .setDescription("Cancel an active flash sale (Admin only)")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("Message ID to cancel (optional, defaults to last)")
        .setRequired(false)
    )
    .toJSON(),

  // End command
  new SlashCommandBuilder()
    .setName("end")
    .setDescription("Manually end a flash sale early (Admin only)")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("Message ID to end (optional, defaults to last)")
        .setRequired(false)
    )
    .toJSON(),

  // Sync command
  new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Sync giveaway data to web report (Admin only)")
    .addStringOption((option) =>
      option
        .setName("giveaway_id")
        .setDescription("Giveaway ID to sync (optional, defaults to latest)")
        .setRequired(false)
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(token);

try {
  console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

  let data;

  if (guildId) {
    // Register guild-specific commands (instant update)
    console.log(`📍 Registering commands for guild: ${guildId}`);
    data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    ) as any[];
    console.log(`✅ Successfully registered ${data.length} guild commands.`);
  } else {
    // Register global commands (may take up to 1 hour to propagate)
    console.log(`🌍 Registering global commands (may take up to 1 hour to show in all servers)`);
    data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    ) as any[];
    console.log(`✅ Successfully registered ${data.length} global commands.`);
  }

  // List registered commands
  console.log("\n📋 Registered commands:");
  for (const cmd of data) {
    console.log(`  - /${cmd.name}: ${cmd.description}`);
  }

  console.log(
    "\n💡 Tip: For instant updates during development, set DISCORD_GUILD_ID in your .env file",
  );
} catch (error) {
  console.error("❌ Error registering commands:", error);
  Deno.exit(1);
}
