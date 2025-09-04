import { REST, type RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from "../deps.ts";
import { config } from "../config/config.ts";
import { logger } from "./logger.ts";

export async function deployCommands(): Promise<void> {
  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  // Import command modules and get their data
  const commandFiles = [
    "../commands/giveaway.ts",
    "../commands/cancel.ts",
    "../commands/end.ts",
    "../commands/list.ts",
    "../commands/ping.ts",
    "../commands/stats.ts",
    "../commands/sync.ts",
  ];

  for (const file of commandFiles) {
    try {
      const commandModule = await import(file);
      commands.push(commandModule.default.data.toJSON());
    } catch (error) {
      logger.warn(`Could not load command from ${file}:`, error);
    }
  }

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    if (config.environment.nodeEnv === "development" && config.discord.guildId) {
      // Deploy to specific guild in development
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands },
      );
      logger.info(`Successfully deployed commands to guild ${config.discord.guildId}`);
    } else {
      // Deploy globally in production
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands },
      );
      logger.info("Successfully deployed commands globally");
    }
  } catch (error) {
    logger.error("Failed to deploy commands:", error);
    throw error;
  }
}
