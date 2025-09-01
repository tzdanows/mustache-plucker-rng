import { logger } from "./logger.ts";
import type { CommandInteraction } from "../deps.ts";

export class BotError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = "BotError";
  }
}

export class ValidationError extends BotError {
  constructor(message: string, userMessage?: string) {
    super(message, "VALIDATION_ERROR", userMessage);
    this.name = "ValidationError";
  }
}

export class PermissionError extends BotError {
  constructor(message: string, userMessage?: string) {
    super(message, "PERMISSION_ERROR", userMessage || "You don't have permission to do that.");
    this.name = "PermissionError";
  }
}

export class DatabaseError extends BotError {
  constructor(message: string, userMessage?: string) {
    super(message, "DATABASE_ERROR", userMessage || "A database error occurred.");
    this.name = "DatabaseError";
  }
}

export async function handleInteractionError(
  error: unknown,
  interaction: CommandInteraction
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  logger.error(`Error in command ${interaction.commandName}:`, {
    error: errorMessage,
    stack: errorStack,
    user: interaction.user.tag,
    guild: interaction.guildId,
  });

  let userMessage = "An unexpected error occurred. Please try again later.";
  
  if (error instanceof BotError) {
    userMessage = error.userMessage || userMessage;
  }

  try {
    if (interaction.deferred) {
      await interaction.editReply({
        content: `❌ ${userMessage}`,
      });
    } else if (interaction.replied) {
      await interaction.followUp({
        content: `❌ ${userMessage}`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `❌ ${userMessage}`,
        ephemeral: true,
      });
    }
  } catch (replyError) {
    logger.error("Failed to send error message to user:", replyError);
  }
}

export function setupGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  globalThis.addEventListener("error", (event) => {
    logger.error("Uncaught exception:", event.error);
    event.preventDefault();
  });

  // Handle unhandled promise rejections
  globalThis.addEventListener("unhandledrejection", (event) => {
    logger.error("Unhandled promise rejection:", event.reason);
    event.preventDefault();
  });

  logger.info("Global error handlers set up");
}