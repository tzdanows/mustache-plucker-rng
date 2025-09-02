import { Client, Collection, GatewayIntentBits } from "../deps.ts";
import { config } from "../config/config.ts";
import { logger } from "../utils/logger.ts";
import type { SlashCommand } from "../types/discord.ts";
import { GiveawayManager } from "../services/giveawayManager.ts";
import { EmbedUpdater } from "../services/embedUpdater.ts";

export class MoustachePluckerBot extends Client {
  commands: Collection<string, SlashCommand>;
  giveawayManager: GiveawayManager;
  embedUpdater: EmbedUpdater;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.commands = new Collection();
    this.giveawayManager = new GiveawayManager(this);
    this.embedUpdater = new EmbedUpdater(this);
  }

  async start(): Promise<void> {
    try {
      // Register event handlers
      await this.registerEvents();

      // Load commands
      await this.loadCommands();

      // Login to Discord
      logger.info("Attempting to login to Discord...");
      await this.login(config.discord.token);
      
      logger.info("Moustache Plucker Bot is starting...");
    } catch (error) {
      logger.error("Failed to start bot:", error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.message.includes("token")) {
        logger.error("Token issue detected. Please check your DISCORD_TOKEN in .env file");
      }
      throw error;
    }
  }

  private async registerEvents(): Promise<void> {
    // Import and register all event handlers
    const eventFiles = [
      "ready.ts",
      "interactionCreate.ts",
      "messageReactionAdd.ts",
      "messageReactionRemove.ts",
    ];

    for (const file of eventFiles) {
      try {
        const eventModule = await import(`../events/${file}`);
        const event = eventModule.default;
        
        if (event.once) {
          this.once(event.name, (...args) => event.execute(...args));
        } else {
          this.on(event.name, (...args) => event.execute(...args));
        }
        
        logger.debug(`Registered event: ${event.name}`);
      } catch (error) {
        logger.warn(`Could not load event ${file}:`, error);
      }
    }
  }

  private async loadCommands(): Promise<void> {
    // Import and register all command handlers
    const commandFiles = [
      "giveaway.ts",
      "cancel.ts",
      "end.ts",
      "list.ts",
      "ping.ts",
      "stats.ts",
      "sync.ts",
    ];

    for (const file of commandFiles) {
      try {
        const commandModule = await import(`../commands/${file}`);
        const command = commandModule.default;
        
        this.commands.set(command.data.name, command);
        logger.debug(`Loaded command: ${command.data.name}`);
      } catch (error) {
        logger.warn(`Could not load command ${file}:`, error);
      }
    }
  }
}