import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'
import { getProducts, getGenres } from './productService.js'
import { addBtnListeners, updateCartIcon } from './cartService.js'
gsap.registerPlugin(ScrollTrigger)

// ===== Editorial — browse CTA =====
document.getElementById('browse-btn').addEventListener('click', () => {
  document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' })
})

// ===== Auth =====
document.getElementById('logout-btn').addEventListener('click', logout)

// ===== Genre colours =====
const GENRE_COLORS = {
  rock: '#2a1a12', indie: '#0d1520', ambient: '#0d1810',
  folk: '#180d18', punk: '#1a0808', jazz: '#0a0a1e',
  electronic: '#060f18', soul: '#3d1a00', classical: '#222218',
  pop: '#1a0a18', metal: '#0a0a0a', blues: '#0a100a',
}
function genreColor(g) { return GENRE_COLORS[g.toLowerCase()] || '#1C1C1C' }
// ===== Genre Scatter =====
// Layout copied from pic2: varied sizes, lots of cream space, no overlap
// All values are % of container — converted to px after render
function buildGenreScatter(genres, allProducts,carouselIds = new Set()) {
  const wrap = document.getElementById('genre-scatter')
  if (!wrap) return

  const layout = [
    [  6, 140, 22, 400],
    [ 30,  30, 40, 140],
    [ 40, 240, 18, 220],
    [ 68, 340, 18, 220],
    [ 32, 510, 32, 160],
  ]

  const W = wrap.offsetWidth

  genres.slice(0, layout.length).forEach((genre, i) => {
    const [lp, tp_px, wp, hp_px] = layout[i]

    const album = 
  allProducts.find(p => p.genre.toLowerCase() === genre.toLowerCase() && !carouselIds.has(p.id))
  || allProducts.find(p => p.genre.toLowerCase() === genre.toLowerCase())

    const bgImage = album ? `url('./images/${album.image}')` : 'none'

    const el = document.createElement('div')
    el.className = 'genre-block'
    el.dataset.genre = genre
    el.style.cssText = `
  position: absolute;
  left: ${(lp/100)*W}px;
  top: ${tp_px}px;
  width: ${(wp/100)*W}px;
  height: ${hp_px}px;
  background-color: ${genreColor(genre)};
  background-image: ${bgImage};
  background-size: cover;
  background-position: center;
  cursor: pointer;
  overflow: hidden;
  opacity: 0;
`


    el.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.35);"></div>
      <span style="position:absolute;top:10px;right:12px;font-size:0.7rem;color:rgba(255,255,255,0.6);">↗</span>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 14px;">
        <div style="font-size:0.85rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.05em;">${genre}</div>
      </div>
    `
    el.addEventListener('mouseenter', () => { gsap.to(el, { opacity: 0.8, duration: 0.2 }) })
el.addEventListener('mouseleave', () => { gsap.to(el, { opacity: 1, duration: 0.2 }) })
    el.addEventListener('click', () => showGenreProducts(genre))
    wrap.appendChild(el)
  })

  // Vinyl decoration
  const vinyl = document.createElement('div')
  vinyl.style.cssText = `
    position: absolute;
    left: ${0.72 * W}px;
    top: 140px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: repeating-radial-gradient(
      circle at center,
      #080808 0px, #080808 2px,
      #141414 2px, #1a1a1a 4px
    );
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  `
  const label = document.createElement('div')
  label.style.cssText = `
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--color-bg);
    display: flex;
    align-items: center;
    justify-content: center;
  `
  const dot = document.createElement('div')
  dot.style.cssText = `
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #999;
  `
  label.appendChild(dot)
  vinyl.appendChild(label)
  wrap.appendChild(vinyl)

}

// ===== Show products for a genre =====
async function showGenreProducts(genre) {
  document.getElementById('genre-view').style.display = 'none'
  const plv = document.getElementById('product-list-view')
  plv.style.display = 'block'
  document.getElementById('genre-back-name').textContent = genre

  const products = await getProducts({ genre })
  const container = document.getElementById('products-container')
  container.innerHTML = ''

  // Wrapper: block layout, no flex overlap
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'display:block;width:100%;'

  // Genre title row
  const title = document.createElement('div')
 title.style.cssText = 'display:block;width:100%;padding:1.2rem 1.5rem;border-bottom:2px solid #1C1C1C;box-sizing:border-box;'
  title.innerHTML = `<span style="font-family:var(--font-heading);font-size:clamp(2rem,5vw,4.5rem);font-weight:900;color:#1C1C1C;text-transform:uppercase;letter-spacing:-0.03em;display:block;">${genre}</span>`
  wrapper.appendChild(title)

  if (!products.length) {
    const empty = document.createElement('p')
    empty.style.cssText = 'padding:2rem;color:#8A7F72;font-size:0.85rem;text-transform:uppercase;display:block;'
    empty.textContent = 'No records found.'
    wrapper.appendChild(empty)
    container.appendChild(wrapper)
    return
  }

  // Grid row — completely separate from title
  const gridWrap = document.createElement('div')
  gridWrap.style.cssText = 'display:block;width:100%;box-sizing:border-box;'

  const grid = document.createElement('div')
  grid.style.cssText = [
    'display:grid',
'grid-template-columns:repeat(4,minmax(0,1fr))',
'width:100%',
'box-sizing:border-box',
'border-left:1px solid #D4C9B8',
'border-top:1px solid #D4C9B8',
'margin:0',
'padding:0',
  ].join(';')

  products.forEach(album => {
    const card = document.createElement('div')
    card.style.cssText = [
      'border-right:1px solid #D4C9B8',
      'border-bottom:1px solid #D4C9B8',
      'background:#F7F3EC',
      'display:flex',
      'flex-direction:column',
      'min-width:0',
      'overflow:hidden',
    ].join(';')

    const img = document.createElement('img')
    img.src = `./images/${album.image}`
    img.alt = album.title
    img.loading = 'lazy'
    img.style.cssText = 'width:100%;aspect-ratio:3/2;object-fit:cover;display:block;border-bottom:2px solid #1C1C1C;'

    const link = document.createElement('a')
    link.href = `/detail.html?id=${album.id}`
    link.style.cssText = 'display:block;overflow:hidden;'
    link.appendChild(img)

    const body = document.createElement('div')
    body.style.cssText = 'padding:0.6rem 0.8rem 0.9rem;display:flex;flex-direction:column;flex:1;'
    body.innerHTML = `
      <div style="font-size:0.75rem;font-weight:700;color:#1C1C1C;text-transform:uppercase;letter-spacing:-0.01em;">${album.title}</div>
      <div style="font-size:0.65rem;color:#C0392B;margin-top:2px;">${album.artist}</div>
      <div style="font-size:0.72rem;font-weight:700;color:#1C1C1C;margin-top:3px;">$${Number(album.price).toFixed(2)}</div>
    `

    const btn = document.createElement('button')
    btn.className = 'main-btn add-btn'
    btn.dataset.id = album.id
    btn.style.cssText = 'margin-top:auto;padding:0.45rem 0;font-size:0.6rem;'
    btn.textContent = 'Add to Cart'

    body.appendChild(btn)
    card.appendChild(link)
    card.appendChild(body)
    grid.appendChild(card)
  })

  gridWrap.appendChild(grid)
  wrapper.appendChild(gridWrap)
  container.appendChild(wrapper)
  addBtnListeners()
}

// ===== Back to genre scatter =====
document.getElementById('genre-back-bar').addEventListener('click', () => {
  document.getElementById('product-list-view').style.display = 'none'
  document.getElementById('genre-view').style.display = 'block'
})

// ===== Vinyl Carousel =====
let carouselProducts = []
let carouselIndex = 0
let carouselAnimating = false

function updateCarousel(dir) {
  if (carouselAnimating || !carouselProducts.length) return
  carouselAnimating = true

  const disc  = document.getElementById('vinyl-disc')
  const cover = document.getElementById('vinyl-cover')
  const info  = document.getElementById('vinyl-info')
  const bg    = document.getElementById('hero-bg')

  disc.classList.remove('anim-disc','anim-disc-rev')
  cover.classList.remove('anim-cover','anim-cover-rev')
  info.classList.remove('anim-info')
  void disc.offsetWidth

  const album = carouselProducts[carouselIndex]
  document.getElementById('vinyl-genre').textContent  = album.genre
  document.getElementById('vinyl-title').textContent  = album.title
  document.getElementById('vinyl-artist').textContent = album.artist
  cover.src = `./images/${album.image}`
  cover.alt = album.title
  bg.style.backgroundImage = `url('./images/${album.image}')`
  bg.style.backgroundSize = 'cover'
  bg.style.backgroundPosition = 'center'

  const fwd = dir >= 0
  disc.classList.add(fwd  ? 'anim-disc'  : 'anim-disc-rev')
  cover.classList.add(fwd ? 'anim-cover' : 'anim-cover-rev')
  info.classList.add('anim-info')
  setTimeout(() => { carouselAnimating = false }, 650)
}

function carouselNext() {
  carouselIndex = (carouselIndex + 1) % carouselProducts.length
  updateCarousel(1)
}
function carouselPrev() {
  carouselIndex = (carouselIndex - 1 + carouselProducts.length) % carouselProducts.length
  updateCarousel(-1)
}

let autoRotate = setInterval(carouselNext, 4000)

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { clearInterval(autoRotate); carouselNext(); autoRotate = setInterval(carouselNext, 4000) }
  if (e.key === 'ArrowLeft')  { clearInterval(autoRotate); carouselPrev(); autoRotate = setInterval(carouselNext, 4000) }
})

document.getElementById('vinyl-cover').addEventListener('click', () => {
  if (!carouselProducts.length) return
  window.location.href = `/detail.html?id=${carouselProducts[carouselIndex].id}`
})
document.getElementById('vinyl-mockup').style.cursor = 'pointer'

// ===== Search =====
document.getElementById('search-input').addEventListener('input', async () => {
  const q = document.getElementById('search-input').value.trim()
  document.getElementById('genre-view').style.display = 'none'
  document.getElementById('product-list-view').style.display = 'block'
  document.getElementById('genre-back-name').textContent = `"${q}"`
  const products = q ? await getProducts({ search: q }) : []
  const container = document.getElementById('products-container')
  container.innerHTML = ''
  if (!products.length) {
    container.innerHTML = '<p style="padding:2rem;color:var(--color-text-muted);font-size:0.85rem;text-transform:uppercase;">No results.</p>'
    return
  }
  await showGenreProducts('Search results')
})

document.querySelector('form[role="search"]').addEventListener('submit', e => e.preventDefault())

// ===== Hero Header — Card Deal Animation =====
function animateHeroHeader(allProducts) {
  const hero    = document.getElementById('hero-section')
  const heroBg  = document.getElementById('hero-bg')
  const heroOv  = hero.querySelector('.hero-overlay')
  const heroStg = hero.querySelector('.hero-stage')
  const siteHdr = hero.querySelector('.site-header')

  const W  = hero.offsetWidth
  const H  = hero.offsetHeight || window.innerHeight
  const cx = W / 2
  const cy = H / 2

  const STRIP_H      = Math.round(H * 0.36)   // height of each image strip
  const DECK_CARD_W  = 110                     // deck card width (px)
  const DECK_CARD_H  = 140                     // deck card height (px)
  const STRIP_CARD_W = Math.round(W / 7.5)     // each card width inside strip

  // ── Hide existing hero content ──────────────────────────────────────────
  hero.style.background = '#000'
  gsap.set([heroBg, heroOv, heroStg], { autoAlpha: 0 })
  gsap.set(siteHdr, { autoAlpha: 0 })

  // ── Inject animation styles ─────────────────────────────────────────────
  if (!document.getElementById('hero-anim-styles')) {
    const s = document.createElement('style')
    s.id = 'hero-anim-styles'
    s.textContent = `
      @keyframes heroStripLeft  { from { transform: translateX(0) }    to { transform: translateX(-50%) } }
      @keyframes heroStripRight { from { transform: translateX(-50%) } to { transform: translateX(0) }    }
      .hero-track-left  { animation: heroStripLeft  22s linear infinite; }
      .hero-track-right { animation: heroStripRight 22s linear infinite; }
      .site-header.anim-centered {
        position:   absolute !important;
        top:        ${STRIP_H}px !important;
        left:       0 !important;
        right:      0 !important;
        height:     ${H - STRIP_H * 2}px !important;
        display:    flex !important;
        align-items: center !important;
      }
    `
    document.head.appendChild(s)
  }

  // ── Build a strip row ───────────────────────────────────────────────────
  function buildStrip(products) {
    const wrap  = document.createElement('div')
    const track = document.createElement('div')
    wrap.style.cssText  = `position:absolute;left:0;right:0;height:${STRIP_H}px;overflow:hidden;opacity:0;z-index:2;pointer-events:none;`
    track.style.cssText = `display:flex;gap:3px;width:max-content;`
    // Duplicate for seamless loop
    ;[...products, ...products].forEach(p => {
      const c = document.createElement('div')
      c.style.cssText = `width:${STRIP_CARD_W}px;height:${STRIP_H}px;flex-shrink:0;` +
        `background:url('./images/${p.image}') center/cover no-repeat;`
      track.appendChild(c)
    })
    wrap.appendChild(track)
    return { wrap, track }
  }

  // Shuffle products and split into pools.
  // pickFrom wraps with modulo so small catalogs always fill every slot.
  const shuffled = [...allProducts].sort(() => Math.random() - 0.5)
  const pickFrom = (arr, n, start = 0) =>
    Array.from({ length: n }, (_, i) => arr[(start + i) % arr.length])
  const deckPool = pickFrom(shuffled, 6)
  const topPool  = pickFrom(shuffled, 14, 6)
  const botPool  = pickFrom(shuffled, 14, 20)

  const topStrip = buildStrip(topPool)
  const botStrip = buildStrip(botPool)

  topStrip.wrap.style.top    = '0'
  botStrip.wrap.style.bottom = '0'
  hero.appendChild(topStrip.wrap)
  hero.appendChild(botStrip.wrap)

  // ── Build deck of 6 cards ───────────────────────────────────────────────
  // Deals alternate top / bottom, 3 to each strip
  const DEALS = [
    { dest: 'top',    pos: 0, img: deckPool[0]?.image },
    { dest: 'bottom', pos: 0, img: deckPool[1]?.image },
    { dest: 'top',    pos: 1, img: deckPool[2]?.image },
    { dest: 'bottom', pos: 1, img: deckPool[3]?.image },
    { dest: 'top',    pos: 2, img: deckPool[4]?.image },
    { dest: 'bottom', pos: 2, img: deckPool[5]?.image },
  ]

  // Visual stack offsets — each card slightly shifted so the pile is visible
  const STACK_OFFSETS = [
    { dx:  0, dy: 0, rot: -1.5 },
    { dx:  2, dy: 2, rot:  2.0 },
    { dx: -3, dy: 3, rot: -3.0 },
    { dx:  4, dy: 5, rot:  3.5 },
    { dx: -4, dy: 6, rot: -4.0 },
    { dx:  5, dy: 8, rot:  4.5 },
  ]

  const deckLayer = document.createElement('div')
  deckLayer.style.cssText = 'position:absolute;inset:0;z-index:10;pointer-events:none;'
  hero.appendChild(deckLayer)

  // Append deepest card first so the top card renders in front
  const cardEls = [...DEALS].reverse().map((d, ri) => {
    const i   = DEALS.length - 1 - ri
    const off = STACK_OFFSETS[i]
    const el  = document.createElement('div')
    el.style.cssText = [
      'position:absolute',
      `width:${DECK_CARD_W}px`,
      `height:${DECK_CARD_H}px`,
      `left:${cx - DECK_CARD_W / 2}px`,
      `top:${cy - DECK_CARD_H / 2}px`,
      'border-radius:10px',
      `z-index:${i + 1}`,
      d.img
        ? `background:url('./images/${d.img}') center/cover no-repeat`
        : `background:#1a1a2e`,
    ].join(';')
    gsap.set(el, { x: off.dx, y: off.dy, rotation: off.rot })
    deckLayer.appendChild(el)
    return { el, d }
  }).reverse() // restore deal order

  // ── GSAP deal timeline ──────────────────────────────────────────────────
  // 3 landing columns spread evenly across the strip width
  const dealXs = [W * 0.05, W * 0.38, W * 0.71]
  const startL = cx - DECK_CARD_W / 2
  const startT = cy - DECK_CARD_H / 2

  const tl = gsap.timeline({ delay: 0.5 })

  DEALS.forEach((d, i) => {
    const { el } = cardEls[i]
    const isTop  = d.dest === 'top'

    tl.to(el, {
      x:            dealXs[d.pos] - startL,
      y:            (isTop ? 0 : H - STRIP_H) - startT,
      width:        STRIP_CARD_W,
      height:       STRIP_H,
      rotation:     0,
      borderRadius: 0,
      duration:     0.32,
      ease:         'power3.out',
    }, i * 0.18)  // 0.18 s stagger between each deal
  })

  // ── Reveal phase — strips + header ──────────────────────────────────────
  const endT = (DEALS.length - 1) * 0.18 + 0.38

  tl.call(() => {
    // Fade in full looping strips
    gsap.to([topStrip.wrap, botStrip.wrap], { opacity: 1, duration: 0.25 })

    // Fade out and remove the individual deal cards
    gsap.to(cardEls.map(c => c.el), {
      opacity: 0, duration: 0.2,
      onComplete: () => deckLayer.remove(),
    })

    // Start CSS scroll animations
    topStrip.track.classList.add('hero-track-left')
    botStrip.track.classList.add('hero-track-right')

    // Move site-header into the center gap and fade it in
    siteHdr.classList.add('anim-centered')
    gsap.to(siteHdr, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' })
  }, [], endT)
}

// ===== Init =====
async function init() {
  const name = await checkAuth()
  renderGreeting(name)
  showHideMenuItems(name)
  if (name) await updateCartIcon()

  const genres = await getGenres()
  const all    = await getProducts()

  // Hero header card-deal animation (replaces vinyl carousel)
  animateHeroHeader(all)

  // Genre scatter section (kept as-is)
  buildGenreScatter(genres, all)
  addBtnListeners()

  // Genre scatter — animate in when it actually enters the viewport
  ScrollTrigger.create({
    trigger: '#genre-scatter',
    start: 'top 80%',
    once: true,
    onEnter: () => {
      document.querySelectorAll('#genre-scatter .genre-block').forEach((el, i) => {
        const fromX = i % 2 === 0 ? -60 : 60
        gsap.fromTo(el,
          { opacity: 0, x: fromX, scale: 0.85 },
          { opacity: 1, x: 0, scale: 1, duration: 0.8, delay: i * 0.15, ease: 'back.out(1.4)' }
        )
      })
    }
  })

  // Editorial section — scroll-linked scrub, option B: lines alternate left / right
  const edTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#editorial-section',
      start: 'top 60%',
      end: 'center 40%',
      scrub: 1.2,
    }
  })

  const lines = document.querySelectorAll('.ed-line')

  edTl
    // Eyebrow fades in from above
    .fromTo('.editorial-eyebrow',
      { opacity: 0, y: -16 },
      { opacity: 1, y: 0,  duration: 1, ease: 'power2.out' },
      0
    )
    // Line 1 — drops from above
    .fromTo(lines[0],
      { opacity: 0, y: -70 },
      { opacity: 1, y: 0,  duration: 1, ease: 'power3.out' },
      0.6
    )
    // Line 2 — drops from above
    .fromTo(lines[1],
      { opacity: 0, y: -70 },
      { opacity: 1, y: 0,  duration: 1, ease: 'power3.out' },
      1.0
    )
    // Line 3 (red) — drops from above
    .fromTo(lines[2],
      { opacity: 0, y: -70 },
      { opacity: 1, y: 0,  duration: 1, ease: 'power3.out' },
      1.4
    )
    // CTA fades up
    .fromTo('.editorial-cta',
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0,  duration: 1, ease: 'power2.out' },
      2.0
    )
    // Bottom bar — tip from left, hint from right
    .fromTo('.editorial-tip',
      { opacity: 0, x: -14 },
      { opacity: 1, x: 0,  duration: 0.8, ease: 'power2.out' },
      2.5
    )
    .fromTo('.editorial-scroll-hint',
      { opacity: 0, x: 14 },
      { opacity: 1, x: 0,  duration: 0.8, ease: 'power2.out' },
      2.5
    )
}

init()