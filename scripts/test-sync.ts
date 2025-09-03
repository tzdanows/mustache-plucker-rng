#!/usr/bin/env -S deno run --allow-net --allow-env

// Test script to manually sync a giveaway to Deno Deploy

const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
const authToken = Deno.env.get("DEPLOY_SECRET");

if (!authToken) {
  console.error("❌ DEPLOY_SECRET environment variable is required");
  console.error("Please set it in your .env file");
  Deno.exit(1);
}

const testGiveaway = {
  giveawayId: "test-" + Date.now(),
  id: "test-" + Date.now(),
  itemName: "Test Keycap $50",
  status: "ended",
  winnerCount: 3,
  endsAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  creatorId: "123456789",
  creatorUsername: "TestUser",
  participants: [
    { userId: "user1", username: "Alice", enteredAt: new Date().toISOString() },
    { userId: "user2", username: "Bob", enteredAt: new Date().toISOString() },
    { userId: "user3", username: "Charlie", enteredAt: new Date().toISOString() },
  ],
  winners: [
    { userId: "user1", username: "Alice", position: 1 },
    { userId: "user2", username: "Bob", position: 2 },
  ]
};

console.log(`🌙 Testing sync to ${deployUrl}`);
console.log(`Using token: ${authToken.substring(0, 10)}...`);

try {
  const response = await fetch(`${deployUrl}/api/giveaway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify(testGiveaway)
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error(`❌ Sync failed: ${response.status} ${response.statusText}`);
    console.error(`Response: ${responseText}`);
  } else {
    console.log(`✅ Sync successful!`);
    console.log(`Response: ${responseText}`);
    console.log(`\n📎 View at: ${deployUrl}/report/${testGiveaway.giveawayId}`);
  }
} catch (error) {
  console.error(`❌ Failed to connect: ${error}`);
  console.error(`\nMake sure:`);
  console.error(`1. Deno Deploy app is running at ${deployUrl}`);
  console.error(`2. DEPLOY_SECRET is set in .env`);
  console.error(`3. BOT_SECRET matches DEPLOY_SECRET in the Deno Deploy app`);
}