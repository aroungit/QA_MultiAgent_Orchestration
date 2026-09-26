import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Applies any `.sql` migration files not yet recorded in `schema_migrations`, in filename order. */
export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db.prepare('SELECT name FROM schema_migrations').all() as Array<{ name: string }>;
  const applied = new Set(appliedRows.map((row) => row.name));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const insertMigration = db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)');

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file, new Date().toISOString());
    });
    applyMigration();
  }
}
