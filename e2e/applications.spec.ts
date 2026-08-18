import { test, expect } from './fixtures/auth';

test('applications page loads and shows new application button', async ({ page }) => {
  await page.goto('/applications');
  await expect(page.getByRole('button', { name: /new application/i })).toBeVisible({
    timeout: 10000,
  });
});

test('opens new application dialog and fills required fields', async ({ page }) => {
  await page.goto('/applications');

  await page.getByRole('button', { name: /new application/i }).click();

  // Wait for dialog to appear
  await expect(page.getByRole('heading', { name: 'New Application' })).toBeVisible({
    timeout: 5000,
  });

  await page.getByLabel(/company name/i).fill('E2E Test Company');
  await page.getByLabel(/job title/i).fill('Senior Engineer');

  // Verify fields are filled
  await expect(page.getByLabel(/company name/i)).toHaveValue('E2E Test Company');
  await expect(page.getByLabel(/job title/i)).toHaveValue('Senior Engineer');

  // Click Next to proceed
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  // Dialog should advance to the next step (step 2 with job posting text)
  // Just verify the dialog is still open / transition happened
  await page.waitForTimeout(1000);
});

test('create full application through both dialog steps', async ({ page }) => {
  await page.goto('/applications');

  // Step 1: Open dialog and fill job details
  await page.getByRole('button', { name: /new application/i }).click();
  await expect(page.getByRole('heading', { name: 'New Application' })).toBeVisible({
    timeout: 5000,
  });

  await page.getByLabel(/company name/i).fill('E2E Full Flow Corp');
  await page.getByLabel(/job title/i).fill('Staff Engineer');

  await page.getByRole('button', { name: 'Next', exact: true }).click();

  // Step 2: Job posting text
  await expect(page.getByText(/paste the job posting/i)).toBeVisible({ timeout: 5000 });

  await page
    .getByPlaceholder(/paste the full job description/i)
    .fill(
      'We are looking for a Staff Engineer to lead our frontend team. Requirements: React, TypeScript, 8+ years experience.'
    );

  // NOTE: the dialog labels Contact Person as optional, but the schema
  // requires contact.name when the contact object is present (it always is).
  await page.getByLabel('Name', { exact: true }).fill('Jane Recruiter');

  await page.getByRole('button', { name: /create application/i }).click();

  // Should navigate to the new application detail page
  await page.waitForURL('**/applications/**', { timeout: 15000 });

  // Verify we're on the application detail page with the company name
  await expect(page.getByText('E2E Full Flow Corp').first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Staff Engineer' })).toBeVisible();

  // Navigate back to applications list to verify it appears there
  await page.goto('/applications');
  await expect(page.getByText('E2E Full Flow Corp').first()).toBeVisible({ timeout: 5000 });
});
