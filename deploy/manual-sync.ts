#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// Load environment variables
await load({ export: true });

const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
const authToken = Deno.env.get("DEPLOY_SECRET") || "mustacherngpluckernightcaps2025";

// Get the flash sale ID from command line argument or use the latest one
const flashSaleId = Deno.args[0] || "gvwy_1756811162583_385zlsf";

const testData = {
  giveawayId: flashSaleId,
  id: flashSaleId,
  itemName: "prize: wokege $50",
  status: "ended",
  winnerCount: 1,
  endsAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  creatorId: "1217149598808780931",
  creatorUsername: "PRIME",
  participants: [
    { userId: "1217149598808780931", username: "PRIME", enteredAt: new Date().toISOString() }
  ],
  winners: [
    { userId: "1217149598808780931", username: "PRIME", position: 1 }
  ]
};

console.log(`Syncing flash sale: ${flashSaleId}`);
console.log(`To: ${deployUrl}/api/giveaway`);

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
    console.log(`View at: ${deployUrl}/report/${flashSaleId}`);
  } else {
    console.log(`\n❌ Sync failed`);
  }
} catch (error) {
  console.error("Error:", error);
}