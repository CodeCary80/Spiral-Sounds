# Redesign mockups

Static HTML mockups for the Spiral Sounds redesign (Sept 2026). They are the
reference for building the redesign into `public/` — not part of the running app.

| File | What it shows |
|---|---|
| `page.html` | Home: red-panel hero with playable turntable, genre collage, showroom, client stories, red poster finale + footer, and the genre overlay |
| `detail.html?id=66` | Record detail page with sticky purchase bar |
| `album-open.html?id=36` | Detail page "album open": click the cover, the record and a tracklist insert slide out, tracks play as Spotify previews over a blurred-cover background and the insert shows lyrics from LRCLIB (works for any id) |
| `album-open-3d.html?id=36` | The album-open stage with the 3D picture disc from `vinyl3d.js` in place of the flat one: flat on while it slides out, drag to turn it once open (it settles back), spins only while a track plays; falls back to the flat disc without WebGL |
| `vinyl3d.html?id=36` | 3D record (three.js, `vinyl3d.js`): a picture disc by default — the cover printed across the record under clear vinyl, with a clear rim — or translucent coloured vinyl tinted from the cover (`&style=colour`); track gaps cut from the tracklist durations; drag to turn it all the way round, Spin 33⅓ |
| `cart.html` | Bag, payment step, empty and thank-you states |
| `auth.html` / `auth.html?mode=signup` | Log in / sign up (`?next=cart` shows the checkout notice) |

Mockup-only stand-ins (to be replaced by the real API when building):
`products.js` (snapshot of `/api/products`), `bag.js` (localStorage bag instead of `/api/cart`),
`user.js` (localStorage session instead of `/api/me`).

To view: serve the repo root (e.g. `python3 -m http.server`) and open
`/design/mockups/page.html` — cover art and turntable layers load from `public/images/`.
