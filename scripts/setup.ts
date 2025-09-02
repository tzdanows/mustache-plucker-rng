#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path";

console.log("🌙 Moustache Plucker Bot - Setup Script\n");

// Check if .env already exists
const envPath = ".env";
const envExamplePath = ".env.example";

try {
  await Deno.stat(envPath);
  console.log("✅ .env file already exists");
  
  const overwrite = confirm("Do you want to overwrite the existing .env file?");
  if (!overwrite) {
    console.log("Keeping existing .env file");
  } else {
    await createEnvFile();
  }
} catch {
  console.log("📝 Creating .env file...");
  await createEnvFile();
}

// Ensure data directory exists
console.log("\n📁 Creating data directory...");
await ensureDir("./data");
console.log("✅ Data directory ready");

// Check Deno version
console.log("\n🔍 Checking Deno version...");
const denoVersion = Deno.version.deno;
console.log(`✅ Deno version: ${denoVersion}`);

if (compareVersions(denoVersion, "1.37.0") < 0) {
  console.warn("⚠️  Warning: Deno 1.37.0 or higher is recommended");
}

console.log("\n📦 Installing dependencies...");
const cacheProcess = new Deno.Command("deno", {
  args: ["cache", "--reload", "src/deps.ts"],
  stdout: "piped",
  stderr: "piped",
});

const cacheResult = await cacheProcess.output();
if (cacheResult.success) {
  console.log("✅ Dependencies cached successfully");
} else {
  console.error("❌ Failed to cache dependencies");
  console.error(new TextDecoder().decode(cacheResult.stderr));
}

console.log("\n🗃️  Initializing database...");
const dbProcess = new Deno.Command("deno", {
  args: ["run", "--allow-read", "--allow-write", "--allow-env", "--allow-net", "--allow-ffi", "src/db/seed.ts"],
  stdout: "piped",
  stderr: "piped",
});

const dbResult = await dbProcess.output();
if (dbResult.success) {
  console.log("✅ Database initialized with seed data");
} else {
  console.warn("⚠️  Database initialization had issues (this might be okay on first run)");
}

// Generate bot invite link
console.log("\n🔗 Bot Invite Link Generator");
console.log("=" .repeat(50));

const useDefaults = confirm("Would you like to generate a bot invite link now?");
if (useDefaults) {
  const clientId = prompt("Enter your Discord Application/Client ID:");
  
  if (clientId) {
    const permissions = "3197952"; // Send Messages, Embed Links, Add Reactions, Read Message History, Use Slash Commands
    const scopes = "bot%20applications.commands";
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scopes}`;
    
    console.log("\n✅ Bot Invite URL:");
    console.log(inviteUrl);
    console.log("\nPermissions included:");
    console.log("  - Send Messages");
    console.log("  - Embed Links");
    console.log("  - Add Reactions");
    console.log("  - Read Message History");
    console.log("  - Use Slash Commands");
    console.log("  - Read Messages/View Channels");
  }
}

console.log("\n" + "=".repeat(50));
console.log("✨ Setup complete!");
console.log("\nNext steps:");
console.log("1. Edit .env file with your Discord bot token");
console.log("2. Run 'deno task dev' to start the bot");
console.log("3. Use the invite link to add the bot to your server");
console.log("\nFor detailed instructions, see SETUP.md");

async function createEnvFile() {
  try {
    const template = await Deno.readTextFile(envExamplePath);
    
    console.log("\n🔧 Let's configure your bot:");
    console.log("(Press Enter to use default values)\n");
    
    const token = prompt("Discord Bot Token (required):") || "";
    const clientId = prompt("Discord Client/Application ID (required):") || "";
    const guildId = prompt("Test Server/Guild ID (for development):") || "";
    const dbPath = prompt("Database Path [./data/moustache_plucker.db]:") || "./data/moustache_plucker.db";
    const winnerCount = prompt("Default Winner Count [3]:") || "3";
    const maxDuration = prompt("Max Giveaway Duration in Days [30]:") || "30";
    const logLevel = prompt("Log Level (debug/info/warn/error) [info]:") || "info";
    
    let envContent = template;
    envContent = envContent.replace("your_bot_token_here", token);
    envContent = envContent.replace("your_client_id_here", clientId);
    envContent = envContent.replace("your_test_guild_id_here", guildId);
    envContent = envContent.replace("./data/moustache_plucker.db", dbPath);
    envContent = envContent.replace("DEFAULT_WINNER_COUNT=3", `DEFAULT_WINNER_COUNT=${winnerCount}`);
    envContent = envContent.replace("MAX_GIVEAWAY_DURATION_DAYS=30", `MAX_GIVEAWAY_DURATION_DAYS=${maxDuration}`);
    envContent = envContent.replace("LOG_LEVEL=info", `LOG_LEVEL=${logLevel}`);
    
    await Deno.writeTextFile(envPath, envContent);
    console.log("\n✅ .env file created successfully");
    
    if (!token || !clientId) {
      console.warn("\n⚠️  Warning: Bot token and client ID are required!");
      console.warn("Please edit the .env file before running the bot.");
    }
  } catch (error) {
    console.error("❌ Failed to create .env file:", error);
  }
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}