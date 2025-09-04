import { logger } from "./logger.ts";

/**
 * Parse a duration string into milliseconds
 * Supports formats like: 30s, 5m, 2h, 7d, 1y
 * Default unit is seconds if no unit specified
 */
export function parseDuration(duration: string): number | null {
  const match = duration.match(/^(\d+)([smhdy])?$/i);

  if (!match) {
    logger.warn(`Invalid duration format: ${duration}`);
    return null;
  }

  const value = parseInt(match[1]);
  const unit = match[2]?.toLowerCase() || "s"; // Default to seconds

  const multipliers: Record<string, number> = {
    "s": 1000, // seconds
    "m": 60 * 1000, // minutes
    "h": 60 * 60 * 1000, // hours
    "d": 24 * 60 * 60 * 1000, // days
    "y": 365 * 24 * 60 * 60 * 1000, // years
  };

  const multiplier = multipliers[unit];
  if (!multiplier) {
    logger.warn(`Unknown duration unit: ${unit}`);
    return null;
  }

  const milliseconds = value * multiplier;

  // Validate duration is reasonable (min 1 second, max 2 years)
  const minDuration = 1000; // 1 second
  const maxDuration = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years

  if (milliseconds < minDuration) {
    logger.warn(`Duration too short: ${duration} (minimum 1s)`);
    return null;
  }

  if (milliseconds > maxDuration) {
    logger.warn(`Duration too long: ${duration} (maximum 2y)`);
    return null;
  }

  return milliseconds;
}

/**
 * Format milliseconds into a human-readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format remaining time for display
 */
export function formatTimeRemaining(endsAt: Date): string {
  const now = Date.now();
  const remaining = endsAt.getTime() - now;

  if (remaining <= 0) {
    return "Ended";
  }

  const seconds = Math.floor(remaining / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  } else {
    return `${Math.floor(seconds / 86400)}d`;
  }
}
