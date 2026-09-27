// Record detail page (redesign). Reference: design/mockups/detail.html.

import { initHeader, setBagCount } from './header.js'
import { getProducts } from './productService.js'
import { getCart, addToCart } from './cartApi.js'
import { handOffCover } from './handoff.js'

const $ = sel => document.querySelector(sel)
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const money = n => '$' + Number(n).toFixed(2)
const secs = d => { const [m, s] = String(d).split(':').map(Number); return (m || 0) * 60 + (s || 0) }
const runtimeText = t => {
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60
  return h ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`
}

function renderMissing() {
  document.title = 'Record not found — Spiral Sounds'
  $('#detail-main').innerHTML = `
    <section class="missing">
      <p class="caps">Not on the shelf</p>
      <h1 class="h2">We couldn’t find that record.</h1>
      <a class="jump" href="/?genre=all">Browse the collection <span aria-hidden="true">↗</span></a>
    </section>`
}

function stampSVG(genre) {
  // font size and text length scale with the word so ELECTRONIC fits as well as PUNK
  const size = Math.min(64, 250 / genre.length)
  const len = Math.min(118, genre.length * 29)
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs><filter id="wear"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.9"/><feComposite in="SourceGraphic" operator="in"/></filter></defs>
    <g filter="url(#wear)" fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="92" stroke-width="8"/>
      <circle cx="100" cy="100" r="79" stroke-width="3"/>
      <text x="100" y="100" dy=".35em" text-anchor="middle" fill="currentColor" stroke="none" font-size="${size}"
        textLength="${len}" lengthAdjust="spacingAndGlyphs" transform="translate(100 100) scale(1 1.35) translate(-100 -100)">${esc(genre.toUpperCase())}</text>
    </g></svg>`
}

// Long titles step down in size until they sit in two lines.
function fitTitle() {
  const title = $('#title')
  if (!title) return
  title.style.fontSize = ''
  let fs = parseFloat(getComputedStyle(title).fontSize)
  const line = () => parseFloat(getComputedStyle(title).lineHeight) || fs * 1.02
  while (title.querySelector('.ln > span').offsetHeight > line() * 2.2 && fs > 28) {
    fs *= .92
    title.style.fontSize = fs + 'px'
  }
}

function render(rec, more, inBag) {
  const genre = rec.genre.toLowerCase()
  const tracks = rec.tracklist || []
  const runtime = tracks.reduce((a, t) => a + secs(t.duration), 0)
  const stock = Number(rec.stock) || 0
  const low = stock > 0 && stock <= 3, out = stock <= 0
  const stockText = out ? 'Sold out' : low ? `Only ${stock} left on the shelf` : `${stock} copies on the shelf`
  const addLabel = out ? 'Sold out' : inBag ? 'In bag ✓' : 'Add to bag <span aria-hidden="true">+</span>'

  document.title = `${rec.title} — Spiral Sounds`
  const back = $('#back')
  back.textContent = `← Back to ${genre}`
  back.href = `/?genre=${encodeURIComponent(genre)}&id=${rec.id}`

  const cover = $('#cover')
  cover.style.setProperty('--cover', `url("/images/${rec.image}")`)
  cover.setAttribute('aria-label', `${rec.title} cover`)

  $('#info').innerHTML = `
    <div class="head">
      <p class="artist caps">${esc(rec.artist)}</p>
      <h1 class="title" id="title"><span class="ln"><span>${esc(rec.title)}</span></span></h1>
      <a class="stamp" href="/?genre=${encodeURIComponent(genre)}" aria-label="More ${esc(genre)} records">${stampSVG(genre)}</a>
    </div>
    <p class="price">${money(rec.price)}</p>
    <p class="stock${low ? ' low' : ''}${out ? ' out' : ''}">${stockText}</p>
    <button class="add-btn${inBag ? ' done' : ''}" id="add" type="button" data-id="${rec.id}"${out ? ' disabled' : ''}>${addLabel}</button>
    ${tracks.length ? '<a class="jump" href="#tracklist">View tracklist <span aria-hidden="true">↓</span></a>' : ''}`

  $('#detail-main').insertAdjacentHTML('beforeend', `
    <section class="notes" id="tracklist">
      <div class="facts">
        <p class="caps">The record</p>
        <h2 class="h2">At a glance</h2>
        <dl>
          <div><dt>Artist</dt><dd>${esc(rec.artist)}</dd></div>
          <div><dt>Released</dt><dd>${rec.year || '—'}</dd></div>
          <div><dt>Genre</dt><dd>${esc(genre)}</dd></div>
          <div><dt>Tracks</dt><dd>${tracks.length || '—'}</dd></div>
          <div><dt>Runtime</dt><dd>${runtime ? runtimeText(runtime) : '—'}</dd></div>
          <div><dt>Format</dt><dd>12" vinyl LP</dd></div>
        </dl>
      </div>
      <div>
        <p class="caps" aria-hidden="true">&nbsp;</p>
        <h2 class="h2">Tracklist</h2>
        ${tracks.length
          ? `<ol class="tracks">${tracks.map((t, i) => `
              <li><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${esc(t.title)}</span><span class="d">${esc(t.duration || '')}</span></li>`).join('')}</ol>`
          : '<p class="soon">Tracklist coming soon.</p>'}
      </div>
    </section>
    ${more.length ? `<section class="more">
      <p class="caps">More ${esc(genre)}</p>
      <div class="more-head">
        <h2 class="h2">Keep listening</h2>
        <a class="jump" href="/?genre=${encodeURIComponent(genre)}">All ${esc(genre)} records <span aria-hidden="true">↗</span></a>
      </div>
      <div class="more-grid">${more.map(p => `
        <a class="card" href="/detail.html?id=${p.id}" data-id="${p.id}" data-image="${esc(p.image)}">
          <div class="c" style="background-image:url('/images/${esc(p.image)}')"></div>
          <b>${esc(p.title)}</b><span>${esc(p.artist)}</span><em>${p.year} · ${money(p.price)}</em>
        </a>`).join('')}</div>
    </section>` : ''}`)

  // sticky purchase bar
  const bar = $('#buybar')
  bar.innerHTML = `<div class="buybar-in">
      <div class="t" style="background-image:url('/images/${esc(rec.image)}')"></div>
      <div class="who"><b>${esc(rec.title)}</b><span>${esc(rec.artist)}</span></div>
      <div class="p">${money(rec.price)}<span class="left${low ? ' low' : ''}">${out ? 'Sold out' : low ? `Only ${stock} left` : `${stock} left`}</span></div>
      <button class="add-btn${inBag ? ' done' : ''}" id="add2" type="button" data-id="${rec.id}"${out ? ' disabled' : ''}>${addLabel}</button>
    </div>`
  // show whenever the main button has scrolled up out of view — all the way to the bottom
  new IntersectionObserver(([e]) => {
    const show = !e.isIntersecting && e.boundingClientRect.top < 0
    bar.classList.toggle('on', show)
    bar.setAttribute('aria-hidden', !show)
  }).observe($('#add'))
  const reserve = () => { document.body.style.paddingBottom = bar.offsetHeight + 'px' }
  reserve()
  addEventListener('resize', reserve)

  fitTitle()
  document.fonts.ready.then(fitTitle)
}

async function boot() {
  const id = new URLSearchParams(location.search).get('id')
  const [name, rec] = await Promise.all([
    initHeader(),
    id ? fetch(`/api/products/${encodeURIComponent(id)}`).then(r => (r.ok ? r.json() : null)).catch(() => null) : null,
  ])
  if (!rec) { renderMissing(); return }

  const [sameGenre, cart] = await Promise.all([getProducts({ genre: rec.genre }), name ? getCart() : null])
  const more = sameGenre.filter(p => p.id !== rec.id).slice(0, 4)
  render(rec, more, !!cart?.some(i => i.productId === rec.id))

  // both buttons add the same record and stay in sync
  const buttons = [$('#add'), $('#add2')]
  buttons.forEach(btn => btn.addEventListener('click', async () => {
    buttons.forEach(b => { b.disabled = true })
    const added = await addToCart(rec.id)
    if (added.needsLogin) { location.href = '/login.html'; return }
    if (added.error) { buttons.forEach(b => { b.textContent = added.error }); return }   // stays disabled
    buttons.forEach(b => { b.innerHTML = 'In bag ✓'; b.classList.add('done'); b.disabled = false })
    const items = await getCart()
    setBagCount((items || []).reduce((a, i) => a + i.quantity, 0))
  }))

  // "Keep listening": hand the transition name to the clicked card's cover
  document.querySelector('.more-grid')?.addEventListener('click', e => {
    const card = e.target.closest('.card')
    if (!card) return
    $('#cover').style.viewTransitionName = 'none'
    card.querySelector('.c').style.viewTransitionName = 'record-cover'
    handOffCover({ id: card.dataset.id, image: card.dataset.image })
  })
}

boot()
