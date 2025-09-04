#!/usr/bin/env -S deno test --allow-env --allow-read --allow-write

/**
 * Integration test for RNG service and winner selection
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { Database } from "@db/sqlite";
import { load } from "@std/dotenv";
import { selectRandomWinners } from "../../src/utils/random.ts";

// Load environment variables
await load({ export: true });

Deno.test("RNG service selects correct number of winners", () => {
  const participants = ["user1", "user2", "user3", "user4", "user5"];

  // Test single winner
  const singleWinner = selectRandomWinners(participants, 1);
  assertEquals(singleWinner.length, 1, "Should select exactly 1 winner");
  assert(participants.includes(singleWinner[0]), "Winner should be from participants");

  // Test multiple winners
  const multipleWinners = selectRandomWinners(participants, 3);
  assertEquals(multipleWinners.length, 3, "Should select exactly 3 winners");

  // Check all winners are unique
  const uniqueWinners = new Set(multipleWinners);
  assertEquals(uniqueWinners.size, 3, "All winners should be unique");

  // Check all winners are from participants
  for (const winner of multipleWinners) {
    assert(participants.includes(winner), `Winner ${winner} should be from participants`);
  }
});

Deno.test("RNG service handles edge cases", () => {
  const participants = ["user1", "user2"];

  // Test when requesting more winners than participants
  const winners = selectRandomWinners(participants, 5);
  assertEquals(winners.length, 2, "Should not select more winners than participants");

  // Test with empty participants
  const noWinners = selectRandomWinners([], 1);
  assertEquals(noWinners.length, 0, "Should return empty array for no participants");

  // Test with zero winners requested
  const zeroWinners = selectRandomWinners(participants, 0);
  assertEquals(zeroWinners.length, 0, "Should return empty array when 0 winners requested");
});

Deno.test("RNG produces different results (randomness check)", () => {
  const participants = Array.from({ length: 10 }, (_, i) => `user${i + 1}`);

  // Run selection multiple times
  const results = [];
  for (let i = 0; i < 10; i++) {
    const winner = selectRandomWinners(participants, 1)[0];
    results.push(winner);
  }

  // Check that we got some variation (extremely unlikely to get all same with true randomness)
  const uniqueResults = new Set(results);
  assert(uniqueResults.size > 1, "RNG should produce different results across runs");

  console.log(`✅ RNG produced ${uniqueResults.size} different winners in 10 runs`);
});

Deno.test("Database integration for winner storage", async () => {
  const dbPath = ":memory:"; // Use in-memory database for testing
  const db = new Database(dbPath);

  try {
    // Create necessary tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS giveaways (
        id TEXT PRIMARY KEY,
        item TEXT NOT NULL,
        duration INTEGER NOT NULL,
        winner_count INTEGER NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        ends_at INTEGER NOT NULL,
        ended BOOLEAN DEFAULT FALSE,
        cancelled BOOLEAN DEFAULT FALSE,
        synced BOOLEAN DEFAULT FALSE
      );
      
      CREATE TABLE IF NOT EXISTS participants (
        giveaway_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        PRIMARY KEY (giveaway_id, user_id),
        FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
      );
      
      CREATE TABLE IF NOT EXISTS winners (
        giveaway_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (giveaway_id, user_id),
        FOREIGN KEY (giveaway_id) REFERENCES giveaways(id)
      );
    `);

    // Create a test giveaway
    const giveawayId = crypto.randomUUID();
    const now = Date.now();

    db.prepare(`
      INSERT INTO giveaways (id, item, duration, winner_count, channel_id, created_by, created_at, ends_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(giveawayId, "Test Item", 30000, 2, "123456", "admin", now, now + 30000);

    // Add participants
    const participants = ["user1", "user2", "user3", "user4", "user5"];
    for (const userId of participants) {
      db.prepare(`
        INSERT INTO participants (giveaway_id, user_id, joined_at)
        VALUES (?, ?, ?)
      `).run(giveawayId, userId, now);
    }

    // Select winners
    const winners = selectRandomWinners(participants, 2);

    // Store winners in database
    for (let i = 0; i < winners.length; i++) {
      db.prepare(`
        INSERT INTO winners (giveaway_id, user_id, position)
        VALUES (?, ?, ?)
      `).run(giveawayId, winners[i], i + 1);
    }

    // Verify winners were stored correctly
    const storedWinners = db.prepare(`
      SELECT user_id, position FROM winners 
      WHERE giveaway_id = ? 
      ORDER BY position
    `).all(giveawayId) as Array<{ user_id: string; position: number }>;

    assertEquals(storedWinners.length, 2, "Should store 2 winners");
    assertEquals(storedWinners[0].position, 1, "First winner should have position 1");
    assertEquals(storedWinners[1].position, 2, "Second winner should have position 2");

    console.log("✅ Winners stored successfully in database");
  } finally {
    db.close();
  }
});
