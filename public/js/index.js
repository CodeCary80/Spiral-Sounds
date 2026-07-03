import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'
import { getProducts, getGenres } from './productService.js'
import { addBtnListeners, updateCartIcon } from './cartService.js'
gsap.registerPlugin(ScrollTrigger)




// ===== Client Stories — 3-card slider, fade+slide transition =====
// No separate "wipe" overlay element — that was a full-bleed panel positioned independently
// of the card (a whole extra element whose bounding box had to be kept in sync with the card's
// own, and drifted out of sync more than once). This animates the .story cards' own
// transform/opacity directly instead, so the transition is *structurally* incapable of covering
// anything beyond the card — there's nothing else for it to reach.
;(function () {
  const TOTAL = 3
  let cur = 0
  let going = false

  function updateCounter(n) {
    const el = document.getElementById('stories-counter')
    if (el) el.innerHTML = `<b>${String(n + 1).padStart(2, '0')}</b> / 0${TOTAL}`
  }

  function goTo(idx, dir) {
    if (going || idx === cur) return
    going = true
    const out = document.getElementById(`story-${cur}`)
    const inn = document.getElementById(`story-${idx}`)

    const tl = gsap.timeline({ onComplete: () => going = false })
    // Outgoing card: fade + slide out in the direction of travel.
    tl.to(out, { autoAlpha: 0, x: dir > 0 ? -40 : 40, duration: 0.25, ease: 'power2.in' })
    tl.call(() => {
      out.classList.remove('story-active')
      out.style.transform = ''  // clear the inline x so it's not left offset next time it's shown
      inn.classList.add('story-active')
      cur = idx
      updateCounter(idx)
    })
    // Incoming card: enters from the opposite side, staggered cascade on its own contents
    // (photo/quote/meta each with a slight delay + Y offset) rather than mounting all at once.
    tl.fromTo(inn, { autoAlpha: 0, x: dir > 0 ? 40 : -40 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out' })
    tl.fromTo(inn.querySelector('.story-photo'),
      { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }, '-=0.3')
    tl.fromTo(inn.querySelector('.story-quote'),
      { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power3.out' }, '-=0.25')
    tl.fromTo(inn.querySelector('.story-meta'),
      { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power3.out' }, '-=0.3')
  }

  // Click to advance
  const wrap = document.getElementById('stories-wrap')
  if (wrap) {
    wrap.addEventListener('click', () => goTo((cur + 1) % TOTAL, 1))
  }
})()

// ===== Footer — scroll to top button =====
;(function () {
  const scrollTopBtn = document.getElementById('footer-scroll-top')
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }
})()

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
function buildGenreScatter(genres, allProducts, carouselIds = new Set()) {
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
    el.addEventListener('click', () => openGenreOverlay(genre))
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
async function showGenreProducts(label, preloadedProducts = null) {
  document.getElementById('genre-view').style.display = 'none'
  const plv = document.getElementById('product-list-view')
  plv.style.display = 'block'
  document.getElementById('genre-back-name').textContent = label

  const products = preloadedProducts ?? await getProducts({ genre: label })
  const container = document.getElementById('products-container')
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'display:block;width:100%;'

  const title = document.createElement('div')
  title.style.cssText = 'display:block;width:100%;padding:1.2rem 1.5rem;border-bottom:2px solid #1C1C1C;box-sizing:border-box;'
  title.innerHTML = `<span style="font-family:var(--font-heading);font-size:clamp(2rem,5vw,4.5rem);font-weight:900;color:#1C1C1C;text-transform:uppercase;letter-spacing:-0.03em;display:block;">${label}</span>`
  wrapper.appendChild(title)

  if (!products.length) {
    const empty = document.createElement('p')
    empty.style.cssText = 'padding:2rem;color:#8A7F72;font-size:0.85rem;text-transform:uppercase;display:block;'
    empty.textContent = 'No records found.'
    wrapper.appendChild(empty)
    container.appendChild(wrapper)
    return
  }

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

// ===== Genre descriptions =====
const GENRE_DESC = {
  rock:       'Raw energy, distorted guitars, and records that hit hard. Music built to last.',
  indie:      'Off the beaten path. Handpicked artists who make music entirely on their own terms.',
  ambient:    'Atmospheric and immersive. Made for thinking, drifting, and deep listening.',
  folk:       'Acoustic tradition. Stories passed down through strings, voice, and time.',
  punk:       'Fast, loud, and deliberate. No polish — all conviction.',
  jazz:       'Improvisation and soul. The ongoing conversation between exceptional musicians.',
  electronic: 'Synthesised landscapes from studio to dance floor and everywhere between.',
  soul:       'Deep feeling and warm grooves. Music that moves the body and stirs the spirit.',
  classical:  'Centuries of composition. Timeless orchestral and chamber works on vinyl.',
  pop:        'Hooks, melodies, moments. Music crafted to stay with you long after it ends.',
  metal:      'Heavy, precise, and relentless. For listeners who want more from their records.',
  blues:      'The root of it all. Raw emotion poured over twelve honest bars.',
}

// Genres populated in init() — used to render the tab strip
let _allGenres = []

// Render / refresh the tab strip, marking activeGenre
function renderGenreTabs(activeGenre) {
  const tabs = document.getElementById('genre-page-tabs')
  if (!tabs || !_allGenres.length) return
  tabs.innerHTML = ''
  _allGenres.forEach(g => {
    const btn = document.createElement('button')
    btn.className = 'genre-tab-btn' + (g.toLowerCase() === activeGenre.toLowerCase() ? ' active' : '')
    btn.textContent = g
    btn.addEventListener('click', () => switchGenreContent(g))
    tabs.appendChild(btn)
    if (g.toLowerCase() === activeGenre.toLowerCase()) {
      requestAnimationFrame(() => btn.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }))
    }
  })
}

// Build product cards into an existing grid element
function buildProductCards(products, grid) {
  products.forEach(album => {
    const card = document.createElement('div')
    card.className = 'genre-card'

    const imgWrap = document.createElement('div')
    imgWrap.className = 'genre-card-img-wrap'
    const link = document.createElement('a')
    link.href = `/detail.html?id=${album.id}`
    const img = document.createElement('img')
    img.src = `./images/${album.image}`
    img.alt = album.title
    img.loading = 'lazy'
    link.appendChild(img)
    imgWrap.appendChild(link)

    const info = document.createElement('div')
    info.className = 'genre-card-info'
    info.innerHTML = `
      <div class="genre-card-title">${album.title}</div>
      <div class="genre-card-artist">${album.artist}</div>
      <div class="genre-card-price">$${Number(album.price).toFixed(2)}</div>
    `
    const btn = document.createElement('button')
    btn.className = 'genre-card-btn main-btn add-btn'
    btn.dataset.id = album.id
    btn.textContent = 'Add to Cart'
    info.appendChild(btn)

    card.appendChild(imgWrap)
    card.appendChild(info)
    grid.appendChild(card)
  })
}

// Render the body layout for a genre (shared by open + switch)
async function renderGenreBody(genre) {
  const body = document.getElementById('genre-page-body')
  const desc = GENRE_DESC[genre.toLowerCase()] || 'A curated selection of records chosen for their depth, craft, and lasting sound.'

  body.innerHTML = `
    <div class="genre-page-left">
      <div class="genre-page-big-name">${genre}</div>
      <p class="genre-page-desc">${desc}</p>
      <div class="genre-page-count" id="genre-page-count">Loading…</div>
    </div>
    <div class="genre-page-right">
      <div class="genre-page-grid" id="genre-page-grid"></div>
    </div>
  `

  const products = await getProducts({ genre })
  const countEl  = document.getElementById('genre-page-count')
  const grid     = document.getElementById('genre-page-grid')

  if (countEl) countEl.textContent = `${products.length} record${products.length !== 1 ? 's' : ''}`

  if (!products.length) {
    if (grid) grid.innerHTML = '<p style="padding:1rem;color:#8A7F72;font-size:0.8rem;text-transform:uppercase;grid-column:1/-1;">No records found.</p>'
    return
  }

  buildProductCards(products, grid)
  addBtnListeners()
}

// Tab click — update active tab + re-render body (no slide animation)
async function switchGenreContent(genre) {
  renderGenreTabs(genre)
  await renderGenreBody(genre)
}

// Genre block click — slide the overlay up then load content
async function openGenreOverlay(genre) {
  const page = document.getElementById('genre-page')

  renderGenreTabs(genre)

  // Build skeleton right away so the panel has content as it rises
  const desc = GENRE_DESC[genre.toLowerCase()] || 'A curated selection of records chosen for their depth, craft, and lasting sound.'
  document.getElementById('genre-page-body').innerHTML = `
    <div class="genre-page-left">
      <div class="genre-page-big-name">${genre}</div>
      <p class="genre-page-desc">${desc}</p>
      <div class="genre-page-count" id="genre-page-count">Loading…</div>
    </div>
    <div class="genre-page-right">
      <div class="genre-page-grid" id="genre-page-grid"></div>
    </div>
  `

  document.body.style.overflow = 'hidden'
  gsap.to(page, { y: '0%', duration: 0.45, ease: 'power4.out' })
  refreshCartSidebar() // show any pre-existing cart items

  const products = await getProducts({ genre })
  const countEl  = document.getElementById('genre-page-count')
  const grid     = document.getElementById('genre-page-grid')

  if (countEl) countEl.textContent = `${products.length} record${products.length !== 1 ? 's' : ''}`

  if (!products.length) {
    if (grid) grid.innerHTML = '<p style="padding:1rem;color:#8A7F72;font-size:0.8rem;text-transform:uppercase;grid-column:1/-1;">No records found.</p>'
    return
  }

  buildProductCards(products, grid)
  addBtnListeners()
}

// Search — slide the same overlay up, but show search results instead of a genre
async function openSearchOverlay(query, products) {
  const page = document.getElementById('genre-page')

  // No genre tabs for search results — clear them
  const tabs = document.getElementById('genre-page-tabs')
  if (tabs) tabs.innerHTML = ''

  document.getElementById('genre-page-body').innerHTML = `
    <div class="genre-page-left">
      <div class="genre-page-big-name">"${query}"</div>
      <p class="genre-page-desc">Search results for "${query}".</p>
      <div class="genre-page-count" id="genre-page-count">Loading…</div>
    </div>
    <div class="genre-page-right">
      <div class="genre-page-grid" id="genre-page-grid"></div>
    </div>
  `

  document.body.style.overflow = 'hidden'
  gsap.to(page, { y: '0%', duration: 0.45, ease: 'power4.out' })
  refreshCartSidebar()

  const countEl = document.getElementById('genre-page-count')
  const grid    = document.getElementById('genre-page-grid')

  if (countEl) countEl.textContent = `${products.length} record${products.length !== 1 ? 's' : ''}`

  if (!products.length) {
    if (grid) grid.innerHTML = '<p style="padding:1rem;color:#8A7F72;font-size:0.8rem;text-transform:uppercase;grid-column:1/-1;">No records found.</p>'
    return
  }

  buildProductCards(products, grid)
  addBtnListeners()
}

// Back button — slide the overlay back down, close cart sidebar
document.getElementById('genre-page-back').addEventListener('click', () => {
  const sidebar = document.getElementById('genre-cart-sidebar')
  if (sidebar) sidebar.classList.remove('open')
  gsap.to(document.getElementById('genre-page'), {
    y: '100%',
    duration: 0.38,
    ease: 'power3.in',
    onComplete: () => { document.body.style.overflow = ''}
  })
})

// ===== Genre overlay cart sidebar =====
async function refreshCartSidebar() {
  const sidebar = document.getElementById('genre-cart-sidebar')
  if (!sidebar) return

  try {
    const res = await fetch('/api/cart', { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    // Handle both {items:[]} and [] response shapes
    const items = Array.isArray(data) ? data : (data.items || data.cart || [])

    sidebar.classList.toggle('open', items.length > 0)
    if (!items.length) { sidebar.innerHTML = ''; return }

    const total   = items.reduce((s, i) => s + Number(i.price) * (i.quantity || 1), 0)
    const qty     = items.reduce((s, i) => s + (i.quantity || 1), 0)

    sidebar.innerHTML = `
      <div class="gcart-header">
        <span class="gcart-title">♦ Cart</span>
        <span class="gcart-count">${qty} item${qty !== 1 ? 's' : ''}</span>
      </div>
      <div class="gcart-items">
        ${items.map(it => `
          <div class="gcart-item">
            <img src="./images/${it.image}" alt="${it.title}" class="gcart-img">
            <div class="gcart-info">
              <div class="gcart-name">${it.title}</div>
              <div class="gcart-artist">${it.artist}</div>
              <div class="gcart-qty">$${Number(it.price).toFixed(2)} &times; ${it.quantity || 1}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="gcart-footer">
        <div class="gcart-total">
          <span class="gcart-total-label">Total</span>
          <span class="gcart-total-amount">$${total.toFixed(2)}</span>
        </div>
        <a href="/cart.html" class="gcart-checkout-btn">↳ &nbsp;View cart & checkout</a>
      </div>
    `
  } catch (e) {
    console.warn('Cart sidebar:', e)
  }
}

// Detect add-to-cart clicks inside the overlay and refresh the sidebar
// (delay 500ms to let cartService finish its API call first)
document.getElementById('genre-page').addEventListener('click', e => {
  if (e.target.closest('.add-btn')) {
    setTimeout(refreshCartSidebar, 500)
  }
})

// ===== Search =====
// ===== Search =====
async function runSearch() {
  const q = document.getElementById('search-input').value.trim()
  if (!q) return
  const products = await getProducts({ search: q })
  await openSearchOverlay(q, products)
}

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault()
    runSearch()
  }
})

document.querySelector('.search-arrow').addEventListener('click', runSearch)

document.querySelector('form[role="search"]').addEventListener('submit', e => e.preventDefault())

document.querySelector('form[role="search"]').addEventListener('submit', e => e.preventDefault())

// ===== Init =====
async function init() {
  const name = await checkAuth()
  renderGreeting(name)
  showHideMenuItems(name)
  if (name) await updateCartIcon()

  const genres = await getGenres()
  const all    = await getProducts()
  _allGenres = genres

  // Hero — static background image + centered tagline
  const heroBg = document.getElementById('hero-bg')
  if (heroBg && all.length) {
    heroBg.style.backgroundImage = `url('./images/${all[0].image}')`
    heroBg.style.backgroundSize = 'cover'
    heroBg.style.backgroundPosition = 'center'
  }
  gsap.set(['#hero-bg', '.hero-overlay', '.hero-stage', '#master-vinyl'], { autoAlpha: 1 })

  // Genre scatter
  buildGenreScatter(genres, all)
  addBtnListeners()

  // Genre scatter — scrub animation
  const scatterTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#genre-scatter',
      start: 'top 80%',
      end: 'top 10%',
      scrub: 1,
    }
  })
  document.querySelectorAll('#genre-scatter .genre-block').forEach((el, i) => {
    const fromX = i % 2 === 0 ? -60 : 60
    scatterTl.fromTo(el,
      { opacity: 0, x: fromX, scale: 0.85 },
      { opacity: 1, x: 0, scale: 1, duration: 0.8, ease: 'back.out(1.4)' },
      i * 0.12
    )
  })

  // Editorial section scrub
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
    .fromTo('.editorial-eyebrow',
      { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 0)
    .fromTo(lines[0],
      { opacity: 0, y: -70 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.6)
    .fromTo(lines[1],
      { opacity: 0, y: -70 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 1.0)
    .fromTo(lines[2],
      { opacity: 0, y: -70 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 1.4)
    .fromTo('.editorial-cta',
      { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 2.0)
    .fromTo('.editorial-tip',
      { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 2.5)
    .fromTo('.editorial-scroll-hint',
      { opacity: 0, x: 14 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 2.5)

  // ===== Showcase — image expands as it scrolls (CSS-sticky frame) =====
  ;(function () {
    const section = document.getElementById('showcase-section')
    const frame   = document.getElementById('showcase-frame')
    if (!section || !frame) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + window.innerHeight,
        scrub: 1.5,
        invalidateOnRefresh: true,
      }
    })
    tl.to(frame, { width: '100%', height: '100vh', ease: 'none' }, 0)
    tl.to('.showcase-header', { opacity: 0, ease: 'none', duration: 0.25 }, 0)
  })()

  // ===== Footer rises up over the pinned stories section (last section) =====
  ;(function () {
    const footer  = document.getElementById('site-footer')
    const stories = document.getElementById('stories-section')
    if (!footer || !stories) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stories,
        start: 'top top',
        end: '+=100%',
        scrub: 1,
        pin: stories,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      }
    })
    // y:'100%'→'0%' overrides the CSS transform cleanly (yPercent would stack on it)
    tl.fromTo(footer, { y: '100%' }, { y: '0%', ease: 'none' })
  })()

  // ===== Master vinyl — Hero -> Editorial -> Products -> (yields to Showcase's own
  // 250vh sticky pin, untouched above) -> Stories segment -> (yields to the footer-rise
  // tl above, untouched). Desktop/tablet only; mobile gets a static image, no timeline. =====
  ;(function () {
    const heroSection     = document.getElementById('hero-section')
    const showcaseSection = document.getElementById('showcase-section')
    const storiesSection  = document.getElementById('stories-section')
    const vinyl            = document.getElementById('master-vinyl')
    if (!heroSection || !showcaseSection || !storiesSection || !vinyl) return

    // Placeholders — swap paths once real art exists, no other code changes needed.
    const DESKTOP_SRC = '/images/hero-vinyl.svg'
    const MOBILE_SRC   = '/images/hero-vinyl.svg' // TODO: swap for compressed mobile WebP when produced

    ScrollTrigger.matchMedia({

      // ---- Desktop / tablet — full scroll-driven journey, same breakpoint as index.css:1354 ----
      '(min-width: 769px)': function () {
        vinyl.src = DESKTOP_SRC
        gsap.set(vinyl, { x: 0, y: 0, scale: 1, rotation: 0, transformOrigin: '50% 50%' })

        // Segment A: Hero through Products. Vinyl travels across the viewport. Ends exactly at
        // showcase-section 'top top' so it hands off the instant the existing sticky/scrub
        // takes over — no overlap with the locked Showcase logic above.
        // No `pin` here on purpose: .hero-vinyl is already position:fixed in CSS, so it's
        // viewport-anchored for the whole page regardless of scroll — GSAP's pin option is for
        // converting an in-flow element to fixed temporarily, which doesn't apply here, and
        // using it anyway caused GSAP to mis-measure the revert position once the range ended
        // (element snapped to the top-left corner). scrub alone is enough to drive x/y/rotation/scale.
        // NOTE: every numeric value below is a rough placeholder for a first visual pass,
        // not a design decision — tune freely once it's actually on screen.
        const journeyTl = gsap.timeline({
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            endTrigger: showcaseSection,
            end: 'top top',
            scrub: 1,
            invalidateOnRefresh: true,
            markers: true, // TEMP debug — remove before ship
          }
        })

        journeyTl.addLabel('hero')
        journeyTl.to(vinyl, { rotation: '+=90', duration: 1, ease: 'none' }, 'hero')

        // x/y bumped up from the 220px-box placeholder values to keep travel distance
        // proportional now that the disc is ~45vmin — same scale ratios as before.
        journeyTl.addLabel('editorial')
        journeyTl.to(vinyl, { x: -340, y: -40, scale: 0.8, rotation: '+=180', duration: 1, ease: 'none' }, 'editorial')

        journeyTl.addLabel('products')
        journeyTl.to(vinyl, { x: 340, y: 50, scale: 0.55, rotation: '+=180', duration: 1, ease: 'none' }, 'products')

        journeyTl.addLabel('handoffToShowcase')
        journeyTl.to(vinyl, { autoAlpha: 0, scale: 0.35, duration: 1, ease: 'none' }, 'handoffToShowcase')

        // Segment B: Stories range. End mirrors the footer-rise ScrollTrigger above
        // (index.js:642-653) for 1:1 sync — NOT independently re-derived via a 'top top' string,
        // since both this ST and the footer's target the SAME trigger element and the footer's ST
        // pins it (inserts a pin-spacer); two independent 'top top' measurements against a pinned
        // trigger can drift apart depending on refresh order (confirmed: up to 900px drift on a
        // plain page load even with refreshPriority alone). Reading the footer ST's own
        // already-computed .end directly means this one can never disagree with it.
        const getFooterRiseST = () => ScrollTrigger.getAll().find(st => st.pin === storiesSection)
        // Start is deliberately NOT the footer's own start ('top top' of stories-section, i.e. the
        // moment it's fully on screen and the footer pin engages). showcase-section is 250vh but
        // its sticky frame (.showcase-sticky, 100vh) can only stay stuck for 250vh-100vh=150vh of
        // scrolling before it runs out of room and releases — for the last 100vh of showcase, the
        // photo is already sliding away and Stories is visibly sliding into view from the bottom,
        // well before stories-section's top reaches the viewport top. Starting at 'top top' meant
        // the vinyl waited through that entire final 100vh of Showcase doing nothing, reading as
        // "way too late." This starts right as the sticky releases instead — the actual moment
        // Showcase visually hands off to Stories.
        const getShowcaseST = () => ScrollTrigger.getAll().find(st => st.trigger === showcaseSection)
        const storiesTl = gsap.timeline({
          scrollTrigger: {
            trigger: storiesSection,
            start: () => {
              const showcaseST = getShowcaseST()
              if (!showcaseST) return 0
              const stickyBudget = showcaseSection.offsetHeight - window.innerHeight
              return showcaseST.start + stickyBudget
            },
            end: () => getFooterRiseST()?.end ?? 0,
            // scrub is intentionally NOT matched to the footer tl's scrub:1 here — that was only
            // ever about keeping start/end boundaries in sync (now handled above), not the lag
            // duration. A full 1s scrub lag meant that on a normal-speed scroll, the vinyl's
            // fade-in was still catching up well past the 25% mark where it's supposed to finish
            // and hold — visually reading as "no static hold." A snappier scrub makes the render
            // track the actual scroll position closely enough that the hold reads as genuinely still.
            scrub: 0.3,
            invalidateOnRefresh: true,
            // still needed: guarantees the footer ST's own .start/.end are finalized before
            // the functions above read them during this ST's refresh pass.
            refreshPriority: -1,
            markers: true, // TEMP debug — remove before ship
          }
        })

        // Total timeline duration is normalized to 1 (sum of tween durations below), so these
        // numbers map directly to % of the (now longer, since start moved earlier) Stories scroll
        // range: fade in + settle over the first 30%, hold fully visible (nothing tweens autoAlpha
        // in between, so it just stays put) until 80%, then fade out over the last 20% as the
        // footer rises to cover it. Bumped from 0.2 to 0.3 — the entrance was reading as an
        // instant jump rather than a visible glide even though it was technically eased; 0.3 of
        // the wider range gives it noticeably more scroll distance to actually play out over.
        storiesTl.addLabel('storiesIn')
        // immediateRender:false — otherwise this fromTo snaps vinyl to its "from" state the
        // instant this line runs (page load), stomping journeyTl's render before any scroll happens.
        storiesTl.fromTo(vinyl,
          { autoAlpha: 0, scale: 0.35 },
          { autoAlpha: 1, scale: 1.0, rotation: '+=90', duration: 0.3, ease: 'none', immediateRender: false }, 'storiesIn')
        // x/y split into their own tweens (same start label + duration) with different top-level
        // eases — x arrives early (power2.out), y catches up late (power1.in) — so the combined
        // path bows into an arc instead of a straight diagonal cut, matching the journeyTl
        // editorial/products leg's swoop. (A single tween with per-property {value, ease} objects
        // was tried first but silently no-ops on this GSAP setup — x/y never moved at all — so
        // this is two plain single-property tweens instead, which is a well-supported pattern.)
        // End position (x:363, y:28, scale:1.0) is measured against the pinned story card, which
        // is now capped at max-width:720px (index.css .story) specifically to leave this space
        // clear — card right edge ≈752, card vertical center ≈478 at 1280x900. Vinyl sits in its
        // own ~460px-wide zone to the right with a real gap (~48px) from the card edge, full size
        // (~405px, comparable to the card's own height) and vertically centered on the card — no
        // overlap with the card at any point. Independent of which story is active (all three
        // share the same card geometry), so it never moves when the quote/name/photo swap
        // underneath it — only the card content changes, not the vinyl.
        storiesTl.fromTo(vinyl, { x: 260 }, { x: 363, duration: 0.3, ease: 'power2.out', immediateRender: false }, 'storiesIn')
        storiesTl.fromTo(vinyl, { y: 40 }, { y: 28, duration: 0.3, ease: 'power1.in', immediateRender: false }, 'storiesIn')

        storiesTl.addLabel('mergeWithFooter', 0.8)
        storiesTl.to(vinyl, { autoAlpha: 0, y: '+=60', scale: 0.3, duration: 0.2, ease: 'none' }, 'mergeWithFooter')

        // matchMedia cleanup — kill both triggers if the viewport crosses back out of this range
        return () => {
          journeyTl.scrollTrigger && journeyTl.scrollTrigger.kill()
          storiesTl.scrollTrigger && storiesTl.scrollTrigger.kill()
        }
      },

      // ---- Mobile — no timeline at all. Static image, positioned once, no ScrollTrigger. ----
      '(max-width: 768px)': function () {
        vinyl.src = MOBILE_SRC
        gsap.set(vinyl, { x: 0, y: 0, scale: 1, rotation: 0 })
      }

    })
  })()

  // Refresh all ScrollTrigger positions after content is built
  ScrollTrigger.refresh()
}

init()