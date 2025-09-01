// Discord.js dependencies
export {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  type Interaction,
  type CommandInteraction,
  type MessageReaction,
  type User,
  type PartialMessageReaction,
  type PartialUser,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

// Standard library dependencies  
export { load } from "@std/dotenv";
export { ensureDir } from "@std/fs/ensure-dir";
export { join } from "@std/path";

// Database
export { Database } from "@db/sqlite";

// Note: We'll use Web Crypto API directly for secure randomness