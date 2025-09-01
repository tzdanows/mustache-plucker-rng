import { 
  SlashCommandBuilder, 
  type CommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle 
} from "../deps.ts";
import { createGiveaway } from "../db/giveawayRepository.ts";
import { logger } from "../utils/logger.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage giveaways")
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Create a new giveaway")
        .addStringOption(option =>
          option
            .setName("item")
            .setDescription("Name of the item to give away")
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName("winners")
            .setDescription("Number of winners (default: 3)")
            .setMinValue(1)
            .setMaxValue(100))
        .addIntegerOption(option =>
          option
            .setName("duration")
            .setDescription("Duration in minutes")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(43200)) // Max 30 days
        .addIntegerOption(option =>
          option
            .setName("quantity")
            .setDescription("Quantity of items (default: 1)")
            .setMinValue(1))
        .addStringOption(option =>
          option
            .setName("price")
            .setDescription("Price/value of the item (optional)")))
    .addSubcommand(subcommand =>
      subcommand
        .setName("end")
        .setDescription("End a giveaway early")
        .addStringOption(option =>
          option
            .setName("message_id")
            .setDescription("Message ID of the giveaway")
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("List active giveaways in this server"))
    .addSubcommand(subcommand =>
      subcommand
        .setName("cancel")
        .setDescription("Cancel a giveaway")
        .addStringOption(option =>
          option
            .setName("message_id")
            .setDescription("Message ID of the giveaway")
            .setRequired(true))),

  async execute(interaction: CommandInteraction) {
    const subcommand = interaction.options.data[0]?.name;

    switch (subcommand) {
      case "create":
        await handleCreate(interaction);
        break;
      case "end":
        await handleEnd(interaction);
        break;
      case "list":
        await handleList(interaction);
        break;
      case "cancel":
        await handleCancel(interaction);
        break;
      default:
        await interaction.reply({ 
          content: "Unknown subcommand", 
          ephemeral: true 
        });
    }
  },
};

async function handleCreate(interaction: CommandInteraction) {
  await interaction.deferReply();

  try {
    // Get options
    const itemName = interaction.options.get("item")?.value as string;
    const winners = (interaction.options.get("winners")?.value as number) || 3;
    const duration = interaction.options.get("duration")?.value as number;
    const quantity = (interaction.options.get("quantity")?.value as number) || 1;
    const price = interaction.options.get("price")?.value as string | undefined;

    // Calculate end time
    const endsAt = new Date(Date.now() + duration * 60 * 1000);

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle("🎉 **GIVEAWAY** 🎉")
      .setDescription(`**${itemName}**`)
      .setColor(0x5865F2)
      .addFields(
        { name: "Quantity", value: quantity.toString(), inline: true },
        { name: "Winners", value: `${winners} lucky moustache${winners > 1 ? "s" : ""}`, inline: true },
        { name: "Ends", value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: "React with 🎉 to enter!" })
      .setTimestamp(endsAt);

    if (price) {
      embed.addFields({ name: "Value", value: price, inline: true });
    }

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
      item_name: itemName,
      item_quantity: quantity,
      item_price: price,
      winner_count: winners,
      ends_at: endsAt.toISOString(),
    });

    logger.info(`Giveaway created: ${giveawayId} for ${itemName} by ${interaction.user.tag}`);
  } catch (error) {
    logger.error("Failed to create giveaway:", error);
    await interaction.editReply({
      content: "Failed to create giveaway. Please try again.",
    });
  }
}

async function handleEnd(interaction: CommandInteraction) {
  await interaction.reply({
    content: "⏳ Ending giveaway... (This feature will be implemented soon)",
    ephemeral: true,
  });
}

async function handleList(interaction: CommandInteraction) {
  await interaction.reply({
    content: "📋 Listing giveaways... (This feature will be implemented soon)",
    ephemeral: true,
  });
}

async function handleCancel(interaction: CommandInteraction) {
  await interaction.reply({
    content: "❌ Cancelling giveaway... (This feature will be implemented soon)",
    ephemeral: true,
  });
}