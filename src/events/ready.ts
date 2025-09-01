import { Events, type Client } from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { deployCommands } from "../utils/deployCommands.ts";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client) {
    if (!client.user) return;
    
    logger.info(`🎩 Moustache Plucker Bot is ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
    
    // Set bot status
    client.user.setActivity("plucking moustaches 🎩", { type: 0 });
    
    // Deploy slash commands
    try {
      await deployCommands();
      logger.info("Slash commands deployed successfully");
    } catch (error) {
      logger.error("Failed to deploy slash commands:", error);
    }
  },
};