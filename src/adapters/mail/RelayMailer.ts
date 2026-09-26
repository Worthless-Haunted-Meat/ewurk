import type { Mailer, OutboxEntry } from '../../ports/auth.js';

export interface RelayMailerOptions {
  baseUrl: string;
  apiKey: string;
  from: string;
  appEnv: string;
  fetchImpl?: typeof fetch;
}

/**
 * Sends magic links through the Noctusoft relay (`POST /email/send`).
 * The relay owns the mailbox: `dev` is captured, `uat` is tagged, `production` is delivered.
 */
export class RelayMailer implements Mailer {
  constructor(private opts: RelayMailerOptions) {}

  send(to: string, subject: string, body: string): void {
    const base = this.opts.baseUrl.replace(/\/+$/, '');
    const fetchImpl = this.opts.fetchImpl ?? fetch;
    void fetchImpl(`${base}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.opts.apiKey}`,
        'X-App-Env': this.opts.appEnv,
      },
      body: JSON.stringify({
        to,
        subject,
        text: body,
        from: this.opts.from,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        console.error(`Relay email failed (${res.status}): ${detail.slice(0, 300)}`);
      }
    }).catch((err: unknown) => {
      console.error(`Relay email request failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  list(): OutboxEntry[] {
    return [];
  }
}

/** Map Railway's environment name onto the relay's dev / uat / production router. */
export function relayAppEnv(): string {
  const railway = process.env.RAILWAY_ENVIRONMENT_NAME?.trim().toLowerCase();
  if (railway === 'dev' || railway === 'development') return 'dev';
  if (railway === 'uat' || railway === 'staging') return 'uat';
  if (railway === 'production') return 'production';
  if (process.env.NODE_ENV !== 'production') return 'dev';
  return 'production';
}
