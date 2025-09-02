import { 
  SlashCommandBuilder, 
  type CommandInteraction
} from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { getDatabase } from "../db/database.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("end")
    .setDescription("End a giveaway early")
    .addStringOption(option =>
      option
        .setName("message_id")
        .setDescription("Message ID of the giveaway")
        .setRequired(true)),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const messageId = interaction.options.get("message_id")?.value as string;
      const client = interaction.client as MoustachePluckerBot;
      
      // Check permissions
      if (!interaction.memberPermissions?.has("ManageGuild")) {
        const db = getDatabase();
        const giveaway = db.prepare(
          "SELECT creator_id FROM giveaways WHERE message_id = ?"
        ).get(messageId) as { creator_id: string } | undefined;
        
        if (!giveaway || giveaway.creator_id !== interaction.user.id) {
          await interaction.editReply({
            content: "❌ You don't have permission to end this giveaway.",
          });
          return;
        }
      }
      
      const success = await client.giveawayManager.endGiveawayManually(
        messageId,
        interaction.user.id
      );
      
      if (success) {
        await interaction.editReply({
          content: "✅ Giveaway ended successfully! Winners have been announced.",
        });
      } else {
        await interaction.editReply({
          content: "❌ Could not find an active giveaway with that message ID.",
        });
      }
    } catch (error) {
      logger.error("Failed to end giveaway:", error);
      await interaction.editReply({
        content: "❌ An error occurred while ending the giveaway.",
      });
    }
  },
};