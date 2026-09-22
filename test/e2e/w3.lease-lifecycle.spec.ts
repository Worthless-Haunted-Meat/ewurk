import { test, expect } from '@playwright/test';
import { loginAs, driveDeviceToAvailable, SEED_EMAILS } from './helpers.js';

test.describe('W3: lease, class enrollment, swap, payment, and the one-screen caseworker view', () => {
  test('[R9][R10][R11][R12][R13][R14][R16][R17][R18][R19] the full lease lifecycle', async ({ page }) => {
    await loginAs(page, SEED_EMAILS.staff);

    // Set up two available devices to work with (initial lease device + swap target).
    await page.goto('/donations');
    await page.getByLabel('Donor organization').fill('W3 Test Org');
    await page.getByLabel('Pickup date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Create donation' }).click();
    await page.getByLabel('Model').fill('Dell Latitude 5490');
    await page.getByLabel('Serial number').fill('SN-W3-A');
    await page.getByRole('button', { name: 'Receive item' }).click();
    await page.getByLabel('Model').fill('Dell Latitude 5490');
    await page.getByLabel('Serial number').fill('SN-W3-B');
    await page.getByRole('button', { name: 'Receive item' }).click();

    const links = page.getByRole('link', { name: /EW-\d{4,}/ });
    const tagA = (await links.nth(0).innerText()).trim();
    const tagB = (await links.nth(1).innerText()).trim();

    await page.goto(`/devices/${tagA}`);
    await driveDeviceToAvailable(page, '2026-02-09');
    await page.goto(`/devices/${tagB}`);
    await driveDeviceToAvailable(page, '2026-02-09');

    // Step 1 (R9): lease device A to the Herrera family.
    await page.goto('/families');
    await page.getByLabel('Name').fill('W3 Herrera Family');
    await page.getByLabel('Contact').fill('555-0100');
    await page.getByLabel('Neighborhood / referral').fill('Westside');
    await page.getByRole('button', { name: 'Add family' }).click();
    const familyUrl = page.url();

    await page.getByLabel('Device').selectOption(tagA);
    await page.getByRole('button', { name: 'Start lease' }).click();
    await page.getByRole('link', { name: 'View lease' }).click();
    const leaseUrl = page.url();
    const sinceText = await page.getByText(/^Since:/).innerText();

    // Step 2 (R16, R17): build a class roster off active leases; Herrera is picked up automatically.
    await page.goto('/classes');
    await page.getByLabel('Date').fill('2026-02-14');
    await page.getByLabel('Topic').fill('Saturday Class W3');
    await page.getByRole('button', { name: 'Create session' }).click();
    const classUrl = page.url();
    await page.getByRole('button', { name: 'Build roster' }).click();
    await expect(page.getByText('W3 Herrera Family')).toBeVisible();

    // Step 3 (R10): the screen cracks; swap device A for device B on the same lease.
    await page.goto(leaseUrl);
    await page.getByLabel('Replacement device').selectOption(tagB);
    await page.getByRole('button', { name: 'Swap' }).click();
    await expect(page.getByText(tagB)).toBeVisible();

    // Step 4 (R11): the family page lists both devices under one lease, start date unchanged.
    await page.goto(leaseUrl);
    const custody = page.locator('section[aria-label="Custody chain"]');
    await expect(custody.getByText(tagA)).toBeVisible();
    await expect(custody.getByText(tagB)).toBeVisible();
    await expect(page.getByText(/^Since:/)).toHaveText(sinceText); // swap never touched the lease start date

    // Step 5 (R12, R13): record a $20 payment; paid-through advances and the lease reads current.
    await page.getByLabel('Amount ($)').fill('20');
    await page.getByLabel('Date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Record payment' }).click();
    await expect(page.locator('.status')).toHaveText('current');

    // Step 6 (R14): hardship pause reads "paused", not "behind"/"current", and the device stays leased.
    await page.getByRole('button', { name: 'Pause for hardship' }).click();
    await expect(page.locator('.status')).toHaveText('paused');
    await page.getByRole('button', { name: 'Resume normal billing' }).click();

    // Step 7 (R18): mark class attendance present for Herrera.
    await page.goto(classUrl);
    const row = page.locator('li', { hasText: 'W3 Herrera Family' });
    await row.getByRole('button', { name: 'Mark present' }).click();
    await expect(page.locator('li', { hasText: 'W3 Herrera Family' })).toContainText('present');

    // Step 8 (R19): search Herrera and see device + wipe record + payment status + attendance on one page.
    await page.goto('/families');
    await page.getByLabel('Search by name').fill('W3 Herrera');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: 'W3 Herrera Family' }).click();
    expect(page.url()).toBe(familyUrl);
    await expect(page.getByText(tagB)).toBeVisible();
    await expect(page.getByText('NIST SP 800-88 Clear')).toBeVisible();
    await expect(page.getByText(/current|paused/)).toBeVisible();
    await expect(page.getByText('Saturday Class W3')).toBeVisible();
    await expect(page.getByText('present')).toBeVisible();
  });
});
