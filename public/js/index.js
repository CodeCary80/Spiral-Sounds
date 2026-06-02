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

// Genre scatter — pic1 style
// Hard-coded pixel positions scaled to container width
// 7 blocks, no overlap guaranteed by design
const SCATTER = [
  // Rock: tall portrait, top-left        R=0.22 B=0.60
  { left: 0.03, top: 0.02, width: 0.19, height: 0.58 },
  // Indie: landscape, top-center         L=0.27 R=0.57 B=0.30
  { left: 0.27, top: 0.04, width: 0.30, height: 0.26 },
  // Ambient: tall portrait, top-right    L=0.68 R=0.87 B=0.55
  { left: 0.68, top: 0.03, width: 0.19, height: 0.52 },
  // Folk: narrow tall, bottom-left       L=0.03 R=0.16 B=0.95
  { left: 0.03, top: 0.66, width: 0.13, height: 0.28 },
  // Punk: tall portrait, center          L=0.27 R=0.54 B=0.85
  { left: 0.27, top: 0.36, width: 0.27, height: 0.48 },
  // Jazz: wide landscape, right-center   L=0.58 R=0.86 B=0.80
  { left: 0.58, top: 0.62, width: 0.28, height: 0.22 },
  // Electronic: slim tall, far right     L=0.89 R=1.00 B=0.90
  { left: 0.89, top: 0.38, width: 0.09, height: 0.45 },
]

function buildGenreScatter(genres) {
  const wrap = document.getElementById('genre-scatter')
  if (!wrap) return

  // Wait for layout then measure
  requestAnimationFrame(() => {
    const W = wrap.offsetWidth
    const H = wrap.offsetHeight

    genres.slice(0, SCATTER.length).forEach((genre, i) => {
      const s = SCATTER[i]
      const block = document.createElement('div')
      block.className = 'genre-block'
      block.dataset.genre = genre
      block.style.cssText = [
        `left:${Math.round(s.left * W)}px`,
        `top:${Math.round(s.top * H)}px`,
        `width:${Math.round(s.width * W)}px`,
        `height:${Math.round(s.height * H)}px`,
        `background:${genreColor(genre)}`,
      ].join(';')
      block.innerHTML = `
        <span class="genre-block-arrow" aria-hidden="true">↗</span>
        <div class="genre-block-label">
          <div class="genre-block-name">${genre}</div>
        </div>
      `
      block.addEventListener('click', () => showGenreProducts(genre))
      wrap.appendChild(block)
    })
  })
}

// ===== Show products for a genre — pic3 style =====

async function showGenreProducts(genre) {
  document.getElementById('genre-view').style.display = 'none'
  document.getElementById('product-list-view').style.display = 'block'
  document.getElementById('genre-back-name').textContent = genre

  const products = await getProducts({ genre })
  const container = document.getElementById('products-container')
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'product-list-view-inner'

  // Left column
  const left = document.createElement('div')
  left.className = 'plv-left'
  left.innerHTML = `<div class="plv-genre-title">${genre}</div>`

  // Right grid
  const right = document.createElement('div')
  right.className = 'plv-right'

  if (products.length === 0) {
    right.innerHTML = `<p style="padding:2rem;color:var(--color-text-muted);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.1em;grid-column:1/-1;">No records found.</p>`
  } else {
    products.forEach(album => {
      const card = document.createElement('div')
      card.className = 'plv-card'
      card.innerHTML = `
        <div class="plv-card-img-wrap">
          <a href="/detail.html?id=${album.id}">
            <img src="./images/${album.image}" alt="${album.title}" loading="lazy">
          </a>
        </div>
        <div class="plv-card-body">
          <div class="plv-card-title">${album.title}</div>
          <div class="plv-card-artist">${album.artist}</div>
          <div class="plv-card-price">$${Number(album.price).toFixed(2)}</div>
          <button class="main-btn add-btn plv-card-btn" data-id="${album.id}">Add to Cart</button>
        </div>
      `
      right.appendChild(card)
    })
  }

  wrapper.appendChild(left)
  wrapper.appendChild(right)
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