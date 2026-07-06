# tool-experiment — exploration summary

## Purpose

This branch is independent from `animation-wip`. It exists purely to experiment
with design directions generated/informed by the `ui-ux-pro-max` skill (a
57-style design-pattern search tool) and refined with the `redesign-existing-projects`
("taste-skill") audit checklist. Nothing here is meant to affect the main
product line — it's a sandbox for testing how far AI-assisted design tooling
can take a real redesign of Spiral Sounds before deciding whether any of it is
worth carrying forward.

## Directions tried, in order

1. **Bauhaus** — first pass, using `ui-ux-pro-max`'s design-system generator to
   find the closest match to Bauhaus in its style library and propose a full
   color/typography/layout system. Preview-only, not applied to the working
   animation/layout logic.

2. **Vintage Analog / Retro Film** — rejected by the user as too tame; lacked
   the tension and confidence a vinyl record shop's brand should have.

3. **Swiss Design (International Typographic Style)** — searched via
   `ui-ux-pro-max` as a more structured, high-contrast alternative. Also
   rejected — didn't fit the product's character.

4. **fluid.glass-inspired redesign** — an attempt to match
   [fluid.glass](https://fluid.glass/)'s layout, color, and scroll/animation
   behavior directly, including extracting frames from a user-provided screen
   recording (via `ffmpeg`) to study the reference site's real motion instead
   of guessing from description alone.

   **Problems and limitations of this direction:**
   - Early attempts misread an old scope boundary ("don't touch the shared
     nav") as a blanket rule and avoided touching that section even when the
     user explicitly asked — a self-imposed constraint, not one the user set.
   - Repeated mismatches between what was delivered and the actual reference,
     since large parts of fluid.glass's specific visual language were being
     inferred rather than faithfully reproduced.
   - The "scattered floating collage" layout the user wanted could not be
     achieved with `flex-wrap` (it only ever packs items sequentially, never
     true edge-to-edge asymmetric scatter). CSS Grid with explicit
     column/row placement was tried as an intermediate fix, but this too was
     ruled out once the user gave an explicit spec forbidding Grid, Masonry,
     and Flexbox-wrapping for that section — the final approach had to be
     pure hand-placed `position: absolute`.
   - Net result: treating an external site as a literal copy target repeatedly
     produced visible gaps between intent and output. This direction was
     eventually abandoned in favor of a self-directed design.

5. **Editorial Grid / Magazine (current, in-progress direction)** — instead of
   copying a reference, this pass started from an honest read of the actual
   product (an independent Toronto vinyl shop, a curated collection, a
   confident editorial voice) and used `ui-ux-pro-max` + taste-skill only to
   refine that self-directed design, not generate it wholesale. This is the
   direction the visible work-in-progress on this branch currently reflects
   (nav bar, hero split with photo, absolute-positioned genre collage, copy
   pass).

## Standing rule

**This entire branch is exploratory.** Regardless of how far any individual
direction gets, none of it should be merged into `animation-wip` or `main`
unless a direction is explicitly chosen and that decision is confirmed
separately. Treat everything here as disposable until that happens.

## Implementation reference: "Browse by Genre" section

This section documents the **current, as-shipped implementation** of the
genre collage inside the Editorial Grid direction (section 5 above). It is a
factual record of what the code does right now — not a proposal, and not a
description of intent. Relevant files: `public/index.html` (`#genre-grid`
markup), `public/css/index.css` (search `GENRE COLLAGE`), `public/js/index.js`
(`buildGenreGrid()`, `GENRE_SLOTS`).

### Visual layout and composition

`#genre-grid` is a `position: relative` canvas, `max-width: 1200px`, centered
(`margin: 0 auto`), with a fixed `height: 1420px`. It deliberately uses no
CSS Grid, Masonry, or Flexbox-wrap for placement — every element inside it is
hand-positioned with `position: absolute` and a fixed `left`/`top`, so the
composition reads as independently placed objects rather than a packed grid.

Inside the canvas:

- **`.genre-intro`** — an editorial copy card (kicker "The Collection", a
  drop-cap intro paragraph, and a pill-shaped "↳ View all genres" button),
  positioned at `left: 320px; top: 130px`, width 300px, opaque cream
  background, 1px taupe border. Its left edge deliberately overlaps ~24px
  onto the feature sleeve's right edge — the single intentional overlap in
  the composition (an opaque card resting on top of a corner, not a
  transparent collision).
- **Five sleeve "slots"**, each a square resting on the page:
  | Slot | Size | Position | Rotation | Disc |
  |---|---|---|---|---|
  | `--feature` | 320×320 | left 24, top 60 | 0° (calm anchor) | no |
  | `--slot-a` | 250×250 | right-aligned, top 6 | 5° | yes (peeks lower-left) |
  | `--slot-d` | 230×230 | right-aligned, top 470 | −6° | no |
  | `--slot-c` | 250×250 | left 440, top 690 | 4° | yes (peeks upper-right) |
  | `--slot-b` | 270×270 | left 30, top 840 | −4° | no |

  If the catalog ever exceeds 5 genres, a `.genre-tile--cycle-2` modifier
  repeats the same 5 slot positions shifted down by `margin-top: 1460px` (a
  second "page"). Currently unused — the catalog has exactly 5 genres.

### How sleeves, discs, labels, and hover annotations work

- **`.genre-tile`** (wrapper) — `position: absolute`, sized/positioned per
  slot above. It is *not itself rotated* and carries the click handler
  (`openGenreOverlay(genre)`).
- **`.genre-tile-sleeve`** — the visual "album jacket": fills the wrapper,
  `background-image` set to one representative product's cover for that
  genre, `background-size: cover`, 3px rounded corners, a two-layer
  `box-shadow` to suggest it rests above the page. **Rotation lives on this
  element specifically** (not the wrapper), so that the hover annotation —
  a sibling, not a child — never inherits the tilt.
- **`.genre-tile-disc`** — only rendered for `slot-a` and `slot-c` (flagged
  per-slot in JS, see below). A circle built from a
  `repeating-radial-gradient` (fake grooves) plus a `::after` pseudo-element
  forming the center label/spindle hole. Sized to 65–70% of the tile and
  offset so it sits mostly behind the sleeve with a portion peeking from one
  corner. `z-index: 0`, below the sleeve's `z-index: 1`.
- **`.genre-tile-label`** — the genre name, **always visible** (not
  hover-gated): a small opaque ink-colored "sticker" in the sleeve's
  bottom-left corner, serif/600-weight cream text, `text-transform:
  capitalize`, drop shadow — reads as a genre/price tag printed on the
  jacket, not a caption floating below the image.
- **`.genre-tile-hover-info`** — the secondary "Explore {Genre} · {N}
  Records" annotation, hidden by default (`opacity: 0`), revealed only on
  `.genre-tile:hover`. It is a **sibling of `.genre-tile-sleeve`**, both
  children of the unrotated `.genre-tile` wrapper — placed there
  specifically so it never inherits the sleeve's rotation and always reads
  level/horizontal. It is always positioned *outside* the sleeve's own box
  (never over the artwork), in one of three directions depending on slot:
  - **Above** (default) — used by `slot-b` (indie) and `slot-d` (folk).
  - **Beneath** — used by `--feature` (punk, plenty of clear space below)
    and by `slot-c` (ambient), which is an *override* of the default
    "above": ambient's disc peeks from the top-right corner, and the
    default "above" placement used to sit partly over that dark disc,
    hurting legibility.
  - **To the right, but only at `min-width: 1600px`** — `slot-a` (rock).
    Below that width it falls back to "beneath" (the same safe pattern as
    punk/ambient). This threshold was set after measuring real overflow:
    an unconditional "always right" placement overflowed the viewport by
    84px at 1280px wide and by 24px even at 1400px, because `slot-a` sits
    close to the canvas's own right edge and the canvas is capped at
    `max-width: 1200px`.

### Hover interaction, exact behavior

On `:hover` of a `.genre-tile`, purely via CSS transitions (no GSAP, no JS):

1. The sleeve lifts `translateY(-6px)` and its `box-shadow` deepens (larger
   blur/spread).
2. The sleeve's rotation shifts by **at most 2° toward level** — e.g.
   `slot-a` 5°→3°, `slot-d` −6°→−4°, `slot-c` 4°→2°, `slot-b` −4°→−2°. It
   never fully de-rotates to 0°, so it reads as the same tilted object being
   picked up, not swapped for a flat one. `--feature` (already at 0°) has no
   rotation change on hover at all — a deliberate exception, so it stays the
   one calm/stable anchor even under interaction.
3. For `slot-a` and `slot-c` (the two disc slots) only: the disc nudges
   outward a few pixels (`translate(∓8px, ±8px)`) in the same direction it
   already peeks, as if sliding further out from behind the sleeve.
4. The hover-info annotation fades in (`opacity` 0→1) and its position
   settles (a 6px directional offset collapses to 0 — direction depends on
   above/beneath/right).

All transitions run at ~0.25–0.3s ease. Clicking a tile (independent of
hover) calls `openGenreOverlay(genre)`, sliding up the existing full-screen
genre/product overlay — unrelated to the hover treatment.

### Dynamic vs. hardcoded data

**Dynamic (from the API/DB):**
- The genre list itself (`getGenres()`).
- Each sleeve's cover image (`getProducts()` — the first product for that
  genre not already used in the hero carousel, else the first product for
  that genre overall).
- The exact record count in the hover annotation:
  `allProducts.filter(p => p.genre === genre).length`. Verified directly
  against the live `/api/products` response during implementation (punk 1,
  rock 2, indie 4, ambient 2, folk 1 — exact match, not fabricated).

**Hardcoded (in CSS, by design):** every slot's position, size, rotation
angle, which two slots get a disc, the disc's own size/offset/peek
direction, and which direction each slot's hover annotation is placed. These
are fixed, hand-composed values, not computed or randomized in JS — matching
the brief's "carefully composed, not randomly scattered" requirement. The
intro card's copy is static HTML.

### Responsive behavior

- **Desktop (>720px):** the absolutely-positioned collage described above.
  A `min-width: 1600px` query additionally switches `slot-a`'s hover
  annotation from beneath to the right (see above).
- **Mobile (≤720px):** `#genre-grid` becomes `display: flex; flex-direction:
  column;` with a 32px gap. `.genre-intro` and every `.genre-tile` are
  forced to `position: static; transform: none;`, collapsing the canvas
  into a simple vertical stack in natural DOM order — no absolute
  positioning, no rotation. Each tile becomes a fixed 220×220px square,
  centered. **The vinyl-disc elements are hidden entirely** (`display:
  none`) — noted in the CSS as deliberate: the disc-peek only reads
  correctly against a rotated, absolutely-positioned sleeve, and has no
  correct containing block to size against once the tile is
  `position: static`. The hover annotation still exists in the DOM on
  mobile but is functionally moot there, since touch has no hover state —
  only the always-visible genre-name sticker is meaningfully seen on
  mobile.

### GSAP, CSS, and accessibility considerations

- **GSAP is not used anywhere in this section.** It's deliberately
  static/CSS-only — a comment in `index.js` notes this was a conscious
  choice after reviewing a reference recording frame-by-frame ("the
  collection tiles are just static content as you scroll past them, no
  stagger/fade choreography"). GSAP is used elsewhere on the page (hero
  reveal, editorial-section scroll scrub, showcase sticky-scale, stories
  crossfade, footer/CTA reveal) but not here.
- All hover motion in this section is plain CSS `transition`.
- **Accessibility, current state (factual, not a fix list):** sleeve
  artwork is a CSS `background-image` on a `<div>`, not an `<img>`, so
  there's no alt text for the album covers. The genre name is real visible
  text (`.genre-tile-label-name`), so it is exposed to screen readers. Disc
  decorations are marked `aria-hidden="true"`. The hover-only annotation has
  no `:focus` equivalent and no other exposure path for keyboard/
  screen-reader users; tiles are plain `<div>`s relying on a JS `click`
  listener rather than a native `<button>`/`<a>`, so they are not natively
  keyboard-focusable.

### What was intentionally preserved and not changed

Across this whole round of refinements to the hover annotation:
- The overall asymmetrical floating layout, canvas size, and every slot's
  position/size/rotation value.
- Which slots show a vinyl disc (`slot-a`, `slot-c`) and the disc's own
  size/peek-offset.
- The hover lift, shadow-deepen, and per-slot rotation-delta behavior.
- The genre-name sticker's look (background, padding, position, typography)
  — unchanged through every one of these follow-up requests.
- The real, DB-derived record counts and the data-fetching flow.
- Mobile's simplified stacked layout and disc-hiding behavior.

Only the hover-info annotation itself changed across these rounds: where it
lives in the DOM (moved from inside the sleeve to a sibling of it), its
placement direction per slot, and its typography (size, weight, color,
case).

## Implementation reference: Client Stories → CTA → Footer scroll timing

This section documents the current, as-shipped scroll-timing tuning for the
closing reveal sequence (`public/js/index.js`, search "Footer rises up over
the pinned stories section"). It went through several rounds; this is a
factual record of where it ended up and why, not a proposal.

### Background color chapter break

The closing CTA panel (`.closing-cta-section`) got its own full-bleed
background — deep terracotta (`--cta-bg: #6B3226`) with cream text
(`--cta-text`, reusing `--color-bg`) — so it reads as a distinct chapter
after Client Stories rather than a continuation of the same cream page. The
text contrast was verified programmatically against the WCAG
relative-luminance formula (not just by eye): `#6B3226` vs `#F3F0ED` =
**8.77:1**, well clear of the 4.5:1 AA minimum. The vinyl-disc motif in that
section was also re-toned (warm brown-black grooves, center hole punching
through to `--cta-bg` instead of the page's cream) to integrate with the new
background.

### The core problem: percentage of *what*?

Several rounds of retuning the single scrub-linked timeline (Stories pin →
CTA rise → CTA hold → Footer rise) used percentages of the **pin's own
scroll range** as the reference frame (e.g. "CTA rises from 55% to 79%").
Each round measured out internally consistent — but a real user reported
that after a large amount of visible scrollbar movement, the CTA had barely
started to appear, which contradicted what "68% risen" seemed to promise.

The actual root cause, confirmed by cross-referencing `ScrollTrigger.getAll()`
values against `window.scrollY` and `document.documentElement.scrollHeight`
(and visually with `markers: true`, temporarily): **the pin only occupies the
last ~20-25% of the page's total scrollable height.** Everything before
Client Stories (hero, editorial, products/genre grid, showcase) is a fixed
~5470px, so a phase defined as "38% into the pin" actually corresponded to
roughly **75-85% of the whole page's scrollbar** — which is what a real user
actually perceives progress against. Percentages relative to the pin's own
range and percentages relative to the whole page are not the same number,
and conflating them was the source of every "this still doesn't feel right"
report in this round.

### The fix: reframe against the whole page, not the pin

Because Footer's rise is architecturally forced to end at exactly 100% of
the page (it's a `position: fixed` overlay — nothing scrollable exists after
it) and the content before Stories is fixed, the pin's start-percentage of
the whole page is `start / (start + pinLength)`. Counterintuitively,
**lengthening the pin is what pushes its start earlier** in whole-page
percentage terms, not shortening it — a shorter pin makes the whole page
shorter too, so the same fixed pre-Stories content becomes a *larger*
fraction of a *smaller* total.

Final tuning: `end: '+=330%'` (pin length 2970px), landing pin-start at
**64.8% of the whole page** (down from ~75.2% at `+=200%`), with the
"nothing moving yet" hold capped to a small slice of the pin (15%) so it
only spans **~65%-70% of the whole page** — versus ending around ~85% in
the previous version.

Phase breakdown (fractions are of the pin's own range; the whole-page
percentages in parentheses are what a user actually experiences):
- **0-15%** (~65.0%-70.1% of page): Stories holds stable/readable.
- **15-50%** (~70.1%-82.4% of page): CTA rises continuously into view.
- **50-58%** (~82.4%-85.2% of page): CTA's brief moment of presence.
- **56-100%** (~84.5%-100% of page): Footer rises, overlapping the CTA
  hold's tail at 56% instead of waiting for it to end at 58%.

### Verification method used

Each retuning pass was verified the same way, not just by eyeballing the
preview:
1. Read `ScrollTrigger.getAll()` directly on a **fresh natural load** (not
   immediately after a forced reload) for the trigger's real `start`/`end`,
   to sidestep the pin-spacer staleness issue (see below).
2. Scroll to specific fractions of `document.documentElement.scrollHeight`
   (the actual whole-page reference frame) and cross-check both the
   trigger's own `.progress` and each element's `getBoundingClientRect()`
   against the expected phase.
3. Temporarily add `markers: true` to the ScrollTrigger config for a visual
   screenshot cross-check against the numeric read, then remove it again —
   it is not left enabled in shipped code.

### Known pitfall, still relevant

ScrollTrigger's `start`/`end` (and even a pin-spacer's computed width) can
go stale if read before web fonts finish swapping in and reflowing text —
this was fixed earlier by adding
`document.fonts.ready.then(() => ScrollTrigger.refresh())` after the
init-time refresh in `index.js`. That safeguard was kept as-is through every
round of this timing work; only the ScrollTrigger's own `end` value and the
timeline's tween positions were changed.
