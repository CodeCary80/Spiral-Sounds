// Home page (redesign): hero turntable, genre collage, showroom scroll,
// client stories, finale, and the genre/search overlay ("sheet").
// Reference: design/mockups/page.html.

import { initHeader, setBagCount } from './header.js'
import { getProducts, getGenres } from './productService.js'
import { getCart, addToCart, setQuantity, removeFromCart } from './cartApi.js'
import { stepper } from './qty.js'
import { handOffCover } from './handoff.js'

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = sel => document.querySelector(sel)
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const GENRE_DESC = {
  all: 'Every record on the shelf right now. All of them chosen, none of them filler.',
  rock: 'Raw energy, distorted guitars, and records that hit hard. Music built to last.',
  indie: 'Off the beaten path. Handpicked artists who make music entirely on their own terms.',
  ambient: 'Atmospheric and immersive. Made for thinking, drifting, and deep listening.',
  folk: 'Acoustic tradition. Stories passed down through strings, voice, and time.',
  punk: 'Fast, loud, and deliberate. No polish — all conviction.',
  jazz: 'Improvisation and soul. The ongoing conversation between exceptional musicians.',
  electronic: 'Synthesised landscapes from studio to dance floor and everywhere between.',
  soul: 'Deep feeling and warm grooves. Music that moves the body and stirs the spirit.',
  classical: 'Centuries of composition. Timeless orchestral and chamber works on vinyl.',
  pop: 'Hooks, melodies, moments. Music crafted to stay with you long after it ends.',
  metal: 'Heavy, precise, and relentless. For listeners who want more from their records.',
  blues: 'The root of it all. Raw emotion poured over twelve honest bars.',
}
// Preferred order for the sheet's genre list (two columns of seven); any
// genre the catalogue gains later is appended after these.
const GENRE_ORDER = ['punk', 'ambient', 'rock', 'soul', 'indie', 'pop', 'jazz', 'blues', 'metal', 'folk', 'classical', 'electronic']

// ===================== Hero turntable =====================
// One `playing` flag drives the audio, the eased label spin, the tonearm and
// the cue line. The spin runs through the Web Animations API so its
// playbackRate can ramp up and down instead of stopping dead.
const deck = $('#deck')
;(() => {
  const dial = $('#tt-power'), cue = $('#hero-cue'), audio = $('#tt-audio')
  const spin = deck.querySelector('.record-rotor').animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: 5200, iterations: Infinity, easing: 'linear' })
  spin.pause()
  spin.playbackRate = 0
  let rampId = null, playing = false

  function rampTo(target, ms) {
    if (rampId) cancelAnimationFrame(rampId)
    if (reduced) { spin.pause(); return }
    const from = spin.playbackRate, t0 = performance.now()
    if (spin.playState !== 'running') spin.play()
    const step = now => {
      const t = Math.min(1, (now - t0) / ms)
      spin.playbackRate = from + (target - from) * t
      if (t < 1) rampId = requestAnimationFrame(step)
      else if (target === 0) { spin.pause(); rampId = null }
    }
    rampId = requestAnimationFrame(step)
  }
  function render() {
    deck.classList.toggle('is-playing', playing)
    dial.setAttribute('aria-label', playing ? 'Pause record' : 'Play record')
    cue.innerHTML = playing
      ? '<b aria-hidden="true">&#8545;</b> Now playing &middot; press to pause'
      : '<b aria-hidden="true">&#9654;</b> Press the silver dial to play'
  }
  function stop() { playing = false; audio.pause(); rampTo(0, 600); render() }
  async function start() {
    playing = true; render(); rampTo(1, 900)
    try { await audio.play() } catch { stop() }
  }
  const toggle = () => (playing ? stop() : start())
  ;[dial, cue, $('#record-hit')].forEach(el => el.addEventListener('click', toggle))
  audio.addEventListener('ended', stop)
  audio.addEventListener('error', stop)
  render()
})()

// ===================== Genre collage masthead =====================
const collection = $('#collection')
document.querySelectorAll('.word').forEach(w => {
  w.innerHTML = [...w.dataset.text].map((c, i) => `<span class="ch"><span style="--i:${i}">${c}</span></span>`).join('')
})
// Scale each masthead word so it exactly spans its target width.
function fitMasthead() {
  const W = collection.clientWidth
  const fit = (el, rightEdge) => {
    const left = el.getBoundingClientRect().left - collection.getBoundingClientRect().left
    const size = parseFloat(getComputedStyle(el).fontSize)
    el.style.fontSize = (size * (W * rightEdge - left) / el.getBoundingClientRect().width) / W * 100 + 'cqw'
  }
  fit($('.word.big'), 0.968)
  fit($('.word.the'), 0.145)
}

// ===================== Showroom =====================
// Pinned for one viewport of scroll while the photo grows from a framed print
// to full-bleed. Progress eases toward the scroll target each frame, so the
// growth trails the wheel slightly.
;(() => {
  const sec = $('#showroom'), frame = $('#showroom-frame'), img = frame.querySelector('img')
  const head = sec.querySelector('.showroom-head')
  const fading = [sec.querySelector('.rule-row'), head]
  const lerp = (a, b, t) => a + (b - a) * t
  let cur = 0
  const target = () => Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / innerHeight))
  function draw(p) {
    const W = innerWidth, H = innerHeight, e = p * p * (3 - 2 * p)
    const y0 = head.offsetTop + head.offsetHeight + W * .028
    const narrow = W <= 760
    const h0 = Math.max(H * (narrow ? .3 : .4), H - y0 - H * .06), w0 = W * (narrow ? .88 : .62), x0 = (W - w0) / 2
    frame.style.left = lerp(x0, 0, e) + 'px'
    frame.style.top = lerp(y0, 0, e) + 'px'
    frame.style.width = lerp(w0, W, e) + 'px'
    frame.style.height = lerp(h0, H, e) + 'px'
    img.style.transform = `scale(${lerp(1.12, 1, e)})`
    const f = Math.max(0, 1 - p / .3)
    fading.forEach(el => { el.style.opacity = f; el.style.transform = `translateY(${(1 - f) * -2}vw)` })
  }
  function tick() {
    const t = target()
    cur = reduced ? t : cur + (t - cur) * .14
    if (Math.abs(t - cur) < .0005) cur = t
    draw(cur)
    requestAnimationFrame(tick)
  }
  tick()
  once(head, () => sec.classList.add('play'), .6)
})()

// "Get directions" scrolls to the footer address and flashes it.
$('.showroom-link').addEventListener('click', e => {
  e.preventDefault()
  const v = $('#visit')
  v.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  setTimeout(() => { v.classList.add('flash'); setTimeout(() => v.classList.remove('flash'), 1400) }, 600)
})

// ===================== Stories + finale =====================
once($('#stories'), el => el.classList.add('play'), .2)
document.querySelectorAll('.rotation .sleeve-mini').forEach(a =>
  a.addEventListener('click', () => {
    a.style.viewTransitionName = 'record-cover'
    handOffCover({ id: new URL(a.href).searchParams.get('id'), image: a.dataset.image })
  }))

// The closing record turns with the scroll; while the hero deck is playing it
// also turns at the deck's speed and the "still playing" line appears.
;(() => {
  const disc = $('#closing-spin'), still = $('#still')
  let free = 0, last = performance.now()
  function tick(now) {
    const dt = now - last; last = now
    const playing = deck.classList.contains('is-playing')
    if (playing && !reduced) free += dt * 360 / 5200
    still.classList.toggle('on', playing)
    disc.style.transform = `rotate(${reduced ? 0 : scrollY * .12 + free}deg)`
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  // The finale starts fully clipped (observers treat it as invisible), and a
  // jump to the bottom can skip past it, so watch an unclipped marker instead.
  const finale = $('#closing'), sentinel = $('#finale-sentinel')
  ;(function watch() {
    if (sentinel.getBoundingClientRect().top < innerHeight * .88) finale.classList.add('play')
    else requestAnimationFrame(watch)
  })()
})()

function once(el, fn, threshold) {
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { fn(e.target); o.disconnect() } }, { threshold }).observe(el)
}

// ===================== Genre / search overlay =====================
const sheet = $('#genre-page'), left = $('#sheet-left'), grid = $('#genre-page-grid')
const bagPanel = $('#bag-panel'), scrim = $('#scrim')
const T = reduced ? 0 : 1

let products = []
let genres = []
let cart = null          // null = logged out; [] = logged in, empty
let view = { kind: 'genre', key: 'all', list: [] }
// the genre list starts folded on phones, where it would push the records below the fold
let listOpen = !matchMedia('(max-width: 760px)').matches

const inCart = id => !!cart && cart.some(i => i.productId === id)
const cap = s => s[0].toUpperCase() + s.slice(1)

function productsFor(genre) {
  return genre === 'all' ? products : products.filter(p => p.genre.toLowerCase() === genre)
}

function fitName(el) {
  const pad = parseFloat(getComputedStyle(left).paddingLeft) + parseFloat(getComputedStyle(left).paddingRight)
  const max = left.clientWidth - pad
  // measure the word itself — the rise mask around it clips, so the heading's own width lies
  const w = el.querySelector('i').getBoundingClientRect().width
  if (w > max) el.style.fontSize = parseFloat(getComputedStyle(el).fontSize) * max / w + 'px'
}

function renderSheet() {
  // genre views read the catalogue at render time, so a sheet opened before it loaded still fills in
  if (view.kind === 'genre') view.list = productsFor(view.key)
  const { kind, key, list } = view
  const title = kind === 'search' ? `“${key}”` : key
  const desc = kind === 'search'
    ? `Search results for “${esc(key)}”.`
    : (GENRE_DESC[key] || 'A curated selection of records chosen for their depth, craft, and lasting sound.')
  left.innerHTML = `
    <h2 class="g-name"><span class="ln"><span><i>${esc(title)}</i></span></span></h2>
    <p class="g-desc">${desc}</p>
    <div class="g-count">${list.length} record${list.length === 1 ? '' : 's'}</div>
    <button class="g-change" type="button" aria-expanded="${listOpen}" aria-controls="g-list">${kind === 'search' ? 'Browse by genre' : 'Change genre'} <span aria-hidden="true">↑</span></button>
    <ul class="g-list" id="g-list"${listOpen ? '' : ' hidden'}>${['all', ...genres].map(g =>
      `<li><button type="button" data-g="${g}" class="${kind === 'genre' && g === key ? 'active' : ''}">${g === 'all' ? 'All records' : cap(g)}</button></li>`).join('')}</ul>`
  fitName(left.querySelector('.g-name'))

  grid.innerHTML = list.length ? list.map((p, n) => `
    <article class="rec" style="--n:${Math.min(n, 8)}">
      <a class="rec-art" href="/detail.html?id=${p.id}" data-id="${p.id}" aria-label="${esc(p.title)} by ${esc(p.artist)}">
        <span class="cover" style="background-image:url('/images/${esc(p.image)}')"></span>
      </a>
      <h3>${esc(p.title)}</h3>
      <p class="artist">${esc(p.artist)}</p>
      <div class="rec-row">
        <span class="meta">${p.year} · $${Number(p.price).toFixed(2)}</span>
        <button class="add-btn${inCart(p.id) ? ' done' : ''}" type="button" data-id="${p.id}">${inCart(p.id) ? 'In bag ✓' : 'Add to bag'}</button>
      </div>
    </article>`).join('')
    : '<p class="sheet-empty">No records found.</p>'
  grid.scrollTop = 0
}

function renderBag() {
  const items = cart || []
  const qty = items.reduce((a, i) => a + i.quantity, 0)
  const total = items.reduce((a, i) => a + i.quantity * Number(i.price), 0)
  setBagCount(qty)
  sheet.classList.toggle('bag-open', qty > 0)
  bagPanel.innerHTML = `
    <h4><span>Your bag</span><span class="gcart-count">${qty} item${qty === 1 ? '' : 's'}</span></h4>
    <div class="bag-items">${items.map(i => `
      <div class="bag-item">
        <div class="thumb" style="background-image:url('/images/${esc(i.image)}')"></div>
        <div><b>${esc(i.title)}</b><span>${esc(i.artist)}</span>${stepper(i, { small: true, removeAtOne: true })}</div>
        <em>$${(i.quantity * Number(i.price)).toFixed(2)}</em>
      </div>`).join('')}</div>
    <div class="bag-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>
    <a class="checkout" href="/cart.html">Checkout</a><a class="view" href="/cart.html">View bag</a>`
}

// ---- open / close: grow out of the clicked element, shrink back into it ----
let origin = null, pick = null, hiddenSleeve = null, busy = false
const insetOf = r => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 3px)`

function openSheet(nextView, from) {
  if (busy || sheet.classList.contains('open')) { view = nextView; renderSheet(); return }
  busy = true
  view = nextView
  scrim.classList.add('on')
  let rect
  const sleeve = from?.classList.contains('genre-tile') ? from.querySelector('.sleeve') : null
  if (sleeve) {
    // a free-floating copy of the sleeve lifts and straightens above the scrim
    const w = from.offsetWidth, h = from.offsetHeight, b = sleeve.getBoundingClientRect()
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2
    pick = document.createElement('div')
    pick.className = 'pick'
    pick.style.cssText = `left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;` +
      `background-image:${getComputedStyle(sleeve).backgroundImage};--r:${getComputedStyle(from).getPropertyValue('--r')}`
    document.body.appendChild(pick)
    hiddenSleeve = sleeve
    sleeve.style.visibility = 'hidden'
    requestAnimationFrame(() => requestAnimationFrame(() => pick.classList.add('lifted')))
    rect = { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 }
  } else {
    const b = (from || document.body).getBoundingClientRect()
    rect = { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
  }
  origin = rect
  renderSheet()
  sheet.classList.add('intro')
  sheet.style.transition = 'none'
  sheet.style.clipPath = insetOf(rect)
  document.documentElement.style.overflow = 'hidden'
  // 1) the sleeve lifts, 2) the panel grows out from under it, 3) the sleeve dissolves into it
  setTimeout(() => {
    sheet.classList.add('open')
    requestAnimationFrame(() => {
      sheet.style.transition = `clip-path ${.38 * T}s cubic-bezier(.65,0,.25,1)`
      sheet.style.clipPath = 'inset(0px 0px 0px 0px round 0px)'
      sheet.classList.add('shown')
    })
  }, (pick ? 150 : 40) * T)
  setTimeout(() => pick?.classList.add('gone'), 290 * T)
  setTimeout(() => { busy = false; $('#sheet-back').focus({ preventScroll: true }) }, 600 * T)
}

function closeSheet() {
  if (busy || !sheet.classList.contains('open')) return
  busy = true
  sheet.classList.remove('intro', 'shown')
  sheet.style.transition = `clip-path ${.34 * T}s cubic-bezier(.65,0,.25,1)`
  sheet.style.clipPath = insetOf(origin)
  setTimeout(() => pick?.classList.remove('gone'), 130 * T)
  setTimeout(() => {
    sheet.classList.remove('open')
    scrim.classList.remove('on')
    pick?.classList.remove('lifted')
    setTimeout(() => {
      pick?.remove(); pick = null
      if (hiddenSleeve) { hiddenSleeve.style.visibility = ''; hiddenSleeve = null }
      document.documentElement.style.overflow = ''
      busy = false
    }, 220 * T)
  }, 340 * T)
}

const genreView = key => ({ kind: 'genre', key, list: productsFor(key) })

// switching inside the sheet: only the grid dips out and back, no intro
function swapTo(nextView) {
  sheet.classList.remove('intro')
  grid.classList.add('swap')
  setTimeout(() => { view = nextView; renderSheet(); grid.classList.remove('swap') }, 160 * T)
}

left.addEventListener('click', e => {
  const toggle = e.target.closest('.g-change')
  if (toggle) {
    listOpen = !listOpen
    toggle.setAttribute('aria-expanded', listOpen)
    $('#g-list').hidden = !listOpen
    return
  }
  const b = e.target.closest('.g-list button')
  if (b && !(view.kind === 'genre' && view.key === b.dataset.g)) swapTo(genreView(b.dataset.g))
})

grid.addEventListener('click', async e => {
  const art = e.target.closest('.rec-art')
  if (art) {
    art.querySelector('.cover').style.viewTransitionName = 'record-cover'
    handOffCover(products.find(p => p.id === +art.dataset.id) || view.list.find(p => p.id === +art.dataset.id))
    return
  }
  const btn = e.target.closest('.add-btn')
  if (!btn) return
  btn.disabled = true
  const ok = await addToCart(btn.dataset.id)
  if (!ok) { location.href = '/login.html'; return }
  btn.textContent = 'In bag ✓'
  btn.classList.add('done')
  btn.disabled = false
  cart = await getCart()
  renderBag()
})

// − / + in the bag panel
bagPanel.addEventListener('click', async e => {
  const btn = e.target.closest('.qty [data-step]')
  if (!btn) return
  const box = btn.closest('.qty')
  const next = Number(box.dataset.qty) + Number(btn.dataset.step)
  box.classList.add('busy')
  const res = next < 1 ? { ok: await removeFromCart(box.dataset.item) } : await setQuantity(box.dataset.item, next)
  if (!res.ok) { box.classList.remove('busy'); box.title = res.error || 'Could not update the quantity.'; return }
  cart = await getCart()
  renderBag()
  // a removed record goes back to "Add to bag" in the grid
  grid.querySelectorAll('.add-btn.done').forEach(b => {
    if (!inCart(+b.dataset.id)) { b.classList.remove('done'); b.textContent = 'Add to bag' }
  })
})

$('#sheet-back').addEventListener('click', closeSheet)
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet() })

// ---- entry points ----
document.querySelectorAll('.genre-tile').forEach(tile => {
  const go = () => openSheet(genreView(tile.dataset.genre), tile)
  tile.addEventListener('click', go)
  tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } })
})
;[$('#all-genres'), $('#finale-browse'), $('[data-open-genres]')].forEach(el =>
  el.addEventListener('click', e => { e.preventDefault(); openSheet(genreView('all'), el) }))
$('[data-focus-search]').addEventListener('click', e => {
  e.preventDefault()
  scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  setTimeout(() => $('#search-input').focus({ preventScroll: true }), reduced ? 0 : 500)
})

// ---- search ----
$('.search').addEventListener('submit', async e => {
  e.preventDefault()
  const q = $('#search-input').value.trim()
  if (!q) return
  const results = await getProducts({ search: q })
  openSheet({ kind: 'search', key: q, list: results }, $('.search'))
})

// ===================== Boot =====================
async function boot() {
  const [name, all, genreList] = await Promise.all([initHeader(), getProducts(), getGenres()])
  products = all
  const known = genreList.map(g => g.toLowerCase())
  genres = [...GENRE_ORDER.filter(g => known.includes(g)), ...known.filter(g => !GENRE_ORDER.includes(g))]
  document.querySelector('[data-genre-count]').textContent = genres.length
  cart = name ? await getCart() : null
  renderBag()
  // A sheet opened before the catalogue arrived (fast click, slow network) was
  // rendered empty — fill it in now.
  if (view.kind === 'genre' && (sheet.classList.contains('open') || sheet.classList.contains('intro'))) renderSheet()

  // Arriving from a detail page's "back to <genre>" link: open that genre at
  // once, and name the record's cover so the page transition lands on it.
  const q = new URLSearchParams(location.search)
  const g = q.get('genre')?.toLowerCase()
  if (g && (g === 'all' || genres.includes(g))) {
    const tile = document.querySelector(`.genre-tile[data-genre="${g}"]`)
    scrollTo(0, collection.offsetTop)
    view = genreView(g)
    renderSheet()
    sheet.style.transition = 'none'
    sheet.style.clipPath = 'none'
    sheet.classList.add('open', 'shown')
    scrim.classList.add('on')
    document.documentElement.style.overflow = 'hidden'
    const b = (tile || collection).getBoundingClientRect()
    origin = { left: b.left, top: b.top, right: b.right, bottom: b.bottom }
    const cover = grid.querySelector(`.rec-art[data-id="${q.get('id')}"] .cover`)
    if (cover) {
      cover.style.viewTransitionName = 'record-cover'
      addEventListener('pageshow', () => setTimeout(() => { cover.style.viewTransitionName = '' }, 700))
    }
  }
}

// Start the hero once fonts and the deck art are ready, so nothing pops in late.
const hero = $('#hero')
Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))])
  .then(() => document.fonts.load('100px Oranienbaum', 'COLLECTION'))
  .then(() => {
    fitMasthead()
    return Promise.all([...hero.querySelectorAll('.deck img')].map(i => i.decode().catch(() => {})))
  })
  .then(() => {
    hero.classList.add('play')
    once(collection, el => el.classList.add('play'), .35)
  })

boot()
