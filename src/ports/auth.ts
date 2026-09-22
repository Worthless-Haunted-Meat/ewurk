import type { User } from '../domain/types.js';

export interface UserStore {
  findByEmail(email: string): User | null;
  getById(id: number): User | null;
  list(): User[];
}

export interface TokenStore {
  issue(userId: number, tokenHash: string, expiresAt: string): void;
  /** Marks the token used and returns the user id, or null if missing/expired/already used. */
  consume(tokenHash: string): number | null;
}

export interface SessionStore {
  /** Returns the new session id. */
  create(userId: number, expiresAt: string): string;
  get(sessionId: string): { userId: number; expiresAt: string } | null;
  destroy(sessionId: string): void;
}

export interface OutboxEntry {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface Mailer {
  send(to: string, subject: string, body: string): void;
  list(): OutboxEntry[];
}

/**
 * The narrow surface `src/http/middleware/session.ts` and
 * `src/http/routes/auth.ts` depend on (not the concrete `AuthService`
 * class), so a test double can stand in for it without needing
 * `AuthService`'s own adapters implemented. `AuthService` implements this.
 */
export interface AuthServicePort {
  requestMagicLink(email: string): void;
  verifyMagicLink(rawToken: string): { sessionId: string; user: User };
  getSessionUser(sessionId: string): User | null;
  logout(sessionId: string): void;
}
