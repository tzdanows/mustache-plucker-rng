import { Client, EmbedBuilder, type TextChannel } from "../deps.ts";
import { getDatabase } from "../db/database.ts";
import { logger } from "../utils/logger.ts";
import { selectRandomWinners } from "../utils/random.ts";
import { getGiveawayParticipants } from "../db/giveawayRepository.ts";

export class GiveawayManager {
  private client: Client;
  private checkInterval: number | null = null;
  private scheduledEndings: Map<string, number> = new Map();
  private processingGiveaways: Set<string> = new Set();

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    // Check for ended giveaways every 5 seconds (for recovery/missed timers)
    this.checkInterval = setInterval(() => {
      this.checkEndedGiveaways();
    }, 5000);

    // Initial check and schedule existing giveaways
    this.scheduleExistingGiveaways();
    
    logger.info("Giveaway manager started (using precise timers for ending)");
  }
  
  private async scheduleExistingGiveaways(): Promise<void> {
    const db = getDatabase();
    const activeGiveaways = db.prepare(
      "SELECT * FROM giveaways WHERE status = 'active'"
    ).all();
    
    for (const giveaway of activeGiveaways) {
      this.scheduleGiveawayEnd(giveaway);
    }
  }
  
  scheduleGiveawayEnd(giveaway: any): void {
    const endsAt = new Date(giveaway.ends_at).getTime();
    const now = Date.now();
    const delay = Math.max(0, endsAt - now);
    
    // Clear any existing timer for this giveaway
    if (this.scheduledEndings.has(giveaway.id)) {
      clearTimeout(this.scheduledEndings.get(giveaway.id));
    }
    
    // Schedule precise ending
    const timerId = setTimeout(() => {
      this.endGiveawayPrecise(giveaway.id);
      this.scheduledEndings.delete(giveaway.id);
    }, delay);
    
    this.scheduledEndings.set(giveaway.id, timerId);
    logger.info(`Scheduled giveaway ${giveaway.id} to end in ${delay}ms`);
  }
  
  private async endGiveawayPrecise(giveawayId: string): Promise<void> {
    // Prevent double processing
    if (this.processingGiveaways.has(giveawayId)) {
      return;
    }
    
    this.processingGiveaways.add(giveawayId);
    
    const db = getDatabase();
    const giveaway = db.prepare(
      "SELECT * FROM giveaways WHERE id = ? AND status = 'active'"
    ).get(giveawayId);
    
    if (giveaway) {
      await this.endGiveaway(giveaway);
    }
    
    this.processingGiveaways.delete(giveawayId);
  }

  stop(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info("Giveaway manager stopped");
  }

  private async checkEndedGiveaways(): Promise<void> {
    try {
      const db = getDatabase();
      const now = new Date().toISOString();
      
      // Find giveaways that have ended but not been processed
      const endedGiveaways = db.prepare(`
        SELECT * FROM giveaways 
        WHERE status = 'active' 
        AND ends_at <= ?
      `).all(now);

      for (const giveaway of endedGiveaways) {
        // Skip if already being processed
        if (!this.processingGiveaways.has(giveaway.id)) {
          await this.endGiveawayPrecise(giveaway.id);
        }
      }
    } catch (error) {
      logger.error("Error checking ended giveaways:", error);
    }
  }

  async endGiveaway(giveaway: any): Promise<void> {
    try {
      logger.info(`Ending giveaway ${giveaway.id} for ${giveaway.item_name}`);
      
      // Stop the embed updater from updating this giveaway
      const bot = this.client as any;
      if (bot.embedUpdater) {
        bot.embedUpdater.removeGiveaway(giveaway.id);
      }
      
      // Small delay to ensure embed updater has stopped
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get participants BEFORE updating status
      const participants = await getGiveawayParticipants(giveaway.id);
      
      if (participants.length === 0) {
        await this.announceNoWinners(giveaway);
        // NOW update status after announcing
        await this.updateGiveawayStatus(giveaway.id, "ended");
        return;
      }

      // Select winners
      const winners = selectRandomWinners(participants, giveaway.winner_count);
      
      // Save winners to database
      await this.saveWinners(giveaway.id, winners);
      
      // Announce winners (this updates the original embed)
      await this.announceWinners(giveaway, winners);
      
      // NOW update giveaway status after everything is done
      await this.updateGiveawayStatus(giveaway.id, "ended");
      
      logger.info(`Giveaway ${giveaway.id} ended with ${winners.length} winners`);
    } catch (error) {
      logger.error(`Failed to end giveaway ${giveaway.id}:`, error);
      // Even if there's an error, the status is already set to "ended"
    }
  }

  private async saveWinners(giveawayId: string, winners: string[]): Promise<void> {
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO winners (giveaway_id, user_id, position) VALUES (?, ?, ?)"
    );
    
    for (let i = 0; i < winners.length; i++) {
      stmt.run(giveawayId, winners[i], i + 1);
    }
  }

  private async updateGiveawayStatus(giveawayId: string, status: string): Promise<void> {
    const db = getDatabase();
    db.prepare("UPDATE giveaways SET status = ? WHERE id = ?").run(status, giveawayId);
  }

  private async announceWinners(giveaway: any, winners: string[]): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
      if (!channel) return;

      const winnerMentions = winners.map(id => `<@${id}>`).join(" ");
      const allParticipants = await getGiveawayParticipants(giveaway.id);
      
      // Generate plucking summary page URL
      const summaryUrl = `http://localhost:8081/giveaway/${giveaway.id}`;
      
      // Update original message to show it ended with results link
      if (giveaway.message_id) {
        try {
          const originalMessage = await channel.messages.fetch(giveaway.message_id);
          const titleText = giveaway.item_name;  // Title without bold
          
          const endedTimestamp = Math.floor(Date.now() / 1000);
          const description = `plucking in: Ended @ <t:${endedTimestamp}:f>\nentries: \`${allParticipants.length}\`\nwinner(s): ${winnerMentions || "No winners"}\n[giveaway results](${summaryUrl})`;
          
          const updatedEmbed = new EmbedBuilder()
            .setTitle(titleText)
            .setDescription(description)
            .setColor(0x808080) // Gray for ended
            .setFooter({ text: "react with 🌙 to enter" })  // Keep original footer
            .setTimestamp(new Date(giveaway.ends_at));  // Keep original timestamp
          
          await originalMessage.edit({ embeds: [updatedEmbed] });
        } catch (error) {
          logger.warn("Could not update original giveaway message:", error);
        }
      }

      // Send individual congratulations messages for each winner
      if (winners.length > 0) {
        for (const winnerId of winners) {
          await channel.send(
            `🎊 Congratulations <@${winnerId}>! 🎊\n` +
            `> Please dm your paypal address to <@${giveaway.creator_id}> to claim your **${giveaway.item_name}**!`
          );
        }
      }
    } catch (error) {
      logger.error("Failed to announce winners:", error);
    }
  }

  private async announceNoWinners(giveaway: any): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
      if (!channel) return;

      // Update original message if it exists
      if (giveaway.message_id) {
        try {
          const originalMessage = await channel.messages.fetch(giveaway.message_id);
          const titleText = giveaway.item_name;
          
          const endedTimestamp = Math.floor(Date.now() / 1000);
          const summaryUrl = `http://localhost:8081/giveaway/${giveaway.id}`;
          const description = `plucking in: Ended @ <t:${endedTimestamp}:f>\nentries: \`0\`\nwinner(s): No entries\n[giveaway results](${summaryUrl})`;
          
          const updatedEmbed = new EmbedBuilder()
            .setTitle(titleText)
            .setDescription(description)
            .setColor(0xFF0000) // Red for no entries
            .setFooter({ text: "react with 🌙 to enter" })
            .setTimestamp(new Date(giveaway.ends_at));
          
          await originalMessage.edit({ embeds: [updatedEmbed] });
        } catch (error) {
          logger.warn("Could not update original giveaway message:", error);
        }
      }
    } catch (error) {
      logger.error("Failed to announce no winners:", error);
    }
  }

  async endGiveawayManually(messageId: string, userId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      
      // Find giveaway by message ID
      const giveaway = db.prepare(
        "SELECT * FROM giveaways WHERE message_id = ? AND status = 'active'"
      ).get(messageId);
      
      if (!giveaway) {
        return false;
      }
      
      // Check if user is the creator or has manage server permissions
      // (Permission check should be done in the command handler)
      
      await this.endGiveaway(giveaway);
      return true;
    } catch (error) {
      logger.error("Failed to manually end giveaway:", error);
      return false;
    }
  }
}