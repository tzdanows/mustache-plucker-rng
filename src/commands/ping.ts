import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "../deps.ts";
import type { SlashCommand } from "../types/discord.ts";

const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Test if the bot is responsive (Admin only)"),

  async execute(interaction: ChatInputCommandInteraction) {
    const latency = Date.now() - interaction.createdTimestamp;
    const apiLatency = interaction.client.ws.ping;
    
    await interaction.reply({
      content: `🏓 Pong! Latency: ${latency}ms | API Latency: ${apiLatency}ms`,
      ephemeral: true,
    });
  },
};

export default pingCommand;