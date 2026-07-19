import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'
import { getProducts, getGenres } from './productService.js'
import { addBtnListeners, updateCartIcon } from './cartService.js'
import { calculateCartTotal } from './cartTotal.js'
gsap.registerPlugin(ScrollTrigger)




// ===== Client Stories — 3-card slider with plain crossfade =====
// fluid.glass's own testimonial transition is a same-position opacity
// crossfade (old fades out, new fades in, no slide/wipe), confirmed by
// frame-by-frame review of the reference recording — not a directional
// wipe, so .story is positioned absolute to let both overlap briefly.
;(function () {
  const TOTAL = 3
  let cur = 0
  let going = false

  function updateCounter(n) {
    const el = document.getElementById('stories-counter')
    if (el) el.innerHTML = `<b>${String(n + 1).padStart(2, '0')}</b> / 0${TOTAL}`
  }

  function goTo(idx) {
    if (going || idx === cur) return
    going = true
    const out = document.getElementById(`story-${cur}`)
    const inn = document.getElementById(`story-${idx}`)

    inn.classList.add('story-active')
    gsap.set(inn, { opacity: 0 })
    updateCounter(idx)
    cur = idx

    const tl = gsap.timeline({
      onComplete: () => {
        out.classList.remove('story-active')
        gsap.set(out, { clearProps: 'opacity' })
        going = false
      }
    })
    tl.to(out, { opacity: 0, duration: 0.35, ease: 'power1.out' }, 0)
    tl.to(inn, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0.05)
  }

  // Click anywhere on the wrap, or the explicit prev/next buttons, to advance
  const wrap = document.getElementById('stories-wrap')
  if (wrap) {
    wrap.addEventListener('click', () => goTo((cur + 1) % TOTAL))
  }

  const prevBtn = document.getElementById('stories-prev')
  const nextBtn = document.getElementById('stories-next')
  if (prevBtn) prevBtn.addEventListener('click', e => { e.stopPropagation(); goTo((cur - 1 + TOTAL) % TOTAL) })
  if (nextBtn) nextBtn.addEventListener('click', e => { e.stopPropagation(); goTo((cur + 1) % TOTAL) })
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

// ===== Closing CTA — same destination as the editorial browse CTA =====
document.getElementById('closing-cta-btn').addEventListener('click', () => {
  document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' })
})

// ===== Auth =====
document.getElementById('logout-btn').addEventListener('click', logout)

// ===== Genre Grid — curated vinyl-sleeve collage =====
// Positioning, rotation and the disc-peek are all hand-set in CSS per slot
// (no coordinate math, no randomization) — deliberately composed rather
// than scattered at random. Each slot is its own visual island: a square
// sleeve resting on the page, some with a black vinyl disc peeking out
// from behind, echoing the same disc motif used in the hero photo and the
// closing CTA. buildGenreGrid() only creates elements and cycles slots.
const GENRE_SLOTS = [
  { cls: 'genre-tile--feature', disc: false },
  { cls: 'genre-tile--slot-a',  disc: true  },
  { cls: 'genre-tile--slot-b',  disc: false },
  { cls: 'genre-tile--slot-c',  disc: true  },
  { cls: 'genre-tile--slot-d',  disc: false },
]

function buildGenreGrid(genres, allProducts, carouselIds = new Set()) {
  const wrap = document.getElementById('genre-grid')
  if (!wrap) return

  genres.forEach((genre, i) => {
    const genreProducts = allProducts.filter(p => p.genre.toLowerCase() === genre.toLowerCase())
    const album =
      genreProducts.find(p => !carouselIds.has(p.id))
      || genreProducts[0]
    const count = genreProducts.length

    const slot = GENRE_SLOTS[i % GENRE_SLOTS.length]
    const cycleClass = i >= GENRE_SLOTS.length ? ' genre-tile--cycle-2' : ''
    const el = document.createElement('div')
    el.className = 'genre-tile ' + slot.cls + cycleClass
    el.dataset.genre = genre

    el.innerHTML = `
      ${slot.disc ? '<div class="genre-tile-disc" aria-hidden="true"></div>' : ''}
      <div class="genre-tile-sleeve"${album ? ` style="background-image:url('./images/${album.image}')"` : ''}>
        <span class="genre-tile-label">
          <span class="genre-tile-label-name">${genre}</span>
        </span>
      </div>
      <span class="genre-tile-hover-info">Explore ${genre} &middot; ${count} record${count !== 1 ? 's' : ''}</span>
    `
    el.addEventListener('click', () => openGenreOverlay(genre))
    wrap.appendChild(el)
  })
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
      requestAnimationFrame(() => btn.scrollIntoView({ inline: 'nearest', block: 'nearest' }))
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

    const total   = calculateCartTotal(items)
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

  gsap.set(['.hero-stage'], { autoAlpha: 1 })

  // Genre grid
  buildGenreGrid(genres, all)
  addBtnListeners()

  const introBtn = document.getElementById('genre-intro-btn')
  if (introBtn && genres.length) introBtn.addEventListener('click', () => openGenreOverlay(genres[0]))

  // No scroll-triggered reveal here — frame-by-frame review of the
  // reference recording shows the collection tiles are just static
  // content as you scroll past them, no stagger/fade choreography.

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
  // Single ScrollTrigger drives the pin AND both reveals through one
  // timeline, so Stories/CTA/Footer share one source of scroll-progress
  // truth and can never drift out of sync with each other, no matter how
  // the phase timings below are tuned.
  //
  // The pin lasts '+=330%' (~3 viewport heights). This number was chosen
  // for its effect on the WHOLE PAGE's scroll percentage, not just its own
  // internal progress — footer's rise architecturally must end at 100% of
  // the page (it's a fixed overlay, nothing scrollable after it), and all
  // content before Stories is a fixed 5470px, so the pin's start-percentage
  // of the whole page is start/(start+pinLength) — a LONGER pin is what
  // pushes that percentage EARLIER, not a shorter one. At +=330%, pin-start
  // lands at ~65% of the whole page (down from ~75% before), and the
  // "nothing moving yet" hold is capped to a small slice of the pin so it
  // only spans ~65%-70% of the whole page, not ~75%-85% as before.
  //
  // Tween positions are fractions of 0-1, which — because scrub maps
  // ScrollTrigger progress directly to timeline totalProgress — read
  // exactly as % of the pin's own range. In whole-page terms (pin spans
  // ~65%-100%), each phase below maps to roughly the range noted:
  //   0%   - 15%  Stories holds stable/readable   (~65.0% - 70.1% of page)
  //   15%  - 50%  CTA rises continuously into view (~70.1% - 82.4% of page)
  //   50%  - 58%  CTA's brief moment of presence   (~82.4% - 85.2% of page)
  //   56%  - 100% Footer rises, overlapping the CTA hold's tail at 56%
  //               instead of waiting for it to fully end at 58%
  //               (~84.5% - 100% of page)
  ;(function () {
    const footer     = document.getElementById('site-footer')
    const stories    = document.getElementById('stories-section')
    const closingCta = document.getElementById('closing-cta-section')
    if (!footer || !stories) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stories,
        start: 'top top',
        end: '+=330%',
        scrub: 1,
        pin: stories,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      }
    })
    // y:'100%'→'0%' overrides the CSS transform cleanly (yPercent would stack on it)
    if (closingCta) tl.fromTo(closingCta, { y: '100%' }, { y: '0%', ease: 'none', duration: 0.35 }, 0.15)
    tl.fromTo(footer, { y: '100%' }, { y: '0%', ease: 'none', duration: 0.44 }, closingCta ? 0.56 : 0.15)
  })()

  // Refresh all ScrollTrigger positions after content is built
  ScrollTrigger.refresh()

  // Web fonts (Libre Bodoni/Public Sans) swap in asynchronously and reflow
  // text after the refresh above already ran, which silently drifts every
  // scroll-trigger's start/end px offsets. Refresh again once fonts settle.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh())
  }
}

init()