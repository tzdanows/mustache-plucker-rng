import { Client, EmbedBuilder, type TextChannel } from "../deps.ts";
import { getDatabase } from "../db/database.ts";
import { logger } from "../utils/logger.ts";
import { selectRandomWinners } from "../utils/random.ts";
import { getGiveawayParticipants } from "../db/giveawayRepository.ts";

export class GiveawayManager {
  private client: Client;
  private checkInterval: number | null = null;

  constructor(client: Client) {
    this.client = client;
  }

  start(): void {
    // Check for ended giveaways every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkEndedGiveaways();
    }, 30000);

    // Initial check
    this.checkEndedGiveaways();
    
    logger.info("Giveaway manager started");
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
        await this.endGiveaway(giveaway);
      }
    } catch (error) {
      logger.error("Error checking ended giveaways:", error);
    }
  }

  async endGiveaway(giveaway: any): Promise<void> {
    try {
      logger.info(`Ending giveaway ${giveaway.id} for ${giveaway.item_name}`);
      
      // Get participants
      const participants = await getGiveawayParticipants(giveaway.id);
      
      if (participants.length === 0) {
        await this.announceNoWinners(giveaway);
        await this.updateGiveawayStatus(giveaway.id, "ended");
        return;
      }

      // Select winners
      const winners = selectRandomWinners(participants, giveaway.winner_count);
      
      // Save winners to database
      await this.saveWinners(giveaway.id, winners);
      
      // Announce winners
      await this.announceWinners(giveaway, winners);
      
      // Update giveaway status
      await this.updateGiveawayStatus(giveaway.id, "ended");
      
      logger.info(`Giveaway ${giveaway.id} ended with ${winners.length} winners`);
    } catch (error) {
      logger.error(`Failed to end giveaway ${giveaway.id}:`, error);
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

      const winnerMentions = winners.map(id => `<@${id}>`).join(", ");
      
      const embed = new EmbedBuilder()
        .setTitle("🎉 **GIVEAWAY ENDED** 🎉")
        .setDescription(`**${giveaway.item_name}**`)
        .setColor(0x00FF00)
        .addFields(
          { 
            name: "🎩 Winners", 
            value: winnerMentions || "No winners", 
            inline: false 
          },
          { 
            name: "Quantity", 
            value: giveaway.item_quantity.toString(), 
            inline: true 
          },
          { 
            name: "Total Entries", 
            value: (await getGiveawayParticipants(giveaway.id)).length.toString(), 
            inline: true 
          }
        )
        .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
        .setTimestamp();

      if (giveaway.item_price) {
        embed.addFields({ name: "Value", value: giveaway.item_price, inline: true });
      }

      // Reply to original message if possible
      if (giveaway.message_id) {
        try {
          const originalMessage = await channel.messages.fetch(giveaway.message_id);
          await originalMessage.reply({ embeds: [embed] });
        } catch {
          await channel.send({ embeds: [embed] });
        }
      } else {
        await channel.send({ embeds: [embed] });
      }

      // Send congratulations message
      await channel.send(
        `🎊 Congratulations ${winnerMentions}! You've won **${giveaway.item_name}**! 🎊\n` +
        `Please contact <@${giveaway.creator_id}> to claim your prize.`
      );
    } catch (error) {
      logger.error("Failed to announce winners:", error);
    }
  }

  private async announceNoWinners(giveaway: any): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(giveaway.channel_id) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setTitle("😢 **GIVEAWAY ENDED** 😢")
        .setDescription(`**${giveaway.item_name}**\n\nNo one entered the giveaway!`)
        .setColor(0xFF0000)
        .setFooter({ text: `Giveaway ID: ${giveaway.id}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] });
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