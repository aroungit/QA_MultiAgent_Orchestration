import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { REPO_ROOT } from '../paths.js';
import { runMigrations } from './migrate.js';

let singleton: Database.Database | undefined;

function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH ?? './data/qa-agent.sqlite';
  if (configured === ':memory:') return configured;
  return path.isAbsolute(configured) ? configured : path.resolve(REPO_ROOT, configured);
}

/** Opens (and migrates) a SQLite database at the given path. Use `getDb()` for the app-wide singleton. */
export function openDatabase(dbPath: string): Database.Database {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

/** Lazily-initialized app-wide database connection, resolved from `DATABASE_PATH`. */
export function getDb(): Database.Database {
  if (!singleton) {
    singleton = openDatabase(resolveDatabasePath());
  }
  return singleton;
}

export function closeDb(): void {
  singleton?.close();
  singleton = undefined;
}
