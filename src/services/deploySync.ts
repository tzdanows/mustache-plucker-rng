import { logger } from "../utils/logger.ts";
import { getDatabase } from "../db/database.ts";
import { Client } from "../deps.ts";

export class DeploySync {
  private client: Client;
  private deployUrl: string;
  private authToken: string;

  constructor(client: Client) {
    this.client = client;
    // Use the configured URL, defaulting to production
    this.deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
    
    const secret = Deno.env.get("DEPLOY_SECRET");
    if (!secret) {
      logger.warn("DEPLOY_SECRET not configured - deploy sync will be disabled");
      this.authToken = "";
    } else {
      this.authToken = secret;
    }
    
    logger.info(`DeploySync configured for: ${this.deployUrl}`);
  }

  async syncGiveaway(giveawayId: string): Promise<void> {
    if (!this.authToken) {
      logger.warn("Deploy sync skipped - DEPLOY_SECRET not configured");
      return;
    }
    
    try {
      const db = getDatabase();
      
      // Get giveaway data
      const giveaway = db.prepare(
        "SELECT * FROM giveaways WHERE id = ?"
      ).get(giveawayId) as any;
      
      if (!giveaway) {
        logger.warn(`Giveaway ${giveawayId} not found for sync`);
        return;
      }
      
      // Get participants
      const participants = db.prepare(
        `SELECT user_id, entered_at 
         FROM participants 
         WHERE giveaway_id = ? 
         ORDER BY entered_at ASC`
      ).all(giveawayId) as { user_id: string; entered_at: string }[];
      
      // Get winners
      const winners = db.prepare(
        `SELECT user_id, position 
         FROM winners 
         WHERE giveaway_id = ? 
         ORDER BY position ASC`
      ).all(giveawayId) as { user_id: string; position: number }[];
      
      // Resolve Discord usernames
      const allUserIds = [
        ...participants.map(p => p.user_id),
        ...winners.map(w => w.user_id),
        giveaway.creator_id
      ];
      
      const userMap = await this.resolveUsernames(allUserIds);
      
      // Prepare data for Deno Deploy
      const deployData = {
        giveawayId: giveaway.id,
        id: giveaway.id,
        itemName: giveaway.item_name,
        status: giveaway.status,
        winnerCount: giveaway.winner_count,
        endsAt: giveaway.ends_at,
        createdAt: giveaway.created_at,
        creatorId: giveaway.creator_id,
        creatorUsername: userMap.get(giveaway.creator_id) || giveaway.creator_id,
        participants: participants.map(p => ({
          userId: p.user_id,
          username: userMap.get(p.user_id) || p.user_id,
          enteredAt: p.entered_at
        })),
        winners: winners.map(w => ({
          userId: w.user_id,
          username: userMap.get(w.user_id) || w.user_id,
          position: w.position
        }))
      };
      
      // Send to Deno Deploy
      logger.info(`Syncing giveaway ${giveawayId} to ${this.deployUrl}/api/giveaway`);
      
      const response = await fetch(`${this.deployUrl}/api/giveaway`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.authToken}`
        },
        body: JSON.stringify(deployData)
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        logger.error(`Deploy sync failed for ${giveawayId}: ${response.status} ${response.statusText}`);
        logger.error(`Response body: ${responseText}`);
        throw new Error(`Deploy sync failed: ${response.status} ${response.statusText} - ${responseText}`);
      }
      
      logger.info(`Successfully synced giveaway ${giveawayId} to Deno Deploy: ${responseText}`);
      logger.info(`View report at: ${this.deployUrl}/report/${giveawayId}`);
      
    } catch (error) {
      logger.error(`Failed to sync giveaway ${giveawayId}:`, error);
    }
  }
  
  private async resolveUsernames(userIds: string[]): Promise<Map<string, string>> {
    const userMap = new Map<string, string>();
    
    for (const userId of new Set(userIds)) {
      try {
        const user = await this.client.users.fetch(userId);
        userMap.set(userId, user.username);
      } catch {
        userMap.set(userId, userId);
      }
    }
    
    return userMap;
  }
}