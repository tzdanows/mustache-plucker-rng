import { 
  SlashCommandBuilder, 
  type CommandInteraction,
  EmbedBuilder
} from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { getActiveGiveaways, getGiveawayParticipants } from "../db/giveawayRepository.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List active giveaways in this server"),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const giveaways = await getActiveGiveaways(interaction.guildId!);
      
      if (giveaways.length === 0) {
        await interaction.editReply({
          content: "📋 No active giveaways in this server.",
        });
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle("📋 Active Giveaways")
        .setColor(0x5865F2)
        .setTimestamp();
      
      for (const giveaway of giveaways.slice(0, 10)) { // Limit to 10
        const endsAt = new Date(giveaway.ends_at);
        const participantCount = await getGiveawayParticipants(giveaway.id).then(p => p.length);
        
        embed.addFields({
          name: giveaway.item_name,
          value: `Message ID: ${giveaway.message_id}\n` +
                 `Winners: ${giveaway.winner_count}\n` +
                 `Participants: ${participantCount}\n` +
                 `Ends: <t:${Math.floor(endsAt.getTime() / 1000)}:R>`,
          inline: true,
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error("Failed to list giveaways:", error);
      await interaction.editReply({
        content: "❌ An error occurred while listing giveaways.",
      });
    }
  },
};