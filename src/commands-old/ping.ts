import { SlashCommandBuilder, type CommandInteraction } from "../deps.ts";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is responsive"),
  
  async execute(interaction: CommandInteraction) {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply({
      content: `🌙 Pong! Latency: ${latency}ms | Websocket: ${Math.round(interaction.client.ws.ping)}ms`,
      ephemeral: true,
    });
  },
};