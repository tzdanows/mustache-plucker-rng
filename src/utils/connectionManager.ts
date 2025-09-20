import { logger } from "./logger.ts";

export class ConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseDelay = 5000; // 5 seconds
  private maxDelay = 300000; // 5 minutes
  private lastConnectionTime = 0;
  private connectionWindow = 60000; // 1 minute window

  /**
   * Check if we should attempt reconnection
   * Implements exponential backoff with jitter
   */
  async shouldReconnect(): Promise<boolean> {
    const now = Date.now();

    // Reset counter if last successful connection was over 1 minute ago
    if (now - this.lastConnectionTime > this.connectionWindow) {
      this.reconnectAttempts = 0;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(
        `Max reconnection attempts (${this.maxReconnectAttempts}) reached. Shutting down.`,
      );
      return false;
    }

    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxDelay,
    );

    // Add random jitter (0-25% of delay)
    const jitter = Math.random() * exponentialDelay * 0.25;
    const totalDelay = Math.floor(exponentialDelay + jitter);

    logger.info(
      `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${totalDelay}ms`,
    );

    await new Promise((resolve) => setTimeout(resolve, totalDelay));

    return true;
  }

  /**
   * Reset the connection manager state on successful connection
   */
  onSuccessfulConnection(): void {
    this.reconnectAttempts = 0;
    this.lastConnectionTime = Date.now();
    logger.info("Connection successful, resetting reconnection counter");
  }

  /**
   * Get current reconnection stats
   */
  getStats() {
    return {
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastConnectionTime: this.lastConnectionTime,
    };
  }
}
