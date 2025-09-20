import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "../deps.ts";
import type { SlashCommand } from "../types/discord.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";
import { logger } from "../utils/logger.ts";

const endCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("end")
    .setDescription("Manually end a flash sale early (Admin only)")
    .addStringOption((option) =>
      option
        .setName("message_id")
        .setDescription("Message ID to end (optional, defaults to last)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const bot = interaction.client as MoustachePluckerBot;
      const messageId = interaction.options.getString("message_id");

      let giveaway;
      if (messageId) {
        // End specific giveaway
        giveaway = await bot.giveawayManager.getGiveawayByMessageId(messageId);
        if (!giveaway) {
          await interaction.editReply("❌ No flash sale found with that message ID.");
          return;
        }
      } else {
        // End the last active giveaway in this guild
        const activeGiveaways = await bot.giveawayManager.getActiveGiveaways(interaction.guildId!);
        if (activeGiveaways.length === 0) {
          await interaction.editReply("❌ No active flash sales in this server.");
          return;
        }
        giveaway = activeGiveaways[activeGiveaways.length - 1];
      }

      // End the giveaway and pick winners
      const winners = await bot.giveawayManager.endGiveaway(giveaway.id);

      if (winners.length > 0) {
        const winnerMentions = winners.map((w, i) => `${i + 1}. <@${w.user_id}>`).join("\n");
        await interaction.editReply(
          `✅ Flash sale **${giveaway.item_name}** ended!\n\n🎉 Winners:\n${winnerMentions}`
        );
      } else {
        await interaction.editReply(
          `✅ Flash sale **${giveaway.item_name}** ended with no participants.`
        );
      }

      logger.info(`Flash sale ended manually: ${giveaway.id} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error("Error ending flash sale:", error);
      await interaction.editReply({
        content: "❌ Failed to end flash sale. Please try again.",
      });
    }
  },
};

export default endCommand;