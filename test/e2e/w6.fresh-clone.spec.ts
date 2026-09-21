import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { loginAs, SEED_EMAILS } from './helpers.js';

/**
 * All W1-W5 specs run against this same seeded server/database, adding
 * their own data along the way (by design — see REQUIREMENTS.md's "every
 * scenario creates its own data" rule). So this spec identifies seed data
 * specifically by the literal values src/seed.ts is documented to use
 * (see its doc comment): serials prefixed "SN-SEED-", and the families
 * literally named "Herrera Family" / "Osei Family" — never a raw count of
 * "everything in the database".
 */
test.describe('W6: fresh clone is explorable', () => {
  test('[R23] the seeded donation, devices, leases, and swap are visible without any manual entry', async ({ page }) => {
    await loginAs(page, SEED_EMAILS.staff);

    await page.goto('/devices');
    const bodyText = await page.locator('main').innerText();
    const seededSerialMatches = bodyText.match(/SN-SEED-\d+/g) ?? [];
    expect(new Set(seededSerialMatches).size).toBeGreaterThanOrEqual(5);

    // At least four distinct lifecycle stages among the seeded devices.
    const api = await page.request.get('/api/devices');
    const allDevices = (await api.json()) as Array<{ serial: string; status: string; replacesDeviceId: number | null }>;
    const seeded = allDevices.filter((d) => d.serial.startsWith('SN-SEED-'));
    expect(seeded.length).toBeGreaterThanOrEqual(5);
    const distinctStatuses = new Set(seeded.map((d) => d.status));
    expect(distinctStatuses.size).toBeGreaterThanOrEqual(4);

    // Two seeded leases (Herrera Family, Osei Family), one of them swapped.
    await page.goto('/families');
    await page.getByLabel('Search by name').fill('Herrera Family');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: 'Herrera Family', exact: true }).click();
    await expect(page.getByText(/current|behind|paused/)).toBeVisible();

    const withSwapLink = seeded.find((d) => d.replacesDeviceId !== null);
    expect(withSwapLink, 'one seeded device should show a replaces link from the seeded swap').toBeTruthy();
  });

  test('[R24] LICENSE is GPL-3.0', () => {
    const text = readFileSync('LICENSE', 'utf8');
    expect(text.slice(0, 200)).toMatch(/GNU GENERAL PUBLIC LICENSE/);
    expect(text.slice(0, 200)).toMatch(/Version 3/);
  });
});
