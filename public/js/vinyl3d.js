// The 3D record on the detail page's album stage: a picture disc, the cover
// printed across the whole record, with a black edge. It's unlit on purpose: the
// print shows the cover's exact colours from every angle, and the depth comes from
// the shape alone (perspective, the edge, a slight lean). Drag to turn it any way.
// Reference: design/mockups/album-open-3d.html (vinyl3d.js there has the lit,
// grooved and coloured-vinyl versions that were tried first).
//
//   const vinyl = await createVinyl({ canvas, dragTarget, frame: 1.5 })
//   await vinyl.setCover('/images/vinyl36.jpg')
//   vinyl.setPose('lean'); vinyl.setDragEnabled(true); vinyl.setSpinning(true)
//
// Throws if the browser can't make a WebGL context, so the caller can keep its
// flat disc.

import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, RingGeometry, LatheGeometry, CylinderGeometry,
  MeshBasicMaterial, Texture, Vector2, Vector3, Quaternion, Euler, MathUtils, SRGBColorSpace, NoToneMapping, BackSide,
} from '/vendor/three.min.js'

// Record units: 1 = the radius. A 12" LP: 7.24 mm spindle hole, and here the
// print stops ~5 mm short of the edge, where the black rim begins.
const HOLE_R = 0.024
const RIM_IN = 0.965
const T = 0.009 // half the thickness, exaggerated a touch so the edge reads
const RPM = 33 + 1 / 3
const DRAG_K = 0.0085 // radians per pixel dragged
const POSES = { face: [0, 0], lean: [-0.38, 0.5] }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

// canvas     — where it draws; size it bigger than the record so it can turn without clipping
// dragTarget — the element that takes the drag
// frame      — canvas size ÷ record diameter
// fov        — camera angle in degrees; wider = stronger perspective
// hoverTilt  — how far (radians) it leans toward the pointer while it rests
export async function createVinyl({ canvas, dragTarget = canvas, frame = 1.5, fov = 42, hoverTilt = 0.18 }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = NoToneMapping
  renderer.outputColorSpace = SRGBColorSpace
  const maxAniso = renderer.capabilities.getMaxAnisotropy()

  const scene = new Scene()
  const camera = new PerspectiveCamera(fov, 1, 0.1, 30)
  camera.position.set(0, 0, frame / Math.tan(MathUtils.degToRad(fov / 2)))

  // tilt = the orientation (dragged, or resting); spin = the record turning on its spindle
  const tilt = new Group(), spin = new Group()
  tilt.add(spin)
  scene.add(tilt)

  // ---------- the record ----------
  // Both faces are rings whose default UVs map the square cover onto the circle,
  // so it fills the disc out to the rim and its corners fall off the record.
  const print = new MeshBasicMaterial({ color: 0xffffff })
  const black = new MeshBasicMaterial({ color: 0x141210 })
  const faceA = new Mesh(new RingGeometry(HOLE_R, RIM_IN, 256, 1), print)
  faceA.position.z = T
  const faceB = new Mesh(faceA.geometry, print)
  faceB.rotation.x = Math.PI // flipped over, the B side shows the cover too
  faceB.position.z = -T
  // the rim: a rounded bead a little proud of the faces, as on a real LP
  const rimProfile = [
    [RIM_IN, -T], [0.975, -T * 1.18], [0.987, -T * 1.26], [0.995, -T * 1.05], [0.9995, -T * 0.5], [1, 0],
    [0.9995, T * 0.5], [0.995, T * 1.05], [0.987, T * 1.26], [0.975, T * 1.18], [RIM_IN, T],
  ].map(([r, z]) => new Vector2(r, z))
  const rim = new Mesh(new LatheGeometry(rimProfile, 256), black)
  rim.rotation.x = Math.PI / 2
  const hole = new Mesh(new CylinderGeometry(HOLE_R, HOLE_R, 2 * T, 32, 1, true), new MeshBasicMaterial({ color: 0x141210, side: BackSide }))
  hole.rotation.x = Math.PI / 2
  spin.add(faceA, faceB, rim, hole)
  spin.visible = false // until the cover has loaded, so no blank disc flashes up

  async function setCover(url) {
    const img = new Image()
    img.src = url
    await img.decode()
    print.map?.dispose()
    const tex = new Texture(img)
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = maxAniso
    tex.needsUpdate = true
    print.map = tex
    print.needsUpdate = true
    spin.visible = true
    dirty = true
  }

  // ---------- pose ----------
  // At rest it eases toward its pose, leaning a little toward the pointer. A
  // drag takes over; let go and, once it has coasted to a stop, it eases back.
  const restPose = new Quaternion(), goal = new Quaternion(), lean = new Quaternion(), euler = new Euler()
  let settled = true
  function setPose(name) {
    const [x, y] = POSES[name] || POSES.face
    restPose.setFromEuler(euler.set(x, y, 0))
    settled = true
    dirty = true
  }

  const hover = { x: 0, y: 0 }
  addEventListener('pointermove', e => {
    if (!hoverTilt || !dragEnabled) return
    const r = canvas.getBoundingClientRect()
    if (!r.width) return
    hover.x = MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / (r.width * 0.75), -1, 1)
    hover.y = MathUtils.clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 0.75), -1, 1)
  })

  // ---------- drag ----------
  let dragging = false, dragEnabled = false, last = null, vel = { x: 0, y: 0 }, releasedAt = 0
  const axis = new Vector3(), turn = new Quaternion()
  function turnBy(dx, dy) {
    const angle = Math.hypot(dx, dy) * DRAG_K
    if (!angle) return
    tilt.quaternion.premultiply(turn.setFromAxisAngle(axis.set(dy, dx, 0).normalize(), angle))
    dirty = true
  }
  dragTarget.style.touchAction = 'none'
  dragTarget.addEventListener('pointerdown', e => {
    if (!dragEnabled || e.button > 0) return
    dragging = true; settled = false; releasedAt = 0
    last = { x: e.clientX, y: e.clientY, t: performance.now() }
    vel = { x: 0, y: 0 }
    dragTarget.setPointerCapture(e.pointerId)
    dragTarget.style.cursor = 'grabbing'
  })
  dragTarget.addEventListener('pointermove', e => {
    if (!dragging) return
    const now = performance.now()
    const dx = e.clientX - last.x, dy = e.clientY - last.y, dt = Math.max(1, now - last.t)
    turnBy(dx, dy)
    vel = { x: dx / dt * 16.7, y: dy / dt * 16.7 } // px per frame
    last = { x: e.clientX, y: e.clientY, t: now }
  })
  function release() {
    if (!dragging) return
    dragging = false
    dragTarget.style.cursor = dragEnabled ? 'grab' : ''
    releasedAt = performance.now()
    if (reduceMotion || releasedAt - last.t > 80) vel = { x: 0, y: 0 } // held still before letting go: no coasting
  }
  dragTarget.addEventListener('pointerup', release)
  dragTarget.addEventListener('pointercancel', release)
  function setDragEnabled(on) {
    if (!on) { release(); vel = { x: 0, y: 0 }; settled = true; hover.x = hover.y = 0 }
    dragEnabled = on
    dragTarget.style.cursor = on ? 'grab' : ''
  }

  // ---------- loop ----------
  let spinning = false, spinRate = 0, active = false, dirty = true, prev = performance.now()
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    dirty = true
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  renderer.setAnimationLoop(now => {
    const dt = Math.min(0.05, (now - prev) / 1000)
    prev = now
    if (!active || !canvas.clientWidth) return // nothing to draw while the stage is closed

    if (!dragging && (vel.x || vel.y)) {
      turnBy(vel.x, vel.y)
      const k = Math.exp(-dt * 4)
      vel.x *= k; vel.y *= k
      if (Math.hypot(vel.x, vel.y) < 0.02) vel = { x: 0, y: 0 }
    }
    if (releasedAt && !dragging && !vel.x && !vel.y && now - releasedAt > 450) { releasedAt = 0; settled = true }
    if (settled && !dragging) {
      goal.copy(restPose)
      if (hoverTilt && dragEnabled && !reduceMotion) goal.premultiply(lean.setFromEuler(euler.set(hover.y * hoverTilt, hover.x * hoverTilt, 0)))
      if (tilt.quaternion.angleTo(goal) > 1e-4) {
        if (reduceMotion) tilt.quaternion.copy(goal)
        else tilt.quaternion.slerp(goal, 1 - Math.exp(-dt * 4.5))
        dirty = true
      }
    }
    // ease up to and down from 33⅓, like a platter; clockwise seen from the front
    const target = spinning ? (RPM / 60) * Math.PI * 2 : 0
    spinRate += (target - spinRate) * Math.min(1, dt * 2.2)
    if (Math.abs(spinRate) < 1e-3 && !spinning) spinRate = 0
    if (spinRate) { spin.rotation.z -= spinRate * dt; dirty = true }

    if (dirty) { renderer.render(scene, camera); dirty = false } // a resting record costs nothing
  })

  setPose('face')
  tilt.quaternion.copy(restPose)

  return {
    setCover, setPose, setDragEnabled,
    setSpinning(on) { spinning = on && !reduceMotion },
    setActive(on) { active = on; dirty = true },
    dispose() { renderer.setAnimationLoop(null); ro.disconnect(); renderer.dispose() },
  }
}
