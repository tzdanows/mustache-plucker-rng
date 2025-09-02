import { 
  SlashCommandBuilder, 
  type CommandInteraction
} from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { getDatabase } from "../db/database.ts";
import { DeploySync } from "../services/deploySync.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Manually sync a giveaway to the web report (for testing)")
    .addStringOption(option =>
      option
        .setName("giveaway_id")
        .setDescription("Giveaway ID to sync (leave empty for last giveaway)")
        .setRequired(false)),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const db = getDatabase();
      const specificId = interaction.options.get("giveaway_id")?.value as string | undefined;
      
      let giveaway: any;
      
      if (specificId) {
        // Get specific giveaway
        giveaway = db.prepare(
          "SELECT * FROM giveaways WHERE id = ?"
        ).get(specificId);
      } else {
        // Get the most recent giveaway
        giveaway = db.prepare(
          "SELECT * FROM giveaways ORDER BY created_at DESC LIMIT 1"
        ).get();
      }
      
      if (!giveaway) {
        await interaction.editReply({
          content: "❌ No giveaway found to sync",
        });
        return;
      }
      
      // Perform sync
      const client = interaction.client as MoustachePluckerBot;
      const deploySync = new DeploySync(client);
      
      logger.info(`Manually syncing giveaway ${giveaway.id}`);
      await deploySync.syncGiveaway(giveaway.id);
      
      const deployUrl = Deno.env.get("DEPLOY_URL") || "http://localhost:8432";
      const reportUrl = `${deployUrl}/report/${giveaway.id}`;
      
      await interaction.editReply({
        content: `✅ Giveaway synced!\n**Item:** ${giveaway.item_name}\n**ID:** ${giveaway.id}\n**Status:** ${giveaway.status}\n**View at:** ${reportUrl}`,
      });
      
    } catch (error) {
      logger.error("Failed to sync giveaway:", error);
      await interaction.editReply({
        content: `❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
};