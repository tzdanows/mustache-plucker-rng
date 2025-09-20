import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "../deps.ts";
import type { SlashCommand } from "../types/discord.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";
import { logger } from "../utils/logger.ts";
import { config } from "../config/config.ts";

const syncCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Sync giveaway data to web report (Admin only)")
    .addStringOption((option) =>
      option
        .setName("giveaway_id")
        .setDescription("Giveaway ID to sync (optional, defaults to latest)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const bot = interaction.client as MoustachePluckerBot;
      const giveawayId = interaction.options.getString("giveaway_id");

      let giveaway;
      if (giveawayId) {
        // Sync specific giveaway
        giveaway = await bot.giveawayManager.getGiveawayById(giveawayId);
        if (!giveaway) {
          await interaction.editReply("❌ No giveaway found with that ID.");
          return;
        }
      } else {
        // Sync the latest giveaway in this guild
        const allGiveaways = await bot.giveawayManager.getAllGiveaways(interaction.guildId!);
        if (allGiveaways.length === 0) {
          await interaction.editReply("❌ No giveaways found in this server.");
          return;
        }
        giveaway = allGiveaways[allGiveaways.length - 1];
      }

      // Sync to deploy instance if configured
      if (bot.deploySync) {
        await bot.deploySync.syncGiveaway(giveaway);
      }

      // Generate report URL
      const reportUrl = `http://localhost:${config.web.port}/report/${giveaway.id}`;

      await interaction.editReply(
        `✅ Giveaway **${giveaway.item_name}** synced!\n\n📊 Report available at: ${reportUrl}`
      );

      logger.info(`Giveaway synced: ${giveaway.id} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error("Error syncing giveaway:", error);
      await interaction.editReply({
        content: "❌ Failed to sync giveaway. Please try again.",
      });
    }
  },
};

export default syncCommand;