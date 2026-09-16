// Builds public/images/knob.png — the aluminium dial lifted out of the base
// art so it can be pressed down while the record plays.
//
// The dial is baked into turntable-base.png, so the patch deliberately takes
// a feathered ring of surrounding deck with it. Shifting the patch down then
// paints deck over the dial still drawn in the base, and the patch's own
// border lands on flat cream where a few pixels of offset don't read.
//
//   node scripts/extractKnob.mjs

import sharp from 'sharp'

const W = 1448, H = 1086
const CENTRE = { x: 1140, y: 712 }
const RX = 112, RY = 105
const OPAQUE_UNTIL = 0.85          // feather the outer 15%

const src = await sharp('public/images/turntable-base.png').raw().ensureAlpha().toBuffer()
const out = Buffer.alloc(W * H * 4, 0)

let opaque = 0, feathered = 0
for (let y = Math.floor(CENTRE.y - RY); y <= Math.ceil(CENTRE.y + RY); y++) {
  for (let x = Math.floor(CENTRE.x - RX); x <= Math.ceil(CENTRE.x + RX); x++) {
    const r = Math.hypot((x - CENTRE.x) / RX, (y - CENTRE.y) / RY)
    if (r > 1) continue
    const a = r <= OPAQUE_UNTIL ? 1 : 1 - (r - OPAQUE_UNTIL) / (1 - OPAQUE_UNTIL)
    const i = (y * W + x) * 4
    out[i] = src[i]; out[i+1] = src[i+1]; out[i+2] = src[i+2]
    out[i+3] = Math.round(src[i+3] * a)
    if (a === 1) opaque++; else feathered++
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile('public/images/knob.png')
console.log({ opaque, feathered })
