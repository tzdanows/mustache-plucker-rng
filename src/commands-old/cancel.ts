import { 
  SlashCommandBuilder, 
  type CommandInteraction,
  type TextChannel
} from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { getDatabase } from "../db/database.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("cancel")
    .setDescription("Cancel the last giveaway (or specify a message ID)")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("Message ID of the giveaway (optional)")
        .setRequired(false)),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const db = getDatabase();
      let messageId = interaction.options.get("message_id")?.value as string | undefined;
      let giveaway: any;
      
      // If no message ID provided, get the last active giveaway
      if (!messageId) {
        giveaway = db.prepare(
          `SELECT * FROM giveaways 
           WHERE guild_id = ? AND status = 'active' 
           ORDER BY created_at DESC 
           LIMIT 1`
        ).get(interaction.guildId) as any;
        
        if (!giveaway) {
          await interaction.editReply({
            content: "❌ No active giveaways found in this server.",
          });
          return;
        }
        
        messageId = giveaway.message_id;
      } else {
        // Get the specified giveaway
        giveaway = db.prepare(
          "SELECT * FROM giveaways WHERE message_id = ?"
        ).get(messageId) as any;
        
        if (!giveaway) {
          await interaction.editReply({
            content: "❌ Could not find a giveaway with that message ID.",
          });
          return;
        }
      }
      
      // Check permissions
      if (!interaction.memberPermissions?.has("ManageGuild")) {
        if (giveaway.creator_id !== interaction.user.id) {
          await interaction.editReply({
            content: "❌ You don't have permission to cancel this giveaway.",
          });
          return;
        }
      }
      
      // Update giveaway status
      const result = db.prepare(
        "UPDATE giveaways SET status = 'cancelled' WHERE id = ? AND status = 'active'"
      ).run(giveaway.id);
      
      if (result > 0) {
        // Delete the giveaway message
        try {
          const channel = await interaction.client.channels.fetch(giveaway.channel_id) as TextChannel;
          const message = await channel.messages.fetch(messageId);
          await message.delete();
          logger.info(`Deleted giveaway message ${messageId} for cancelled giveaway ${giveaway.id}`);
        } catch (error) {
          logger.warn("Could not delete cancelled giveaway message:", error);
        }
        
        await interaction.editReply({
          content: `✅ Giveaway for **${giveaway.item_name}** cancelled and message deleted.`,
        });
      } else {
        await interaction.editReply({
          content: "❌ This giveaway is not active or already ended.",
        });
      }
    } catch (error) {
      logger.error("Failed to cancel giveaway:", error);
      await interaction.editReply({
        content: "❌ An error occurred while cancelling the giveaway.",
      });
    }
  },
};