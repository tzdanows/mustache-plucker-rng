import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "../deps.ts";
import type { SlashCommand } from "../types/discord.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";
import { logger } from "../utils/logger.ts";

const cancelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("cancel")
    .setDescription("Cancel an active flash sale (Admin only)")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("Message ID to cancel (optional, defaults to last)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const bot = interaction.client as MoustachePluckerBot;
      const messageId = interaction.options.getString("message_id");

      let giveaway;
      if (messageId) {
        // Cancel specific giveaway
        giveaway = await bot.giveawayManager.getGiveawayByMessageId(messageId);
        if (!giveaway) {
          await interaction.editReply("❌ No flash sale found with that message ID.");
          return;
        }
      } else {
        // Cancel the last active giveaway in this guild
        const activeGiveaways = await bot.giveawayManager.getActiveGiveaways(interaction.guildId!);
        if (activeGiveaways.length === 0) {
          await interaction.editReply("❌ No active flash sales in this server.");
          return;
        }
        giveaway = activeGiveaways[activeGiveaways.length - 1];
      }

      // Cancel the giveaway
      await bot.giveawayManager.cancelGiveaway(giveaway.id);

      await interaction.editReply(
        `✅ Flash sale **${giveaway.item_name}** has been cancelled.`
      );

      logger.info(`Flash sale cancelled: ${giveaway.id} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error("Error cancelling flash sale:", error);
      await interaction.editReply({
        content: "❌ Failed to cancel flash sale. Please try again.",
      });
    }
  },
};

export default cancelCommand;