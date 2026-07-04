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
