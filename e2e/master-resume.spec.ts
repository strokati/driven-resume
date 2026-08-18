import { test, expect } from './fixtures/auth';

test('master resume list page loads with header and new resume button', async ({ page }) => {
  await page.goto('/master-resume');

  await expect(page.getByRole('heading', { name: 'Master Resumes' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText(/one per language or market/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /new resume/i })).toBeVisible();
});

test('resume detail page shows all section editors', async ({ page }) => {
  await page.goto('/master-resume');

  // A default resume ("Default") is auto-created on first load — open it.
  // Click bubbles from the card title to the card's onClick handler.
  await page.getByText('Default', { exact: true }).first().click();

  await page.waitForURL(/\/master-resume\/[^/]+$/, { timeout: 10000 });

  await expect(page.getByText('Work Experience', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Education', { exact: true })).toBeVisible();
  await expect(page.getByText(/skills/i).first()).toBeVisible();
});
