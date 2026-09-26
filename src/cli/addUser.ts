import type { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { openDb } from '../db/connection.js';
import { isEntryPoint } from '../entryPoint.js';
import type { User } from '../domain/types.js';

/**
 * Creates the people who can sign in. v1 has no user-management screen, and
 * production never runs the demo seed, so this is how a real deployment gets
 * its first staff account:
 *
 *   npm run build   # once, locally; hosted builds already have dist/
 *   EWURK_DB_PATH=/data/ewurk.db npm run user:add -- --email you@org.org --name "Your Name" --role staff
 *
 * Emails are stored lowercase so sign-in is not case-sensitive.
 */

const ROLES: ReadonlyArray<User['role']> = ['staff', 'volunteer', 'instructor'];

export function addUser(db: DatabaseSync, input: { email: string; name: string; role: string }): User {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role = input.role.trim() as User['role'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Not an email address: "${input.email}"`);
  if (!name) throw new Error('A name is required.');
  if (!ROLES.includes(role)) throw new Error(`Role must be one of: ${ROLES.join(', ')}.`);
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    throw new Error(`A user with email ${email} already exists.`);
  }
  const result = db
    .prepare('INSERT INTO users (email, name, role, created_at) VALUES (?, ?, ?, ?)')
    .run(email, name, role, new Date().toISOString());
  return { id: Number(result.lastInsertRowid), email, name, role };
}

function main(): void {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string', default: 'staff' } },
  });
  if (!values.email || !values.name) {
    console.error('Usage: npm run user:add -- --email <email> --name "<name>" [--role staff|volunteer|instructor]');
    process.exit(1);
  }
  const db = openDb(process.env.EWURK_DB_PATH ?? 'data/ewurk.db');
  try {
    const user = addUser(db, { email: values.email, name: values.name, role: values.role ?? 'staff' });
    // eslint-disable-next-line no-console
    console.log(`Added ${user.role} ${user.name} <${user.email}> (id ${user.id}). They can sign in with a magic link now.`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

if (isEntryPoint(import.meta.url)) {
  main();
}
