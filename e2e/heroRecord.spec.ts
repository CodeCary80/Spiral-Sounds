import { test, expect, type Page } from '@playwright/test';

// A stand-in for Spotify's iFrame API. The test decides when "Spotify" reports
// playback, because the hero must only react to that report and not to the tap.
const FAKE_SPOTIFY = `
  window.__player = { plays: 0, pauses: 0, resumes: 0, listener: null };
  window.__emit = data => window.__player.listener({ data });
  window.onSpotifyIframeApiReady({
    createController(el, options, ready) {
      window.__player.uri = options.uri;
      ready({
        addListener: (_name, fn) => { window.__player.listener = fn },
        play: () => window.__player.plays++,
        pause: () => window.__player.pauses++,
        resume: () => window.__player.resumes++,
      });
    },
  });
`;
const PLAYING = { isPaused: false, isBuffering: false, position: 1000, duration: 30000 };
const PAUSED = { isPaused: true, isBuffering: false, position: 5000, duration: 30000 };
// how Spotify really reports the end of a track: not paused, position at the duration
const ENDED = { isPaused: false, isBuffering: false, position: 30000, duration: 30000 };
const JUST_LOADED = { isPaused: false, isBuffering: false, position: 0, duration: 30000 };

// The real pick changes weekly, so most tests fix which record is featured.
const FEATURED = {
  id: 49, title: 'Rumours', artist: 'Fleetwood Mac', genre: 'rock', year: 1977, image: 'vinyl49.jpg', stock: 5,
  previewTrack: { title: 'Dreams', spotifyId: 'testtrack' },
};
const spinState = (page: Page) => page.locator('.record-rotor').evaluate(el => el.getAnimations()[0].playState);

async function openHome(page: Page) {
  // the opening animation plays once per visit; these tests start after it
  await page.addInitScript(() => sessionStorage.setItem('ss-opening', '1'));
  await page.route('**/api/products/featured', route => route.fulfill({ json: FEATURED }));
  await page.route('https://open.spotify.com/embed/iframe-api/v1', route =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_SPOTIFY }));
  await page.goto('/');
  await expect(page.locator('#deck')).toHaveCSS('opacity', '1');
  await expect.poll(() => page.evaluate(() => !!(window as any).__player?.listener), { timeout: 10000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__player.uri)).toBe('spotify:track:testtrack');
}
const emit = (page: Page, data: object) => page.evaluate(d => (window as any).__emit(d), data);

test('Preview slides the record out, but it only spins once Spotify confirms playback', async ({ page }) => {
  await openHome(page);
  const deck = page.locator('#deck');
  const sleeveAtRest = await page.locator('#hero-sleeve').boundingBox();

  await page.locator('#hero-preview').click();
  await expect(deck).toHaveClass(/is-out/);
  await expect(deck).not.toHaveClass(/is-playing/);
  await expect(page.locator('#hero-preview')).toHaveText('Starting…');
  await expect(page.locator('#hero-player')).not.toHaveClass(/on/);
  expect(await spinState(page)).toBe('paused');
  expect(await page.evaluate(() => (window as any).__player.plays)).toBe(1);

  // Spotify's first report comes before any audio
  await emit(page, JUST_LOADED);
  await expect(deck).not.toHaveClass(/is-playing/);

  await emit(page, PLAYING);
  await expect(deck).toHaveClass(/is-playing/);
  await expect(page.locator('#hero-player')).toHaveClass(/on/);
  await expect(page.locator('#hero-preview')).toContainText('Pause');
  expect(await spinState(page)).toBe('running');

  // the sleeve never moves
  await page.waitForTimeout(1000);
  expect(await page.locator('#hero-sleeve').boundingBox()).toEqual(sleeveAtRest);
});

test('pausing keeps the record out, and the end of the preview slides it back', async ({ page }) => {
  await openHome(page);
  const deck = page.locator('#deck');
  await page.locator('#hero-preview').click();
  await emit(page, PLAYING);

  await page.locator('#hero-preview').click();
  expect(await page.evaluate(() => (window as any).__player.pauses)).toBe(1);
  await emit(page, PAUSED);
  await expect(deck).not.toHaveClass(/is-playing/);
  await expect(deck).toHaveClass(/is-out/);
  await expect(page.locator('#hero-preview')).toContainText('Resume');

  await page.locator('#hero-preview').click();
  expect(await page.evaluate(() => (window as any).__player.resumes)).toBe(1);
  await emit(page, PLAYING);
  await expect(deck).toHaveClass(/is-playing/);

  await emit(page, ENDED);
  await expect(deck).not.toHaveClass(/is-out/);
  await expect(page.locator('#hero-player')).not.toHaveClass(/on/);
  await expect(page.locator('#hero-preview')).toContainText('Preview');
});

test('End puts the hero back as it was, and Preview starts again', async ({ page }) => {
  await openHome(page);
  const deck = page.locator('#deck'), end = page.locator('#hero-end');
  await expect(end).toBeHidden();

  await page.locator('#hero-preview').click();
  await expect(end).toBeVisible();
  await emit(page, PLAYING);
  await expect(deck).toHaveClass(/is-playing/);

  await end.click();
  expect(await page.evaluate(() => (window as any).__player.pauses)).toBe(1);
  await expect(deck).not.toHaveClass(/is-out/);
  await expect(deck).not.toHaveClass(/is-playing/);
  await expect(page.locator('#hero-player')).not.toHaveClass(/on/);
  await expect(end).toBeHidden();
  await expect(page.locator('#hero-preview')).toContainText('Preview');
  await expect(page.locator('#hero-preview')).toBeFocused();

  // a report already on its way from Spotify doesn't bring it all back
  await emit(page, PLAYING);
  await expect(deck).not.toHaveClass(/is-out/);

  await page.locator('#hero-preview').click();
  expect(await page.evaluate(() => (window as any).__player.plays)).toBe(2);
  await emit(page, PLAYING);
  await expect(deck).toHaveClass(/is-playing/);
});

test('End also cancels a Preview that hasn\'t started yet', async ({ page }) => {
  await openHome(page);
  await page.locator('#hero-preview').click();
  await page.locator('#hero-end').click();
  await expect(page.locator('#deck')).not.toHaveClass(/is-out/);
  await expect(page.locator('#hero-preview')).toContainText('Preview');
});

test('closing a genre page reached from a record\'s back link stays closed after a refresh', async ({ page }) => {
  await page.route('https://open.spotify.com/**', route => route.abort());
  await page.goto('/?genre=soul&id=36');
  const sheet = page.locator('#genre-page');
  await expect(sheet).toHaveClass(/open/);

  // refreshing while it's open keeps you there
  await page.reload();
  await expect(sheet).toHaveClass(/open/);

  await page.keyboard.press('Escape');
  await expect(sheet).not.toHaveClass(/open/);
  await expect(page).toHaveURL(/\/$/);

  await page.reload();
  await expect(page.locator('#deck')).toHaveCSS('opacity', '1');
  await expect(sheet).not.toHaveClass(/open/);
});

test('using the play button inside Spotify\'s player works too', async ({ page }) => {
  await openHome(page);
  await emit(page, PLAYING);
  await expect(page.locator('#deck')).toHaveClass(/is-playing/);
  await expect(page.locator('#deck')).toHaveClass(/is-out/);
});

test('if Spotify never loads, the record goes back and the hero says so', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('ss-opening', '1'));
  await page.route('https://open.spotify.com/**', route => route.abort());
  await page.clock.install();
  await page.goto('/');
  await page.clock.runFor(3000);
  await page.locator('#hero-preview').click();
  await expect(page.locator('#deck')).toHaveClass(/is-out/);

  await page.clock.runFor(8000);
  await expect(page.locator('#deck')).not.toHaveClass(/is-out/);
  await expect(page.locator('#hero-note')).toHaveText('Couldn’t reach Spotify. Try again in a moment.');
});

test('the album name leads to the record\'s detail page', async ({ page }) => {
  await openHome(page);
  await page.locator('.featured-name').click();
  await expect(page).toHaveURL(/detail\.html\?id=49/);
  await expect(page.locator('#title')).toHaveText('Rumours');
});

test('the hero shows the record the server picked for the week', async ({ page }) => {
  await openHome(page);
  await expect(page.locator('#featured-name')).toHaveText('Rumours');
  await expect(page.locator('#featured-about')).toHaveText('Fleetwood Mac · Rock · 1977');
  await expect(page.locator('#hero-sleeve')).toHaveAttribute('src', '/images/vinyl49.jpg');
  await expect(page.locator('.featured-view')).toHaveAttribute('href', '/detail.html?id=49');
});

test('the real featured route gives the hero a record it can play', async ({ page, request }) => {
  const res = await request.get('/api/products/featured');
  expect(res.ok()).toBe(true);
  const record = await res.json();
  expect(record.previewTrack.spotifyId).toBeTruthy();

  await page.addInitScript(() => sessionStorage.setItem('ss-opening', '1'));
  await page.route('https://open.spotify.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#featured-name')).toHaveText(record.title);
});

test('if the server can\'t pick a record, the hero still has one', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('ss-opening', '1'));
  await page.route('**/api/products/featured', route => route.fulfill({ status: 500, json: {} }));
  await page.route('https://open.spotify.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#featured-name')).toHaveText('Songs in the Key of Life');
  await expect(page.locator('#hero-preview')).toBeVisible();
});

test('a record with nothing to preview keeps its album link but no Preview button', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('ss-opening', '1'));
  await page.route('**/api/products/featured', route => route.fulfill({ json: { ...FEATURED, previewTrack: null } }));
  await page.route('https://open.spotify.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#featured-name')).toHaveText('Rumours');
  await expect(page.locator('#hero-preview')).toBeHidden();
});

test('the opening hands over to the hero, ending with the sleeve in place', async ({ page }) => {
  await page.route('https://open.spotify.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#opening')).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator('html')).not.toHaveClass(/opening/);
  await expect(page.locator('#hero-sleeve')).toHaveCSS('opacity', '1');
});

test('with reduced motion the record still moves out, but never spins', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);
  await page.locator('#hero-preview').click();
  await emit(page, PLAYING);

  await expect(page.locator('#deck')).toHaveClass(/is-playing/);
  await expect(page.locator('.record-slide')).toHaveCSS('transition-duration', '0s');
  expect(await spinState(page)).toBe('paused');
});
