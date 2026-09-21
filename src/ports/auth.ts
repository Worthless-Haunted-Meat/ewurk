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
