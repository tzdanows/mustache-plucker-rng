import { Events, type Interaction, type CommandInteraction } from "../deps.ts";
import { logger } from "../utils/logger.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isCommand()) return;

    const client = interaction.client as MoustachePluckerBot;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Command not found: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction as CommandInteraction);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      
      const errorMessage = "There was an error executing this command!";
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};