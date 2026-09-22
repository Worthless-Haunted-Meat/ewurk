import type { Mailer, OutboxEntry } from '../../ports/auth.js';

export class DevOutboxMailer implements Mailer {
  private outbox: OutboxEntry[] = [];

  send(to: string, subject: string, body: string): void {
    this.outbox.push({ to, subject, body, sentAt: new Date().toISOString() });
  }

  list(): OutboxEntry[] {
    return [...this.outbox];
  }
}
