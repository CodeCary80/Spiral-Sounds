import { test, expect } from '@playwright/test';

test('searching for nonexistent record shows no results', async ({ page }) => {
  await page.goto('/');

   // Search for a term that won't match anything
  await page.fill('#search-input', 'zzznonexistentxyz')

  // Trigger the search
  await page.locator('.search-arrow').click();

  // Should show the no-results message
  await expect(page.locator('#genre-page-grid')).toContainText('No records found.');
});

