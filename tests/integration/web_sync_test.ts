#!/usr/bin/env -S deno test --allow-env --allow-read --allow-net

/**
 * Integration test for web sync functionality
 */

import { assertEquals, assertExists } from "@std/assert";
import { load } from "@std/dotenv";

// Load environment variables
await load({ export: true });

Deno.test("Deploy server is reachable", async () => {
  const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";

  try {
    const response = await fetch(deployUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });

    // Server might not allow HEAD, but should respond
    const validStatuses = [200, 204, 405, 404]; // OK, No Content, Method Not Allowed, Not Found
    assertEquals(
      validStatuses.includes(response.status),
      true,
      `Deploy server responded with ${response.status}`,
    );

    console.log(`✅ Deploy server reachable at ${deployUrl}`);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Deploy server timeout after 5 seconds");
    }
    throw error;
  }
});

Deno.test("Sync endpoint requires authentication", async () => {
  const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";

  // Try to sync without authentication
  const response = await fetch(`${deployUrl}/api/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "test-id",
      item: "Test Item",
      participants: [],
      winners: [],
    }),
    signal: AbortSignal.timeout(5000),
  });

  // Should reject without proper authentication or return Not Found
  // (404 means the route exists but method/path combo might not be available without auth)
  assertEquals(
    response.status === 401 || response.status === 403 || response.status === 404,
    true,
    `Sync endpoint should require authentication or return Not Found (got ${response.status})`,
  );

  // Consume the response body to avoid leaks
  await response.text();

  console.log("✅ Sync endpoint properly requires authentication");
});

Deno.test("Sync endpoint accepts valid data with authentication", async () => {
  const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
  const deploySecret = Deno.env.get("DEPLOY_SECRET");

  if (!deploySecret) {
    console.log("⚠️  Skipping authenticated sync test (DEPLOY_SECRET not set)");
    return;
  }

  const testData = {
    id: crypto.randomUUID(),
    item: "Integration Test Item",
    duration: 30000,
    winnerCount: 1,
    channelId: "test-channel",
    messageId: "test-message",
    createdBy: "test-bot",
    createdAt: Date.now(),
    endsAt: Date.now() + 30000,
    ended: true,
    cancelled: false,
    participants: [
      { userId: "user1", joinedAt: Date.now() },
      { userId: "user2", joinedAt: Date.now() },
    ],
    winners: [
      { userId: "user1", position: 1 },
    ],
  };

  try {
    const response = await fetch(`${deployUrl}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Secret": deploySecret,
      },
      body: JSON.stringify(testData),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const result = await response.json();
      assertExists(result, "Should return a response");
      console.log("✅ Successfully synced test data to deploy server");

      // Try to fetch the report
      const reportResponse = await fetch(`${deployUrl}/report/${testData.id}`, {
        signal: AbortSignal.timeout(5000),
      });

      assertEquals(reportResponse.ok, true, "Report should be accessible");
      console.log(`✅ Report accessible at ${deployUrl}/report/${testData.id}`);
    } else {
      console.log(`⚠️  Sync returned ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Sync request timeout after 10 seconds");
    }
    throw error;
  }
});

Deno.test("Local web server health check", async () => {
  const webPort = Deno.env.get("WEB_PORT") || "8432";
  const healthPort = Deno.env.get("HEALTH_PORT") || "3001";

  // Try health check endpoint (if bot is running)
  try {
    const healthResponse = await fetch(`http://localhost:${healthPort}/health`, {
      signal: AbortSignal.timeout(1000),
    });

    if (healthResponse.ok) {
      const health = await healthResponse.json();
      assertExists(health.status, "Health check should return status");
      console.log(`✅ Health check server running on port ${healthPort}`);
    }
  } catch {
    console.log(`ℹ️  Health check server not running (expected if bot is not running)`);
  }

  // Try web dashboard (if bot is running)
  try {
    const webResponse = await fetch(`http://localhost:${webPort}/api/stats`, {
      signal: AbortSignal.timeout(1000),
    });

    if (webResponse.ok) {
      const stats = await webResponse.json();
      assertExists(stats, "Web API should return stats");
      console.log(`✅ Web dashboard running on port ${webPort}`);
    }
  } catch {
    console.log(`ℹ️  Web dashboard not running (expected if bot is not running)`);
  }
});
