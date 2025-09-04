import { assertEquals, assertExists } from "@std/assert";
import { closeDatabase, getDatabase, initDatabase } from "../../src/db/database.ts";
import {
  addParticipant,
  createGiveaway,
  getGiveawayParticipants,
} from "../../src/db/giveawayRepository.ts";

Deno.test("Database initialization", async () => {
  await initDatabase();
  const db = getDatabase();
  assertExists(db);
  closeDatabase();
});

Deno.test("Create and retrieve giveaway", async () => {
  await initDatabase();

  const testGiveaway = {
    id: "test-" + crypto.randomUUID(),
    guild_id: "test-guild",
    channel_id: "test-channel",
    message_id: "test-message",
    creator_id: "test-creator",
    item_name: "Test Item",
    item_quantity: 1,
    item_price: "$10",
    winner_count: 1,
    ends_at: new Date(Date.now() + 3600000).toISOString(),
  };

  await createGiveaway(testGiveaway);

  // Verify giveaway was created
  const db = getDatabase();
  const result = db.prepare("SELECT * FROM giveaways WHERE id = ?").get(testGiveaway.id);
  assertExists(result);

  closeDatabase();
});

Deno.test("Add and retrieve participants", async () => {
  await initDatabase();

  // Create a test giveaway
  const giveawayId = "test-" + crypto.randomUUID();
  const messageId = "msg-" + crypto.randomUUID();

  await createGiveaway({
    id: giveawayId,
    guild_id: "test-guild",
    channel_id: "test-channel",
    message_id: messageId,
    creator_id: "test-creator",
    item_name: "Test Item",
    item_quantity: 1,
    winner_count: 1,
    ends_at: new Date(Date.now() + 3600000).toISOString(),
  });

  // Add participants
  await addParticipant(messageId, "user1");
  await addParticipant(messageId, "user2");
  await addParticipant(messageId, "user3");

  // Get participants
  const participants = await getGiveawayParticipants(giveawayId);
  assertEquals(participants.length, 3);
  assertEquals(participants.includes("user1"), true);
  assertEquals(participants.includes("user2"), true);
  assertEquals(participants.includes("user3"), true);

  closeDatabase();
});
