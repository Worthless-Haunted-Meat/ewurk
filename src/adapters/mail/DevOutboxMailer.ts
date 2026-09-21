import type { Mailer, OutboxEntry } from '../../ports/auth.js';

/**
 * STUB — implemented by T1. Real implementation: push {to, subject, body,
 * sentAt: clock-independent ISO string via Date().toISOString()} onto an
 * in-memory array in send(), return a copy of it in list(). Never sends a
 * real email — this stands in for a mail provider in dev/test per
 * REQUIREMENTS.md Decisions.
 */
export class DevOutboxMailer implements Mailer {
  send(_to: string, _subject: string, _body: string): void {
    throw new Error('not implemented: DevOutboxMailer.send');
  }

  list(): OutboxEntry[] {
    throw new Error('not implemented: DevOutboxMailer.list');
  }
}
