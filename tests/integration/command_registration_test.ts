#!/usr/bin/env -S deno test --allow-env --allow-read --allow-net

/**
 * Integration test for slash command registration
 */

import { assertEquals, assertExists } from "@std/assert";
import { REST, Routes } from "npm:discord.js@14";
import { load } from "@std/dotenv";

// Load environment variables
await load({ export: true });

// Define expected commands
const EXPECTED_COMMANDS = [
  { name: "fs", description: "Create a flash sale" },
  { name: "cancel", description: "Cancel an active flash sale" },
  { name: "end", description: "End a flash sale early and select winners" },
  { name: "sync", description: "Sync a flash sale to the web" },
  { name: "ping", description: "Check if the bot is responsive" },
  { name: "hello", description: "Display greeting art" },
];

Deno.test({
  name: "Commands can be fetched from Discord API",
  sanitizeResources: false, // Discord.js REST client has internal resources
  sanitizeOps: false, // Discord.js REST client uses timers
  fn: async () => {
    const token = Deno.env.get("DISCORD_TOKEN");
    const clientId = Deno.env.get("DISCORD_CLIENT_ID");

    assertExists(token, "DISCORD_TOKEN must be set");
    assertExists(clientId, "DISCORD_CLIENT_ID must be set");

    const rest = new REST({ version: "10" }).setToken(token);

    try {
      // Fetch global commands
      const commands = await rest.get(
        Routes.applicationCommands(clientId),
      ) as Array<{ name: string; description: string }>;

      assertExists(commands, "Commands should exist");
      assertEquals(Array.isArray(commands), true, "Commands should be an array");

      // Check if our expected commands are registered
      for (const expectedCmd of EXPECTED_COMMANDS) {
        const found = commands.find((cmd) => cmd.name === expectedCmd.name);
        assertExists(found, `Command /${expectedCmd.name} should be registered`);

        if (found) {
          console.log(`✅ Command /${expectedCmd.name}: ${found.description}`);
        }
      }

      console.log(`\nTotal registered commands: ${commands.length}`);
    } catch (error) {
      throw new Error(
        `Failed to fetch commands: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

Deno.test({
  name: "Command structure validation",
  sanitizeResources: false, // Discord.js REST client has internal resources
  sanitizeOps: false, // Discord.js REST client uses timers
  fn: async () => {
    const token = Deno.env.get("DISCORD_TOKEN");
    const clientId = Deno.env.get("DISCORD_CLIENT_ID");

    assertExists(token, "DISCORD_TOKEN must be set");
    assertExists(clientId, "DISCORD_CLIENT_ID must be set");

    const rest = new REST({ version: "10" }).setToken(token);

    try {
      const commands = await rest.get(
        Routes.applicationCommands(clientId),
      ) as Array<any>;

      // Find and validate the /fs command specifically
      const fsCommand = commands.find((cmd) => cmd.name === "fs");
      assertExists(fsCommand, "Flash sale command should exist");

      if (fsCommand) {
        // Check for required options
        assertExists(fsCommand.options, "/fs should have options");
        assertEquals(fsCommand.options.length >= 3, true, "/fs should have at least 3 options");

        // Validate option names
        const optionNames = fsCommand.options.map((opt: any) => opt.name);
        assertEquals(optionNames.includes("item"), true, "/fs should have 'item' option");
        assertEquals(optionNames.includes("duration"), true, "/fs should have 'duration' option");
        assertEquals(optionNames.includes("winners"), true, "/fs should have 'winners' option");

        // Check admin permission requirement
        if (fsCommand.default_member_permissions !== undefined) {
          console.log(
            `✅ /fs command has permission requirements: ${fsCommand.default_member_permissions}`,
          );
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to validate command structure: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  },
});
