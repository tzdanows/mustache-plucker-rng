#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-env

/**
 * Deployment script for Mustache Plucker Bot
 * 
 * This script:
 * 1. Pulls latest code from git
 * 2. Rebuilds and restarts the Docker container
 * 3. Shows container logs
 */

import { $ } from "https://deno.land/x/dax@0.39.2/mod.ts";

console.log("🚀 Mustache Plucker Bot Deployment Script");
console.log("==========================================\n");

// Helper function to run commands with nice output
async function runStep(description: string, fn: () => Promise<void>) {
  console.log(`📦 ${description}...`);
  try {
    await fn();
    console.log(`✅ ${description} - Complete\n`);
  } catch (error) {
    console.error(`❌ ${description} - Failed`);
    console.error(error);
    Deno.exit(1);
  }
}

// Check if we're in the right directory
await runStep("Checking current directory", async () => {
  const files = await $`ls -la`.text();
  if (!files.includes("docker-compose.yml")) {
    throw new Error("Not in project directory! Please cd to wokege-rng-bot first.");
  }
});

// Git pull latest changes
await runStep("Pulling latest code from git", async () => {
  const gitStatus = await $`git status --porcelain`.text();
  
  if (gitStatus.trim()) {
    console.log("⚠️  Warning: You have uncommitted changes:");
    console.log(gitStatus);
    const proceed = prompt("Continue anyway? (y/N)");
    if (proceed?.toLowerCase() !== 'y') {
      console.log("Deployment cancelled.");
      Deno.exit(0);
    }
  }
  
  await $`git pull origin main`.printCommand();
});

// Check if .env file exists
await runStep("Checking environment configuration", async () => {
  try {
    await Deno.stat(".env");
  } catch {
    throw new Error(".env file not found! Copy .env.example and configure it first.");
  }
  
  // Verify required env vars
  const envContent = await Deno.readTextFile(".env");
  const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DEPLOY_SECRET"];
  
  for (const key of required) {
    if (!envContent.includes(`${key}=`) || envContent.includes(`${key}=YOUR_`)) {
      throw new Error(`${key} not configured in .env file!`);
    }
  }
});

// Stop existing container
await runStep("Stopping existing container", async () => {
  try {
    await $`docker-compose down`.printCommand();
  } catch {
    console.log("No existing container to stop");
  }
});

// Remove old image to force rebuild
await runStep("Removing old Docker image", async () => {
  try {
    await $`docker rmi wokege-rng-bot_bot`.quiet();
  } catch {
    console.log("No old image to remove");
  }
});

// Build new Docker image
await runStep("Building new Docker image", async () => {
  await $`docker-compose build --no-cache`.printCommand();
});

// Start container in detached mode
await runStep("Starting container", async () => {
  await $`docker-compose up -d`.printCommand();
});

// Wait a moment for container to start
await new Promise(resolve => setTimeout(resolve, 3000));

// Check container status
await runStep("Checking container status", async () => {
  const status = await $`docker-compose ps`.text();
  console.log(status);
  
  if (!status.includes("Up")) {
    throw new Error("Container failed to start!");
  }
});

// Show recent logs
console.log("📋 Recent container logs:");
console.log("========================");
await $`docker-compose logs --tail=20`.printCommand();

console.log("\n✨ Deployment complete!");
console.log("\n📌 Useful commands:");
console.log("  docker-compose logs -f          # Follow logs");
console.log("  docker-compose restart          # Restart container");
console.log("  docker-compose down             # Stop container");
console.log("  docker-compose exec bot sh      # Shell into container");
console.log("  docker-compose ps               # Check status");

// Ask if user wants to follow logs
const followLogs = prompt("\nFollow logs now? (y/N)");
if (followLogs?.toLowerCase() === 'y') {
  console.log("\n📡 Following logs (Ctrl+C to exit)...\n");
  await $`docker-compose logs -f`.printCommand();
}