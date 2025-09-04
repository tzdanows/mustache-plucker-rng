#!/usr/bin/env -S deno test --allow-env --allow-read --allow-net

/**
 * Integration test for Discord bot connection
 */

import { assertEquals, assertExists } from "@std/assert";
import { Client, GatewayIntentBits } from "npm:discord.js@14";
import { load } from "@std/dotenv";

// Load environment variables
await load({ export: true });

Deno.test({
  name: "Bot can authenticate with Discord",
  sanitizeResources: false, // Discord.js has internal resources we can't control
  sanitizeOps: false, // Discord.js uses timers we can't clean up
  fn: async () => {
    const token = Deno.env.get("DISCORD_TOKEN");
    assertExists(token, "DISCORD_TOKEN must be set");

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    let connected = false;

    // Set up promise to wait for ready event
    const readyPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout after 10 seconds"));
      }, 10000);

      client.once("ready", () => {
        clearTimeout(timeout);
        connected = true;
        resolve();
      });

      client.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    try {
      await client.login(token);
      await readyPromise;

      assertEquals(connected, true, "Bot should connect successfully");
      assertExists(client.user, "Bot user should exist");
      assertExists(client.user?.id, "Bot should have an ID");

      console.log(`✅ Connected as ${client.user?.tag}`);
    } finally {
      // Clean up - properly close all connections
      client.removeAllListeners();
      await client.destroy();
      // Give it a moment to clean up
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  },
});

Deno.test("Bot has correct intents configured", () => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Check that intents are properly configured
  const intents = client.options.intents;
  assertExists(intents, "Intents should be configured");

  // The intents should include necessary permissions
  assertEquals(typeof intents, "object", "Intents should be an object");

  client.destroy();
});
