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
        .addStringOption(option =>
          option
            .setName("duration")
            .setDescription("Duration (e.g., 30s, 5m, 2h, 7d, 1y)")
            .setRequired(true))
        .addIntegerOption(option =>
          option
            .setName("winners")
            .setDescription("Number of winners (default: 3)")
            .setMinValue(1)
            .setMaxValue(100))
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
        .setDescription("Cancel a giveaway (defaults to last created)")
        .addStringOption(option =>
          option
            .setName("message_id")
            .setDescription("Message ID of the giveaway (optional)")
            .setRequired(false))),

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
    const winners = (interaction.options.get("winners")?.value as number) || 1;
    const durationStr = interaction.options.get("duration")?.value as string;
    const quantity = (interaction.options.get("quantity")?.value as number) || 1;
    const price = interaction.options.get("price")?.value as string | undefined;

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

    // Create customized embed
    const titleText = price ? `${itemName} ${price}` : itemName;
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
}

async function handleList(interaction: CommandInteraction) {
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
}

async function handleCancel(interaction: CommandInteraction) {
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
      // Try to update the original message
      try {
        const channel = await interaction.client.channels.fetch(giveaway.channel_id) as TextChannel;
        const message = await channel.messages.fetch(messageId);
        
        const titleText = giveaway.item_price ? 
          `${giveaway.item_name} ${giveaway.item_price}` : 
          giveaway.item_name;
        
        const embed = new EmbedBuilder()
          .setTitle(`❌ ${titleText}`)
          .setDescription("This giveaway has been cancelled.")
          .setColor(0xFF0000)
          .setFooter({ text: `Cancelled by ${interaction.user.tag}` })
          .setTimestamp();
        
        await message.edit({ embeds: [embed] });
      } catch (error) {
        logger.warn("Could not update cancelled giveaway message:", error);
      }
      
      await interaction.editReply({
        content: `✅ Giveaway for **${giveaway.item_name}** cancelled successfully.`,
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
}