import { closeDatabase, getDatabase, initDatabase } from "./database.ts";
import { logger } from "../utils/logger.ts";

async function seedDatabase() {
  try {
    logger.info("Starting database seeding...");

    // Initialize database
    await initDatabase();
    const db = getDatabase();

    // Clear existing data
    db.exec("DELETE FROM winners");
    db.exec("DELETE FROM participants");
    db.exec("DELETE FROM giveaways");

    // Create sample giveaways
    const giveaways = [
      {
        id: "test-giveaway-1",
        guild_id: "123456789",
        channel_id: "987654321",
        message_id: "111111111",
        creator_id: "555555555",
        item_name: "Discord Nitro 1 Month",
        item_quantity: 1,
        item_price: "$9.99",
        winner_count: 1,
        ends_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        status: "active",
      },
      {
        id: "test-giveaway-2",
        guild_id: "123456789",
        channel_id: "987654321",
        message_id: "222222222",
        creator_id: "555555555",
        item_name: "Steam Gift Card",
        item_quantity: 3,
        item_price: "$50",
        winner_count: 3,
        ends_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        status: "active",
      },
      {
        id: "test-giveaway-3",
        guild_id: "123456789",
        channel_id: "987654321",
        message_id: "333333333",
        creator_id: "555555555",
        item_name: "Custom Discord Bot",
        item_quantity: 1,
        item_price: null,
        winner_count: 1,
        ends_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (ended)
        status: "ended",
      },
    ];

    // Insert giveaways
    const giveawayStmt = db.prepare(`
      INSERT INTO giveaways (
        id, guild_id, channel_id, message_id, creator_id,
        item_name, item_quantity, item_price, winner_count, ends_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const giveaway of giveaways) {
      giveawayStmt.run(
        giveaway.id,
        giveaway.guild_id,
        giveaway.channel_id,
        giveaway.message_id,
        giveaway.creator_id,
        giveaway.item_name,
        giveaway.item_quantity,
        giveaway.item_price,
        giveaway.winner_count,
        giveaway.ends_at,
        giveaway.status,
      );
      logger.info(`Created giveaway: ${giveaway.item_name}`);
    }

    // Add sample participants
    const participants = [
      { giveaway_id: "test-giveaway-1", user_id: "user1" },
      { giveaway_id: "test-giveaway-1", user_id: "user2" },
      { giveaway_id: "test-giveaway-1", user_id: "user3" },
      { giveaway_id: "test-giveaway-2", user_id: "user1" },
      { giveaway_id: "test-giveaway-2", user_id: "user2" },
      { giveaway_id: "test-giveaway-2", user_id: "user3" },
      { giveaway_id: "test-giveaway-2", user_id: "user4" },
      { giveaway_id: "test-giveaway-2", user_id: "user5" },
      { giveaway_id: "test-giveaway-3", user_id: "user1" },
      { giveaway_id: "test-giveaway-3", user_id: "user2" },
    ];

    const participantStmt = db.prepare(
      "INSERT INTO participants (giveaway_id, user_id) VALUES (?, ?)",
    );

    for (const participant of participants) {
      participantStmt.run(participant.giveaway_id, participant.user_id);
    }
    logger.info(`Added ${participants.length} participants`);

    // Add sample winners for the ended giveaway
    const winnerStmt = db.prepare(
      "INSERT INTO winners (giveaway_id, user_id, position) VALUES (?, ?, ?)",
    );

    winnerStmt.run("test-giveaway-3", "user1", 1);
    logger.info("Added sample winner");

    logger.info("Database seeding completed successfully!");
  } catch (error) {
    logger.error("Failed to seed database:", error);
  } finally {
    closeDatabase();
  }
}

// Run the seed script
if (import.meta.main) {
  seedDatabase();
}
