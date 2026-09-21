import type { DatabaseSync } from 'node:sqlite';
import type { User } from '../../domain/types.js';
import type { UserStore, TokenStore, SessionStore } from '../../ports/auth.js';

/**
 * STUB — implemented by T1. Real implementation notes:
 * - Table: users(id, email UNIQUE, name, role, created_at). Read-only
 *   store for v1 (users are seeded, not created via the app).
 * - findByEmail: `SELECT * FROM users WHERE email = ?`, map row to User
 *   (camelCase), return null if no row.
 * - getById: `SELECT * FROM users WHERE id = ?`.
 * - list: `SELECT * FROM users ORDER BY id`.
 */
export class SqliteUserStore implements UserStore {
  constructor(private db: DatabaseSync) {}

  findByEmail(_email: string): User | null {
    throw new Error('not implemented: SqliteUserStore.findByEmail');
  }

  getById(_id: number): User | null {
    throw new Error('not implemented: SqliteUserStore.getById');
  }

  list(): User[] {
    throw new Error('not implemented: SqliteUserStore.list');
  }
}

/**
 * STUB — implemented by T1. Real implementation notes:
 * - Table: magic_links(id, user_id, token_hash UNIQUE, expires_at, used_at, created_at).
 * - issue: INSERT a row with the given hash/expiry, used_at = NULL.
 * - consume: look up by token_hash; return null if no row, if used_at is
 *   not NULL, or if expires_at < now (compare ISO strings, or parse with
 *   Date). Otherwise UPDATE used_at = now and return the user_id.
 */
export class SqliteTokenStore implements TokenStore {
  constructor(private db: DatabaseSync) {}

  issue(_userId: number, _tokenHash: string, _expiresAt: string): void {
    throw new Error('not implemented: SqliteTokenStore.issue');
  }

  consume(_tokenHash: string): number | null {
    throw new Error('not implemented: SqliteTokenStore.consume');
  }
}

/**
 * STUB — implemented by T1. Real implementation notes:
 * - Table: sessions(id TEXT PK, user_id, expires_at, created_at).
 * - create: generate a session id with `crypto.randomUUID()` (built-in,
 *   `import { randomUUID } from 'node:crypto'`), INSERT, return the id.
 * - get: SELECT by id; return null if missing or expires_at < now.
 * - destroy: DELETE by id.
 */
export class SqliteSessionStore implements SessionStore {
  constructor(private db: DatabaseSync) {}

  create(_userId: number, _expiresAt: string): string {
    throw new Error('not implemented: SqliteSessionStore.create');
  }

  get(_sessionId: string): { userId: number; expiresAt: string } | null {
    throw new Error('not implemented: SqliteSessionStore.get');
  }

  destroy(_sessionId: string): void {
    throw new Error('not implemented: SqliteSessionStore.destroy');
  }
}
