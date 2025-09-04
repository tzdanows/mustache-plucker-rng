import { config, validateConfig } from "./config/config.ts";
import { MoustachePluckerBot } from "./bot/client.ts";
import { logger } from "./utils/logger.ts";
import { initDatabase } from "./db/database.ts";
import { setupGlobalErrorHandlers } from "./utils/errorHandler.ts";
import { WebServer } from "./web/server.ts";

async function main() {
  try {
    // Set up global error handlers
    setupGlobalErrorHandlers();

    // Validate configuration
    validateConfig();
    logger.info("Configuration validated successfully");

    // Initialize database
    await initDatabase();
    logger.info("Database initialized successfully");

    // Create and start bot
    const bot = new MoustachePluckerBot();
    await bot.start();

    // Start web server for giveaway summaries
    const webServer = new WebServer(config.web.port);
    webServer.setDiscordClient(bot);
    await webServer.start();

    // Handle graceful shutdown
    const shutdownHandler = async () => {
      logger.info("Shutting down gracefully...");
      bot.destroy();
      webServer.stop();
      Deno.exit(0);
    };

    Deno.addSignalListener("SIGINT", shutdownHandler);
    Deno.addSignalListener("SIGTERM", shutdownHandler);
  } catch (error) {
    logger.error(
      "Fatal error during startup:",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error) {
      logger.error("Stack trace:", error.stack);
    }
    Deno.exit(1);
  }
}

// Run the bot
if (import.meta.main) {
  main();
}
