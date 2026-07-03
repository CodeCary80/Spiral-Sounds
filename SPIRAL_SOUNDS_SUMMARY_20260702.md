# Spiral Sounds — Vinyl Scroll Story Session Summary

**Branch:** `animation-wip` (created off `main` @ `994dd6a`). Initial work committed as `84e1126`; this document was updated alongside a follow-up commit covering Bug #11 (story-switch transition rebuild) — see git log for the current commit on this branch.
**Date:** 2026-07-02, updated 2026-07-03
**Scope:** Add a persistent vinyl element that travels from Hero through Stories on scroll, without touching the two pre-existing locked scroll segments (Showcase's 250vh pin, Footer's rise), plus a visual pass on the Stories card via the `redesign-existing-projects` skill.

---

## 1. Architecture — Master Vinyl Scroll System

### The locked segments (never modified)

These two existing scroll-driven behaviors were treated as fixed constraints throughout — every new piece of logic was built to hand off cleanly at their boundaries, never to overlap or re-derive their timing independently.

- **Showcase 250vh pin** — `.showcase-section` is 250vh tall; `.showcase-sticky` (`position: sticky`, 100vh) does the actual pinning via CSS, not GSAP. A GSAP scrub tween ([index.js:623-640](public/js/index.js:623)) only drives the first 100vh of that range (frame expand + header fade). The remaining 150vh is the sticky frame sitting static until it runs out of room and releases.
- **Footer rise** — [index.js:642-662](public/js/index.js:642). A GSAP `ScrollTrigger` pins `#stories-section` itself (`pin: stories`, `pinSpacing: true`) over a `+=100%` range and tweens the footer from `y:'100%'` to `y:'0%'`, `ease:'none'` (linear).

### The new vinyl system

One persistent `<img id="master-vinyl">` ([index.html:29](public/index.html:29)), `position: fixed` at all times ([index.css:363-373](public/css/index.css:363)) — it's a viewport-anchored floating element for the entire Hero→Stories journey, never an in-flow element, so it needs no GSAP `pin` of its own (see Bug #2 below for why that matters).

All vinyl logic lives in one `ScrollTrigger.matchMedia()` block ([index.js:664-811](public/js/index.js:664)), desktop-only (`min-width: 769px`); mobile gets a static, non-scroll-tied placement ([index.js:805-808](public/js/index.js:805)).

Two independent timelines drive it, split because the two locked segments (Showcase, Footer-pin) sit between them and neither timeline is allowed to run during those:

- **`journeyTl`** ([index.js:695-719](public/js/index.js:695)) — Hero → Editorial → Products → fade out. `trigger: heroSection, start:'top top', endTrigger: showcaseSection, end:'top top'`. Ends exactly where Showcase's own pin begins, so there is zero overlap. Labels: `hero` → `editorial` → `products` → `handoffToShowcase` (fades to invisible before Showcase takes the screen).
- **`storiesTl`** ([index.js:739-795](public/js/index.js:739)) — re-enters during the Stories segment. `start` is computed dynamically as the moment Showcase's sticky frame releases (not "fully in Stories" — see Bug #6); `end` mirrors the footer-rise ScrollTrigger's own `.end` exactly (see Bug #4). Labels: `storiesIn` (fade+arc into its docked position, first 30% of the range) → static hold (30%–80%, nothing tweens) → `mergeWithFooter` (80%–100%, fades out as the footer finishes covering the screen).

Nothing in either timeline runs during the Showcase or Footer-pin ranges themselves — the vinyl is invisible throughout Showcase's 250vh, and reappears only once Stories starts taking over.

---

## 2. Bugs Fixed (in the order they were found)

1. **`immediateRender` stomp — vinyl invisible from page load.**
   `storiesTl.fromTo(vinyl, {autoAlpha:0,...}, {...})` defaults to `immediateRender:true`, which applied its "from" state (invisible) the instant the line executed at page load — before any scrolling — silently overwriting `journeyTl`'s initial render. Fix: `immediateRender:false` on that tween ([index.js](public/js/index.js), now folded into the current `storiesIn` tweens).

2. **GSAP `pin` misuse — vinyl snapped to the top-left corner after Showcase.**
   `journeyTl` originally used `pin: vinyl`. Since `.hero-vinyl` is already `position:fixed`, GSAP's pin was solving a problem that didn't exist — and worse, when the pin *released* at the Showcase handoff, GSAP reverted the element to whatever position it had *before* pinning (CSS `absolute`), anchoring it to `#hero-section` (the very top of the page) and yanking it thousands of pixels off-screen for the rest of the journey. Fix: removed `pin`/`pinSpacing` from `journeyTl` entirely; `scrub` alone drives `x/y/rotation/scale` against the already-fixed element.

3. **Mobile: vinyl floats across the entire page, not just Hero.**
   The mobile `matchMedia` branch never un-fixes the vinyl, and it's `position:fixed` globally — so on mobile it stayed glued to the viewport through Editorial/Products/Showcase/Stories/Footer instead of scrolling away with Hero. Fix: mobile-only CSS override to `position:absolute` inside the `max-width:768px` media query ([index.css:1440](public/css/index.css:1440)), letting it scroll away naturally like a normal decorative image.

4. **ScrollTrigger start/end drift between two triggers sharing a pinned element.**
   `storiesTl` and the footer's pinning ScrollTrigger both independently computed `trigger: storiesSection, start:'top top'`. Because the footer's ST *pins* that same element (inserting a pin-spacer), two independent measurements of "top top" against it can disagree depending on refresh order — confirmed up to **900px of drift** on a plain page load even with `refreshPriority` set. Fix: `storiesTl.end` now reads the footer ST's own already-computed `.end` directly via `getFooterRiseST()` ([index.js:728](public/js/index.js:728)) instead of re-deriving it, so they can never disagree. `refreshPriority:-1` kept as a secondary guarantee that the footer ST refreshes first.

5. **Scrub lag hides the "static hold."**
   `storiesTl` initially matched the footer's `scrub:1`. That's up to 1 second of catch-up lag — on a normal-speed scroll, the vinyl's fade-in was still visibly catching up well past its intended 25-30% settle point, so the "hold" never read as genuinely still. Fix: decoupled `storiesTl`'s own `scrub` down to `0.3` ([index.js:755](public/js/index.js:755)) — the boundary-sync fix in #4 was the only thing that actually needed to match the footer; the smoothing duration didn't.

6. **Vinyl reappears too late entering Stories.**
   `storiesTl` originally started at `stories-section`'s own `'top top'` (the point it's *fully* scrolled into view). But `.showcase-sticky` (100vh) inside the 250vh `.showcase-section` can only stay stuck for `250vh - 100vh = 150vh` of scrolling before it runs out of room and releases — for the final 100vh of Showcase, the photo is already sliding away and Stories is visibly sliding up from the bottom, well before "top top." The vinyl sat idle through that entire window. Fix: `start` is now computed dynamically as the sticky-release point — `showcaseST.start + (showcaseSection.offsetHeight - window.innerHeight)` ([index.js:742-747](public/js/index.js:742)) — the actual moment Showcase visually hands off.

7. **GSAP per-property `{value, ease}` syntax silently no-ops.**
   To give the entrance an arc/swoop path (matching the journeyTl leg's style), a single tween using `x: {value:-220, ease:'power2.out'}` was tried first. It silently failed — x/y never animated at all, confirmed via direct DOM inspection (`translate3d` component missing entirely from the rendered style). Fix: split into two separate single-property `fromTo` tweens sharing the same `storiesIn` label, each with its own top-level `ease` ([index.js:791-792](public/js/index.js:791)) — a plain, well-supported pattern instead.

8. **Entrance duration too short — reads as an instant jump.**
   With the original ~900px-wide Stories range and a `duration:0.2` entrance, the visible glide was only ~180px of scroll — technically eased but perceptually a snap. Fixed in two parts: extending the start point earlier (fix #6) roughly doubled the total range to ~1800px, and the duration fraction was bumped to `0.3`, giving ~540px of actual scroll distance for the arc to play out over.

9. **Vinyl/card overlap — several iterations before it landed.**
   After sizing the vinyl up and docking it beside the card, three rounds of measured-but-still-wrong placement: centering on the card clipped the quote's last line; a smaller/lower placement avoided the quote but the card had no dedicated space so any large vinyl inevitably overlapped its corner. Root fix: gave `.story` an actual `max-width: 720px` ([index.css:1652](public/css/index.css:1652)) to free real, dedicated space to its right, then computed the vinyl's final `x:363, y:28, scale:1.0` ([index.js:791-792](public/js/index.js:791)) directly from the *live-measured* pinned card geometry (right edge, vertical center) rather than guessing — landing on a 48px clear gap, matching vertical centers, and ~89% of the card's height.

10. **`scroll-behavior: smooth` (global CSS) fighting ScrollTrigger.**
    Reported as "vinyl keeps falling, never stops." Instrumented testing showed `storiesTl`'s hold logic was already correct (14 consecutive identical samples across the 30-80% window in a clean scroll pass). The actual cause: `html { scroll-behavior: smooth }` ([index.css:47](public/css/index.css:47), now removed) intercepts keyboard-triggered scrolling (Page Down / Space / Home / End / arrow keys) in most browsers, which fights with ScrollTrigger's own scrub math — reproduced accidentally via rapid scripted `scrollTo()` calls during testing, which showed the exact same "chasing a moving target, never settling" symptom. Mouse wheel/trackpad scrolling is exempt from this CSS property, so it likely wasn't visible that way. Fix: removed the global rule; the two call sites that want smooth scrolling now request it explicitly via `behavior:'smooth'` in JS ([index.js:65](public/js/index.js:65), [index.js:72](public/js/index.js:72), [index.js:312](public/js/index.js:312)) so nothing lost its intended smoothness.

11. **Story-switch transition covered the vinyl's dock zone — took two passes to actually fix.**
    First reported as: the wipe visually swept across the *entire* section width, including the space to the right of the card where the vinyl now lives. Root cause turned out to be two separate, compounding bugs, and the eventual fix was structural rather than a tuning pass:
    - **Pass 1 (CSS scope):** `.stories-wipe` used `position:absolute; inset:0` inside `.stories-wrap` — filling the *wrap's* full padding box (measured 1280px wide), not the card's own `max-width:720px` box. Confirmed via `git show` that the earlier vinyl-docking commit never touched `.stories-wipe` at all — this wasn't a regression, it was a gap nobody had closed yet. Scoped the wipe's `top/left/bottom/width/max-width` to match the card's box exactly (`[32,752]`), instead of `inset:0`.
    - **Pass 2 (JS travel distance):** fixing the width introduced a *new* bug — the wipe's off-screen rest position used `x:'±101%'`, a percentage of *its own* width. That math worked when the wipe was ~1280px wide (rested far off-screen), but at the corrected 720px width, 101% only travels ~727px — landing the "resting" wipe at x:759-1479, squarely inside the vinyl's dock zone (x:801-1206). Bumped to `±220%` to reliably clear past the vinyl regardless of viewport width.
    - **Both passes were verified correct by measurement** (wipe rest position, full-coverage geometry, vinyl's inline style unchanged across real transitions) — but the *visual read* was still "this covers the whole section," because a full-bleed color panel sliding behind the vinyl reads as a wipe-everything effect even when it's pixel-perfectly clipped. Consulted the `redesign-existing-projects` skill's motion guidance ("staggered entry, combining translation with opacity fade," prefer `transform`/`opacity` over a separate covering element) and **removed the `#stories-wipe` overlay entirely** ([index.html](public/index.html) — the `<div class="stories-wipe">` is gone; [index.css](public/css/index.css) — the `.stories-wipe` rule is gone). Replaced with a transition that only ever touches the `.story` cards' own `opacity`/`transform` ([index.js:10-58](public/js/index.js:10)): outgoing card fades + slides out 40px, then the incoming card fades + slides in from the opposite side with its photo/quote/meta cascading in on a stagger. Structural fix, not just a tuning pass — there is no longer a separate element whose bounding box needs to be kept in sync with the card's, so this bug class can't recur.
    - Verified across a full 01→02→03→01 cycle: screenshot mid-transition shows only the card fading/shifting, vinyl fully opaque and unmoved; vinyl's inline style (`x:363, y:28, opacity:1`) confirmed byte-identical before/after every switch.

---

## 3. Stories Card Visual Pass (`redesign-existing-projects` skill audit)

Applied via the locally-installed skill (`.claude/skills/redesign-existing-projects/SKILL.md`, gitignored — dev tooling, not part of the app).

- **Card treatment** ([index.css:1646-1657](public/css/index.css:1646)) — `.story` went from bare, unstyled content floating on the page background to an actual card: `background: var(--color-bg-secondary)`, `border-radius: 20px`, `padding: 36px 40px`, and a soft **red-tinted** shadow (`rgba(192,57,43,0.22)`) instead of a generic black drop-shadow — per the skill's "don't stack border+shadow+white-bg, pick one elevation cue" and "tint shadows to match the palette" guidance. No border.
- **Radius hierarchy** — `.story-photo` bumped from `border-radius: 2px` to `10px` ([index.css:1666](public/css/index.css:1666)), intentionally tighter than the card's own 20px ("vary radius: tighter on inner elements, softer on containers").
- **Color bug found during the audit, not requested but fixed anyway**: two of the three `.story-photo` placeholder background colors were navy/indigo-tinted (`#0d1520`, `#0a0a1e`) — actual blue, contradicting the site's red/black-only palette. Replaced with warm dark tones (`#2e1512`, `#1c1714`) at [index.html:176](public/index.html:176) and [index.html:188](public/index.html:188).
- **Layout** — `.stories-wrap` padding reduced from `44px 48px 52px` to `24px 32px 32px` ([index.css:1632-1640](public/css/index.css:1632)), and `.story` capped at `max-width: 720px` ([index.css:1652](public/css/index.css:1652)) specifically to free up dedicated space for the vinyl dock (see Bug #9).
- **Transition redesign** (see Bug #11) — the story-switch transition itself was rebuilt on the skill's motion guidance: no separate covering element, `.story` cards' own `opacity`/`transform` animate directly with a staggered cascade on the photo/quote/meta.

---

## 4. Known Unresolved Issues

None currently open. The story-switch transition's coverage-scope problem (previously tracked here) is resolved — see Bug #11 in Section 2 for the full history, including why the first fix attempt (scoping `.stories-wipe`'s CSS) wasn't sufficient and what actually shipped instead (the wipe overlay was removed entirely in favor of animating the `.story` cards' own `opacity`/`transform`).

---

## 5. Key File / Line Reference

| What | File : Line |
|---|---|
| Vinyl `<img>` element | [index.html:29](public/index.html:29) |
| Story card markup + photo colors | [index.html:161-195](public/index.html:161) |
| `.hero-vinyl` base CSS (`position:fixed`, load-bearing) | [index.css:358-373](public/css/index.css:358) |
| `.hero-vinyl` mobile override (`position:absolute`) | [index.css:1440](public/css/index.css:1440) |
| Hero flash-prevention selector list (includes vinyl) | [index.css:1454-1457](public/css/index.css:1454) |
| `.story` card styling (incl. `max-width:720px` vinyl clearance) | [index.css:1642-1657](public/css/index.css:1642) |
| `.stories-wrap` (no longer hosts a separate overlay element) | [index.css:1632-1640](public/css/index.css:1632) |
| Showcase 250vh pin (locked, untouched) | [index.js:623-640](public/js/index.js:623) |
| Footer rise (locked, untouched) | [index.js:642-662](public/js/index.js:642) |
| Master vinyl `matchMedia` block (all vinyl logic) | [index.js:664-811](public/js/index.js:664) |
| `journeyTl` (Hero→Products) | [index.js:695-719](public/js/index.js:695) |
| `getFooterRiseST` / `getShowcaseST` helpers | [index.js:728](public/js/index.js:728), [index.js:738](public/js/index.js:738) |
| `storiesTl` (Stories segment) | [index.js:739-795](public/js/index.js:739) |
| Mobile static-vinyl branch | [index.js:805-808](public/js/index.js:805) |
| Story slider / fade+slide transition JS (no wipe overlay) | [index.js:10-58](public/js/index.js:10) |
| `scroll-behavior` removal + rationale | [index.css:47-57](public/css/index.css:47) |
| Explicit `behavior:'smooth'` call sites | [index.js:65](public/js/index.js:65), [index.js:72](public/js/index.js:72), [index.js:312](public/js/index.js:312) |

---

## Debug Scaffolding Still In Place

`markers: true` is still set on both `journeyTl`'s and `storiesTl`'s ScrollTrigger configs ([index.js:703](public/js/index.js:703), [index.js:760](public/js/index.js:760)), both flagged `// TEMP debug — remove before ship`. Left in intentionally for continued visual boundary-checking; strip before merging to `main`.
