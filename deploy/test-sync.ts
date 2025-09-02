#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// Load environment variables
await load({ export: true });

const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
const authToken = Deno.env.get("DEPLOY_SECRET") || "mustacherngpluckernightcaps2025";

const testData = {
  giveawayId: "gvwy_1756807633932_zn0aqfe",
  id: "gvwy_1756807633932_zn0aqfe",
  itemName: "wokege",
  status: "ended",
  winnerCount: 1,
  endsAt: "2025-09-02T10:08:00.000Z",
  createdAt: "2025-09-02T10:07:13.932Z",
  creatorId: "123456789",
  creatorUsername: "TestUser",
  participants: [
    { userId: "user1", username: "Participant1", enteredAt: "2025-09-02T10:07:20.000Z" },
    { userId: "user2", username: "Participant2", enteredAt: "2025-09-02T10:07:25.000Z" }
  ],
  winners: [
    { userId: "user1", username: "Participant1", position: 1 }
  ]
};

console.log(`Syncing to ${deployUrl}/api/giveaway`);
console.log(`Using token: ${authToken.substring(0, 10)}...`);

try {
  const response = await fetch(`${deployUrl}/api/giveaway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify(testData)
  });

  const responseText = await response.text();
  
  console.log(`Response status: ${response.status}`);
  console.log(`Response: ${responseText}`);
  
  if (response.ok) {
    console.log(`\n✅ Successfully synced!`);
    console.log(`View at: ${deployUrl}/report/${testData.giveawayId}`);
  } else {
    console.log(`\n❌ Sync failed`);
  }
} catch (error) {
  console.error("Error:", error);
}