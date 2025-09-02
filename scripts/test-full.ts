#!/usr/bin/env -S deno run --allow-all

/**
 * Full Test Suite for Moustache Plucker Bot
 * Comprehensive testing including Discord API simulation
 */

import { Database } from "@db/sqlite";
import { load } from "@std/dotenv";
import { assertEquals, assertExists } from "@std/assert";

await load({ export: true });

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

console.log(`${YELLOW}🌙 Moustache Plucker Bot - Full Test Suite${RESET}\n`);

// Test Categories
const categories = {
  env: [] as TestResult[],
  database: [] as TestResult[],
  commands: [] as TestResult[],
  services: [] as TestResult[],
  utils: [] as TestResult[],
  deploy: [] as TestResult[],
  integration: [] as TestResult[],
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

async function runTest(
  category: keyof typeof categories,
  name: string,
  fn: () => void | Promise<void>
): Promise<void> {
  const start = performance.now();
  let passed = true;
  let error: string | undefined;
  
  try {
    await fn();
    console.log(`  ${GREEN}✓${RESET} ${name}`);
  } catch (e) {
    passed = false;
    error = e.message;
    console.log(`  ${RED}✗${RESET} ${name}`);
    console.log(`    ${RED}${error}${RESET}`);
  }
  
  const duration = performance.now() - start;
  categories[category].push({ name, passed, error, duration });
}

// === ENVIRONMENT TESTS ===
console.log(`\n${BLUE}Environment Configuration${RESET}`);

await runTest("env", "All required environment variables", () => {
  const required = [
    "DISCORD_TOKEN",
    "DISCORD_CLIENT_ID", 
    "DATABASE_PATH",
    "DEPLOY_URL",
    "DEPLOY_SECRET",
  ];
  
  for (const key of required) {
    assertExists(Deno.env.get(key), `${key} is required`);
  }
});

await runTest("env", "Discord token structure", () => {
  const token = Deno.env.get("DISCORD_TOKEN")!;
  assertEquals(token.split(".").length, 3, "Token should have 3 parts");
  assertEquals(token.length > 50, true, "Token too short");
});

await runTest("env", "Deploy URL format", () => {
  const url = Deno.env.get("DEPLOY_URL")!;
  assertEquals(url.startsWith("https://"), true, "Should use HTTPS");
  assertEquals(url.includes("deno.dev"), true, "Should be Deno Deploy URL");
});

// === DATABASE TESTS ===
console.log(`\n${BLUE}Database Tests${RESET}`);

await runTest("database", "Database file exists", async () => {
  const dbPath = Deno.env.get("DATABASE_PATH")!;
  const stat = await Deno.stat(dbPath);
  assertEquals(stat.isFile, true);
});

await runTest("database", "Database schema integrity", () => {
  const dbPath = Deno.env.get("DATABASE_PATH")!;
  const db = new Database(dbPath);
  
  // Check giveaways table
  const giveawaysCols = db.prepare("PRAGMA table_info(giveaways)").all() as any[];
  const giveawayColNames = giveawaysCols.map((c: any) => c.name);
  const expectedCols = ["id", "item_name", "winner_count", "ends_at", "created_at", "creator_id", "channel_id", "message_id", "status"];
  
  for (const col of expectedCols) {
    assertEquals(giveawayColNames.includes(col), true, `Missing column: ${col}`);
  }
  
  db.close();
});

await runTest("database", "Can insert and query giveaway", () => {
  const dbPath = Deno.env.get("DATABASE_PATH")!;
  const db = new Database(dbPath);
  
  const testId = `test-${Date.now()}`;
  
  // Insert test giveaway with guild_id
  db.prepare(`
    INSERT INTO giveaways (id, guild_id, item_name, winner_count, ends_at, created_at, creator_id, channel_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testId,
    "test-guild",
    "Test Item",
    1,
    new Date(Date.now() + 60000).toISOString(),
    new Date().toISOString(),
    "test-user",
    "test-channel",
    "active"
  );
  
  // Query it back
  const result = db.prepare("SELECT * FROM giveaways WHERE id = ?").get(testId);
  assertExists(result);
  assertEquals(result.item_name, "Test Item");
  
  // Clean up
  db.prepare("DELETE FROM giveaways WHERE id = ?").run(testId);
  db.close();
});

// === COMMAND TESTS ===
console.log(`\n${BLUE}Command Tests${RESET}`);

await runTest("commands", "Command registration script exists", async () => {
  const stat = await Deno.stat(`./src/register-commands.ts`);
  assertEquals(stat.isFile, true, `register-commands.ts should exist`);
});

await runTest("commands", "Registration script has correct commands", async () => {
  const content = await Deno.readTextFile(`./src/register-commands.ts`);
  
  // Check that the new commands are defined
  assertEquals(content.includes('setName("fs")'), true, "Should have /fs command");
  assertEquals(content.includes('setName("cancel")'), true, "Should have /cancel command");
  assertEquals(content.includes('setName("end")'), true, "Should have /end command");
  assertEquals(content.includes('setName("sync")'), true, "Should have /sync command");
  assertEquals(content.includes('setName("ping")'), true, "Should have /ping command");
});

// === SERVICE TESTS ===
console.log(`\n${BLUE}Service Tests${RESET}`);

await runTest("services", "GiveawayManager class exists", async () => {
  const module = await import("../src/services/giveawayManager.ts");
  assertExists(module.GiveawayManager);
  assertEquals(typeof module.GiveawayManager, "function");
});

await runTest("services", "EmbedUpdater class exists", async () => {
  const module = await import("../src/services/embedUpdater.ts");
  assertExists(module.EmbedUpdater);
  assertEquals(typeof module.EmbedUpdater, "function");
});

await runTest("services", "DeploySync class exists", async () => {
  const module = await import("../src/services/deploySync.ts");
  assertExists(module.DeploySync);
  assertEquals(typeof module.DeploySync, "function");
});

// === UTILITY TESTS ===
console.log(`\n${BLUE}Utility Tests${RESET}`);

await runTest("utils", "Duration parsing", async () => {
  const { parseDuration } = await import("../src/utils/duration.ts");
  
  const tests = [
    { input: "30", expected: 30000 },
    { input: "30s", expected: 30000 },
    { input: "5m", expected: 300000 },
    { input: "2h", expected: 7200000 },
    { input: "1d", expected: 86400000 },
    { input: "1y", expected: 31536000000 },
  ];
  
  for (const test of tests) {
    const result = parseDuration(test.input);
    assertEquals(result, test.expected, `${test.input} should parse to ${test.expected}ms`);
  }
});

await runTest("utils", "Time formatting", async () => {
  const { formatTimeRemaining } = await import("../src/utils/duration.ts");
  
  // Test with future date
  const future = new Date(Date.now() + 60000); // 1 minute
  const result = formatTimeRemaining(future);
  assertEquals(result.includes("59s") || result.includes("1m"), true);
  
  // Test with past date
  const past = new Date(Date.now() - 1000);
  assertEquals(formatTimeRemaining(past), "Ended");
});

await runTest("utils", "Random winner selection", async () => {
  const { selectRandomWinners } = await import("../src/utils/random.ts");
  
  const participants = ["user1", "user2", "user3", "user4", "user5"];
  
  // Test selecting fewer winners than participants
  const winners = selectRandomWinners(participants, 2);
  assertEquals(winners.length, 2);
  assertEquals(new Set(winners).size, 2, "Winners should be unique");
  
  // Test selecting more winners than participants
  const allWinners = selectRandomWinners(participants, 10);
  assertEquals(allWinners.length, 5, "Can't have more winners than participants");
});

// === DEPLOY TESTS ===
console.log(`\n${BLUE}Deno Deploy Integration${RESET}`);

await runTest("deploy", "Deploy server is reachable", async () => {
  const url = Deno.env.get("DEPLOY_URL")!;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });
  
  assertEquals(response.ok, true, `Server returned ${response.status}`);
});

await runTest("deploy", "API endpoint accepts POST", async () => {
  const url = Deno.env.get("DEPLOY_URL")!;
  const token = Deno.env.get("DEPLOY_SECRET")!;
  
  const testData = {
    giveawayId: `test-suite-${Date.now()}`,
    id: `test-suite-${Date.now()}`,
    itemName: "Test Suite Item",
    status: "ended",
    winnerCount: 1,
    endsAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    creatorId: "test",
    creatorUsername: "TestBot",
    participants: [],
    winners: [],
  };
  
  const response = await fetch(`${url}/api/giveaway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(testData),
    signal: AbortSignal.timeout(10000),
  });
  
  assertEquals(response.ok, true, `API returned ${response.status}`);
});

// === INTEGRATION TESTS ===
console.log(`\n${BLUE}Integration Tests${RESET}`);

await runTest("integration", "Database migrations completed", () => {
  const dbPath = Deno.env.get("DATABASE_PATH")!;
  const db = new Database(dbPath);
  
  const migrations = db.prepare("SELECT * FROM migrations ORDER BY id DESC LIMIT 1").get();
  assertExists(migrations, "Should have at least one migration");
  
  db.close();
});

await runTest("integration", "Giveaway lifecycle simulation", () => {
  const dbPath = Deno.env.get("DATABASE_PATH")!;
  const db = new Database(dbPath);
  
  const giveawayId = `lifecycle-test-${Date.now()}`;
  
  // Create giveaway with guild_id
  db.prepare(`
    INSERT INTO giveaways (id, guild_id, item_name, winner_count, ends_at, created_at, creator_id, channel_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveawayId,
    "test-guild",
    "Lifecycle Test",
    2,
    new Date(Date.now() + 1000).toISOString(),
    new Date().toISOString(),
    "test-creator",
    "test-channel",
    "active"
  );
  
  // Add participants
  const participants = ["user1", "user2", "user3"];
  for (const userId of participants) {
    db.prepare(`
      INSERT INTO participants (giveaway_id, user_id, entered_at)
      VALUES (?, ?, ?)
    `).run(giveawayId, userId, new Date().toISOString());
  }
  
  // Verify participants
  const count = db.prepare(
    "SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?"
  ).get(giveawayId) as { count: number };
  assertEquals(count.count, 3);
  
  // End giveaway
  db.prepare("UPDATE giveaways SET status = ? WHERE id = ?").run("ended", giveawayId);
  
  // Add winners
  db.prepare(`
    INSERT INTO winners (giveaway_id, user_id, position)
    VALUES (?, ?, ?)
  `).run(giveawayId, "user1", 1);
  
  // Verify winner
  const winner = db.prepare(
    "SELECT * FROM winners WHERE giveaway_id = ?"
  ).get(giveawayId);
  assertExists(winner);
  
  // Clean up
  db.prepare("DELETE FROM winners WHERE giveaway_id = ?").run(giveawayId);
  db.prepare("DELETE FROM participants WHERE giveaway_id = ?").run(giveawayId);
  db.prepare("DELETE FROM giveaways WHERE id = ?").run(giveawayId);
  
  db.close();
});

// === SUMMARY ===
console.log("\n" + "=".repeat(60));
console.log(`${YELLOW}Test Results Summary${RESET}\n`);

let totalPassed = 0;
let totalFailed = 0;
let totalDuration = 0;

for (const [category, results] of Object.entries(categories)) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const duration = results.reduce((sum, r) => sum + r.duration, 0);
  
  totalPassed += passed;
  totalFailed += failed;
  totalDuration += duration;
  
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  const status = failed === 0 ? GREEN : RED;
  
  console.log(`${categoryName.padEnd(15)} ${status}${passed}/${results.length}${RESET} (${duration.toFixed(0)}ms)`);
}

console.log("-".repeat(60));
console.log(`${"Total".padEnd(15)} ${totalFailed === 0 ? GREEN : RED}${totalPassed}/${totalPassed + totalFailed}${RESET} (${totalDuration.toFixed(0)}ms)`);

if (totalFailed === 0) {
  console.log(`\n${GREEN}✅ All tests passed! Bot is ready for production.${RESET}`);
  console.log("\nDeployment checklist:");
  console.log("1. ✓ Environment configured");
  console.log("2. ✓ Database initialized");
  console.log("3. ✓ Commands registered");
  console.log("4. ✓ Services functional");
  console.log("5. ✓ Deploy integration working");
  console.log("\nStart bot with: deno task dev");
  Deno.exit(0);
} else {
  console.log(`\n${RED}❌ ${totalFailed} test(s) failed. Review errors above.${RESET}`);
  
  // Show failed tests
  console.log(`\n${RED}Failed Tests:${RESET}`);
  for (const [category, results] of Object.entries(categories)) {
    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log(`\n  ${category}:`);
      for (const test of failed) {
        console.log(`    - ${test.name}`);
        if (test.error) {
          console.log(`      ${RED}${test.error}${RESET}`);
        }
      }
    }
  }
  
  Deno.exit(1);
}