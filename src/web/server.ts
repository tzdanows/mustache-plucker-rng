import { logger } from "../utils/logger.ts";
import { getDatabase } from "../db/database.ts";
import { metrics } from "../utils/metrics.ts";
import type { Client } from "../deps.ts";

export class WebServer {
  private server: Deno.HttpServer | null = null;
  private port: number;
  private client: Client | null = null;

  constructor(port: number) {
    this.port = port;
  }

  setDiscordClient(client: Client): void {
    this.client = client;
  }

  async start(): Promise<void> {
    try {
      this.server = Deno.serve({ port: this.port }, (request) => this.handleRequest(request));
      logger.info(`Web server started on port ${this.port}`);
      logger.info(
        `Giveaway reports will be available at http://localhost:${this.port}/report/{giveaway_id}`,
      );
    } catch (error) {
      logger.error(`Failed to start web server on port ${this.port}:`, error);
      throw error;
    }
  }

  stop(): void {
    if (this.server) {
      this.server.shutdown();
      this.server = null;
      logger.info("Web server stopped");
    }
  }

  private async handleRequest(request: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);

    try {
      let response: Response;

      if (url.pathname === "/") {
        metrics.incrementPageViews();
        response = this.handleHome();
      } else if (url.pathname.startsWith("/report/")) {
        metrics.incrementReports();
        const giveawayId = url.pathname.split("/report/")[1];
        response = await this.handleGiveawayReport(giveawayId);
      } else if (url.pathname === "/api/giveaway" && request.method === "POST") {
        response = await this.handleGiveawaySync(request);
      } else if (url.pathname === "/health") {
        metrics.incrementHealthChecks();
        response = new Response("OK", { status: 200 });
      } else if (url.pathname === "/api/metrics") {
        response = await this.handleMetricsJson();
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      metrics.recordResponseTime(Date.now() - startTime);
      return response;
    } catch (error) {
      metrics.incrementErrors();
      logger.error("Error handling request:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  private handleHome(): Response {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Mustache Plucker Bot</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #7289da; }
        .status { padding: 10px; background: #f0f0f0; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🧄 Mustache Plucker Bot</h1>
    <div class="status">
        <h3>Status: Running</h3>
        <p>Discord bot for running flash sales with random winner selection.</p>
        <p><strong>Available endpoints:</strong></p>
        <ul>
            <li><code>/report/{giveaway_id}</code> - View giveaway results</li>
            <li><code>/health</code> - Health check</li>
            <li><code>/api/metrics</code> - Bot metrics (JSON)</li>
            <li><code>/api/giveaway</code> - API endpoint for giveaway data</li>
        </ul>
    </div>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  private async handleGiveawayReport(giveawayId: string): Promise<Response> {
    try {
      const db = getDatabase();

      // Get giveaway data
      const giveaway = db.prepare("SELECT * FROM giveaways WHERE id = ?").get(giveawayId);

      if (!giveaway) {
        return new Response("Giveaway not found", { status: 404 });
      }

      // Get participants
      const participants = db.prepare(`
        SELECT user_id, entered_at 
        FROM participants 
        WHERE giveaway_id = ? 
        ORDER BY entered_at ASC
      `).all(giveawayId);

      // Get winners
      const winners = db.prepare(`
        SELECT user_id, position 
        FROM winners 
        WHERE giveaway_id = ? 
        ORDER BY position ASC
      `).all(giveawayId);

      // Resolve usernames
      const userMap = await this.resolveUsernames([
        ...participants.map((p: any) => p.user_id),
        ...winners.map((w: any) => w.user_id),
        (giveaway as any).creator_id,
      ]);

      const html = this.generateReportHTML(giveaway, participants, winners, userMap);

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      logger.error(`Error generating report for ${giveawayId}:`, error);
      return new Response("Error generating report", { status: 500 });
    }
  }

  private async handleGiveawaySync(request: Request): Promise<Response> {
    try {
      const authHeader = request.headers.get("Authorization");
      const expectedSecret = Deno.env.get("DEPLOY_SECRET");

      if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return new Response("Unauthorized", { status: 401 });
      }

      const data = await request.json();

      // Store the giveaway data (this would typically go to a database)
      // For now, just acknowledge receipt
      logger.info(`Received giveaway sync for: ${data.giveawayId}`);

      return new Response("Sync successful", { status: 200 });
    } catch (error) {
      logger.error("Error handling giveaway sync:", error);
      return new Response("Sync failed", { status: 500 });
    }
  }

  private async resolveUsernames(userIds: string[]): Promise<Map<string, string>> {
    const userMap = new Map<string, string>();

    if (!this.client) {
      // Return IDs as fallback if no client
      userIds.forEach((id) => userMap.set(id, id));
      return userMap;
    }

    for (const userId of new Set(userIds)) {
      try {
        const user = await this.client.users.fetch(userId);
        userMap.set(userId, user.username || user.tag || userId);
      } catch {
        userMap.set(userId, userId);
      }
    }

    return userMap;
  }

  private generateReportHTML(
    giveaway: any,
    participants: any[],
    winners: any[],
    userMap: Map<string, string>,
  ): string {
    const createdDate = new Date(giveaway.created_at).toLocaleString();
    const endedDate = new Date(giveaway.ends_at).toLocaleString();
    const creatorUsername = userMap.get(giveaway.creator_id) || giveaway.creator_id;

    const participantsList = participants.map((p: any) => {
      const username = userMap.get(p.user_id) || p.user_id;
      const enteredAt = new Date(p.entered_at).toLocaleString();
      return `<li>${username} (entered ${enteredAt})</li>`;
    }).join("");

    const winnersList = winners.map((w: any) => {
      const username = userMap.get(w.user_id) || w.user_id;
      return `<li><strong>#${w.position}: ${username}</strong></li>`;
    }).join("");

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Flash Sale Results - ${giveaway.item_name}</title>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 900px; 
            margin: 50px auto; 
            padding: 20px; 
            background: #2c2f33; 
            color: #ffffff; 
        }
        .header { text-align: center; margin-bottom: 40px; }
        .item-name { color: #7289da; font-size: 2em; margin-bottom: 10px; }
        .status { 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
            background: ${giveaway.status === "ended" ? "#2ecc71" : "#e74c3c"};
        }
        .section { 
            background: #36393f; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
        }
        .winners { background: #2ecc71; }
        .participants { background: #3498db; }
        ul { list-style-type: none; padding: 0; }
        li { padding: 5px 0; border-bottom: 1px solid #40444b; }
        li:last-child { border-bottom: none; }
        .meta { color: #99aab5; font-size: 0.9em; }
        .no-entries { color: #e74c3c; text-align: center; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="item-name">${giveaway.item_name}</h1>
        <div class="status">
            <strong>Status:</strong> ${giveaway.status.toUpperCase()}
        </div>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <p><strong>Creator:</strong> ${creatorUsername}</p>
        <p><strong>Created:</strong> ${createdDate}</p>
        <p><strong>Ended:</strong> ${endedDate}</p>
        <p><strong>Total Entries:</strong> ${participants.length}</p>
        <p><strong>Winners Selected:</strong> ${winners.length} / ${giveaway.winner_count}</p>
    </div>
    
    ${
      winners.length > 0
        ? `
    <div class="section winners">
        <h2>Winners</h2>
        <ul>${winnersList}</ul>
    </div>
    `
        : ""
    }
    
    <div class="section participants">
        <h2>Participants (${participants.length})</h2>
        ${
      participants.length > 0
        ? `<ul>${participantsList}</ul>`
        : '<p class="no-entries">No participants entered this flash sale.</p>'
    }
    </div>
    
    <div class="meta">
        <p><small>Report generated by Mustache Plucker Bot</small></p>
    </div>
</body>
</html>`;
  }

  private async handleMetricsJson(): Promise<Response> {
    try {
      const botMetrics = await metrics.getMetrics();

      return new Response(JSON.stringify(botMetrics, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      logger.error("Error generating metrics:", error);
      return new Response(JSON.stringify({ error: "Failed to generate metrics" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
