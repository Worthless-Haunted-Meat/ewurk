import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { migrate } from './migrate.js';

/**
 * Opens (creating if needed) a SQLite database at `filePath` and applies
 * the schema. Pass ':memory:' for tests. Not called at import time by any
 * module — only from src/server.ts, src/seed.ts, and tests. Uses Node's
 * built-in `node:sqlite` (stable, no native compile step) rather than a
 * native-addon binding — see REQUIREMENTS.md Decisions.
 */
export function openDb(filePath: string): DatabaseSync {
  if (filePath !== ':memory:') {
    const dir = path.dirname(filePath);
    if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
    if (existsSync(filePath) && statSync(filePath).size === 0) {
      unlinkSync(filePath);
    }
  }
  const db = new DatabaseSync(filePath);
  if (filePath !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}
