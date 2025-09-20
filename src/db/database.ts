import { Database, ensureDir } from "../deps.ts";
import { config } from "../config/config.ts";
import { logger } from "../utils/logger.ts";
import { dirname } from "@std/path";

let db: Database;

export async function initDatabase(): Promise<void> {
  try {
    // Ensure the database directory exists
    const dbPath = config.database.path;
    const dbDir = dirname(dbPath);
    
    logger.info(`Database path: ${dbPath}`);
    
    await ensureDir(dbDir);

    // Open database connection
    db = new Database(dbPath);

    // Enable foreign keys
    db.exec("PRAGMA foreign_keys = ON");

    // Optimize for concurrency
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec("PRAGMA synchronous = NORMAL");
    db.exec("PRAGMA cache_size = 10000");
    db.exec("PRAGMA temp_store = MEMORY");

    // Run migrations
    await runMigrations();

    logger.info("Database connection established");
  } catch (error) {
    logger.error("Failed to initialize database:", error);
    throw error;
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

async function runMigrations(): Promise<void> {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get all migration files
  const migrations = [
    {
      name: "001_create_giveaways_table",
      sql: `
        CREATE TABLE IF NOT EXISTS giveaways (
          id TEXT PRIMARY KEY,
          guild_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          message_id TEXT,
          creator_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          item_quantity INTEGER DEFAULT 1,
          item_price TEXT,
          winner_count INTEGER NOT NULL DEFAULT 3,
          ends_at DATETIME NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CHECK (status IN ('active', 'ended', 'cancelled'))
        )
      `,
    },
    {
      name: "002_create_participants_table",
      sql: `
        CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          giveaway_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE,
          UNIQUE(giveaway_id, user_id)
        )
      `,
    },
    {
      name: "003_create_winners_table",
      sql: `
        CREATE TABLE IF NOT EXISTS winners (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          giveaway_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
        )
      `,
    },
    {
      name: "004_create_indexes",
      sql: `
        CREATE INDEX IF NOT EXISTS idx_giveaways_status ON giveaways(status);
        CREATE INDEX IF NOT EXISTS idx_giveaways_ends_at ON giveaways(ends_at);
        CREATE INDEX IF NOT EXISTS idx_participants_giveaway ON participants(giveaway_id);
        CREATE INDEX IF NOT EXISTS idx_winners_giveaway ON winners(giveaway_id);
      `,
    },
  ];

  // Check which migrations have been applied
  const appliedMigrations = db.prepare("SELECT name FROM migrations").all() as { name: string }[];
  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  // Apply new migrations
  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      logger.info(`Applying migration: ${migration.name}`);

      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare("INSERT INTO migrations (name) VALUES (?)").run(migration.name);
      })();

      logger.info(`Migration applied: ${migration.name}`);
    }
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    logger.info("Database connection closed");
  }
}
