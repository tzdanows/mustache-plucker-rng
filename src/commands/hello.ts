import { SlashCommandBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction } from "../deps.ts";
import type { SlashCommand } from "../types/discord.ts";

const helloCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Display a garlic rectangle with HELLO in tomatoes (Admin only)"),

  async execute(interaction: ChatInputCommandInteraction) {
    // Create the garlic border with tomato HELLO text
    const art = `\`\`\`
🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄
🧄                           🧄
🧄  🍅 🍅 🍅 🍅 🍅 🍅 🍅 🍅  🧄
🧄  🍅 H E L L O 🍅  🧄
🧄  🍅 🍅 🍅 🍅 🍅 🍅 🍅 🍅  🧄
🧄                           🧄
🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄🧄
\`\`\``;

    await interaction.reply({
      content: art,
      ephemeral: false,
    });
  },
};

export default helloCommand;