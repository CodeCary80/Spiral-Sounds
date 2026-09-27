import { test, expect } from './fixtures';

test('empty bag shows the empty state and no checkout button', async ({ page, account }) => {
  await page.goto('/cart.html');

  await expect(page.locator('.cart-empty')).toContainText('Nothing here yet.');
  await expect(page.locator('#checkout-btn')).toHaveCount(0);
});
