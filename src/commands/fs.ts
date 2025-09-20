import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "../deps.ts";
import type { SlashCommand } from "../types/discord.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";
import { parseDuration } from "../utils/duration.ts";
import { logger } from "../utils/logger.ts";

const fsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("fs")
    .setDescription("Create a new flash sale (Admin only)")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("What you're selling (e.g., 'Keycap Set $75')")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("How long the sale runs (e.g., '30s', '5m', '2h', '7d')")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("winners")
        .setDescription("Number of winners to select")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const bot = interaction.client as MoustachePluckerBot;
      const item = interaction.options.getString("item", true);
      const durationStr = interaction.options.getString("duration") || "2h";
      const winnerCount = interaction.options.getInteger("winners") || 1;

      // Parse duration
      const durationMs = parseDuration(durationStr);
      if (!durationMs || durationMs < 10000) {
        await interaction.editReply("❌ Invalid duration. Minimum is 10 seconds.");
        return;
      }

      // Calculate end time
      const endsAt = new Date(Date.now() + durationMs);

      // Create the flash sale
      const giveaway = await bot.giveawayManager.createGiveaway({
        guildId: interaction.guildId!,
        channelId: interaction.channelId,
        creatorId: interaction.user.id,
        itemName: item,
        winnerCount,
        endsAt,
      });

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("🎉 FLASH SALE!")
        .setDescription(`**${item}**`)
        .setColor(0x00ff00)
        .addFields(
          { name: "React with", value: "🎉 to enter!", inline: true },
          { name: "Winners", value: `${winnerCount}`, inline: true },
          { name: "Ends", value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true }
        )
        .setFooter({ text: `ID: ${giveaway.id}` })
        .setTimestamp();

      // Send the message
      const message = await interaction.editReply({
        embeds: [embed],
      });

      // Add reaction
      await message.react("🎉");

      // Update giveaway with message ID
      await bot.giveawayManager.updateMessageId(giveaway.id, message.id);

      logger.info(`Flash sale created: ${giveaway.id} in ${interaction.guildId}`);
    } catch (error) {
      logger.error("Error creating flash sale:", error);
      await interaction.editReply({
        content: "❌ Failed to create flash sale. Please try again.",
      });
    }
  },
};

export default fsCommand;