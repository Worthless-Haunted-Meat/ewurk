import { DatabaseSync } from 'node:sqlite';
import type { User } from '../../domain/types.js';
import type { UserStore, TokenStore, SessionStore } from '../../ports/auth.js';

/**
 * Sqlite-backed UserStore.
 * Table: users(id, email UNIQUE, name, role, created_at).
 */
export class SqliteUserStore implements UserStore {
  constructor(private db: DatabaseSync) {}

  findByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as { id: number; email: string; name: string; role: string; created_at: string } | undefined;
    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name, role: row.role as User['role'] };
  }

  getById(id: number): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as { id: number; email: string; name: string; role: string; created_at: string } | undefined;
    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name, role: row.role as User['role'] };
  }

  list(): User[] {
    const rows = this.db
      .prepare('SELECT * FROM users ORDER BY id')
      .all() as Array<{ id: number; email: string; name: string; role: string; created_at: string }>;
    return rows.map((r) => ({ id: r.id, email: r.email, name: r.name, role: r.role as User['role'] }));
  }
}

/**
 * Sqlite-backed TokenStore.
 * Table: magic_links(id, user_id, token_hash UNIQUE, expires_at, used_at, created_at).
 */
export class SqliteTokenStore implements TokenStore {
  constructor(private db: DatabaseSync) {}

  issue(userId: number, tokenHash: string, expiresAt: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        'INSERT INTO magic_links (user_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)',
      )
      .run(userId, tokenHash, expiresAt, now);
  }

  consume(tokenHash: string): number | null {
    const row = this.db
      .prepare('SELECT * FROM magic_links WHERE token_hash = ?')
      .get(tokenHash) as
      | {
          id: number;
          user_id: number;
          token_hash: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        }
      | undefined;
    if (!row) return null;
    if (row.used_at !== null) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    this.db.prepare('UPDATE magic_links SET used_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    return row.user_id;
  }
}

/**
 * Sqlite-backed SessionStore.
 * Table: sessions(id TEXT PK, user_id, expires_at, created_at).
 */
export class SqliteSessionStore implements SessionStore {
  constructor(private db: DatabaseSync) {}

  create(userId: number, expiresAt: string): string {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
      id,
      userId,
      expiresAt,
      now,
    );
    return id;
  }

  get(sessionId: string): { userId: number; expiresAt: string } | null {
    const row = this.db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(sessionId) as
      | { id: string; user_id: number; expires_at: string; created_at: string }
      | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    return { userId: row.user_id, expiresAt: row.expires_at };
  }

  destroy(sessionId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
}
