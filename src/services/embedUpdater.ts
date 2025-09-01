import { Client, EmbedBuilder, type TextChannel } from "../deps.ts";
import { getDatabase } from "../db/database.ts";
import { getGiveawayParticipants } from "../db/giveawayRepository.ts";
import { formatTimeRemaining } from "../utils/duration.ts";
import { logger } from "../utils/logger.ts";

export class EmbedUpdater {
  private client: Client;
  private updateInterval: number | null = null;
  private activeGiveaways: Map<string, { giveaway: any, lastUpdate: number }> = new Map();
  private messageCache: Map<string, any> = new Map();

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    // Update embeds every 1 second for real-time countdown
    this.updateInterval = setInterval(() => {
      this.updateActiveGiveaways();
    }, 1000);

    // Initial update
    this.updateActiveGiveaways();
    
    logger.info("Embed updater started (1s interval)");
  }

  stop(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    logger.info("Embed updater stopped");
  }

  async addGiveaway(giveawayId: string): Promise<void> {
    const db = getDatabase();
    const giveaway = db.prepare(
      "SELECT * FROM giveaways WHERE id = ? AND status = 'active'"
    ).get(giveawayId);
    
    if (giveaway) {
      this.activeGiveaways.set(giveawayId, { giveaway, lastUpdate: Date.now() });
    }
  }

  removeGiveaway(giveawayId: string): void {
    this.activeGiveaways.delete(giveawayId);
  }

  private async updateActiveGiveaways(): Promise<void> {
    try {
      const db = getDatabase();
      
      // Get all active giveaways
      const activeGiveaways = db.prepare(
        "SELECT * FROM giveaways WHERE status = 'active'"
      ).all();

      for (const giveaway of activeGiveaways) {
        await this.updateGiveawayEmbed(giveaway);
      }
    } catch (error) {
      logger.error("Error updating giveaway embeds:", error);
    }
  }

  private async updateGiveawayEmbed(giveaway: any): Promise<void> {
    try {
      if (!giveaway.message_id) return;

      const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
      if (!channel) return;

      const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
      if (!message) return;

      // Get current participant count
      const participants = await getGiveawayParticipants(giveaway.id);
      const participantCount = participants.length;

      // Calculate time remaining
      const endsAt = new Date(giveaway.ends_at);
      const timeRemaining = formatTimeRemaining(endsAt);

      // Build updated embed
      const titleText = giveaway.item_name;  // Now contains the full title including price

      const embed = new EmbedBuilder()
        .setTitle(titleText)
        .setColor(0x5865F2)
        .addFields(
          { 
            name: "Plucking in", 
            value: timeRemaining === "Ended" ? "Ending..." : timeRemaining, 
            inline: false 
          },
          { 
            name: "Entries", 
            value: participantCount.toString(), 
            inline: false 
          },
          { 
            name: "Winner(s)", 
            value: `${giveaway.winner_count} moustache${giveaway.winner_count > 1 ? "s" : ""} will be plucked`, 
            inline: false 
          }
        )
        .setFooter({ text: "React with 🎉 to enter!" })
        .setTimestamp(endsAt);

      // Update the message
      await message.edit({ embeds: [embed] }).catch((error) => {
        logger.debug(`Could not update giveaway embed: ${error.message}`);
      });
    } catch (error) {
      logger.debug(`Error updating giveaway ${giveaway.id}:`, error);
    }
  }
}