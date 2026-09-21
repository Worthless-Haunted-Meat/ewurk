import { test, expect } from '@playwright/test';
import { loginAs, SEED_EMAILS } from './helpers.js';

// R1's check requires the intake flow to work one-handed on a phone.
test.use({ viewport: { width: 375, height: 667 } });

test.describe('W1: loading-dock donation intake to signed acknowledgment', () => {
  test('[R20][R1][R2][R3][R4] volunteer signs in, logs a donation, receives items, and gets a value-free acknowledgment', async ({ page }) => {
    // Step 1 (R20): volunteer signs in via the magic-link / dev-outbox flow.
    await loginAs(page, SEED_EMAILS.volunteer);
    await expect(page.getByText('Vera Volunteer')).toBeVisible();

    // Step 2 (R1): create a donation for "St. Anne's Parish" with a pickup date, on a phone viewport.
    await page.getByRole('link', { name: 'Donations' }).click();
    await page.getByLabel('Donor organization').fill("St. Anne's Parish");
    await page.getByLabel('Pickup date').fill('2026-02-07');
    await page.getByRole('button', { name: 'Create donation' }).click();
    await expect(page.getByRole('heading', { name: "St. Anne's Parish" })).toBeVisible();

    // Step 3 (R2): receive three items, one at a time, each minting a fresh asset tag.
    const models = ['Dell Latitude 5490', 'Dell Latitude 5490', 'iPad Air'];
    for (const [i, model] of models.entries()) {
      await page.getByLabel('Model').fill(model);
      await page.getByLabel('Serial number').fill(`SN-W1-${i}`);
      await page.getByRole('button', { name: 'Receive item' }).click();
    }
    await expect(page.getByText(/Items \(3\)/)).toBeVisible();
    await expect(page.getByText(/EW-\d{4,}/).first()).toBeVisible();

    // Step 4 (R3): generate the acknowledgment letter.
    await page.getByRole('link', { name: 'Generate acknowledgment letter' }).click();
    await expect(page.getByRole('heading', { name: 'Contemporaneous Written Acknowledgment' })).toBeVisible();
    await expect(page.getByText("St. Anne's Parish")).toBeVisible();
    await expect(page.getByText('Dell Latitude 5490').first()).toBeVisible();
    await expect(page.getByText('No goods or services were provided in exchange for this donation.')).toBeVisible();

    // Step 5 (R4): the letter contains no dollar figure anywhere.
    const bodyText = await page.locator('main').innerText();
    expect(bodyText).not.toMatch(/\$\d/);
  });
});
