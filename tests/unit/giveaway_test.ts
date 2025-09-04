import { assertEquals, assertExists } from "@std/assert";
import { closeDatabase, getDatabase, initDatabase } from "../../src/db/database.ts";
import {
  addParticipant,
  createGiveaway,
  getActiveGiveaways,
  getGiveawayParticipants,
  removeParticipant,
} from "../../src/db/giveawayRepository.ts";
import { selectRandomWinners } from "../../src/utils/random.ts";

Deno.test("Giveaway creation and retrieval", async () => {
  await initDatabase();

  const giveaway = {
    id: crypto.randomUUID(),
    guild_id: "test-guild",
    channel_id: "test-channel",
    message_id: "test-message",
    creator_id: "test-creator",
    item_name: "Test Prize",
    item_quantity: 1,
    item_price: "$100",
    winner_count: 3,
    ends_at: new Date(Date.now() + 3600000).toISOString(),
  };

  await createGiveaway(giveaway);

  const activeGiveaways = await getActiveGiveaways("test-guild");
  assertEquals(activeGiveaways.length > 0, true);

  const found = activeGiveaways.find((g) => g.id === giveaway.id);
  assertExists(found);
  assertEquals(found.item_name, "Test Prize");

  closeDatabase();
});

Deno.test("Participant management", async () => {
  await initDatabase();

  const giveawayId = crypto.randomUUID();
  const messageId = crypto.randomUUID();

  // Create giveaway
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
  const added1 = await addParticipant(messageId, "user1");
  const added2 = await addParticipant(messageId, "user2");
  const addedDuplicate = await addParticipant(messageId, "user1"); // Should not add duplicate

  assertEquals(added1, true);
  assertEquals(added2, true);
  assertEquals(addedDuplicate, false);

  // Check participants
  const participants = await getGiveawayParticipants(giveawayId);
  assertEquals(participants.length, 2);
  assertEquals(participants.includes("user1"), true);
  assertEquals(participants.includes("user2"), true);

  // Remove participant
  const removed = await removeParticipant(messageId, "user1");
  assertEquals(removed, true);

  const participantsAfter = await getGiveawayParticipants(giveawayId);
  assertEquals(participantsAfter.length, 1);
  assertEquals(participantsAfter.includes("user1"), false);
  assertEquals(participantsAfter.includes("user2"), true);

  closeDatabase();
});

Deno.test("Random winner selection", () => {
  const participants = ["user1", "user2", "user3", "user4", "user5"];

  // Test selecting 3 winners
  const winners = selectRandomWinners(participants, 3);
  assertEquals(winners.length, 3);

  // Check all winners are unique
  const uniqueWinners = new Set(winners);
  assertEquals(uniqueWinners.size, 3);

  // Check all winners are from participants
  for (const winner of winners) {
    assertEquals(participants.includes(winner), true);
  }

  // Test edge case: more winners than participants
  const allWinners = selectRandomWinners(participants, 10);
  assertEquals(allWinners.length, 5); // Should return all participants

  // Test edge case: no participants
  const noWinners = selectRandomWinners([], 3);
  assertEquals(noWinners.length, 0);

  // Test single winner
  const singleWinner = selectRandomWinners(participants, 1);
  assertEquals(singleWinner.length, 1);
  assertEquals(participants.includes(singleWinner[0]), true);
});

Deno.test("Inactive giveaway participation", async () => {
  await initDatabase();

  const giveawayId = crypto.randomUUID();
  const messageId = crypto.randomUUID();

  // Create ended giveaway
  await createGiveaway({
    id: giveawayId,
    guild_id: "test-guild",
    channel_id: "test-channel",
    message_id: messageId,
    creator_id: "test-creator",
    item_name: "Ended Item",
    item_quantity: 1,
    winner_count: 1,
    ends_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  });

  // Mark as ended
  const db = getDatabase();
  db.prepare("UPDATE giveaways SET status = 'ended' WHERE id = ?").run(giveawayId);

  // Try to add participant to ended giveaway
  const added = await addParticipant(messageId, "user1");
  assertEquals(added, false); // Should not be able to add to ended giveaway

  closeDatabase();
});
