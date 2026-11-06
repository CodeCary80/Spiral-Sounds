import { test, expect } from '@playwright/test';

const RECORD = '/detail.html?id=36';

// Lyrics are stubbed so the test doesn't depend on LRCLIB, and Spotify's script is
// blocked so nothing tries to play audio.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/lyrics**', route =>
    route.fulfill({ json: { lyrics: 'Music is a world within itself', instrumental: false } }));
  await page.route('https://open.spotify.com/**', route => route.abort());
});

test('clicking the cover opens the record, and a track shows its lyrics', async ({ page }) => {
  await page.goto(RECORD);
  await expect(page.locator('#cover')).toBeEnabled();

  await page.locator('#cover').click();
  const stage = page.locator('#stage');
  await expect(stage).toBeVisible();
  await expect(stage).toHaveClass(/open/, { timeout: 10000 });
  await expect(page.locator('#ins-title')).toHaveText('Songs in the Key of Life');
  await expect(page.locator('#ins-tracks button').first()).toBeVisible();

  await page.locator('#ins-tracks button').first().click();
  await expect(page.locator('#view-lyrics')).toBeVisible();
  await expect(page.locator('#lyrics')).toHaveText('Music is a world within itself');
  await expect(page.locator('#player')).toHaveClass(/on/);

  await page.locator('#to-tracks').click();
  await expect(page.locator('#view-tracks')).toBeVisible();
});

test('the record closes again and focus returns to the cover', async ({ page }) => {
  await page.goto(RECORD);
  await page.locator('#open-record').click();
  await expect(page.locator('#stage')).toHaveClass(/open/, { timeout: 10000 });
  await expect(page.locator('#stage-close')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.locator('#stage')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#cover')).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert');
});

test('a failed lyrics lookup says so on the insert', async ({ page }) => {
  await page.route('**/api/lyrics**', route => route.fulfill({ status: 502, json: { error: 'busy' } }));
  await page.goto(RECORD);
  await page.locator('#cover').click();
  await expect(page.locator('#stage')).toHaveClass(/open/, { timeout: 10000 });

  await page.locator('#ins-tracks button').first().click();
  await expect(page.locator('#lyrics')).toHaveText('Couldn’t load the lyrics right now.');
});

test('with reduced motion the record opens and closes without the sleeve animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(RECORD);
  await page.locator('#cover').click();

  await expect(page.locator('#stage')).toHaveClass(/open/);
  await expect(page.locator('#sleeve')).toBeHidden();
  await expect(page.locator('.disc .face')).toHaveCSS('animation-name', 'none');

  await page.locator('#stage-close').click();
  await expect(page.locator('#stage')).toBeHidden();
});

test('the record turns into a 3D picture disc, and three.js loads only once the cover is wanted', async ({ page }) => {
  const three: string[] = [];
  page.on('request', r => { if (/vinyl3d\.js|three\.min\.js/.test(r.url())) three.push(r.url()); });
  await page.goto(RECORD);
  await expect(page.locator('#cover')).toBeEnabled();
  await page.waitForLoadState('networkidle');
  expect(three).toEqual([]);

  await page.locator('#cover').click();
  await expect(page.locator('#stage')).toHaveClass(/open/, { timeout: 10000 });
  await expect(page.locator('#disc')).toHaveClass(/\bgl\b/, { timeout: 10000 });
  await expect(page.locator('#disc canvas.disc-3d')).toBeVisible();
  await expect(page.locator('#disc .face')).toBeHidden();
  await expect(page.locator('.disc-hint')).toBeVisible();

  // dragging the record turns it, and the hint has done its job (the drag only
  // takes once the record has settled, which is when focus moves to Close)
  await expect(page.locator('#stage-close')).toBeFocused();
  const box = (await page.locator('#disc').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('#disc')).toHaveClass(/turned/);
  await expect(page.locator('.disc-hint')).toBeHidden();
  await expect(page.locator('#stage')).toHaveClass(/open/); // a drag isn't a click outside

  await page.keyboard.press('Escape');
  await expect(page.locator('#stage')).toBeHidden({ timeout: 10000 });
});

test('without WebGL the flat disc stays', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return /webgl/.test(type) ? null : (getContext as Function).call(this, type, ...rest);
    } as typeof getContext;
  });
  await page.goto(RECORD);
  await page.locator('#cover').click();
  await expect(page.locator('#stage')).toHaveClass(/open/, { timeout: 10000 });
  await expect(page.locator('#disc .face')).toBeVisible();
  await expect(page.locator('#disc')).not.toHaveClass(/\bgl\b/);
  await expect(page.locator('#disc canvas')).toHaveCount(0);
});
