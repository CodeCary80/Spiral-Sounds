import { test, expect } from '@playwright/test';

test('adding to cart while logged out redirects to login', async ({ page }) => {
  await page.goto('/');

  //open to first genre
  await page.locator('.genre-tile').first().click();

  //click the first products' add-to-cart button
  await page.locator('.add-btn').first().click();

  //should be redirected to the login page
  await expect(page).toHaveURL(/login\.html/);
});
