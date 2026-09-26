# Redesign mockups

Static HTML mockups for the Spiral Sounds redesign (Sept 2026). They are the
reference for building the redesign into `public/` — not part of the running app.

| File | What it shows |
|---|---|
| `page.html` | Home: red-panel hero with playable turntable, genre collage, showroom, client stories, red poster finale + footer, and the genre overlay |
| `detail.html?id=66` | Record detail page with sticky purchase bar |
| `cart.html` | Bag, payment step, empty and thank-you states |
| `auth.html` / `auth.html?mode=signup` | Log in / sign up (`?next=cart` shows the checkout notice) |

Mockup-only stand-ins (to be replaced by the real API when building):
`products.js` (snapshot of `/api/products`), `bag.js` (localStorage bag instead of `/api/cart`),
`user.js` (localStorage session instead of `/api/me`).

To view: serve the repo root (e.g. `python3 -m http.server`) and open
`/design/mockups/page.html` — cover art and turntable layers load from `public/images/`.
