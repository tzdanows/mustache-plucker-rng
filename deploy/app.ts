import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// Deno KV for storing giveaway data
const kv = await Deno.openKv();

// CORS headers for API endpoints
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Homepage
  if (path === "/" || path === "") {
    return new Response(getHomePage(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Flash sale report pages
  const reportMatch = path.match(/^\/report\/([a-zA-Z0-9_-]+)$/);
  if (reportMatch) {
    const flashSaleId = reportMatch[1];
    return await handleFlashSaleReport(flashSaleId);
  }

  // API endpoint for bot to push giveaway data
  if (path === "/api/giveaway" && req.method === "POST") {
    return await handleGiveawayUpdate(req);
  }

  // Test endpoint to create a sample giveaway (for development)
  if (path === "/api/test-giveaway" && req.method === "GET") {
    const testId = "test-" + Date.now();
    await kv.set(["giveaways", testId], {
      id: testId,
      itemName: "Test Keycap $50",
      status: "ended",
      winnerCount: 3,
      endsAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      participants: [
        { userId: "123", username: "Alice" },
        { userId: "456", username: "Bob" },
        { userId: "789", username: "Charlie" }
      ],
      winners: [
        { userId: "123", username: "Alice", position: 1 }
      ]
    });
    return new Response(`Test giveaway created: ${testId}\nView at: /report/${testId}`, {
      headers: { "content-type": "text/plain" }
    });
  }

  // 404
  return new Response("Not Found", { status: 404 });
}

async function handleGiveawayUpdate(req: Request): Promise<Response> {
  try {
    // Verify authorization (add your own secret token)
    const authHeader = req.headers.get("Authorization");
    const expectedToken = Deno.env.get("BOT_SECRET") || "mustacherngpluckernightcaps2025";
    
    console.log("Received giveaway update request");
    console.log("Auth header:", authHeader ? "Present" : "Missing");
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      console.log("Authorization failed");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const data = await req.json();
    const { giveawayId, ...giveawayData } = data;
    
    console.log(`Storing giveaway ${giveawayId} in KV`);

    // Store in Deno KV
    await kv.set(["giveaways", giveawayId], {
      ...giveawayData,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Successfully stored giveaway ${giveawayId}`);

    return new Response(JSON.stringify({ success: true, giveawayId }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating giveaway:", error);
    return new Response(JSON.stringify({ error: "Failed to update" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
}

async function handleFlashSaleReport(flashSaleId: string): Promise<Response> {
  try {
    console.log(`Fetching flash sale ${flashSaleId} from KV`);
    
    // Fetch from Deno KV
    const result = await kv.get(["giveaways", flashSaleId]);
    
    console.log(`KV result for ${flashSaleId}:`, result.value ? "Found" : "Not found");
    
    if (!result.value) {
      // Let's also check what keys exist in KV for debugging
      const entries = [];
      for await (const entry of kv.list({ prefix: ["giveaways"] })) {
        entries.push(entry.key);
      }
      console.log("Available giveaway keys in KV:", entries);
      
      return new Response(getNotFoundPage(flashSaleId), {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const giveaway = result.value as any;
    const html = generateReportPage(giveaway);
    
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error fetching giveaway:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

function generateReportPage(giveaway: any): string {
  const statusColor = {
    active: "#10b981",
    ended: "#3b82f6",
    cancelled: "#ef4444",
  }[giveaway.status] || "#6b7280";

  const winnersList = (giveaway.winners || []).map((w: any, idx: number) => `
    <div class="winner-card">
      <span class="position">#${idx + 1}</span>
      <span class="username">${w.username || w.userId}</span>
    </div>
  `).join('');

  const participantsList = (giveaway.participants || []).map((p: any) => {
    const isWinner = giveaway.winners?.some((w: any) => w.userId === p.userId);
    return `
      <div class="participant ${isWinner ? 'is-winner' : ''}">
        ${p.username || p.userId}
        ${isWinner ? '<span class="winner-badge">W</span>' : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${giveaway.itemName} - Flash Sale Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #ffffff;
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: #f9fafb;
      color: #111827;
      padding: 40px;
      text-align: center;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .moon-icon {
      font-size: 60px;
      margin-bottom: 20px;
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      background: ${statusColor};
      color: white;
      margin-top: 10px;
    }
    
    .content {
      padding: 40px;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      border: 2px solid #e5e7eb;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #764ba2;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
      color: #1f2937;
    }
    
    .winner-card {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 18px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
    }
    
    .position {
      background: rgba(255, 255, 255, 0.3);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 16px;
    }
    
    .participants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
    }
    
    .participant {
      padding: 12px 16px;
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      position: relative;
    }
    
    .participant:hover {
      border-color: #764ba2;
      background: #f3f4f6;
      transform: translateY(-2px);
    }
    
    .participant.is-winner {
      background: #fef3c7;
      border-color: #fbbf24;
      font-weight: 600;
    }
    
    .winner-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      background: #fbbf24;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
    
    .footer {
      text-align: center;
      padding: 30px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 14px;
    }
    
    .footer-id {
      font-family: monospace;
      color: #9ca3af;
      margin-top: 10px;
      font-size: 12px;
    }
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: #6b7280;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="moon-icon">🌙</div>
      <h1>${giveaway.itemName}</h1>
      <span class="status-badge">${giveaway.status?.toUpperCase() || 'ACTIVE'}</span>
    </div>
    
    <div class="content">
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${giveaway.participants?.length || 0}</div>
          <div class="stat-label">Total Entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${giveaway.winners?.length || giveaway.winnerCount || 0}</div>
          <div class="stat-label">Winners</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${new Date(giveaway.endsAt).toLocaleDateString()}</div>
          <div class="stat-label">End Date</div>
        </div>
      </div>
      
      ${giveaway.winners && giveaway.winners.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Winners:</h2>
          ${winnersList}
        </div>
      ` : ''}
      
      <div class="section">
        <h2 class="section-title">All Participants</h2>
        ${giveaway.participants && giveaway.participants.length > 0 ? `
          <div class="participants-grid">
            ${participantsList}
          </div>
        ` : '<div class="no-data">No participants yet</div>'}
      </div>
    </div>
    
    <div class="footer">
      <strong>Moustache Plucker Bot</strong>
      <div class="footer-id">Flash Sale ID: ${giveaway.id}</div>
    </div>
  </div>
</body>
</html>`;
}

function getHomePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moustache Plucker Bot</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      color: #111827;
    }
    .moon {
      font-size: 100px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 3em;
      margin: 0;
      font-weight: 600;
    }
    p {
      font-size: 1.2em;
      color: #6b7280;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="moon">🌙</div>
    <h1>Moustache Plucker Bot</h1>
    <p>a minimal rng bot</p>
  </div>
</body>
</html>`;
}

function getNotFoundPage(flashSaleId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flash Sale Not Found</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 500px;
    }
    .error-icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 32px;
      margin: 0 0 10px 0;
    }
    p {
      font-size: 18px;
      opacity: 0.9;
      margin: 10px 0;
    }
    code {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">🔍</div>
    <h1>Flash Sale Not Found</h1>
    <p>The flash sale report for ID:</p>
    <p><code>${flashSaleId}</code></p>
    <p>could not be found or hasn't been synced yet.</p>
  </div>
</body>
</html>`;
}

// Use port 8432 for local development, or Deno Deploy's automatic port
const port = Deno.env.get("DENO_DEPLOYMENT_ID") ? 8000 : 8432;
serve(handler, { port });