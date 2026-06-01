import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'
import { getProducts, getGenres } from './productService.js'
import { addBtnListeners, updateCartIcon } from './cartService.js'
import { renderProducts } from './productUI.js'

// ===== Auth =====

document.getElementById('logout-btn').addEventListener('click', logout)

// ===== Genre block colours (fixed, no duplicates) =====

const GENRE_COLORS = {
  rock:        '#1a0d08',
  indie:       '#0d1520',
  ambient:     '#0d1810',
  folk:        '#180d18',
  punk:        '#140808',
  jazz:        '#0a0a1e',
  electronic:  '#060f18',
  soul:        '#3d1a00',
  classical:   '#222218',
  pop:         '#1a0a18',
  metal:       '#0a0a0a',
  blues:       '#0a100a',
}

function genreColor(genre) {
  return GENRE_COLORS[genre.toLowerCase()] || '#1C1C1C'
}

// Freeform layout inspired by pic2 — hand-crafted, varied sizes, natural scatter
// Values are fractions of container W/H
const FREEFORM = [
  { x: 0.03,  y: 0.04,  w: 0.26, h: 0.46 },  // Rock  — tall left
  { x: 0.32,  y: 0.02,  w: 0.34, h: 0.28 },  // Indie — wide top centre
  { x: 0.70,  y: 0.05,  w: 0.27, h: 0.36 },  // Ambient — top right
  { x: 0.03,  y: 0.54,  w: 0.18, h: 0.36 },  // Folk  — narrow bottom left
  { x: 0.24,  y: 0.36,  w: 0.30, h: 0.42 },  // Punk  — centre tall
  { x: 0.58,  y: 0.47,  w: 0.22, h: 0.30 },  // Jazz  — centre-right mid
  { x: 0.82,  y: 0.46,  w: 0.16, h: 0.40 },  // Electronic — slim right
]

function buildGenreScatter(genres) {
  const wrap = document.getElementById('genre-scatter')
  if (!wrap) return

  const W = wrap.offsetWidth || 900
  const H = wrap.offsetHeight || 800

  genres.slice(0, FREEFORM.length).forEach((genre, i) => {
    const pos = FREEFORM[i]
    const block = document.createElement('div')
    block.className = 'genre-block'
    block.dataset.genre = genre
    block.style.cssText = `
      left: ${Math.round(pos.x * W)}px;
      top: ${Math.round(pos.y * H)}px;
      width: ${Math.round(pos.w * W)}px;
      height: ${Math.round(pos.h * H)}px;
      background: ${genreColor(genre)};
    `
    block.innerHTML = `
      <span class="genre-block-arrow" aria-hidden="true">↗</span>
      <div class="genre-block-label">
        <div class="genre-block-name">${genre}</div>
      </div>
    `
    block.addEventListener('click', () => showGenreProducts(genre))
    wrap.appendChild(block)
  })
}

// ===== Show products for a genre — pic4 style =====

async function showGenreProducts(genre) {
  document.getElementById('genre-view').style.display = 'none'
  document.getElementById('product-list-view').style.display = 'block'
  document.getElementById('genre-back-name').textContent = genre

  const products = await getProducts({ genre })

  const container = document.getElementById('products-container')
  container.innerHTML = ''

  if (products.length === 0) {
    container.innerHTML = `
      <div class="product-list-inner">
        <div class="product-list-left">
          <div class="product-list-genre-title">${genre}</div>
        </div>
        <div class="product-list-right" style="padding:3rem; color:var(--color-text-muted); font-size:0.85rem; text-transform:uppercase; letter-spacing:0.1em;">
          No records found.
        </div>
      </div>
    `
    return
  }

  const inner = document.createElement('div')
  inner.className = 'product-list-inner'

  inner.innerHTML = `
    <div class="product-list-left">
      <div class="product-list-genre-title">${genre}</div>
    </div>
    <div class="product-list-right" id="product-grid"></div>
  `
  container.appendChild(inner)

  const grid = document.getElementById('product-grid')
  products.forEach(album => {
    const card = document.createElement('div')
    card.className = 'product-card-pic4'
    card.innerHTML = `
      <a href="/detail.html?id=${album.id}">
        <img class="product-card-pic4-img" src="./images/${album.image}" alt="${album.title}" loading="lazy">
      </a>
      <div class="product-card-pic4-info">
        <div class="product-card-pic4-title">${album.title}</div>
        <div class="product-card-pic4-artist">${album.artist}</div>
        <div class="product-card-pic4-price">$${Number(album.price).toFixed(2)}</div>
        <button class="main-btn add-btn product-card-pic4-btn" data-id="${album.id}">Add to Cart</button>
      </div>
    `
    grid.appendChild(card)
  })

  addBtnListeners()
}

// ===== Back to genre scatter =====

document.getElementById('genre-back-bar').addEventListener('click', () => {
  document.getElementById('product-list-view').style.display = 'none'
  document.getElementById('genre-view').style.display = 'block'
})

// ===== Vinyl Carousel =====

let carouselProducts = []
let carouselIndex    = 0
let carouselAnimating = false

function updateCarousel(dir) {
  if (carouselAnimating || carouselProducts.length === 0) return
  carouselAnimating = true

  const disc  = document.getElementById('vinyl-disc')
  const cover = document.getElementById('vinyl-cover')
  const info  = document.getElementById('vinyl-info')
  const bg    = document.getElementById('hero-bg')

  // Remove old animation classes
  disc.classList.remove('anim-disc', 'anim-disc-rev')
  cover.classList.remove('anim-cover', 'anim-cover-rev')
  info.classList.remove('anim-info')

  // Force reflow so animations restart
  void disc.offsetWidth

  const album = carouselProducts[carouselIndex]

  // Update content
  document.getElementById('vinyl-genre').textContent  = album.genre
  document.getElementById('vinyl-title').textContent  = album.title
  document.getElementById('vinyl-artist').textContent = album.artist
  document.getElementById('vinyl-price').textContent  = `$${Number(album.price).toFixed(2)}`
  cover.src = `./images/${album.image}`
  cover.alt = album.title
  document.getElementById('vinyl-cart-btn').dataset.id = album.id

  // Background tint from album image (use a dark overlay colour per album)
  bg.style.backgroundImage = `url('./images/${album.image}')`
  bg.style.backgroundSize = 'cover'
  bg.style.backgroundPosition = 'center'

  // Add animation classes
  const forward = dir >= 0
  disc.classList.add(forward  ? 'anim-disc'  : 'anim-disc-rev')
  cover.classList.add(forward ? 'anim-cover' : 'anim-cover-rev')
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

// Auto-rotate every 4 seconds
let autoRotate = setInterval(carouselNext, 4000)

// Reset timer on keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { clearInterval(autoRotate); carouselNext(); autoRotate = setInterval(carouselNext, 4000) }
  if (e.key === 'ArrowLeft')  { clearInterval(autoRotate); carouselPrev(); autoRotate = setInterval(carouselNext, 4000) }
})

// Clicking the vinyl cover goes to detail view
document.getElementById('vinyl-cover').addEventListener('click', () => {
  if (carouselProducts.length === 0) return
  const album = carouselProducts[carouselIndex]
  window.location.href = `/detail.html?id=${album.id}`
})

document.getElementById('vinyl-mockup').style.cursor = 'pointer'

// ===== Search =====

document.getElementById('search-input').addEventListener('input', async () => {
  const search = document.getElementById('search-input').value.trim()

  // Show product list view with search results
  document.getElementById('genre-view').style.display = 'none'
  document.getElementById('product-list-view').style.display = 'block'
  document.getElementById('genre-back-name').textContent = `"${search}"`

  const products = search
    ? await getProducts({ search })
    : []

  renderProducts(products)
  addBtnListeners()
})

document.querySelector('form[role="search"]').addEventListener('submit', e => {
  e.preventDefault()
})

// ===== Init =====

async function init() {
  const name = await checkAuth()
  renderGreeting(name)
  showHideMenuItems(name)
  if (name) await updateCartIcon()

  // Load genres for scatter
  const genres = await getGenres()
  buildGenreScatter(genres)

  // Load random featured albums for carousel
  const allProducts = await getProducts()
  if (allProducts.length > 0) {
    // Shuffle and take up to 5 for carousel
    carouselProducts = allProducts
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
    updateCarousel(1)
  }

  // Add to cart listener for carousel button
  addBtnListeners()
}

init()