// A 3D record for the mockups, in two styles:
//   'picture' — a picture disc: the cover printed across the whole record under
//               clear vinyl, with the grooves pressed into the clear layer;
//   'colour'  — translucent vinyl tinted from the cover, the cover as the label.
// Either way the grooves catch the light in the radial streak a real record
// shows. Drag to turn it any way, all the way round.
//
//   const vinyl = await createVinyl({ canvas, background: '#efebe4', style: 'picture' });
//
// Options for placing it in a page rather than on its own:
//   transparent  — no backdrop: the page shows round the record and through its clear rim
//   dragTarget   — the element that takes the drag (default: the canvas)
//   pose         — resting pose: 'tilted' (default), 'lean' (a slight turn that shows
//                  the edge) or 'face' (flat on to the viewer, as the 2D disc was);
//                  change it later with setPose()
//   hoverTilt    — how far (radians) it leans toward the pointer while it rests; 0 = off
//   frame        — canvas size ÷ record diameter, i.e. the room left for it to turn into
//   springBack   — after a drag, ease back to the resting pose
//   lights       — 'soft' (default): a broad light from the front, just enough shading
//                  to read as an object, without glare over the print;
//                  'studio': a hard key light up and to the left, with a bright
//                  streak across the grooves; 'none': no light at all, so the print
//                  shows the cover's exact colours and the depth comes from the
//                  shape alone (perspective, the edge, the lean)
//   fov          — camera angle in degrees; wider = stronger perspective
//   await vinyl.setProduct(product, imageUrl);   // product.tracklist: [{ duration: '3:41' }]
//   vinyl.setStyle('colour'); vinyl.setSpinning(true); vinyl.resetView();
//
// Built from code rather than a model file: a record is a thin disc, so the
// shape is simple and the realism comes from the materials and the light.

// The full three.js from node_modules (npm install first); the pages map the bare
// 'three' import that RoomEnvironment uses. The site itself ships a slimmer build.
import * as THREE from '../../node_modules/three/build/three.module.js';
import { RoomEnvironment } from '../../node_modules/three/examples/jsm/environments/RoomEnvironment.js';

// Radii in record units (1 = 6", i.e. a 12" LP is 2 wide). Real proportions:
// 7.24 mm spindle hole, 100 mm label, grooves stop ~10 mm short of the edge.
const HOLE_R = 0.024;
const LABEL_R = 0.335;
const RIM_IN = 0.965;       // the flat playing surface ends here, the raised rim begins
const GROOVE_OUT = 0.95;    // lead-in: grooves start just inside the rim
const GROOVE_MIN = 0.4;     // the innermost a side is allowed to reach
const T = 0.009;            // half the thickness (exaggerated a touch so the edge reads)
const SIDE_FULL = 22 * 60;  // a 22-minute side fills the whole groove area

const ROWS = 2048;          // radial resolution of the groove textures
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function createVinyl({
  canvas, background = '#efebe4', style = 'picture',
  transparent = false, dragTarget = canvas, pose = 'tilted', frame = 1.3, springBack = false,
  lights = 'soft', hoverTilt = 0, fov = 28,
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = lights === 'none' ? THREE.NoToneMapping : THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new THREE.Scene();
  // Translucent vinyl shows what is behind it, so the scene's backdrop is the page colour.
  scene.background = transparent ? null : new THREE.Color(background);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  if (lights === 'studio') {
    // A key light up and to the left: this is what draws the streak across the grooves.
    scene.environmentIntensity = 0.9;
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-2.5, 3, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.6);
    fill.position.set(3, -1.5, 2);
    scene.add(fill);
  } else if (lights === 'soft') {
    // Mostly even light, plus a gentle one from above the viewer's shoulder: faces
    // turned toward it brighten a little, faces turned away dim, and the grooves
    // get a faint sheen. That shading is what makes it read as a solid thing.
    scene.environmentIntensity = 0.5;
    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const front = new THREE.DirectionalLight(0xfffaf2, 1.1);
    front.position.set(0.6, 2.2, 4);
    scene.add(front);
  } else {
    // ambient at π cancels the 1/π of diffuse shading: every surface shows its own
    // colour, exactly, from every angle; no reflections either
    scene.environmentIntensity = 0;
    scene.add(new THREE.AmbientLight(0xffffff, Math.PI));
  }

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 30);
  camera.position.set(0, 0, frame / Math.tan(THREE.MathUtils.degToRad(fov / 2)));

  // tilt = the orientation the visitor drags; spin = the record turning on its spindle
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  tilt.add(spin);
  scene.add(tilt);
  const POSES = { face: [0, 0], lean: [-0.38, 0.5], tilted: [-0.42, 0.28] };
  const restPose = new THREE.Quaternion();
  function setPose(name) {
    const [x, y] = POSES[name] || POSES.tilted;
    restPose.setFromEuler(new THREE.Euler(x, y, 0));
    settled = true; // ease over to it
  }
  let settled = true;
  setPose(pose);
  tilt.quaternion.copy(restPose);

  // ---------- materials ----------
  const vinylBase = {
    color: 0x7a2a24, metalness: 0, roughness: 1,
    transmission: 0.92, thickness: 0.06, ior: 1.5,
    attenuationColor: new THREE.Color(0x7a2a24), attenuationDistance: 0.022,
    specularIntensity: 1, anisotropy: 1,
    clearcoat: 0.35, clearcoatRoughness: 0.18,
  };
  const sideA = new THREE.MeshPhysicalMaterial({ ...vinylBase });
  const sideB = new THREE.MeshPhysicalMaterial({ ...vinylBase });
  const rimMat = new THREE.MeshPhysicalMaterial({ ...vinylBase, roughness: 0.22, anisotropy: 0 });
  const vinylMats = [sideA, sideB, rimMat];

  const labelA = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
  const labelB = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.8, side: THREE.BackSide });

  // Picture disc: the print is matte, so the cover keeps its colours; the grooves
  // and the clear coat over it carry all the shine.
  const picBase = {
    metalness: 0, roughness: 1, specularIntensity: 0.75, anisotropy: 1,
    clearcoat: 0.25, clearcoatRoughness: 0.07,
  };
  const picA = new THREE.MeshPhysicalMaterial({ ...picBase });
  const picB = new THREE.MeshPhysicalMaterial({ ...picBase });
  // the outer few millimetres of a picture disc are clear vinyl with no print
  // (on a transparent canvas there is nothing for transmission to see, so the rim is
  // plain see-through and the page behind it shows instead)
  const clearMat = new THREE.MeshPhysicalMaterial(transparent && lights === 'none'
    // unlit, a clear rim would vanish; a black one outlines the record and shows its thickness
    ? { color: 0x141210, metalness: 0, roughness: 1 }
    : transparent
    ? { color: 0xffffff, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.32, depthWrite: false }
    : { color: 0xffffff, metalness: 0, roughness: 0.1, transmission: 1, thickness: 0.02, ior: 1.5 });

  // ---------- geometry ----------
  // Playing surfaces: rings whose UVs run round the record (u) and out from the
  // label (v), so the groove textures are just horizontal stripes and the
  // tangent follows the grooves, which is the direction the anisotropy needs.
  function surface(rIn, rOut, segs = 256) {
    const g = new THREE.RingGeometry(rIn, rOut, segs, 1);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (i % (segs + 1)) / segs, Math.floor(i / (segs + 1)));
    return g;
  }
  const playA = new THREE.Mesh(surface(LABEL_R, RIM_IN), sideA);
  playA.position.z = T;
  const playB = new THREE.Mesh(surface(LABEL_R, RIM_IN), sideB);
  playB.rotation.x = Math.PI;
  playB.position.z = -T;

  // The rim: a rounded bead a little proud of the playing surface, as on a real LP.
  const rimProfile = [
    [RIM_IN, -T], [0.975, -T * 1.18], [0.987, -T * 1.26], [0.995, -T * 1.05], [0.9995, -T * 0.5],
    [1, 0],
    [0.9995, T * 0.5], [0.995, T * 1.05], [0.987, T * 1.26], [0.975, T * 1.18], [RIM_IN, T],
  ].map(([r, z]) => new THREE.Vector2(r, z));
  const rim = new THREE.Mesh(new THREE.LatheGeometry(rimProfile, 256), rimMat);
  rim.rotation.x = Math.PI / 2;

  const labTop = new THREE.Mesh(new THREE.RingGeometry(HOLE_R, LABEL_R, 128, 1), labelA);
  labTop.position.z = T;
  const labBot = new THREE.Mesh(new THREE.RingGeometry(HOLE_R, LABEL_R, 128, 1), labelB);
  labBot.rotation.x = Math.PI;
  labBot.position.z = -T;
  // the label edge, seen side-on between the two faces
  const labEdge = new THREE.Mesh(new THREE.CylinderGeometry(LABEL_R, LABEL_R, 2 * T, 128, 1, true), rimMat);
  labEdge.rotation.x = Math.PI / 2;
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(HOLE_R, HOLE_R, 2 * T, 32, 1, true), holeMat);
  hole.rotation.x = Math.PI / 2;

  const colourParts = new THREE.Group();
  colourParts.add(playA, playB, rim, labTop, labBot, labEdge);

  // Picture disc faces run right in to the spindle hole. Two UV sets: uv (round
  // and out) for the grooves, as above, and uv1 laid flat for the printed cover,
  // which fills the disc up to the clear rim (its corners fall off the record).
  function printedSurface(rIn, rOut) {
    const g = surface(rIn, rOut);
    const pos = g.attributes.position;
    const uv1 = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv1[i * 2] = 0.5 + pos.getX(i) / (2 * RIM_IN);
      uv1[i * 2 + 1] = 0.5 + pos.getY(i) / (2 * RIM_IN);
    }
    g.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    return g;
  }
  const faceA = new THREE.Mesh(printedSurface(HOLE_R, RIM_IN), picA);
  faceA.position.z = T;
  const faceB = new THREE.Mesh(printedSurface(HOLE_R, RIM_IN), picB);
  faceB.rotation.x = Math.PI;
  faceB.position.z = -T;
  const clearRim = new THREE.Mesh(rim.geometry, clearMat);
  clearRim.rotation.x = Math.PI / 2;
  const pictureParts = new THREE.Group();
  pictureParts.add(faceA, faceB, clearRim);

  spin.add(colourParts, pictureParts, hole);
  spin.visible = false; // until the first cover has loaded, so no blank white disc flashes up
  function setStyle(s) {
    style = s;
    colourParts.visible = s === 'colour';
    pictureParts.visible = s === 'picture';
  }
  setStyle(style);

  // ---------- groove textures ----------
  // One row per radius step. Grooves: a fine ripple in the normal and full
  // anisotropy. Gaps between tracks, the lead-in and the run-out round the label
  // are smooth and glossy, which is how you can count the songs on a real record.
  function grooveTextures(durations, rIn) {
    const total = durations.reduce((a, b) => a + b, 0) || SIDE_FULL * 0.8;
    const inner = GROOVE_OUT - Math.min(1, total / SIDE_FULL) * (GROOVE_OUT - GROOVE_MIN);
    const gaps = [];
    let t = 0;
    for (const d of durations.slice(0, -1)) { t += d; gaps.push(GROOVE_OUT - (t / total) * (GROOVE_OUT - inner)); }
    const bandRough = durations.map(() => 0.2 + Math.random() * 0.08); // each track's loudness varies its sheen
    const GAP_HALF = 0.0035;

    const W = 4;
    const nrm = new Uint8Array(W * ROWS * 4), rgh = new Uint8Array(W * ROWS * 4), ani = new Uint8Array(W * ROWS * 4);
    for (let row = 0; row < ROWS; row++) {
      const r = rIn + ((row + 0.5) / ROWS) * (RIM_IN - rIn);
      const inGrooves = r > inner && r < GROOVE_OUT;
      const inGap = gaps.some(g => Math.abs(r - g) < GAP_HALF);
      const grooved = inGrooves && !inGap;
      let band = 0;
      for (const g of gaps) if (r < g) band++;
      // ripple across the groove walls, tilting the normal in and out
      const s = grooved ? Math.sin((row / 3.2) * Math.PI * 2) * 0.28 : 0;
      const len = Math.hypot(s, 1);
      const rough = grooved ? bandRough[Math.min(band, bandRough.length - 1)] : 0.1;
      const aniso = grooved ? 1 : 0.15;
      for (let x = 0; x < W; x++) {
        const i = (row * W + x) * 4;
        nrm[i] = 128; nrm[i + 1] = Math.round((s / len * 0.5 + 0.5) * 255); nrm[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255); nrm[i + 3] = 255;
        rgh[i] = 255; rgh[i + 1] = Math.round(rough * 255); rgh[i + 2] = 255; rgh[i + 3] = 255;
        ani[i] = 255; ani[i + 1] = 128; ani[i + 2] = Math.round(aniso * 255); ani[i + 3] = 255;
      }
    }
    const tex = data => {
      const t = new THREE.DataTexture(data, W, ROWS, THREE.RGBAFormat);
      t.wrapS = THREE.RepeatWrapping;
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
      return t;
    };
    return { normalMap: tex(nrm), roughnessMap: tex(rgh), anisotropyMap: tex(ani) };
  }

  function applyGrooves(mat, durations, rIn) {
    for (const k of ['normalMap', 'roughnessMap', 'anisotropyMap']) mat[k]?.dispose();
    Object.assign(mat, grooveTextures(durations, rIn));
    mat.normalScale.set(1, 1);
    mat.needsUpdate = true;
  }

  function labelTexture(img, mirror) {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const ctx = c.getContext('2d');
    if (mirror) { ctx.translate(1024, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, 0, 0, 1024, 1024);
    // a faint printed edge where the paper label meets the vinyl
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(20,18,16,.35)';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(512, 512, 509, 0, Math.PI * 2); ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  }

  // ---------- product ----------
  let current = null;
  async function setProduct(product, imageUrl) {
    const img = new Image();
    img.src = imageUrl;
    await img.decode();
    current = product;

    const color = vinylColour(img);
    // the colour comes mostly from light passing through (attenuation); the surface
    // tint is a lighter version so the highlights stay bright and glassy
    const surfaceTint = color.clone().lerp(new THREE.Color(0xffffff), 0.2);
    for (const m of vinylMats) { m.color.copy(surfaceTint); m.attenuationColor.copy(color); }

    for (const m of [labelA, labelB]) m.map?.dispose();
    labelA.map = labelTexture(img, false);
    labelB.map = labelTexture(img, false);
    labelA.needsUpdate = labelB.needsUpdate = true;

    const secs = (product.tracklist || []).map(t => toSeconds(t.duration)).filter(Boolean);
    const half = Math.ceil(secs.length / 2);
    const a = secs.length ? secs.slice(0, half) : fakeSide();
    const b = secs.length > 1 ? secs.slice(half) : fakeSide();
    applyGrooves(sideA, a, LABEL_R);
    applyGrooves(sideB, b, LABEL_R);
    applyGrooves(picA, a, HOLE_R);
    applyGrooves(picB, b, HOLE_R);

    picA.map?.dispose();
    const print = new THREE.Texture(img);
    print.colorSpace = THREE.SRGBColorSpace;
    print.channel = 1;
    print.anisotropy = maxAniso;
    print.needsUpdate = true;
    picA.map = picB.map = print;
    picA.needsUpdate = picB.needsUpdate = true;
    spin.visible = true;
    return { color: '#' + color.getHexString() };
  }

  // ---------- interaction ----------
  let dragging = false, last = null, vel = { x: 0, y: 0 }, spinning = false, spinRate = 0;
  let releasedAt = 0, dragEnabled = true;
  // while it rests, it leans a little toward the pointer
  const hover = { x: 0, y: 0 };
  if (hoverTilt) addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    hover.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width * 0.75)));
    hover.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height * 0.75)));
  });
  const DRAG_K = 0.0085;

  function turnBy(dx, dy) {
    const angle = Math.hypot(dx, dy) * DRAG_K;
    if (!angle) return;
    const axis = new THREE.Vector3(dy, dx, 0).normalize();
    tilt.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
  }

  const grip = dragTarget;
  grip.style.touchAction = 'none';
  grip.style.cursor = 'grab';
  grip.addEventListener('pointerdown', e => {
    if (!dragEnabled) return;
    dragging = true; settled = false; releasedAt = 0;
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel = { x: 0, y: 0 };
    grip.setPointerCapture(e.pointerId);
    grip.style.cursor = 'grabbing';
  });
  grip.addEventListener('pointermove', e => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - last.x, dy = e.clientY - last.y, dt = Math.max(1, now - last.t);
    turnBy(dx, dy);
    vel = { x: dx / dt * 16.7, y: dy / dt * 16.7 }; // px per frame
    last = { x: e.clientX, y: e.clientY, t: now };
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    grip.style.cursor = dragEnabled ? 'grab' : '';
    releasedAt = performance.now();
    if (reduceMotion || performance.now() - last.t > 80) vel = { x: 0, y: 0 };
  };
  grip.addEventListener('pointerup', release);
  grip.addEventListener('pointercancel', release);
  function setDragEnabled(on) {
    dragEnabled = on;
    grip.style.cursor = on ? 'grab' : '';
    if (!on) { release(); vel = { x: 0, y: 0 }; }
  }

  function resetView() {
    vel = { x: 0, y: 0 };
    releasedAt = 0;
    settled = true;
  }
  function setSpinning(on) { spinning = on; }

  // ---------- loop ----------
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const RPM = 33 + 1 / 3;
  let prev = performance.now(), active = true;
  const goal = new THREE.Quaternion();
  renderer.setAnimationLoop(now => {
    if (!active || !canvas.clientWidth) { prev = now; return; } // nothing to draw while hidden
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (!dragging && (vel.x || vel.y)) {
      turnBy(vel.x, vel.y);
      const k = Math.exp(-dt * (springBack ? 4 : 2.6));
      vel.x *= k; vel.y *= k;
      if (Math.hypot(vel.x, vel.y) < 0.02) vel = { x: 0, y: 0 };
    }
    // let go and, once it has coasted to a stop, it turns back to its resting pose
    if (springBack && releasedAt && !dragging && !settled && !vel.x && !vel.y && now - releasedAt > 450) resetView();
    if (settled && !dragging) {
      const lean = hoverTilt && dragEnabled && !reduceMotion
        ? new THREE.Quaternion().setFromEuler(new THREE.Euler(hover.y * hoverTilt, hover.x * hoverTilt, 0))
        : new THREE.Quaternion();
      goal.copy(lean).multiply(restPose);
      if (reduceMotion) tilt.quaternion.copy(goal);
      else tilt.quaternion.slerp(goal, 1 - Math.exp(-dt * 4.5));
    }
    // ease up to and down from 33⅓, like a platter; clockwise seen from above
    const target = spinning ? (RPM / 60) * Math.PI * 2 : 0;
    spinRate += (target - spinRate) * Math.min(1, dt * (reduceMotion ? 60 : 2.2));
    spin.rotation.z -= spinRate * dt;
    renderer.render(scene, camera);
  });

  return {
    setProduct, setSpinning, resetView, setStyle, setDragEnabled, setPose,
    setActive(on) { active = on; },
    get style() { return style; },
    get product() { return current; },
    dispose() { renderer.setAnimationLoop(null); ro.disconnect(); renderer.dispose(); pmrem.dispose(); },
  };
}

// ---------- helpers ----------

function toSeconds(d) {
  if (!d) return 0;
  const p = String(d).split(':').map(Number);
  return p.reduce((a, n) => a * 60 + (n || 0), 0);
}

function fakeSide() {
  return Array.from({ length: 5 }, () => 150 + Math.random() * 150);
}

// The vinyl's colour: the cover's most vivid hue, weighted by how much of the
// cover it covers. Covers with no real colour get a smoky translucent grey
// rather than black.
function vinylColour(img) {
  const N = 48;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, N, N);
  const px = ctx.getImageData(0, 0, N, N).data;
  const BUCKETS = 24;
  const bins = Array.from({ length: BUCKETS }, () => ({ w: 0, s: 0, l: 0, hx: 0, hy: 0 }));
  const hsl = {};
  const tmp = new THREE.Color();
  let total = 0;
  for (let i = 0; i < px.length; i += 4) {
    tmp.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, THREE.SRGBColorSpace).getHSL(hsl, THREE.SRGBColorSpace);
    if (hsl.s < 0.22 || hsl.l < 0.1 || hsl.l > 0.92) continue;
    const w = hsl.s * hsl.s * (1 - Math.abs(hsl.l - 0.5) * 1.3);
    const b = bins[Math.floor(hsl.h * BUCKETS) % BUCKETS];
    b.w += w; b.s += hsl.s * w; b.l += hsl.l * w;
    b.hx += Math.cos(hsl.h * Math.PI * 2) * w; b.hy += Math.sin(hsl.h * Math.PI * 2) * w;
    total += w;
  }
  // smooth across neighbouring buckets so a hue split over two bins still wins
  let best = null, bestW = 0;
  bins.forEach((b, i) => {
    const w = b.w + 0.5 * (bins[(i + 1) % BUCKETS].w + bins[(i + BUCKETS - 1) % BUCKETS].w);
    if (w > bestW) { bestW = w; best = b; }
  });
  if (!best || best.w < N * N * 0.004) return new THREE.Color().setHSL(0.08, 0.06, 0.32, THREE.SRGBColorSpace);
  const h = ((Math.atan2(best.hy, best.hx) / (Math.PI * 2)) + 1) % 1;
  const s = Math.min(0.85, Math.max(0.5, best.s / best.w));
  const l = Math.min(0.5, Math.max(0.3, best.l / best.w));
  return new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace);
}
