#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write

/**
 * Health check server for monitoring the bot
 * Provides endpoints for Uptime Kuma monitoring
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getDatabase } from "./db/database.ts";
import { logger } from "./utils/logger.ts";

const port = parseInt(Deno.env.get("HEALTH_PORT") || "3001");
const startTime = Date.now();

logger.info(`Starting health check server on port ${port}`);

serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // CORS headers for browser access
  const headers = {
    "content-type": "application/json",
    "cache-control": "no-cache",
    "access-control-allow-origin": "*",
  };
  
  // Health check endpoint
  if (url.pathname === "/health") {
    try {
      const db = getDatabase();
      
      // Test database connection
      const dbCheck = db.prepare("SELECT 1 as check").get();
      
      // Get some basic stats
      const stats = db.prepare(`
        SELECT 
          (SELECT COUNT(*) FROM giveaways WHERE status = 'active') as active_giveaways,
          (SELECT MAX(created_at) FROM giveaways) as last_activity
      `).get() as any;
      
      const uptime = Date.now() - startTime;
      const uptimeHours = Math.floor(uptime / 1000 / 60 / 60);
      const uptimeMinutes = Math.floor((uptime / 1000 / 60) % 60);
      
      return new Response(JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: {
          milliseconds: uptime,
          human: `${uptimeHours}h ${uptimeMinutes}m`
        },
        checks: {
          database: !!dbCheck,
          environment: {
            discord_token: !!Deno.env.get("DISCORD_TOKEN"),
            discord_client_id: !!Deno.env.get("DISCORD_CLIENT_ID"),
            deploy_secret: !!Deno.env.get("DEPLOY_SECRET")
          }
        },
        current: {
          active_flash_sales: stats?.active_giveaways || 0,
          last_activity: stats?.last_activity || null
        }
      }), {
        status: 200,
        headers
      });
    } catch (error) {
      logger.error("Health check failed:", error);
      return new Response(JSON.stringify({
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 503,
        headers
      });
    }
  }
  
  // Simple ping endpoint for quick checks
  if (url.pathname === "/ping") {
    return new Response("pong", { 
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  }
  
  // Root endpoint with API documentation
  if (url.pathname === "/") {
    const uptime = Date.now() - startTime;
    return new Response(JSON.stringify({
      service: "Mustache Plucker Bot Health Check API",
      version: "1.0.0",
      status: "online",
      uptime_ms: uptime,
      endpoints: {
        "/": "This documentation",
        "/health": "Health status and basic checks",
        "/ping": "Simple ping/pong check"
      },
      documentation: "Use /health endpoint with Uptime Kuma for monitoring",
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 200,
      headers
    });
  }
  
  // 404 for unknown endpoints
  return new Response(JSON.stringify({
    error: "Not Found",
    message: `Endpoint ${url.pathname} does not exist`,
    available_endpoints: ["/", "/health", "/ping"]
  }), { 
    status: 404,
    headers
  });
}, { port });

console.log(`
╔════════════════════════════════════════════╗
║   Health Check Server Started              ║
╠════════════════════════════════════════════╣
║   Port: ${port}                              ║
║   URL:  http://localhost:${port}             ║
║                                            ║
║   Endpoints:                               ║
║   • /health  - Health status               ║
║   • /ping    - Simple check                ║
║   • /             - Documentation          ║
╚════════════════════════════════════════════╝
`);