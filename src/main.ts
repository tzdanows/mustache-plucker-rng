import { config, validateConfig } from "./config/config.ts";
import { MoustachePluckerBot } from "./bot/client.ts";
import { logger } from "./utils/logger.ts";
import { initDatabase } from "./db/database.ts";
import { setupGlobalErrorHandlers } from "./utils/errorHandler.ts";
import { WebServer } from "./web/server.ts";
import { ConnectionManager } from "./utils/connectionManager.ts";

async function main() {
  const connectionManager = new ConnectionManager();
  let bot: MoustachePluckerBot | null = null;
  let webServer: WebServer | null = null;
  let isShuttingDown = false;

  // Handle graceful shutdown
  const shutdownHandler = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info("Shutting down gracefully...");
    if (bot) bot.destroy();
    if (webServer) webServer.stop();
    Deno.exit(0);
  };

  Deno.addSignalListener("SIGINT", shutdownHandler);
  Deno.addSignalListener("SIGTERM", shutdownHandler);

  // Set up global error handlers
  setupGlobalErrorHandlers();

  try {
    // Validate configuration
    validateConfig();
    logger.info("Configuration validated successfully");

    // Initialize database
    await initDatabase();
    logger.info("Database initialized successfully");

    // Start connection loop with retry logic
    while (!isShuttingDown) {
      try {
        // Create and start bot
        bot = new MoustachePluckerBot();
        await bot.start();

        // Mark successful connection
        connectionManager.onSuccessfulConnection();

        // Start web server for giveaway summaries
        if (!webServer) {
          webServer = new WebServer(config.web.port);
          webServer.setDiscordClient(bot);
          await webServer.start();
        } else {
          webServer.setDiscordClient(bot);
        }

        // Wait for disconnect or shutdown
        await new Promise((resolve) => {
          bot!.on("disconnect", resolve);
          bot!.on("error", (error) => {
            logger.error("Discord client error:", error);
            resolve(error);
          });
        });

        logger.warn("Bot disconnected");

        // Clean up current bot instance
        if (bot) {
          bot.destroy();
          bot = null;
        }

        // Check if we should reconnect
        if (!isShuttingDown && !await connectionManager.shouldReconnect()) {
          logger.error("Maximum reconnection attempts exceeded. Exiting.");
          break;
        }
      } catch (error) {
        logger.error(
          "Error in bot connection:",
          error instanceof Error ? error.message : String(error),
        );

        if (bot) {
          bot.destroy();
          bot = null;
        }

        // Check if we should reconnect
        if (!isShuttingDown && !await connectionManager.shouldReconnect()) {
          logger.error("Maximum reconnection attempts exceeded. Exiting.");
          break;
        }
      }
    }
  } catch (error) {
    logger.error(
      "Fatal error during startup:",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error) {
      logger.error("Stack trace:", error.stack);
    }
  } finally {
    if (!isShuttingDown) {
      await shutdownHandler();
    }
  }
}

// Run the bot
if (import.meta.main) {
  main();
}
