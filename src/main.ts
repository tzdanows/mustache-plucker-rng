import { validateConfig } from "./config/config.ts";
import { MoustachePluckerBot } from "./bot/client.ts";
import { logger } from "./utils/logger.ts";
import { initDatabase } from "./db/database.ts";

async function main() {
  try {
    // Validate configuration
    validateConfig();
    logger.info("Configuration validated successfully");

    // Initialize database
    await initDatabase();
    logger.info("Database initialized successfully");

    // Create and start bot
    const bot = new MoustachePluckerBot();
    await bot.start();
    
    // Handle graceful shutdown
    const shutdownHandler = async () => {
      logger.info("Shutting down gracefully...");
      bot.destroy();
      Deno.exit(0);
    };

    Deno.addSignalListener("SIGINT", shutdownHandler);
    Deno.addSignalListener("SIGTERM", shutdownHandler);

  } catch (error) {
    logger.error("Fatal error during startup:", error);
    Deno.exit(1);
  }
}

// Run the bot
if (import.meta.main) {
  main();
}