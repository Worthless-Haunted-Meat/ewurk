import { createHash, randomBytes } from 'node:crypto';
import type { User } from '../domain/types.js';
import type { UserStore, TokenStore, SessionStore, Mailer, AuthServicePort } from '../ports/auth.js';
import type { Clock } from '../ports/clock.js';
import { AppError } from '../http/errors.js';

/**
 * Magic-link authentication service.
 * - requestMagicLink(email): look up the user; if none, return silently.
 *   Generate a random raw token, hash it, store it with 15-minute expiry,
 *   and send a sign-in link via the mailer.
 * - verifyMagicLink(rawToken): hash the token, consume it (single-use).
 *   If valid, create a 12-hour session and return { sessionId, user }.
 * - getSessionUser(sessionId): look up the session and return the user.
 * - logout(sessionId): destroy the session.
 */
export class AuthService implements AuthServicePort {
  constructor(
    private users: UserStore,
    private tokens: TokenStore,
    private sessions: SessionStore,
    private mailer: Mailer,
    private clock: Clock,
    private publicOrigin = 'http://localhost:3000',
  ) {}

  requestMagicLink(email: string): void {
    const user = this.users.findByEmail(email);
    if (!user) return;
    const rawToken = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(this.clock.now().getTime() + 15 * 60 * 1000).toISOString();
    this.tokens.issue(user.id, hash, expiresAt);
    this.mailer.send(
      email,
      'Your EWURK sign-in link',
      `Sign in: ${this.publicOrigin.replace(/\/$/, '')}/auth/verify?token=${rawToken}`,
    );
  }

  verifyMagicLink(rawToken: string): { sessionId: string; user: User } {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const userId = this.tokens.consume(hash);
    if (userId === null) throw new AppError('INVALID_TOKEN');
    const expiresAt = new Date(this.clock.now().getTime() + 12 * 60 * 60 * 1000).toISOString();
    const sessionId = this.sessions.create(userId, expiresAt);
    const user = this.users.getById(userId);
    if (!user) throw new AppError('INVALID_TOKEN');
    return { sessionId, user };
  }

  getSessionUser(sessionId: string): User | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const user = this.users.getById(session.userId);
    return user;
  }

  logout(sessionId: string): void {
    this.sessions.destroy(sessionId);
  }
}
