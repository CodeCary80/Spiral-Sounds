import { test as base, expect } from '@playwright/test';
import { getDBConnection } from '../db/db.js'

export const test = base.extend<{ account: { username: string } }>({
  account: async ({ page }, use) => {
    const username = `e2e${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;

    const res = await page.request.post('/api/auth/register', {
      data: {
        name: 'E2E User',
        email: `${username}@spiralsounds.test`,
        username,
        password: 'Testpass123!',
      },
    });
    expect(res.status()).toBe(201);

    await use({ username });

    const db = await getDBConnection();
    const user = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (user) {
      await db.run('DELETE FROM cart_items WHERE user_id= ?', [user.id]);
      await db.run('DELETE FROM users WHERE id = ?' , [user.id]);
    }
  },
});

export { expect };