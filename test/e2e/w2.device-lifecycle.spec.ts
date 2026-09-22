import { test, expect } from '@playwright/test';
import { loginAs, SEED_EMAILS } from './helpers.js';

test.use({ viewport: { width: 375, height: 667 } });

test.describe('W2: wipe-gated device availability', () => {
  test('[R5][R6][R7] a device only becomes available after a wipe is recorded, and its full timeline is visible', async ({ page }) => {
    await loginAs(page, SEED_EMAILS.volunteer);

    // Fresh donation + item, isolated from any seeded data.
    await page.getByRole('link', { name: 'Donations' }).click();
    await page.getByLabel('Donor organization').fill('W2 Test Org');
    await page.getByLabel('Pickup date').fill('2026-02-08');
    await page.getByRole('button', { name: 'Create donation' }).click();
    await page.getByLabel('Model').fill('Dell Latitude 5490');
    await page.getByLabel('Serial number').fill('SN-W2-1');
    await page.getByRole('button', { name: 'Receive item' }).click();
    await page.getByRole('link', { name: /EW-\d{4,}/ }).click();

    // Step 1 (R5): mark triaged.
    await page.getByRole('button', { name: 'Mark triaged' }).click();
    await expect(page.locator('.status')).toHaveText('triaged');

    // Step 2 (R6): "Mark available" is not offered yet; only the wipe form is.
    await expect(page.getByRole('button', { name: 'Mark available' })).toHaveCount(0);
    await expect(page.getByLabel('Wipe method')).toBeVisible();

    // Step 3 (R6): record the wipe.
    await page.getByLabel('Wipe method').fill('NIST SP 800-88 Clear');
    await page.getByLabel('Wipe date').fill('2026-02-08');
    await page.getByLabel('Operator').fill('Tech One');
    await page.getByRole('button', { name: 'Record wipe' }).click();

    await page.getByRole('button', { name: 'Mark refurbished' }).click();
    await page.getByRole('button', { name: 'Mark imaged' }).click();

    // Step 4 (R6): now "Mark available" works.
    await expect(page.getByRole('button', { name: 'Mark available' })).toBeVisible();
    await page.getByRole('button', { name: 'Mark available' }).click();
    await expect(page.locator('.status')).toHaveText('available');

    // Step 5 (R7): the timeline shows every step from receipt to available.
    const timeline = page.locator('section[aria-label="Timeline"]');
    await expect(timeline.getByText('received')).toBeVisible();
    await expect(timeline.getByText('triaged')).toBeVisible();
    await expect(timeline.getByText('wiped')).toBeVisible();
    await expect(timeline.getByText('refurbished')).toBeVisible();
    await expect(timeline.getByText('imaged')).toBeVisible();
    await expect(timeline.getByText('available')).toBeVisible();
  });
});
