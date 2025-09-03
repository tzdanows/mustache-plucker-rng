#!/usr/bin/env -S deno run --allow-env

/**
 * Health check script for Docker container
 * Returns exit code 0 if healthy, 1 if unhealthy
 */

// Check if required environment variables are set
const requiredEnvVars = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];

for (const envVar of requiredEnvVars) {
  if (!Deno.env.get(envVar)) {
    console.error(`Missing required environment variable: ${envVar}`);
    Deno.exit(1);
  }
}

// If we get here, basic health check passed
console.log("Health check passed");
Deno.exit(0);