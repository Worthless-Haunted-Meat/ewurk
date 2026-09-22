import { test, expect } from '@playwright/test';
import { loginAs, driveDeviceToAvailable, SEED_EMAILS } from './helpers.js';

test.describe('W4: serial-to-custody lookup', () => {
  test('[R8] searching by a serial number shows donor, wipe operator, and current holder', async ({ page }) => {
    await loginAs(page, SEED_EMAILS.staff);

    // Fresh donation + item, wiped and made available, so a wipe operator exists to show.
    await page.goto('/donations');
    await page.getByLabel('Donor organization').fill('W4 Serial Test Org');
    await page.getByLabel('Pickup date').fill('2026-02-10');
    await page.getByRole('button', { name: 'Create donation' }).click();
    await page.getByLabel('Model').fill('Dell Latitude 5490');
    await page.getByLabel('Serial number').fill('SN-W4-LOOKUP');
    await page.getByRole('button', { name: 'Receive item' }).click();
    await page.getByRole('link', { name: /EW-\d{4,}/ }).click();
    await driveDeviceToAvailable(page, '2026-02-10');

    // Step 1 (R8): a staff member takes the serial off the laptop lid and searches for it.
    await page.goto('/devices');
    await page.getByLabel('Search by serial number').fill('SN-W4-LOOKUP');
    await page.getByRole('button', { name: 'Search' }).click();

    // Step 2 (R8): the result shows donor org, wipe operator, and holder ("in stock" — not yet leased).
    await expect(page.getByText('W4 Serial Test Org')).toBeVisible();
    await expect(page.getByText('Tech One')).toBeVisible();
    await expect(page.getByText('in stock')).toBeVisible();
  });
});
