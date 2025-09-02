/**
 * Handles all Discord interactions (slash commands, buttons, etc.)
 */

import { 
  type Interaction, 
  type CommandInteraction,
  type ChatInputCommandInteraction,
  EmbedBuilder 
} from "discord.js";
import { logger } from "../utils/logger.ts";
import { getDatabase } from "../db/database.ts";
import { parseDuration } from "../utils/duration.ts";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

export class InteractionHandler {
  /**
   * Main interaction handler - routes interactions to appropriate handlers
   */
  async handleInteraction(interaction: Interaction): Promise<void> {
    try {
      // Handle slash commands
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      }
      
      // Add button/select menu handlers here if needed in future
      
    } catch (error) {
      logger.error("Error handling interaction:", error);
      
      // Try to reply with error message
      if (interaction.isRepliable() && !interaction.replied) {
        try {
          await interaction.reply({
            content: "❌ An error occurred while processing your request.",
            ephemeral: true,
          });
        } catch (replyError) {
          logger.error("Failed to send error reply:", replyError);
        }
      }
    }
  }
  
  /**
   * Handle slash commands
   */
  private async handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const { commandName } = interaction;
    
    logger.info(`Slash command received: /${commandName} from ${interaction.user.tag}`);
    
    switch (commandName) {
      case "ping":
        await this.handlePingCommand(interaction);
        break;
        
      case "hello":
        await this.handleHelloCommand(interaction);
        break;
        
      case "fs":
        await this.handleFlashSaleCommand(interaction);
        break;
        
      case "giveaway": // Keep for backwards compatibility
        await this.handleFlashSaleCommand(interaction);
        break;
        
      case "cancel":
        await this.handleCancelCommand(interaction);
        break;
        
      case "end":
        await this.handleEndCommand(interaction);
        break;
        
      case "sync":
        await this.handleSyncCommand(interaction);
        break;
        
      default:
        await interaction.reply({
          content: "❌ Unknown command",
          ephemeral: true,
        });
    }
  }
  
  /**
   * /ping command - Simple test command
   */
  private async handlePingCommand(interaction: CommandInteraction): Promise<void> {
    // Check if user has admin permissions
    const member = interaction.member;
    const isAdmin = member && typeof member.permissions === "object" && 
                   member.permissions.has("ManageGuild");
    
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You need admin permissions to use this command.",
        ephemeral: true,
      });
      return;
    }
    
    const latency = Date.now() - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.reply({
      content: `🏓 Pong!\n⏱️ Latency: ${latency}ms\n📡 API Latency: ${apiLatency}ms`,
      ephemeral: true,
    });
  }
  
  /**
   * /hello command - Display garlic rectangle with HELLO in tomatoes
   */
  private async handleHelloCommand(interaction: CommandInteraction): Promise<void> {
    // Check if user has admin permissions
    const member = interaction.member;
    const isAdmin = member && typeof member.permissions === "object" && 
                   member.permissions.has("ManageGuild");
    
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You need admin permissions to use this command.",
        ephemeral: true,
      });
      return;
    }
    
    // Display garlic rectangle with HELLO spelled in tomatoes
    const message = 
      "🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄\n" +
      "🧄🍅🧄🧄🍅🧄🍅🍅🍅🧄🍅🧄🧄🍅🧄🧄🧄🍅🍅🍅🧄🧄\n" +
      "🧄🍅🧄🧄🍅🧄🍅🧄🧄🧄🍅🧄🧄🍅🧄🧄🍅🧄🧄🧄🍅🧄\n" +
      "🧄🍅🧄🧄🍅🧄🍅🧄🧄🧄🍅🧄🧄🍅🧄🧄🍅🧄🧄🧄🍅🧄\n" +
      "🧄🍅🍅🍅🍅🧄🍅🍅🍅🧄🍅🧄🧄🍅🧄🧄🍅🧄🧄🧄🍅🧄\n" +
      "🧄🍅🧄🧄🍅🧄🍅🧄🧄🧄🍅🧄🧄🍅🧄🧄🍅🧄🧄🧄🍅🧄\n" +
      "🧄🍅🧄🧄🍅🧄🍅🧄🧄🧄🍅🧄🧄🍅🧄🧄🍅🧄🧄🧄🍅🧄\n" +
      "🧄🍅🧄🧄🍅🧄🍅🍅🍅🧄🍅🍅🧄🍅🍅🧄🧄🍅🍅🍅🧄🧄\n" +
      "🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄\n" +
      "-# mobile users --> turn your phone sideways";
    
    await interaction.reply({
      content: message,
    });
  }
  
  /**
   * /fs command - Create a new flash sale
   */
  private async handleFlashSaleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    // Check if user has admin permissions
    const member = interaction.member;
    const isAdmin = member && typeof member.permissions === "object" && 
                   member.permissions.has("ManageGuild");
    
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You need admin permissions to use this command.",
        ephemeral: true,
      });
      return;
    }
    
    // Defer reply since this might take a moment
    await interaction.deferReply();
    
    // Get command options - handle both 'item' (new) and 'prize' (old) names
    const item = interaction.options.getString("item") || interaction.options.getString("prize") || "Flash Sale Item";
    const durationStr = interaction.options.getString("duration") || "5m"; // Default 5 minutes
    const winnerCount = interaction.options.getInteger("winners") || 1; // Default 1 winner
    
    // Parse duration
    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      await interaction.editReply({
        content: `❌ Invalid duration format. Use formats like: 30s, 5m, 2h, 7d, 1y`,
      });
      return;
    }
    
    // Create giveaway in database
    const db = getDatabase();
    const giveawayId = `gvwy_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const endsAt = new Date(Date.now() + durationMs);
    
    try {
      // Insert into database
      db.prepare(`
        INSERT INTO giveaways (
          id, guild_id, channel_id, message_id, creator_id, 
          item_name, winner_count, ends_at, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        giveawayId,
        interaction.guildId,
        interaction.channelId,
        null, // Will update with message ID after sending
        interaction.user.id,
        item,
        winnerCount,
        endsAt.toISOString(),
        "active",
        new Date().toISOString()
      );
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(item)
        .setDescription(
          `plucking in: \`starting...\`\n` +
          `entries: \`0\`\n` +
          `winner(s): awaiting...`
        )
        .setColor(0x5865F2) // Discord blurple
        .setFooter({ text: "react with 🌙 to enter" })
        .setTimestamp(endsAt);
      
      // Send the flash sale message
      const message = await interaction.editReply({
        embeds: [embed],
      });
      
      // Add reaction for entries
      await message.react("🌙");
      
      // Update database with message ID
      db.prepare("UPDATE giveaways SET message_id = ? WHERE id = ?")
        .run(message.id, giveawayId);
      
      logger.info(`Flash sale created: ${giveawayId} for ${item} by ${interaction.user.tag}`);
      
      // If you have a giveaway manager, notify it
      const bot = interaction.client as any;
      if (bot.giveawayManager) {
        bot.giveawayManager.scheduleGiveawayEnd({
          id: giveawayId,
          ends_at: endsAt.toISOString(),
        });
      }
      if (bot.embedUpdater) {
        await bot.embedUpdater.addGiveaway(giveawayId);
      }
      
    } catch (error) {
      logger.error("Failed to create flash sale:", error);
      await interaction.editReply({
        content: "❌ Failed to create flash sale. Please try again.",
      });
    }
  }
  
  /**
   * /cancel command - Cancel an active flash sale
   */
  private async handleCancelCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const messageId = interaction.options.getString("message_id");
    
    await interaction.deferReply({ ephemeral: true });
    
    const db = getDatabase();
    
    try {
      let giveaway: any;
      
      if (messageId) {
        // Find specific giveaway by message ID
        giveaway = db.prepare(
          "SELECT * FROM giveaways WHERE message_id = ? AND status = 'active'"
        ).get(messageId);
      } else {
        // Find the most recent active giveaway in this guild
        giveaway = db.prepare(
          "SELECT * FROM giveaways WHERE guild_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
        ).get(interaction.guildId);
      }
      
      // Fallback: Try to find by message_id directly (in case no message_id stored)
      if (!giveaway && messageId) {
        giveaway = db.prepare(
          "SELECT * FROM giveaways WHERE message_id = ? AND status = 'active'"
        ).get(messageId);
      }
      
      if (!giveaway) {
        await interaction.editReply({
          content: messageId 
            ? "❌ No active flash sale found with that message ID." 
            : "❌ No active flash sale found in this server.",
        });
        return;
      }
      
      // Check permissions (admins only)
      const member = interaction.member;
      const isAdmin = member && typeof member.permissions === "object" && 
                     member.permissions.has("ManageGuild");
      
      if (!isAdmin) {
        await interaction.editReply({
          content: "❌ You need admin permissions to use this command.",
        });
        return;
      }
      
      // Update status
      db.prepare("UPDATE giveaways SET status = 'cancelled' WHERE id = ?")
        .run(giveaway.id);
      
      // Try to delete the message
      try {
        const channel = await interaction.client.channels.fetch(giveaway.channel_id);
        if (channel && channel.isTextBased()) {
          const message = await channel.messages.fetch(giveaway.message_id);
          await message.delete();
        }
      } catch (error) {
        logger.warn("Could not delete flash sale message:", error);
      }
      
      await interaction.editReply({
        content: `✅ Flash sale for **${giveaway.item_name}** has been cancelled.`,
      });
      
      logger.info(`Flash sale ${giveaway.id} cancelled by ${interaction.user.tag}`);
      
    } catch (error) {
      logger.error("Failed to cancel flash sale:", error);
      await interaction.editReply({
        content: "❌ Failed to cancel flash sale.",
      });
    }
  }
  
  /**
   * /end command - Manually end a flash sale
   */
  private async handleEndCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    // Check if user has admin permissions
    const member = interaction.member;
    const isAdmin = member && typeof member.permissions === "object" && 
                   member.permissions.has("ManageGuild");
    
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You need admin permissions to use this command.",
        ephemeral: true,
      });
      return;
    }
    
    const messageId = interaction.options.getString("message_id");
    
    await interaction.deferReply({ ephemeral: true });
    
    const bot = interaction.client as any;
    
    if (bot.giveawayManager) {
      let success = false;
      
      if (messageId) {
        // End specific giveaway by message ID
        success = await bot.giveawayManager.endGiveawayManually(
          messageId, 
          interaction.user.id
        );
      } else {
        // Find and end the most recent active giveaway in this guild
        const db = getDatabase();
        const giveaway = db.prepare(
          "SELECT * FROM giveaways WHERE guild_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
        ).get(interaction.guildId) as any;
        
        if (giveaway && giveaway.message_id) {
          success = await bot.giveawayManager.endGiveawayManually(
            giveaway.message_id,
            interaction.user.id
          );
        }
      }
      
      if (success) {
        await interaction.editReply({
          content: "✅ Flash sale ended successfully!",
        });
      } else {
        await interaction.editReply({
          content: messageId 
            ? "❌ Could not end flash sale. Make sure the message ID is correct and the flash sale is active."
            : "❌ No active flash sale found in this server.",
        });
      }
    } else {
      await interaction.editReply({
        content: "❌ Flash sale manager not available.",
      });
    }
  }
  
  /**
   * /sync command - Sync giveaway to web report
   */
  private async handleSyncCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    // Check if user has admin permissions
    const member = interaction.member;
    const isAdmin = member && typeof member.permissions === "object" && 
                   member.permissions.has("ManageGuild");
    
    if (!isAdmin) {
      await interaction.reply({
        content: "❌ You need admin permissions to use this command.",
        ephemeral: true,
      });
      return;
    }
    
    await interaction.deferReply({ ephemeral: true });
    
    const specificId = interaction.options.getString("giveaway_id");
    const db = getDatabase();
    
    try {
      let giveaway: any;
      
      if (specificId) {
        // If a specific ID is provided, get it regardless of guild
        giveaway = db.prepare("SELECT * FROM giveaways WHERE id = ?").get(specificId);
      } else {
        // Get the most recent flash sale from this guild
        // Even with global commands, we should respect guild boundaries for default behavior
        giveaway = db.prepare("SELECT * FROM giveaways WHERE guild_id = ? ORDER BY created_at DESC LIMIT 1").get(interaction.guildId);
      }
      
      if (!giveaway) {
        await interaction.editReply({
          content: "❌ No flash sale found to sync.",
        });
        return;
      }
      
      // Perform sync
      const bot = interaction.client as any;
      if (bot.deploySync) {
        await bot.deploySync.syncGiveaway(giveaway.id);
        
        const deployUrl = Deno.env.get("DEPLOY_URL") || "https://mustache-plucker.deno.dev";
        const reportUrl = `${deployUrl}/report/${giveaway.id}`;
        
        await interaction.editReply({
          content: `✅ Flash sale synced!\n**Item:** ${giveaway.item_name}\n**View at:** ${reportUrl}`,
        });
      } else {
        await interaction.editReply({
          content: "❌ Deploy sync not available.",
        });
      }
    } catch (error) {
      logger.error("Failed to sync flash sale:", error);
      await interaction.editReply({
        content: "❌ Failed to sync flash sale.",
      });
    }
  }
}