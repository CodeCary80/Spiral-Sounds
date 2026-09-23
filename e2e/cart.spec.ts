import { test, expect } from './fixtures';

test('adding to cart while logged out redirects to login', async ({ page }) => {
  await page.goto('/');

  // Open the first genre
  await page.locator('.genre-tile').first().click();

  // Click the first product's add-to-cart button
  await page.locator('.add-btn').first().click();

  // Should be redirected to the login page
  await expect(page).toHaveURL(/login\.html/);

  
});

test('logged-in user can add a record to the cart', async ({ page, account }) => {
  await page.goto('/');
  await page.locator('.genre-tile').first().click();
  await page.locator('.add-btn').first().click();
  await expect(page.locator('.gcart-count')).toHaveText('1 item');
});