import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'
import { getProducts, getGenres } from './productService.js'
import { addBtnListeners, updateCartIcon } from './cartService.js'

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
function buildGenreScatter(genres) {
  const wrap = document.getElementById('genre-scatter')
  if (!wrap) return

  // Define layout as [leftPct, topPct, widthPct, heightPct]
  // Container is 820px tall, full viewport wide
  // These match pic2 proportions exactly
const layout = [
  // [left%, top_px, width%, height_px]
  // Rock: left, medium-high start
  [  6,  140, 22, 400],
  // Indie: center-left, tallest, starts near top
  [ 30,  30, 40, 140],
  // Ambient: center-right, medium, starts mid
  [ 40, 240, 18, 220],
   // Folk: far right, tall, starts high
  [ 68, 340, 18, 220],
  // Punk: center, small, much lower — isolated
  [ 32, 510, 32, 160],
]

  const W = wrap.offsetWidth

genres.slice(0, layout.length).forEach((genre, i) => {
    const [lp, tp_px, wp, hp_px] = layout[i]
    const el = document.createElement('div')
    el.className = 'genre-block'
    el.dataset.genre = genre
    el.style.cssText = `
      position: absolute;
      left: ${(lp/100)*W}px;
      top: ${tp_px}px;
      width: ${(wp/100)*W}px;
      height: ${hp_px}px;
      background: ${genreColor(genre)};
      cursor: pointer;
      overflow: hidden;
      transition: opacity 0.2s;
    `
    el.innerHTML = `
      <span style="position:absolute;top:10px;right:12px;font-size:0.7rem;color:rgba(255,255,255,0.45);">↗</span>
      <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 14px;">
        <div style="font-size:0.85rem;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:0.05em;">${genre}</div>
      </div>
    `
    el.addEventListener('mouseenter', () => { el.style.opacity = '0.8' })
    el.addEventListener('mouseleave', () => { el.style.opacity = '1' })
    el.addEventListener('click', () => showGenreProducts(genre))
    wrap.appendChild(el)
  })

  // Vinyl decoration — outside forEach, only created once
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
  document.getElementById('vinyl-price').textContent  = `$${Number(album.price).toFixed(2)}`
  cover.src = `./images/${album.image}`
  cover.alt = album.title
  document.getElementById('vinyl-cart-btn').dataset.id = album.id
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

// ===== Init =====
async function init() {
  const name = await checkAuth()
  renderGreeting(name)
  showHideMenuItems(name)
  if (name) await updateCartIcon()

  const genres = await getGenres()
  buildGenreScatter(genres)

  const all = await getProducts()
  if (all.length) {
    carouselProducts = all.sort(() => Math.random() - 0.5).slice(0, 5)
    updateCarousel(1)
  }
  addBtnListeners()
}

init()