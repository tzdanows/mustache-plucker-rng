#!/usr/bin/env -S deno run --allow-all

/**
 * Stress Test for Moustache Plucker Bot
 * Tests handling of high-volume concurrent reactions
 */

import { Database } from "@db/sqlite";
import { load } from "@std/dotenv";

await load({ export: true });

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

console.log(`${YELLOW}🌙 Moustache Plucker Bot - Stress Test${RESET}\n`);

// Test configurations
const CONCURRENT_USERS = 100;
const BURST_USERS = 500;
const SUSTAINED_DURATION_MS = 5000;

interface TestResult {
  test: string;
  passed: boolean;
  metrics: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageTimeMs: number;
    maxTimeMs: number;
    minTimeMs: number;
    throughput: number; // operations per second
  };
  errors: string[];
}

const results: TestResult[] = [];

// Database stress test
async function testDatabaseConcurrency(): Promise<TestResult> {
  console.log(`\n${BLUE}Testing Database Concurrency (${CONCURRENT_USERS} users)...${RESET}`);
  
  const dbPath = Deno.env.get("DATABASE_PATH") || "./data/moustache_plucker.db";
  const db = new Database(dbPath);
  const giveawayId = `stress-test-${Date.now()}`;
  const errors: string[] = [];
  const times: number[] = [];
  
  // Create test giveaway
  db.prepare(`
    INSERT INTO giveaways (id, guild_id, item_name, winner_count, ends_at, created_at, creator_id, channel_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveawayId,
    "test-guild",
    "Stress Test Item",
    10,
    new Date(Date.now() + 600000).toISOString(),
    new Date().toISOString(),
    "test-creator",
    "test-channel",
    "active"
  );
  
  // Simulate concurrent participant additions
  const operations = Array.from({ length: CONCURRENT_USERS }, (_, i) => async () => {
    const userId = `user-${i}`;
    const start = performance.now();
    
    try {
      // Check if already entered (simulating reaction check)
      const existing = db.prepare(
        "SELECT * FROM participants WHERE giveaway_id = ? AND user_id = ?"
      ).get(giveawayId, userId);
      
      if (!existing) {
        // Add participant
        db.prepare(`
          INSERT INTO participants (giveaway_id, user_id, entered_at)
          VALUES (?, ?, ?)
        `).run(giveawayId, userId, new Date().toISOString());
      }
      
      const end = performance.now();
      times.push(end - start);
      return true;
    } catch (error) {
      errors.push(`User ${i}: ${error.message}`);
      return false;
    }
  });
  
  // Execute all operations concurrently
  const startTime = performance.now();
  const results = await Promise.all(operations.map(op => op()));
  const endTime = performance.now();
  
  const successful = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  
  // Verify final count
  const finalCount = db.prepare(
    "SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?"
  ).get(giveawayId) as { count: number };
  
  // Clean up
  db.prepare("DELETE FROM participants WHERE giveaway_id = ?").run(giveawayId);
  db.prepare("DELETE FROM giveaways WHERE id = ?").run(giveawayId);
  db.close();
  
  const totalTime = endTime - startTime;
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  
  return {
    test: "Database Concurrency",
    passed: successful === CONCURRENT_USERS && finalCount.count === CONCURRENT_USERS,
    metrics: {
      totalOperations: CONCURRENT_USERS,
      successfulOperations: successful,
      failedOperations: failed,
      averageTimeMs: avgTime,
      maxTimeMs: Math.max(...times),
      minTimeMs: Math.min(...times),
      throughput: (CONCURRENT_USERS / totalTime) * 1000,
    },
    errors: errors.slice(0, 5), // Show first 5 errors
  };
}

// Burst load test
async function testBurstLoad(): Promise<TestResult> {
  console.log(`\n${BLUE}Testing Burst Load (${BURST_USERS} users)...${RESET}`);
  
  const dbPath = Deno.env.get("DATABASE_PATH") || "./data/moustache_plucker.db";
  const db = new Database(dbPath);
  const giveawayId = `burst-test-${Date.now()}`;
  const errors: string[] = [];
  const times: number[] = [];
  
  // Create test giveaway
  db.prepare(`
    INSERT INTO giveaways (id, guild_id, item_name, winner_count, ends_at, created_at, creator_id, channel_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveawayId,
    "test-guild",
    "Burst Test Item",
    10,
    new Date(Date.now() + 600000).toISOString(),
    new Date().toISOString(),
    "test-creator",
    "test-channel",
    "active"
  );
  
  // Simulate burst of participants
  const startTime = performance.now();
  let successful = 0;
  let failed = 0;
  
  // Process in batches to avoid overwhelming
  const batchSize = 50;
  for (let batch = 0; batch < BURST_USERS; batch += batchSize) {
    const batchOps = Array.from({ length: Math.min(batchSize, BURST_USERS - batch) }, (_, i) => async () => {
      const userId = `burst-user-${batch + i}`;
      const start = performance.now();
      
      try {
        db.prepare(`
          INSERT OR IGNORE INTO participants (giveaway_id, user_id, entered_at)
          VALUES (?, ?, ?)
        `).run(giveawayId, userId, new Date().toISOString());
        
        const end = performance.now();
        times.push(end - start);
        return true;
      } catch (error) {
        errors.push(`User ${batch + i}: ${error.message}`);
        return false;
      }
    });
    
    const batchResults = await Promise.all(batchOps.map(op => op()));
    successful += batchResults.filter(r => r).length;
    failed += batchResults.filter(r => !r).length;
  }
  
  const endTime = performance.now();
  
  // Verify final count
  const finalCount = db.prepare(
    "SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?"
  ).get(giveawayId) as { count: number };
  
  // Clean up
  db.prepare("DELETE FROM participants WHERE giveaway_id = ?").run(giveawayId);
  db.prepare("DELETE FROM giveaways WHERE id = ?").run(giveawayId);
  db.close();
  
  const totalTime = endTime - startTime;
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  
  return {
    test: "Burst Load",
    passed: successful === BURST_USERS && finalCount.count === BURST_USERS,
    metrics: {
      totalOperations: BURST_USERS,
      successfulOperations: successful,
      failedOperations: failed,
      averageTimeMs: avgTime,
      maxTimeMs: Math.max(...times),
      minTimeMs: Math.min(...times),
      throughput: (BURST_USERS / totalTime) * 1000,
    },
    errors: errors.slice(0, 5),
  };
}

// Sustained load test
async function testSustainedLoad(): Promise<TestResult> {
  console.log(`\n${BLUE}Testing Sustained Load (${SUSTAINED_DURATION_MS}ms)...${RESET}`);
  
  const dbPath = Deno.env.get("DATABASE_PATH") || "./data/moustache_plucker.db";
  const db = new Database(dbPath);
  const giveawayId = `sustained-test-${Date.now()}`;
  const errors: string[] = [];
  const times: number[] = [];
  
  // Create test giveaway
  db.prepare(`
    INSERT INTO giveaways (id, guild_id, item_name, winner_count, ends_at, created_at, creator_id, channel_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveawayId,
    "test-guild",
    "Sustained Test Item",
    10,
    new Date(Date.now() + 600000).toISOString(),
    new Date().toISOString(),
    "test-creator",
    "test-channel",
    "active"
  );
  
  const startTime = performance.now();
  let operationCount = 0;
  let successful = 0;
  let failed = 0;
  
  // Run operations for the duration
  while (performance.now() - startTime < SUSTAINED_DURATION_MS) {
    const userId = `sustained-user-${operationCount}`;
    const opStart = performance.now();
    
    try {
      // Mix of adds and checks (simulating real usage)
      if (Math.random() > 0.3) {
        db.prepare(`
          INSERT OR IGNORE INTO participants (giveaway_id, user_id, entered_at)
          VALUES (?, ?, ?)
        `).run(giveawayId, userId, new Date().toISOString());
      } else {
        db.prepare(
          "SELECT * FROM participants WHERE giveaway_id = ? AND user_id = ?"
        ).get(giveawayId, userId);
      }
      
      successful++;
    } catch (error) {
      failed++;
      errors.push(`Op ${operationCount}: ${error.message}`);
    }
    
    times.push(performance.now() - opStart);
    operationCount++;
    
    // Small delay to simulate realistic spacing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
  }
  
  const endTime = performance.now();
  
  // Clean up
  db.prepare("DELETE FROM participants WHERE giveaway_id = ?").run(giveawayId);
  db.prepare("DELETE FROM giveaways WHERE id = ?").run(giveawayId);
  db.close();
  
  const totalTime = endTime - startTime;
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  
  return {
    test: "Sustained Load",
    passed: failed === 0 && avgTime < 50, // All succeed and avg under 50ms
    metrics: {
      totalOperations: operationCount,
      successfulOperations: successful,
      failedOperations: failed,
      averageTimeMs: avgTime,
      maxTimeMs: Math.max(...times),
      minTimeMs: Math.min(...times),
      throughput: (operationCount / totalTime) * 1000,
    },
    errors: errors.slice(0, 5),
  };
}

// Winner selection performance test
async function testWinnerSelection(): Promise<TestResult> {
  console.log(`\n${BLUE}Testing Winner Selection Performance...${RESET}`);
  
  const dbPath = Deno.env.get("DATABASE_PATH") || "./data/moustache_plucker.db";
  const db = new Database(dbPath);
  const giveawayId = `selection-test-${Date.now()}`;
  const participantCount = 1000;
  
  // Create test giveaway
  db.prepare(`
    INSERT INTO giveaways (id, guild_id, item_name, winner_count, ends_at, created_at, creator_id, channel_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveawayId,
    "test-guild",
    "Selection Test Item",
    50, // Select 50 winners from 1000
    new Date(Date.now() + 600000).toISOString(),
    new Date().toISOString(),
    "test-creator",
    "test-channel",
    "active"
  );
  
  // Add many participants
  const insertStmt = db.prepare(`
    INSERT INTO participants (giveaway_id, user_id, entered_at)
    VALUES (?, ?, ?)
  `);
  
  for (let i = 0; i < participantCount; i++) {
    insertStmt.run(giveawayId, `selection-user-${i}`, new Date().toISOString());
  }
  
  // Test winner selection
  const startTime = performance.now();
  
  // Get all participants
  const participants = db.prepare(
    "SELECT user_id FROM participants WHERE giveaway_id = ? ORDER BY entered_at"
  ).all(giveawayId) as { user_id: string }[];
  
  // Simulate random winner selection (Fisher-Yates shuffle)
  const participantIds = participants.map(p => p.user_id);
  for (let i = participantIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participantIds[i], participantIds[j]] = [participantIds[j], participantIds[i]];
  }
  
  const winners = participantIds.slice(0, 50);
  
  // Insert winners
  const winnerStmt = db.prepare(`
    INSERT INTO winners (giveaway_id, user_id, position)
    VALUES (?, ?, ?)
  `);
  
  for (let i = 0; i < winners.length; i++) {
    winnerStmt.run(giveawayId, winners[i], i + 1);
  }
  
  const endTime = performance.now();
  const selectionTime = endTime - startTime;
  
  // Clean up
  db.prepare("DELETE FROM winners WHERE giveaway_id = ?").run(giveawayId);
  db.prepare("DELETE FROM participants WHERE giveaway_id = ?").run(giveawayId);
  db.prepare("DELETE FROM giveaways WHERE id = ?").run(giveawayId);
  db.close();
  
  return {
    test: "Winner Selection (1000 participants, 50 winners)",
    passed: selectionTime < 100, // Should complete in under 100ms
    metrics: {
      totalOperations: 1,
      successfulOperations: 1,
      failedOperations: 0,
      averageTimeMs: selectionTime,
      maxTimeMs: selectionTime,
      minTimeMs: selectionTime,
      throughput: 1000 / selectionTime, // participants processed per second
    },
    errors: [],
  };
}

// Run all tests
async function runStressTests() {
  results.push(await testDatabaseConcurrency());
  results.push(await testBurstLoad());
  results.push(await testSustainedLoad());
  results.push(await testWinnerSelection());
  
  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log(`${YELLOW}Stress Test Results Summary${RESET}\n`);
  
  let allPassed = true;
  
  for (const result of results) {
    const status = result.passed ? `${GREEN}✓ PASSED${RESET}` : `${RED}✗ FAILED${RESET}`;
    console.log(`${result.test}: ${status}`);
    
    console.log(`  Operations: ${result.metrics.successfulOperations}/${result.metrics.totalOperations}`);
    console.log(`  Avg Time: ${result.metrics.averageTimeMs.toFixed(2)}ms`);
    console.log(`  Min/Max: ${result.metrics.minTimeMs.toFixed(2)}ms / ${result.metrics.maxTimeMs.toFixed(2)}ms`);
    console.log(`  Throughput: ${result.metrics.throughput.toFixed(0)} ops/sec`);
    
    if (result.errors.length > 0) {
      console.log(`  ${RED}Errors:${RESET}`);
      result.errors.forEach(err => console.log(`    - ${err}`));
    }
    
    console.log();
    allPassed = allPassed && result.passed;
  }
  
  // Scalability assessment
  console.log("-".repeat(60));
  console.log(`${YELLOW}Scalability Assessment${RESET}\n`);
  
  const dbConcurrency = results.find(r => r.test === "Database Concurrency");
  const burstLoad = results.find(r => r.test === "Burst Load");
  
  if (dbConcurrency && dbConcurrency.passed) {
    console.log(`${GREEN}✓${RESET} Can handle ${CONCURRENT_USERS} concurrent reactions`);
    console.log(`  Average response time: ${dbConcurrency.metrics.averageTimeMs.toFixed(2)}ms`);
  }
  
  if (burstLoad && burstLoad.passed) {
    console.log(`${GREEN}✓${RESET} Can handle ${BURST_USERS} users in rapid succession`);
    console.log(`  Throughput: ${burstLoad.metrics.throughput.toFixed(0)} reactions/second`);
  }
  
  // Recommendations
  console.log(`\n${YELLOW}Performance Recommendations${RESET}\n`);
  
  if (dbConcurrency && dbConcurrency.metrics.maxTimeMs > 100) {
    console.log(`⚠️  Consider adding database connection pooling for better concurrency`);
  }
  
  if (burstLoad && burstLoad.metrics.throughput < 100) {
    console.log(`⚠️  Consider implementing rate limiting to prevent abuse`);
  }
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.averageTimeMs, 0) / results.length;
  if (avgResponseTime < 50) {
    console.log(`${GREEN}✓${RESET} Excellent performance - average response time ${avgResponseTime.toFixed(2)}ms`);
  } else if (avgResponseTime < 100) {
    console.log(`${YELLOW}⚠${RESET} Good performance - average response time ${avgResponseTime.toFixed(2)}ms`);
  } else {
    console.log(`${RED}✗${RESET} Performance needs optimization - average response time ${avgResponseTime.toFixed(2)}ms`);
  }
  
  // Final verdict
  console.log("\n" + "=".repeat(60));
  if (allPassed) {
    console.log(`${GREEN}✅ Bot is ready for production scale!${RESET}`);
    console.log(`Can handle 100+ concurrent users without issues.`);
  } else {
    console.log(`${RED}❌ Some stress tests failed. Review results above.${RESET}`);
    Deno.exit(1);
  }
}

// Check database exists
try {
  const dbPath = Deno.env.get("DATABASE_PATH") || "./data/moustache_plucker.db";
  await Deno.stat(dbPath);
} catch {
  console.log(`${RED}Database not found. Run 'deno task db:init' first.${RESET}`);
  Deno.exit(1);
}

// Run tests
await runStressTests();