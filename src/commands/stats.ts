import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "../deps.ts";
import { getDatabase } from "../db/database.ts";
import { logger } from "../utils/logger.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View bot statistics"),
  
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      const db = getDatabase();
      
      // Get statistics
      const totalGiveaways = db.prepare(
        "SELECT COUNT(*) as count FROM giveaways"
      ).get() as { count: number };
      
      const activeGiveaways = db.prepare(
        "SELECT COUNT(*) as count FROM giveaways WHERE status = 'active'"
      ).get() as { count: number };
      
      const totalParticipants = db.prepare(
        "SELECT COUNT(DISTINCT user_id) as count FROM participants"
      ).get() as { count: number };
      
      const totalWinners = db.prepare(
        "SELECT COUNT(DISTINCT user_id) as count FROM winners"
      ).get() as { count: number };
      
      // Get server-specific stats if in a guild
      let guildStats = null;
      if (interaction.guildId) {
        guildStats = {
          guildGiveaways: db.prepare(
            "SELECT COUNT(*) as count FROM giveaways WHERE guild_id = ?"
          ).get(interaction.guildId) as { count: number },
          
          guildActiveGiveaways: db.prepare(
            "SELECT COUNT(*) as count FROM giveaways WHERE guild_id = ? AND status = 'active'"
          ).get(interaction.guildId) as { count: number },
        };
      }
      
      const embed = new EmbedBuilder()
        .setTitle("📊 Moustache Plucker Statistics")
        .setColor(0x5865F2)
        .addFields(
          { 
            name: "Total Giveaways", 
            value: totalGiveaways.count.toString(), 
            inline: true 
          },
          { 
            name: "Active Giveaways", 
            value: activeGiveaways.count.toString(), 
            inline: true 
          },
          { 
            name: "Unique Participants", 
            value: totalParticipants.count.toString(), 
            inline: true 
          },
          { 
            name: "Total Winners", 
            value: totalWinners.count.toString(), 
            inline: true 
          },
          {
            name: "Bot Guilds",
            value: interaction.client.guilds.cache.size.toString(),
            inline: true
          },
          {
            name: "Uptime",
            value: formatUptime(interaction.client.uptime || 0),
            inline: true
          }
        )
        .setFooter({ 
          text: `Moustache Plucker v1.0.0` 
        })
        .setTimestamp();
      
      if (guildStats) {
        embed.addFields(
          { 
            name: "\u200B", 
            value: "**Server Statistics**", 
            inline: false 
          },
          { 
            name: "Server Total", 
            value: guildStats.guildGiveaways.count.toString(), 
            inline: true 
          },
          { 
            name: "Server Active", 
            value: guildStats.guildActiveGiveaways.count.toString(), 
            inline: true 
          }
        );
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error("Failed to get statistics:", error);
      await interaction.editReply({
        content: "❌ Failed to retrieve statistics.",
      });
    }
  },
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}