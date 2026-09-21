import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Applies schema.sql (idempotent: every statement is CREATE ... IF NOT EXISTS). */
export function migrate(db: DatabaseSync): void {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf8');
  db.exec(schema);
}
