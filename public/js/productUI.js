import { addBtnListeners } from './cartService.js'
import { getProducts } from './productService.js'

// ===== Render product grid =====

export function renderProducts(products) {
  const albumsContainer = document.getElementById('products-container')
  albumsContainer.classList.remove('detail-mode')
  albumsContainer.style.position = ''
  const cards = products.map((album) => {
    return `
      <div class="product-card">
        <img src="./images/${album.image}" alt="${album.title}">
        <h2>${album.title}</h2>
        <h3 class="artist-name">${album.artist}</h3>
        <p>$${album.price}</p>
        <button class="main-btn add-btn" data-id="${album.id}">Add to Cart</button>
        <p class="genre-label">${album.genre}</p>
      </div>
    `
  }).join('')

  albumsContainer.innerHTML = cards
  addBtnListeners()
}

// ===== Render Today's Pick strip =====

export function renderHeaderPick(products) {
  const pickEl = document.getElementById('header-pick')
  if (!pickEl) return

  const random = products[Math.floor(Math.random() * products.length)]

  pickEl.innerHTML = `
    <div class="header-pick-inner" id="header-pick-trigger" data-id="${random.id}">

      <div class="header-pick-tag">Today's Pick</div>
      <div class="header-pick-divider"></div>

      <!-- Tiny vinyl mockup -->
      <div class="header-pick-mockup">
        <div class="vinyl-disc">
          <div class="vinyl-label"></div>
        </div>
        <div class="featured-img-wrap" id="featured-img-wrap">
          <img src="./images/${random.image}" alt="${random.title}" class="img-main">
          <div class="img-split block-left">
            <img src="./images/${random.image}" alt="">
          </div>
          <div class="img-split block-top-right">
            <img src="./images/${random.image}" alt="">
          </div>
          <div class="img-split block-bottom-right">
            <img src="./images/${random.image}" alt="">
          </div>
        </div>
      </div>

      <!-- Album info -->
      <div class="header-pick-info">
        <span class="header-pick-title">${random.title}</span>
        <span class="header-pick-artist">${random.artist}</span>
        <span class="header-pick-genre">${random.genre}</span>
      </div>

      <div class="header-pick-cta">Click to explore →</div>

    </div>
  `

  document.getElementById('header-pick-trigger').addEventListener('click', () => {
    triggerSplitAnimation(random)
  })
}

// ===== Split animation =====

function triggerSplitAnimation(album) {
  const blockLeft     = document.querySelector('.block-left')
  const blockTopRight = document.querySelector('.block-top-right')
  const blockHero     = document.querySelector('.block-bottom-right')
  const mainImg       = document.querySelector('.img-main')
  const container     = document.getElementById('products-container')

  // Scroll to products container so wipe is visible
  container.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Step 1: show all 3 blocks, hide main image
  blockLeft.style.opacity = '1'
  blockTopRight.style.opacity = '1'
  blockHero.style.opacity = '1'
  mainImg.style.opacity = '0'

  // Step 2: sequential fly-out
  setTimeout(() => { blockLeft.classList.add('fly-left') }, 150)
  setTimeout(() => { blockTopRight.classList.add('fly-top-right') }, 400)
  setTimeout(() => { blockHero.classList.add('fly-bottom-right') }, 650)

  // Step 3: wipe circle spawns in products-container center
  setTimeout(() => {
    const overlay = document.createElement('div')
    overlay.className = 'wipe-overlay'
    container.style.position = 'relative'
    container.appendChild(overlay)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('wipe-expand')
      })
    })
  }, 850)

  // Step 4: render detail view, clean up split blocks
  setTimeout(() => {
    document.querySelectorAll('.img-split').forEach(el => el.remove())
    container.classList.add('detail-mode')
    renderDetailView(album)
  }, 1550)
}

// ===== Detail view =====

function renderDetailView(album) {
  const container = document.getElementById('products-container')

  container.innerHTML = `
    <div class="detail-wrapper">
      <div class="detail-view">
        <div class="detail-img-wrap">
          <img src="./images/${album.image}" alt="${album.title}">
        </div>
        <div class="detail-info">
          <h2 class="detail-title">${album.title}</h2>
          <div class="detail-meta">
            <div class="detail-meta-row">
              <span class="detail-meta-value">${album.artist}</span>
              <span class="detail-meta-label">ARTIST</span>
            </div>
            <div class="detail-meta-row">
              <span class="detail-meta-value">${album.genre}</span>
              <span class="detail-meta-label">GENRE</span>
            </div>
          </div>
          <div class="detail-price">$${album.price}</div>
          <button class="detail-cart-btn add-btn" data-id="${album.id}">
            ADD TO CART <span class="detail-cart-arrow">&#8594;</span>
          </button>
        </div>
      </div>
      <div class="detail-accordion">
        <div class="accordion-item">
          <button class="accordion-trigger">
            ABOUT THE ARTIST
            <span class="accordion-icon">+</span>
          </button>
          <div class="accordion-body">
            <p>${album.artist} is a recording artist known for their distinctive sound and genre-defining work. Their music has influenced countless artists and continues to resonate with audiences worldwide.</p>
          </div>
        </div>
        <div class="accordion-item">
          <button class="accordion-trigger">
            ABOUT THIS ALBUM
            <span class="accordion-icon">+</span>
          </button>
          <div class="accordion-body">
            <p>This album represents a landmark moment in ${album.genre} music. Recorded with meticulous attention to detail, every track tells a story that unfolds across the full listening experience.</p>
          </div>
        </div>
      </div>
    </div>
  `

  addBtnListeners()

  document.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.parentElement
      const isOpen = item.classList.contains('open')
      document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'))
      document.querySelectorAll('.accordion-icon').forEach(i => i.textContent = '+')
      if (!isOpen) {
        item.classList.add('open')
        trigger.querySelector('.accordion-icon').textContent = '—'
      }
    })
  })
}

// ===== Search filter =====

export async function applySearchFilter() {
  const search = document.getElementById('search-input').value.trim()
  const filters = {}
  if (search) filters.search = search
  const products = await getProducts(filters)
  renderProducts(products)
}