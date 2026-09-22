import type { Mailer } from '../../ports/auth.js';
import { DevOutboxMailer } from './DevOutboxMailer.js';
import { RelayMailer, relayAppEnv } from './RelayMailer.js';
import { SmtpMailer } from './SmtpMailer.js';
import { UnconfiguredMailer } from './UnconfiguredMailer.js';

export type MailerKind = 'relay' | 'smtp' | 'dev-outbox' | 'unconfigured';

export function createMailerFromEnv(): { mailer: Mailer; kind: MailerKind } {
  const relayBase = process.env.NOCTUSOFT_RELAY_BASE_URL?.trim();
  const relayKey = process.env.NOCTUSOFT_API_KEY?.trim();
  if (relayBase && relayKey) {
    const from = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || 'noreply@ewurk.org';
    return {
      mailer: new RelayMailer({ baseUrl: relayBase, apiKey: relayKey, from, appEnv: relayAppEnv() }),
      kind: 'relay',
    };
  }
  const smtpHost = process.env.SMTP_HOST?.trim();
  if (smtpHost) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const from = process.env.SMTP_FROM?.trim();
    if (!from) {
      throw new Error('SMTP_FROM is required when SMTP_HOST is set');
    }
    return {
      mailer: new SmtpMailer({
        host: smtpHost,
        port: Number.isFinite(port) ? port : 587,
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS,
        from,
      }),
      kind: 'smtp',
    };
  }
  if (process.env.NODE_ENV === 'production') {
    return { mailer: new UnconfiguredMailer(), kind: 'unconfigured' };
  }
  return { mailer: new DevOutboxMailer(), kind: 'dev-outbox' };
}
