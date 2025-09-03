#!/usr/bin/env -S deno run --allow-run --allow-net --allow-env

/**
 * Restart script for mustache-plucker bot
 * Pulls latest changes, restarts Docker containers, and verifies health
 */

const WEB_PORT = 8765;
const MAX_RETRIES = 30;
const RETRY_DELAY = 3000; // 3 seconds
const INITIAL_DELAY = 5000; // 5 seconds before first health check

async function pullLatest() {
  console.log("Pulling latest changes...");
  const cmd = new Deno.Command("git", { args: ["pull"] });
  const result = await cmd.output();
  
  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`Git pull failed: ${stderr}`);
  }
  console.log("Git pull completed");
}

async function restartContainers() {
  console.log("Stopping containers...");
  const downCmd = new Deno.Command("docker", { args: ["compose", "down"] });
  await downCmd.output();
  
  console.log("Starting containers...");
  const upCmd = new Deno.Command("docker", { args: ["compose", "up", "-d"] });
  const result = await upCmd.output();
  
  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr);
    throw new Error(`Docker compose failed: ${stderr}`);
  }
  console.log("Containers started");
}

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${WEB_PORT}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth() {
  console.log("Waiting for containers to initialize...");
  await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY));
  
  console.log("Running health check...");
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (await checkHealth()) {
      console.log("Health check passed");
      console.log(`Web server: http://localhost:${WEB_PORT}`);
      return;
    }
    
    const remaining = MAX_RETRIES - i - 1;
    if (remaining > 0) {
      console.log(`Health check failed, retrying... (${remaining} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  
  throw new Error("Health check failed after maximum retries");
}

async function main() {
  try {
    await pullLatest();
    await restartContainers();
    await waitForHealth();
    console.log("Restart completed successfully");
  } catch (error) {
    console.error("Restart failed:", error instanceof Error ? error.message : String(error));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}