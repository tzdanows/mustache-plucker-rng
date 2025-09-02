#!/usr/bin/env -S deno run --allow-read --allow-write --allow-ffi --allow-env

/**
 * Optimize database for high concurrency
 */

import { Database } from "@db/sqlite";
import { config } from "../config/config.ts";
import { logger } from "../utils/logger.ts";

export function optimizeDatabase(db: Database): void {
  try {
    // Enable Write-Ahead Logging for better concurrency
    db.exec("PRAGMA journal_mode = WAL");
    
    // Optimize for concurrent reads
    db.exec("PRAGMA read_uncommitted = true");
    
    // Increase cache size for better performance
    db.exec("PRAGMA cache_size = 10000");
    
    // Use memory for temp storage
    db.exec("PRAGMA temp_store = MEMORY");
    
    // Synchronous mode for better performance (slightly less safe)
    db.exec("PRAGMA synchronous = NORMAL");
    
    // Enable query optimization
    db.exec("PRAGMA optimize");
    
    logger.info("Database optimized for high concurrency");
  } catch (error) {
    logger.error("Failed to optimize database:", error);
  }
}

// Run if called directly
if (import.meta.main) {
  const db = new Database(config.database.path);
  optimizeDatabase(db);
  
  // Show current settings
  const settings = [
    "journal_mode",
    "cache_size",
    "temp_store",
    "synchronous",
  ];
  
  console.log("\nCurrent database settings:");
  for (const setting of settings) {
    const result = db.prepare(`PRAGMA ${setting}`).get() as any;
    console.log(`  ${setting}: ${result[setting] || JSON.stringify(result)}`);
  }
  
  db.close();
  console.log("\n✅ Database optimization complete");
}