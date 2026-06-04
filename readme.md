# Spiral Sounds

A vinyl record store with a Bauhaus-inspired design and a GSAP-powered animated landing experience. Browse records by genre, search the catalogue, and add albums to your cart.

live demo: https://spiral-sounds-8dk9.onrender.com/

---

## Tech Stack

| Layer | Choice |
|---|---|
| Markup | Vanilla HTML5 |
| Styles | Vanilla CSS (custom properties, CSS animations) |
| Scripts | Vanilla JS — ES Modules (no bundler) |
| Animation | GSAP 3.12.5 + ScrollTrigger plugin |
| Fonts | Adobe Typekit — Alfarn (headings), Neue Kabel Black (body) |

No build step, no framework, no dependencies beyond GSAP loaded from CDN.

---

## Features

### Hero Animation — Card Deal
On page load, a stack of album cover cards sits in the centre of a black screen. Cards are dealt out one by one, alternating between the top and bottom rows, like a card dealer at a table. Once all six cards are placed, two full-width image strips take over and begin scrolling continuously — the top strip left, the bottom strip right. Random album covers from the database fill both strips on every page load. The site header (logo, search bar, auth links) fades into the centre gap between the strips as the final reveal.

### Editorial Section
A full-screen (100 vh) section between the hero and the product catalogue. Contains a centred eyebrow label, a large uppercase editorial headline, and a "Browse the collection" CTA that smooth-scrolls the user to the products section. The bottom edge has a border rule with a "Browse by genre" tip on the left and a scroll hint on the right.

### Genre Scatter
An abstract collage of genre blocks positioned across the products section. Each block shows a representative album cover for that genre. Clicking a block loads a 4-column product grid filtered to that genre. The blocks animate in from the sides using GSAP when the section enters the viewport (ScrollTrigger — fires at the correct point regardless of how tall the sections above it are).

### Product Grid
Rendered dynamically from the API. Each card shows the album cover, title, artist, price, and an Add to Cart button. A back bar at the top returns the user to the genre scatter view.

### Search
Live search on the header input — filters products as the user types and renders results in the product grid view.

### Auth
Login, sign up, and logout flows. The greeting and menu items update based on auth state. Cart icon shows item count when logged in.

---

## File Structure

```
spiral-sounds/
├── index.html              # Main page
├── css/
│   └── index.css           # All styles — design tokens, layout, components, animations
├── js/
│   ├── index.js            # Main page logic — animation, genre scatter, search, init
│   ├── authUI.js           # Auth state rendering (greeting, show/hide menu items)
│   ├── logout.js           # Logout handler
│   ├── productService.js   # getProducts(), getGenres() — API calls
│   ├── cartService.js      # addBtnListeners(), updateCartIcon()
│   └── menu.js             # Mobile menu toggle
└── images/
    └── *.jpg / *.png       # Album cover images referenced by the database
```

---

## Setup

No build step required. Serve the project from any static server — the ES module `import` statements require a server (they won't work from `file://`).

**Using VS Code Live Server**
Right-click `index.html` → Open with Live Server.

**Using Node.js**
```bash
npx serve .
```

**Using Python**
```bash
python -m http.server 8080
```

Then open `http://localhost:<port>` in your browser.

---

## Animation Notes

### Hero Card Deal (`animateHeroHeader`)
Located in `js/index.js`. Called from `init()` after products are fetched. Key constants at the top of the function control the feel:

| Constant | Default | Effect |
|---|---|---|
| `STRIP_H` | 36% of hero height | Height of each scrolling strip |
| `DECK_CARD_W / H` | 110 × 140 px | Size of cards in the stacked deck |
| `STRIP_CARD_W` | viewport width ÷ 7.5 | Width of each album tile in the strips |
| Deal stagger | `0.18s` | Time between each card being dealt |
| Deal duration | `0.32s` | How long each single deal takes |

The strip scroll speed is controlled by the CSS animation duration in the injected `<style>` block — currently `22s`. Decrease to scroll faster.

`pickFrom(arr, n, start)` is a modulo-safe helper that wraps around the product array, so the strips and deck always have enough images even with a small catalogue.

### Genre Scatter Entrance
Triggered by `ScrollTrigger.create` with `start: 'top 80%'` on `#genre-scatter`. Fires once. Each block slides in from alternating sides with a `back.out(1.4)` bounce. Adjust `start` to control how early in the scroll it fires.

---

## Design Tokens (CSS Custom Properties)

Defined at the top of `index.css`:

```css
--color-bg          /* #EDE8DF — cream page background */
--color-bg-light    /* #1C1C1C — dark (confusingly named; used for header) */
--color-accent      /* #C0392B — red */
--color-text        /* #1C1C1C — primary text */
--color-text-muted  /* #8A7F72 — muted / placeholder text */
--color-border      /* #D4C9B8 — subtle border */
--font-heading      /* Alfarn — display / editorial headings */
--font-base         /* Neue Kabel Black — UI text */
```

---

## Known Limitations

- The hero animation calls `hero.offsetHeight` after the DOM is ready but before images load, so on very slow connections the strip height calculation uses `window.innerHeight` as a fallback.
- The vinyl carousel HTML and JS still exist in the codebase but are hidden by the animation. They can be safely removed if the carousel is no longer needed.
- No offline / service worker support.
- Mobile layout has not been fully optimised for the new hero animation — the strip card widths scale with the viewport but the deck card size is fixed in pixels.