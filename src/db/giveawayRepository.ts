import { getDatabase } from "./database.ts";
import { logger } from "../utils/logger.ts";

export interface Giveaway {
  id: string;
  guild_id: string;
  channel_id: string;
  message_id: string;
  creator_id: string;
  item_name: string;
  item_quantity: number;
  item_price?: string;
  winner_count: number;
  ends_at: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export async function createGiveaway(giveaway: Giveaway): Promise<void> {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare(`
      INSERT INTO giveaways (
        id, guild_id, channel_id, message_id, creator_id,
        item_name, item_quantity, item_price, winner_count, ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      giveaway.id,
      giveaway.guild_id,
      giveaway.channel_id,
      giveaway.message_id,
      giveaway.creator_id,
      giveaway.item_name,
      giveaway.item_quantity,
      giveaway.item_price || null,
      giveaway.winner_count,
      giveaway.ends_at
    );
    
    logger.debug(`Giveaway ${giveaway.id} created in database`);
  } catch (error) {
    logger.error("Failed to create giveaway in database:", error);
    throw error;
  }
}

export async function addParticipant(messageId: string, userId: string): Promise<boolean> {
  const db = getDatabase();
  
  try {
    // First, find the giveaway by message_id
    const giveaway = db.prepare(
      "SELECT id, status FROM giveaways WHERE message_id = ?"
    ).get(messageId) as { id: string; status: string } | undefined;
    
    if (!giveaway) {
      logger.debug(`No giveaway found for message ${messageId}`);
      return false;
    }
    
    if (giveaway.status !== "active") {
      logger.debug(`Giveaway ${giveaway.id} is not active`);
      return false;
    }
    
    // Add participant
    const stmt = db.prepare(
      "INSERT OR IGNORE INTO participants (giveaway_id, user_id) VALUES (?, ?)"
    );
    
    const result = stmt.run(giveaway.id, userId);
    
    // SQLite returns the number of rows affected
    if (result > 0) {
      logger.debug(`User ${userId} added to giveaway ${giveaway.id}`);
      return true;
    } else {
      logger.debug(`User ${userId} already in giveaway ${giveaway.id}`);
      return false;
    }
  } catch (error) {
    logger.error("Failed to add participant:", error);
    return false;
  }
}

export async function removeParticipant(messageId: string, userId: string): Promise<boolean> {
  const db = getDatabase();
  
  try {
    // First, find the giveaway by message_id
    const giveaway = db.prepare(
      "SELECT id FROM giveaways WHERE message_id = ?"
    ).get(messageId) as { id: string } | undefined;
    
    if (!giveaway) {
      logger.debug(`No giveaway found for message ${messageId}`);
      return false;
    }
    
    // Remove participant
    const stmt = db.prepare(
      "DELETE FROM participants WHERE giveaway_id = ? AND user_id = ?"
    );
    
    const result = stmt.run(giveaway.id, userId);
    
    // SQLite returns the number of rows affected
    if (result > 0) {
      logger.debug(`User ${userId} removed from giveaway ${giveaway.id}`);
      return true;
    } else {
      logger.debug(`User ${userId} was not in giveaway ${giveaway.id}`);
      return false;
    }
  } catch (error) {
    logger.error("Failed to remove participant:", error);
    return false;
  }
}

export async function getActiveGiveaways(guildId: string): Promise<Giveaway[]> {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM giveaways 
      WHERE guild_id = ? AND status = 'active'
      ORDER BY ends_at ASC
    `);
    
    return stmt.all(guildId) as Giveaway[];
  } catch (error) {
    logger.error("Failed to get active giveaways:", error);
    return [];
  }
}

export async function getGiveawayParticipants(giveawayId: string): Promise<string[]> {
  const db = getDatabase();
  
  try {
    const stmt = db.prepare(
      "SELECT user_id FROM participants WHERE giveaway_id = ?"
    );
    
    const participants = stmt.all(giveawayId) as { user_id: string }[];
    return participants.map(p => p.user_id);
  } catch (error) {
    logger.error("Failed to get participants:", error);
    return [];
  }
}