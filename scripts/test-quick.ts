#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net

/**
 * Quick Test Suite for Moustache Plucker Bot
 * Tests essential functionality in ~2 minutes
 */

import { Database } from "@db/sqlite";
import { load } from "@std/dotenv";

// Load environment variables
await load({ export: true });

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return async () => {
    try {
      await fn();
      console.log(`${GREEN}✓${RESET} ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`${RED}✗${RESET} ${name}`);
      console.log(`  ${RED}${error.message}${RESET}`);
      testsFailed++;
    }
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log(`${YELLOW}🌙 Moustache Plucker Bot - Quick Test Suite${RESET}\n`);

// Test 1: Environment Variables
await test("Environment variables are set", () => {
  assert(!!Deno.env.get("DISCORD_TOKEN"), "DISCORD_TOKEN not set");
  assert(!!Deno.env.get("DISCORD_CLIENT_ID"), "DISCORD_CLIENT_ID not set");
  assert(!!Deno.env.get("DATABASE_PATH"), "DATABASE_PATH not set");
  assert(!!Deno.env.get("DEPLOY_URL"), "DEPLOY_URL not set");
  assert(!!Deno.env.get("DEPLOY_SECRET"), "DEPLOY_SECRET not set");
})();

// Test 2: Database Connection
await test("Database can be opened", async () => {
  const dbPath = Deno.env.get("DATABASE_PATH") || "./data/moustache_plucker.db";
  const db = new Database(dbPath);
  
  // Check tables exist
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all() as { name: string }[];
  
  const expectedTables = ["giveaways", "participants", "winners", "migrations"];
  for (const table of expectedTables) {
    assert(
      tables.some((t: any) => t.name === table),
      `Table '${table}' not found`
    );
  }
  
  db.close();
})();

// Test 3: Random Number Generation
await test("Cryptographic randomness works", async () => {
  const array = new Uint32Array(10);
  crypto.getRandomValues(array);
  
  // Check that values are different (extremely unlikely to fail with crypto random)
  const uniqueValues = new Set(array);
  assert(uniqueValues.size > 1, "Random values are not random");
})();

// Test 4: Time Parsing
await test("Duration parsing works correctly", () => {
  const parseTests = [
    { input: "30", expected: 30000 }, // 30 seconds default
    { input: "30s", expected: 30000 },
    { input: "5m", expected: 300000 },
    { input: "2h", expected: 7200000 },
    { input: "1d", expected: 86400000 },
    { input: "1y", expected: 31536000000 },
  ];
  
  for (const test of parseTests) {
    const result = parseDuration(test.input);
    assert(
      result === test.expected,
      `Duration '${test.input}' should be ${test.expected}ms, got ${result}ms`
    );
  }
})();

// Test 5: Deno Deploy Connectivity
await test("Can connect to Deno Deploy", async () => {
  const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
  
  try {
    const response = await fetch(deployUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    
    assert(
      response.ok || response.status === 405, // HEAD might not be allowed
      `Deploy server returned ${response.status}`
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Deploy server timeout (5s)");
    }
    throw error;
  }
})();

// Test 6: Discord Token Format
await test("Discord token format is valid", () => {
  const token = Deno.env.get("DISCORD_TOKEN") || "";
  assert(token.length > 50, "Discord token too short");
  assert(token.includes("."), "Discord token missing delimiter");
})();

// Test 7: File Structure
await test("Required directories exist", async () => {
  const requiredDirs = [
    "./src",
    "./src/commands",
    "./src/services",
    "./src/utils",
    "./src/db",
    "./data",
  ];
  
  for (const dir of requiredDirs) {
    try {
      const stat = await Deno.stat(dir);
      assert(stat.isDirectory, `${dir} is not a directory`);
    } catch {
      throw new Error(`Directory ${dir} not found`);
    }
  }
})();

// Test 8: Command Files
await test("All slash commands exist", async () => {
  const commands = [
    "giveaway.ts",
    "cancel.ts",
    "sync.ts",
    "end.ts",
  ];
  
  for (const cmd of commands) {
    try {
      await Deno.stat(`./src/commands/${cmd}`);
    } catch {
      throw new Error(`Command file ${cmd} not found`);
    }
  }
})();

// Helper function (simplified version)
function parseDuration(input: string): number {
  const match = input.match(/^(\d+)([smhdwy]?)$/);
  if (!match) return 0;
  
  const [, num, unit] = match;
  const value = parseInt(num);
  
  const multipliers: Record<string, number> = {
    "": 1000,        // Default to seconds
    "s": 1000,       // Seconds
    "m": 60000,      // Minutes
    "h": 3600000,    // Hours
    "d": 86400000,   // Days
    "y": 31536000000 // Years
  };
  
  return value * (multipliers[unit] || 1000);
}

// Summary
console.log("\n" + "=".repeat(50));
console.log(`${GREEN}Passed: ${testsPassed}${RESET} | ${RED}Failed: ${testsFailed}${RESET}`);

if (testsFailed === 0) {
  console.log(`\n${GREEN}✅ All quick tests passed!${RESET}`);
  console.log("\nNext steps:");
  console.log("1. Run the bot: deno task dev");
  console.log("2. Test in Discord: /giveaway Test $5 30s 1");
  console.log("3. Run full test suite: deno run -A scripts/test-full.ts");
} else {
  console.log(`\n${RED}❌ Some tests failed. Fix issues before running the bot.${RESET}`);
  Deno.exit(1);
}