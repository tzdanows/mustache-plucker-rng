import { Client, EmbedBuilder, type TextChannel } from "../deps.ts";
import { getDatabase } from "../db/database.ts";
import { logger } from "../utils/logger.ts";
import { selectRandomWinners } from "../utils/random.ts";
import { getGiveawayParticipants } from "../db/giveawayRepository.ts";
import { DeploySync } from "./deploySync.ts";

export class GiveawayManager {
  private client: Client;
  private checkInterval: number | null = null;
  private scheduledEndings: Map<string, number> = new Map();
  private processingGiveaways: Set<string> = new Set();
  private deploySync: DeploySync;

  constructor(client: Client) {
    this.client = client;
    this.deploySync = new DeploySync(client);
  }

  start(): void {
    // Check for ended giveaways every 5 seconds (for recovery/missed timers)
    this.checkInterval = setInterval(() => {
      this.checkEndedGiveaways();
    }, 5000);

    // Initial check and schedule existing giveaways
    this.scheduleExistingGiveaways();

    logger.info("Flash sale manager started (using precise timers for ending)");
  }

  private async scheduleExistingGiveaways(): Promise<void> {
    const db = getDatabase();
    const activeGiveaways = db.prepare(
      "SELECT * FROM giveaways WHERE status = 'active'",
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
      "SELECT * FROM giveaways WHERE id = ? AND status = 'active'",
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
    logger.info("Flash sale manager stopped");
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
      logger.info(`Ending flash sale ${giveaway.id} for ${giveaway.item_name}`);

      // Stop the embed updater from updating this giveaway
      const bot = this.client as any;
      if (bot.embedUpdater) {
        bot.embedUpdater.removeGiveaway(giveaway.id);
      }

      // Longer delay to ensure embed updater has completely stopped
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get participants BEFORE updating status
      const participants = await getGiveawayParticipants(giveaway.id);

      if (participants.length === 0) {
        await this.announceNoWinners(giveaway);
        // NOW update status after announcing
        await this.updateGiveawayStatus(giveaway.id, "ended");
        return;
      }

      // Handle case where there are fewer participants than requested winners
      const actualWinnerCount = Math.min(participants.length, giveaway.winner_count);
      const notEnoughEntries = participants.length < giveaway.winner_count;

      // Select winners (will be all participants if not enough entries)
      const winners = selectRandomWinners(participants, actualWinnerCount);

      // Log if not enough entries
      if (notEnoughEntries) {
        logger.info(
          `Giveaway ${giveaway.id}: Only ${participants.length} entries for ${giveaway.winner_count} requested winners`,
        );
      }

      // Save winners to database
      await this.saveWinners(giveaway.id, winners);

      // Announce winners (this updates the original embed)
      await this.announceWinners(giveaway, winners, notEnoughEntries);

      // NOW update giveaway status after everything is done
      await this.updateGiveawayStatus(giveaway.id, "ended");

      logger.info(`Flash sale ${giveaway.id} ended with ${winners.length} winners`);
    } catch (error) {
      logger.error(`Failed to end giveaway ${giveaway.id}:`, error);
      // Even if there's an error, the status is already set to "ended"
    }
  }

  private async saveWinners(giveawayId: string, winners: string[]): Promise<void> {
    const db = getDatabase();
    const stmt = db.prepare(
      "INSERT INTO winners (giveaway_id, user_id, position) VALUES (?, ?, ?)",
    );

    for (let i = 0; i < winners.length; i++) {
      stmt.run(giveawayId, winners[i], i + 1);
    }
  }

  private async updateGiveawayStatus(giveawayId: string, status: string): Promise<void> {
    const db = getDatabase();
    db.prepare("UPDATE giveaways SET status = ? WHERE id = ?").run(status, giveawayId);
  }

  private async announceWinners(
    giveaway: any,
    winners: string[],
    notEnoughEntries: boolean = false,
  ): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
      if (!channel) return;

      const winnerMentions = winners.map((id) => `<@${id}>`).join(" ");
      const allParticipants = await getGiveawayParticipants(giveaway.id);

      // Generate plucking summary page URL - use Deno Deploy URL
      const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
      const summaryUrl = `${deployUrl}/report/${giveaway.id}`;

      // Sync to Deno Deploy
      logger.info(`Attempting to sync giveaway ${giveaway.id} to deploy service`);
      await this.deploySync.syncGiveaway(giveaway.id);
      logger.info(`Sync complete for giveaway ${giveaway.id}`);

      // Update original message to show it ended with results link
      if (giveaway.message_id) {
        try {
          logger.info(`Fetching message ${giveaway.message_id} to update embed`);
          const originalMessage = await channel.messages.fetch(giveaway.message_id);

          if (!originalMessage) {
            logger.error(`Message ${giveaway.message_id} not found`);
            return;
          }

          const titleText = giveaway.item_name; // Title without bold

          const endedTimestamp = Math.floor(Date.now() / 1000);

          // If not enough entries, pad with "null" for missing winners
          let winnerText = winnerMentions || "No winners";
          if (notEnoughEntries && winners.length > 0) {
            const nullCount = giveaway.winner_count - winners.length;
            const nulls = Array(nullCount).fill("null").join(" ");
            winnerText = `${winnerMentions} ${nulls}`;
          }

          const description =
            `plucking in: Ended @ <t:${endedTimestamp}:f>\nentries: \`${allParticipants.length}\`\nwinner(s): ${winnerText}\n[results page](${summaryUrl})`;

          const updatedEmbed = new EmbedBuilder()
            .setTitle(titleText)
            .setDescription(description)
            .setColor(0x808080) // Gray for ended
            .setFooter({ text: "react with 🌙 to enter" }) // Keep original footer
            .setTimestamp(new Date(giveaway.ends_at)); // Keep original timestamp

          logger.info(`Updating embed for giveaway ${giveaway.id}`);
          await originalMessage.edit({ embeds: [updatedEmbed] });
          logger.info(`Successfully updated embed for giveaway ${giveaway.id}`);

          // Double-check that the edit persisted after a short delay
          setTimeout(async () => {
            try {
              const checkMessage = await channel.messages.fetch(giveaway.message_id);
              const currentEmbed = checkMessage.embeds[0];
              if (currentEmbed && !currentEmbed.description?.includes("winner(s):")) {
                logger.warn(`Embed was overwritten after update, re-applying final embed`);
                await checkMessage.edit({ embeds: [updatedEmbed] });
              }
            } catch (e) {
              logger.error(`Failed to verify embed update:`, e);
            }
          }, 1500);
        } catch (error) {
          logger.error(`Failed to update giveaway embed for ${giveaway.id}:`, error);
        }
      } else {
        logger.warn(`No message_id for giveaway ${giveaway.id}`);
      }

      // Send individual congratulations messages for each winner
      if (winners.length > 0) {
        // If not enough entries, send a single message
        if (notEnoughEntries) {
          await channel.send(
            `⚠️ **Not enough entries** - Only ${winners.length} out of ${giveaway.winner_count} requested winners`,
          );
        }

        // Send individual winner messages
        for (const winnerId of winners) {
          await channel.send(
            `## 🎊🧄 Congratulations <@${winnerId}>! 🍅🎊\n` +
              `> Please dm your paypal address to <@${giveaway.creator_id}> to claim: **${giveaway.item_name}**!`,
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
          const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
          const summaryUrl = `${deployUrl}/report/${giveaway.id}`;

          // Sync to Deno Deploy even with no winners
          await this.deploySync.syncGiveaway(giveaway.id);

          const description =
            `plucking in: Ended @ <t:${endedTimestamp}:f>\nentries: \`0\`\nwinner(s): No entries\n[results page](${summaryUrl})`;

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
        "SELECT * FROM giveaways WHERE message_id = ? AND status = 'active'",
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
