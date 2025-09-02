import { load } from "../deps.ts";

// Load environment variables
await load({ export: true });

export const config = {
  discord: {
    token: Deno.env.get("DISCORD_TOKEN") || "",
    clientId: Deno.env.get("DISCORD_CLIENT_ID") || "",
    guildId: Deno.env.get("DISCORD_GUILD_ID") || "",
  },
  database: {
    path: Deno.env.get("DATABASE_PATH") || "./data/moustache_plucker.db",
  },
  bot: {
    prefix: Deno.env.get("BOT_PREFIX") || "!",
    defaultWinnerCount: parseInt(Deno.env.get("DEFAULT_WINNER_COUNT") || "3"),
    maxGiveawayDurationDays: parseInt(Deno.env.get("MAX_GIVEAWAY_DURATION_DAYS") || "30"),
  },
  environment: {
    nodeEnv: Deno.env.get("NODE_ENV") || "development",
    logLevel: Deno.env.get("LOG_LEVEL") || "info",
  },
  web: {
    port: parseInt(Deno.env.get("WEB_PORT") || "8081"),
  },
};

// Validate required configuration
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.discord.token) {
    errors.push("DISCORD_TOKEN is required");
  }

  if (!config.discord.clientId) {
    errors.push("DISCORD_CLIENT_ID is required");
  }

  // Guild ID is now optional for global commands
  // if (config.environment.nodeEnv === "development" && !config.discord.guildId) {
  //   errors.push("DISCORD_GUILD_ID is required for development mode");
  // }

  if (errors.length > 0) {
    console.error("Configuration errors:");
    errors.forEach((error) => console.error(`  - ${error}`));
    console.error("\nPlease create a .env file based on .env.example");
    Deno.exit(1);
  }
}