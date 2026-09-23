import { test, expect } from './fixtures';

test('empty cart shows the empty message and disables checkout', async ({ page, account }) => {
  await page.goto('/cart.html');

  await expect(page.locator('.cart-empty')).toContainText('Your basket is empty.');
  await expect(page.locator('#checkout-btn')).toBeDisabled();
});