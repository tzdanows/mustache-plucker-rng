import { Events, type Interaction, type ChatInputCommandInteraction } from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { handleInteractionError } from "../utils/errorHandler.ts";
import type { MoustachePluckerBot } from "../bot/client.ts";

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as MoustachePluckerBot;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Command not found: ${interaction.commandName}`);
      await interaction.reply({
        content: "❌ Unknown command. This command may have been removed.",
        ephemeral: true,
      });
      return;
    }

    try {
      // Check if command is guild-only
      if (command.guildOnly && !interaction.guildId) {
        await interaction.reply({
          content: "❌ This command can only be used in a server.",
          ephemeral: true,
        });
        return;
      }

      // Check permissions if specified
      if (command.permissions && interaction.memberPermissions) {
        const hasPermission = command.permissions.every(perm => 
          interaction.memberPermissions!.has(perm)
        );
        
        if (!hasPermission) {
          await interaction.reply({
            content: "❌ You don't have the required permissions for this command.",
            ephemeral: true,
          });
          return;
        }
      }

      await command.execute(interaction as ChatInputCommandInteraction);
    } catch (error) {
      await handleInteractionError(error, interaction);
    }
  },
};