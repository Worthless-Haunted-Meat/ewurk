import type { Mailer, OutboxEntry } from '../../ports/auth.js';
import { AppError } from '../../http/errors.js';

/** Production placeholder when SMTP_HOST is unset; never sends mail. */
export class UnconfiguredMailer implements Mailer {
  send(_to: string, _subject: string, _body: string): void {
    throw new AppError('MAIL_NOT_CONFIGURED');
  }

  list(): OutboxEntry[] {
    return [];
  }
}
