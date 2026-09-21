import type { User } from '../domain/types.js';
import type { UserStore, TokenStore, SessionStore, Mailer, AuthServicePort } from '../ports/auth.js';
import type { Clock } from '../ports/clock.js';

/**
 * STUB — implemented by T1. Real implementation notes (see DESIGN.md §3):
 * - requestMagicLink(email): look up the user via `users.findByEmail`. If
 *   none, return silently (never reveal whether an email is registered).
 *   Otherwise: generate a random raw token (`crypto.randomBytes(32).toString('hex')`,
 *   `import { randomBytes, createHash } from 'node:crypto'`), hash it
 *   (`createHash('sha256').update(rawToken).digest('hex')`), `tokens.issue(user.id, hash, expiresAtISO)`
 *   with `expiresAt` = now + 15 minutes, then `mailer.send(email, 'Your EWURK sign-in link',
 *   body-containing-the-URL 'http://localhost:3000/auth/verify?token=' + rawToken)`.
 *   Never persist or log the raw token anywhere except the outbox body.
 * - verifyMagicLink(rawToken): hash it the same way, `tokens.consume(hash)`.
 *   If null, throw `new AppError('INVALID_TOKEN')` (import from
 *   '../http/errors.js'). Otherwise `sessions.create(userId, expiresAtISO)`
 *   with expiresAt = now + 12 hours, load the user via `users.getById`,
 *   return `{ sessionId, user }`.
 * - getSessionUser(sessionId): `sessions.get(sessionId)`; if null or
 *   expired, return null. Otherwise `users.getById(userId)`.
 * - logout(sessionId): `sessions.destroy(sessionId)`.
 */
export class AuthService implements AuthServicePort {
  constructor(
    private users: UserStore,
    private tokens: TokenStore,
    private sessions: SessionStore,
    private mailer: Mailer,
    private clock: Clock,
  ) {}

  requestMagicLink(_email: string): void {
    throw new Error('not implemented: AuthService.requestMagicLink');
  }

  verifyMagicLink(_rawToken: string): { sessionId: string; user: User } {
    throw new Error('not implemented: AuthService.verifyMagicLink');
  }

  getSessionUser(_sessionId: string): User | null {
    throw new Error('not implemented: AuthService.getSessionUser');
  }

  logout(_sessionId: string): void {
    throw new Error('not implemented: AuthService.logout');
  }
}
