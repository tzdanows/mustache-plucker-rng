import { 
  SlashCommandBuilder, 
  type CommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel
} from "../deps.ts";
import { createGiveaway, getActiveGiveaways, getGiveawayParticipants } from "../db/giveawayRepository.ts";
import { logger } from "../utils/logger.ts";
import { getDatabase } from "../db/database.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";
import { parseDuration, formatTimeRemaining } from "../utils/duration.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Create a new giveaway")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Name of the item to give away (include price if desired)")
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName("duration")
        .setDescription("Duration (e.g., 30s, 5m, 2h, 7d, 1y)")
        .setRequired(true))
    .addIntegerOption(option =>
      option
        .setName("winners")
        .setDescription("Number of winners (default: 1)")
        .setMinValue(1)
        .setMaxValue(100)),

  async execute(interaction: CommandInteraction) {
    await handleCreate(interaction);
  },
};

async function handleCreate(interaction: CommandInteraction) {
  await interaction.deferReply();

  try {
    // Get options - item now contains both name and optional price
    const itemInput = interaction.options.get("item")?.value as string;
    const winners = (interaction.options.get("winners")?.value as number) || 1;
    const durationStr = interaction.options.get("duration")?.value as string;

    // Parse duration
    const durationMs = parseDuration(durationStr);
    if (!durationMs) {
      await interaction.editReply({
        content: "❌ Invalid duration format. Use formats like: 30s, 5m, 2h, 7d, 1y",
      });
      return;
    }

    // Calculate end time
    const endsAt = new Date(Date.now() + durationMs);

    // Create customized embed - use the full input as the title
    const titleText = itemInput;
    const timeRemaining = formatTimeRemaining(endsAt);
    
    const embed = new EmbedBuilder()
      .setTitle(titleText)
      .setColor(0x5865F2)
      .addFields(
        { 
          name: "Plucking in", 
          value: timeRemaining, 
          inline: false 
        },
        { 
          name: "Entries", 
          value: "0", 
          inline: false 
        },
        { 
          name: "Winner(s)", 
          value: `${winners} moustache${winners > 1 ? "s" : ""} will be plucked`, 
          inline: false 
        }
      )
      .setFooter({ text: "React with 🎉 to enter!" })
      .setTimestamp(endsAt);

    // Send the giveaway message
    const message = await interaction.editReply({
      embeds: [embed],
    });

    // Add reaction
    await message.react("🎉");

    // Create giveaway in database
    const giveawayId = crypto.randomUUID();
    await createGiveaway({
      id: giveawayId,
      guild_id: interaction.guildId!,
      channel_id: interaction.channelId,
      message_id: message.id,
      creator_id: interaction.user.id,
      item_name: itemInput,  // Store the full input as item name
      item_quantity: 1,
      item_price: undefined,  // No separate price field now
      winner_count: winners,
      ends_at: endsAt.toISOString(),
    });

    logger.info(`Giveaway created: ${giveawayId} for ${itemInput} by ${interaction.user.tag}`);
  } catch (error) {
    logger.error("Failed to create giveaway:", error);
    await interaction.editReply({
      content: "Failed to create giveaway. Please try again.",
    });
  }
}