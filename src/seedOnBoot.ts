import type { DatabaseSync } from 'node:sqlite';
import type { AppDeps } from './deps.js';
import { seed } from './seed.js';

export function isSeedOnBootEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') {
    return false;
  }
  const raw = env.EWURK_SEED_ON_BOOT?.trim().toLowerCase();
  if (!raw || raw === '0' || raw === 'false' || raw === 'no') {
    return false;
  }
  return true;
}

export function isDatabaseEmpty(db: DatabaseSync): boolean {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n === 0;
}

export function maybeSeedOnBoot(deps: AppDeps, db: DatabaseSync): void {
  if (!isSeedOnBootEnabled()) {
    return;
  }
  if (!isDatabaseEmpty(db)) {
    return;
  }
  seed(deps, db);
}
