import { getDatabase } from "../db/database.ts";
import { logger } from "../utils/logger.ts";
import { Client } from "../deps.ts";

export class WebServer {
  private server: Deno.HttpServer | null = null;
  private port: number;
  private discordClient: Client | null = null;

  constructor(port: number = 8080) {
    this.port = port;
  }

  setDiscordClient(client: Client): void {
    this.discordClient = client;
  }

  async start(): Promise<void> {
    const handler = async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const path = url.pathname;

      // Handle giveaway summary pages
      if (path.startsWith("/giveaway/")) {
        const giveawayId = path.substring(10);
        return await this.handleGiveawaySummary(giveawayId);
      }

      // Handle root
      if (path === "/") {
        return new Response(this.getHomePage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      // 404 for other paths
      return new Response("Not Found", { status: 404 });
    };

    this.server = Deno.serve({ port: this.port }, handler);
    logger.info(`Web server started on http://localhost:${this.port}`);
  }

  stop(): void {
    if (this.server) {
      // Note: Deno.serve doesn't have a direct stop method in current versions
      logger.info("Web server stopping...");
    }
  }

  private async handleGiveawaySummary(giveawayId: string): Promise<Response> {
    try {
      const db = getDatabase();
      
      // Get giveaway details
      const giveaway = db.prepare(
        "SELECT * FROM giveaways WHERE id = ?"
      ).get(giveawayId) as any;
      
      if (!giveaway) {
        return new Response("Giveaway not found", { status: 404 });
      }
      
      // Get participants
      const participants = db.prepare(
        `SELECT p.user_id, p.entered_at 
         FROM participants p 
         WHERE p.giveaway_id = ? 
         ORDER BY p.entered_at ASC`
      ).all(giveawayId) as { user_id: string; entered_at: string }[];
      
      // Get winners
      const winners = db.prepare(
        `SELECT w.user_id, w.position 
         FROM winners w 
         WHERE w.giveaway_id = ? 
         ORDER BY w.position ASC`
      ).all(giveawayId) as { user_id: string; position: number }[];
      
      const winnerIds = new Set(winners.map(w => w.user_id));
      
      // Resolve Discord usernames
      const userMap = await this.resolveUsernames([
        ...participants.map(p => p.user_id),
        ...winners.map(w => w.user_id)
      ]);
      
      // Generate HTML page
      const html = this.generateSummaryPage(giveaway, participants, winners, winnerIds, userMap);
      
      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (error) {
      logger.error("Failed to generate giveaway summary:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  private async resolveUsernames(userIds: string[]): Promise<Map<string, string>> {
    const userMap = new Map<string, string>();
    
    if (!this.discordClient) {
      // If no Discord client, just return IDs
      userIds.forEach(id => userMap.set(id, id));
      return userMap;
    }
    
    // Resolve usernames from Discord
    for (const userId of new Set(userIds)) {
      try {
        const user = await this.discordClient.users.fetch(userId);
        userMap.set(userId, user.username);
      } catch {
        // If user not found, use the ID
        userMap.set(userId, userId);
      }
    }
    
    return userMap;
  }

  private generateSummaryPage(
    giveaway: any,
    participants: { user_id: string; entered_at: string }[],
    winners: { user_id: string; position: number }[],
    winnerIds: Set<string>,
    userMap: Map<string, string>
  ): string {
    const titleText = giveaway.item_price ? 
      `${giveaway.item_name} ${giveaway.item_price}` : 
      giveaway.item_name;
    
    const statusBadge = {
      active: { color: "#10b981", text: "Active" },
      ended: { color: "#3b82f6", text: "Ended" },
      cancelled: { color: "#ef4444", text: "Cancelled" },
    }[giveaway.status] || { color: "#6b7280", text: giveaway.status };
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText} - Giveaway Summary</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
      background: #ffffff;
      color: #111827;
      line-height: 1.6;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    
    header {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    
    h1 {
      font-size: 32px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: ${statusBadge.color};
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }
    
    .stat {
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .user-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 8px;
    }
    
    .user {
      padding: 12px 16px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      transition: all 0.2s;
    }
    
    .user:hover {
      border-color: #d1d5db;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .user.winner {
      background: #fef3c7;
      border-color: #fbbf24;
      color: #92400e;
      font-weight: 600;
    }
    
    .position-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 6px;
      background: #fbbf24;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
    
    .footer-id {
      font-family: monospace;
      color: #d1d5db;
      font-size: 12px;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${titleText}</h1>
      <span class="status-badge">${statusBadge.text}</span>
    </header>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${participants.length}</div>
        <div class="stat-label">Total Entries</div>
      </div>
      <div class="stat">
        <div class="stat-value">${winners.length || giveaway.winner_count}</div>
        <div class="stat-label">Winners</div>
      </div>
      <div class="stat">
        <div class="stat-value">${new Date(giveaway.ends_at).toLocaleDateString()}</div>
        <div class="stat-label">End Date</div>
      </div>
    </div>
    
    ${winners.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Winners</h2>
        <div class="user-grid">
          ${winners.map(w => `
            <div class="user winner">
              ${userMap.get(w.user_id) || w.user_id}
              <span class="position-badge">#${w.position}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="section">
      <h2 class="section-title">All Participants</h2>
      <div class="user-grid">
        ${participants.map(p => `
          <div class="user ${winnerIds.has(p.user_id) ? 'winner' : ''}">
            ${userMap.get(p.user_id) || p.user_id}
            ${winnerIds.has(p.user_id) ? '<span class="position-badge">W</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="footer">
      <div>Moustache Plucker Bot</div>
      <div class="footer-id">Giveaway ID: ${giveaway.id}</div>
    </div>
  </div>
</body>
</html>`;
  }

  private getHomePage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moustache Plucker Bot</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
    .container {
      text-align: center;
      color: white;
    }
    .moustache {
      font-size: 100px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 3em;
      margin: 0;
    }
    p {
      font-size: 1.2em;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="moustache">🎩</div>
    <h1>Moustache Plucker Bot</h1>
    <p>Discord Giveaway Bot</p>
  </div>
</body>
</html>`;
  }
}