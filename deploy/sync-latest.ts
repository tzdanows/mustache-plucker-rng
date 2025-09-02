#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write

import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

// Load environment variables
await load({ export: true });

// Open database
const db = new DB("../data/moustache_plucker.db");

// Get the latest flash sale
const latest = db.prepare("SELECT * FROM giveaways ORDER BY created_at DESC LIMIT 1").get();

if (!latest) {
  console.error("No flash sales found");
  Deno.exit(1);
}

console.log(`Found flash sale: ${latest.id}`);
console.log(`Item: ${latest.item_name}`);
console.log(`Status: ${latest.status}`);

// Get participants
const participants = db.prepare(
  `SELECT user_id FROM participants WHERE giveaway_id = ?`
).all(latest.id);

// Get winners
const winners = db.prepare(
  `SELECT user_id, position FROM winners WHERE giveaway_id = ?`
).all(latest.id);

const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
const authToken = Deno.env.get("DEPLOY_SECRET") || "mustacherngpluckernightcaps2025";

const syncData = {
  giveawayId: latest.id,
  id: latest.id,
  itemName: latest.item_name,
  status: latest.status,
  winnerCount: latest.winner_count,
  endsAt: latest.ends_at,
  createdAt: latest.created_at,
  creatorId: latest.creator_id || "unknown",
  creatorUsername: "User",
  participants: participants.map((p: any) => ({
    userId: p.user_id,
    username: `User ${p.user_id.substring(0, 6)}`,
    enteredAt: new Date().toISOString()
  })),
  winners: winners.map((w: any) => ({
    userId: w.user_id,
    username: `User ${w.user_id.substring(0, 6)}`,
    position: w.position
  }))
};

console.log(`\nSyncing to ${deployUrl}/api/giveaway`);

try {
  const response = await fetch(`${deployUrl}/api/giveaway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify(syncData)
  });

  const responseText = await response.text();
  
  console.log(`Response status: ${response.status}`);
  console.log(`Response: ${responseText}`);
  
  if (response.ok) {
    console.log(`\n✅ Successfully synced!`);
    console.log(`View at: ${deployUrl}/report/${latest.id}`);
  } else {
    console.log(`\n❌ Sync failed`);
  }
} catch (error) {
  console.error("Error:", error);
}

db.close();