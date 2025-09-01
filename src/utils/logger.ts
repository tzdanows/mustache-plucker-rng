import { config } from "../config/config.ts";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = this.parseLogLevel(config.environment.logLevel);
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case "debug":
        return LogLevel.DEBUG;
      case "info":
        return LogLevel.INFO;
      case "warn":
        return LogLevel.WARN;
      case "error":
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? " " + JSON.stringify(args) : "";
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage("DEBUG", message, ...args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage("INFO", message, ...args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage("WARN", message, ...args));
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage("ERROR", message, ...args));
    }
  }
}

export const logger = new Logger();