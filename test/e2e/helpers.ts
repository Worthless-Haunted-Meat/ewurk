import type { Page } from '@playwright/test';

export const SEED_EMAILS = {
  staff: 'staff@ewurk.org',
  volunteer: 'volunteer@ewurk.org',
  instructor: 'instructor@ewurk.org',
} as const;

/**
 * Full magic-link sign-in against the real running app: request a link,
 * read it from the dev outbox (never a real mailbox), and open it.
 * Ends with `page` on the dashboard, signed in as `email`.
 */
export async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Send sign-in link' }).click();

  const outbox = (await (await page.request.get('/dev/outbox')).json()) as Array<{ to: string; body: string }>;
  const entry = [...outbox].reverse().find((e) => e.to === email);
  if (!entry) throw new Error(`no outbox entry for ${email}`);
  const match = entry.body.match(/token=([a-f0-9]+)/i);
  if (!match) throw new Error('outbox entry has no token= link');

  await page.goto(`/auth/verify?token=${match[1]}`);
}

/**
 * Given the page already open on a `received` device's detail page,
 * drives it through triaged -> wiped -> refurbished -> imaged ->
 * available, recording a wipe with the given date. Ends back on that
 * device's detail page, now `available`.
 */
export async function driveDeviceToAvailable(page: Page, wipeDate: string): Promise<void> {
  await page.getByRole('button', { name: 'Mark triaged' }).click();
  await page.getByLabel('Wipe method').fill('NIST SP 800-88 Clear');
  await page.getByLabel('Wipe date').fill(wipeDate);
  await page.getByLabel('Operator').fill('Tech One');
  await page.getByRole('button', { name: 'Record wipe' }).click();
  await page.getByRole('button', { name: 'Mark refurbished' }).click();
  await page.getByRole('button', { name: 'Mark imaged' }).click();
  await page.getByRole('button', { name: 'Mark available' }).click();
}
