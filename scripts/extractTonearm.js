// Builds public/images/tonearm-cutout-v2.png — the tonearm layer the hero
// composites over turntable-base.png.
//
// The arm comes from tonearm-overlay.png, which is already a cleanly matted
// transparent render. Cutting one out of turntable-master-reference.png was
// tried first and looked wrong: master and base are two separate generations
// whose bodies don't line up, so pixels lifted near the bearing doubled its
// edges and the matte fringed wherever the arm crossed the cream deck.
//
// tonearm-overlay.png shares the 1448x1086 canvas but draws the arm longer
// and at a slightly different angle, so it is fitted with a similarity
// transform: its counterweight and stylus tips are mapped onto where those
// points sit in the master reference, which is where the arm reads correctly
// against this deck.
//
//   node scripts/extractTonearm.js

import sharp from 'sharp'

const W = 1448, H = 1086

// Two-point fit. Matching the arm's collar to the deck's bearing is what
// seats it mechanically — fitting the counterweight tip instead left the tube
// lying across the bearing like a pipe rather than pivoting in it.
const SRC_COLLAR = { x: 1250, y: 272 }     // where the tube widens into its joint
const SRC_STYLUS = { x: 673, y: 768 }
const DST_COLLAR = { x: 1193, y: 315 }     // top of the bearing housing in the base art
const DST_STYLUS = { x: 850, y: 570 }      // resting point on the record

const idx = (x, y) => y * W + x

;(async () => {
  const src = await sharp('public/images/tonearm-overlay.png').raw().ensureAlpha().toBuffer()

  const da = { x: SRC_STYLUS.x - SRC_COLLAR.x, y: SRC_STYLUS.y - SRC_COLLAR.y }
  const db = { x: DST_STYLUS.x - DST_COLLAR.x, y: DST_STYLUS.y - DST_COLLAR.y }
  const scale = Math.hypot(db.x, db.y) / Math.hypot(da.x, da.y)
  const theta = Math.atan2(db.y, db.x) - Math.atan2(da.y, da.x)
  console.log({ scale: +scale.toFixed(4), degrees: +(theta * 180 / Math.PI).toFixed(2) })

  // Inverse map so every output pixel samples the source bilinearly.
  const cos = Math.cos(-theta), sin = Math.sin(-theta), inv = 1 / scale
  const out = Buffer.alloc(W * H * 4, 0)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x - DST_COLLAR.x, py = y - DST_COLLAR.y
    const sx = (px * cos - py * sin) * inv + SRC_COLLAR.x
    const sy = (px * sin + py * cos) * inv + SRC_COLLAR.y
    if (sx < 0 || sy < 0 || sx >= W - 1 || sy >= H - 1) continue

    const x0 = Math.floor(sx), y0 = Math.floor(sy)
    const fx = sx - x0, fy = sy - y0
    const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy)
    const w01 = (1 - fx) * fy, w11 = fx * fy
    const i00 = idx(x0, y0) * 4, i10 = idx(x0 + 1, y0) * 4
    const i01 = idx(x0, y0 + 1) * 4, i11 = idx(x0 + 1, y0 + 1) * 4

    const a = src[i00+3]*w00 + src[i10+3]*w10 + src[i01+3]*w01 + src[i11+3]*w11
    if (a < 3) continue

    // Blend colour weighted by each sample's own alpha, otherwise transparent
    // neighbours drag the edge pixels toward black.
    const aw00 = w00*src[i00+3], aw10 = w10*src[i10+3], aw01 = w01*src[i01+3], aw11 = w11*src[i11+3]
    const awSum = aw00 + aw10 + aw01 + aw11
    const o = idx(x, y) * 4
    for (let c = 0; c < 3; c++) {
      out[o + c] = Math.round((src[i00+c]*aw00 + src[i10+c]*aw10 + src[i01+c]*aw01 + src[i11+c]*aw11) / awSum)
    }
    // Nudge the near-opaque body to fully opaque; the source sits at ~253.
    out[o + 3] = Math.min(255, Math.round(a * 1.02))
  }

  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile('public/images/tonearm-cutout-v2.png')
  console.log('written public/images/tonearm-cutout-v2.png')
})()
