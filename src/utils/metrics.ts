/**
 * Simple metrics collection for Discord bot monitoring
 */

interface BotMetrics {
  // Bot lifecycle
  startTime: number;
  uptime: number;
  
  // Discord stats
  guildsServed: number;
  totalMembers: number;
  
  // Giveaway stats
  totalGiveaways: number;
  activeGiveaways: number;
  completedGiveaways: number;
  totalParticipants: number;
  totalWinners: number;
  
  // Web stats
  pageViewsServed: number;
  reportsGenerated: number;
  healthCheckHits: number;
  
  // Performance
  memoryUsageMB: number;
  avgResponseTimeMs: number;
  errorCount: number;
}

class MetricsCollector {
  private startTime: number;
  private pageViews = 0;
  private reportsGenerated = 0;
  private healthCheckHits = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  
  constructor() {
    this.startTime = Date.now();
  }
  
  incrementPageViews(): void {
    this.pageViews++;
  }
  
  incrementReports(): void {
    this.reportsGenerated++;
  }
  
  incrementHealthChecks(): void {
    this.healthCheckHits++;
  }
  
  incrementErrors(): void {
    this.errorCount++;
  }
  
  recordResponseTime(timeMs: number): void {
    this.responseTimes.push(timeMs);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }
  
  async getMetrics(): Promise<BotMetrics> {
    const { getDatabase } = await import("../db/database.ts");
    const db = getDatabase();
    
    // Get Discord client stats
    const { client } = await import("../bot/client.ts");
    const guildsServed = client?.guilds.cache.size || 0;
    const totalMembers = client?.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0) || 0;
    
    // Get giveaway stats from database
    const giveawayStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as completed
      FROM giveaways
    `).get() as any;
    
    const participantCount = db.prepare("SELECT COUNT(*) as count FROM participants").get() as any;
    const winnerCount = db.prepare("SELECT COUNT(*) as count FROM winners").get() as any;
    
    // Calculate total possible reports (one per giveaway)
    const totalPossibleReports = giveawayStats.total || 0;
    
    // Calculate performance metrics
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;
    
    return {
      startTime: this.startTime,
      uptime,
      guildsServed,
      totalMembers,
      totalGiveaways: giveawayStats.total || 0,
      activeGiveaways: giveawayStats.active || 0,
      completedGiveaways: giveawayStats.completed || 0,
      totalParticipants: participantCount.count || 0,
      totalWinners: winnerCount.count || 0,
      pageViewsServed: this.pageViews,
      reportsGenerated: totalPossibleReports,
      healthCheckHits: this.healthCheckHits,
      memoryUsageMB: Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024) || 0,
      avgResponseTimeMs: Math.round(avgResponseTime),
      errorCount: this.errorCount
    };
  }
}

export const metrics = new MetricsCollector();