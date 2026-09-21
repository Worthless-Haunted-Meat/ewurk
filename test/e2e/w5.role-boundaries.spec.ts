import { test, expect } from '@playwright/test';
import { loginAs, SEED_EMAILS } from './helpers.js';

test.describe('W5: role boundaries hold', () => {
  test('[R21] volunteer nav hides Leases/Classes and /leases is blocked', async ({ page }) => {
    await loginAs(page, SEED_EMAILS.volunteer);
    await expect(page.getByRole('link', { name: 'Leases' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Classes' })).toHaveCount(0);

    await page.goto('/leases');
    await expect(page.getByRole('heading', { name: 'Not authorized' })).toBeVisible();
  });

  test('[R21] instructor is blocked from /donations', async ({ page }) => {
    await loginAs(page, SEED_EMAILS.instructor);
    await page.goto('/donations');
    await expect(page.getByRole('heading', { name: 'Not authorized' })).toBeVisible();
  });

  test('[R22] the family form has no SSN, bank, or income field', async ({ page }) => {
    await loginAs(page, SEED_EMAILS.staff);
    await page.goto('/families');
    const body = await page.locator('main').innerText();
    expect(body).not.toMatch(/ssn/i);
    expect(body).not.toMatch(/social security/i);
    expect(body).not.toMatch(/bank/i);
    expect(body).not.toMatch(/income/i);
    // Only the three allowed fields are collected.
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Contact')).toBeVisible();
    await expect(page.getByLabel('Neighborhood / referral')).toBeVisible();
  });
});
