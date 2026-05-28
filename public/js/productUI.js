import { addBtnListeners } from './cartService.js'

// ===== Rendering products =====

export function renderProducts(products) {
  const albumsContainer = document.getElementById('products-container')
  const cards = products.map((album) => {
    return `
      <div class="product-card">
        <img src="./images/${album.image}" alt="${album.title}">
        <h2>${album.title}</h2>
        <h3 id="artist">${album.artist}</h3>
        <p>$${album.price}</p>
        <button class="main-btn add-btn" data-id="${album.id}">Add to Cart</button>
        <p class="genre-label">${album.genre}</p>
      </div>
    `
  }).join('')

  albumsContainer.innerHTML = cards
  addBtnListeners()
}

export function renderFeaturedAlbum(products) {
  const container = document.getElementById('products-container')
  
  const random = products[Math.floor(Math.random() * products.length)]
  
  container.innerHTML = `
  <div class="featured-album" id="featured-album" data-id="${random.id}">
    <div class="featured-mockup">
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
    <div class="featured-info">
      <h2 class="featured-title">${random.title}</h2>
      <h3 class="featured-artist">${random.artist}</h3>
    </div>
  </div>
`

  document.getElementById('featured-album').addEventListener('click', () => {
    triggerSplitAnimation(random)
  })
}

function triggerSplitAnimation(album) {
  const blockLeft     = document.querySelector('.block-left')
  const blockTopRight = document.querySelector('.block-top-right')
  const blockHero     = document.querySelector('.block-bottom-right')
  const mainImg       = document.querySelector('.img-main')
  const container     = document.getElementById('products-container')

  // Step 1: show all 3 blocks, hide main image
  blockLeft.style.opacity = '1'
  blockTopRight.style.opacity = '1'
  blockHero.style.opacity = '1'
  mainImg.style.opacity = '0'

  // Step 2: all 3 blocks fly out simultaneously
  setTimeout(() => {
  blockLeft.classList.add('fly-left')
}, 150)

setTimeout(() => {
  blockTopRight.classList.add('fly-top-right')
}, 400)

setTimeout(() => {
  blockHero.classList.add('fly-bottom-right')
}, 650)

  // Step 3: cream circle spawns from album center
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

  // Step 4: render detail view
  setTimeout(() => {
    renderDetailView(album)
  }, 1550)
}

function renderDetailView(album) {
  const container = document.getElementById('products-container')

  container.innerHTML = `
    <div class="detail-view">
      <div class="detail-img-wrap">
        <img src="./images/${album.image}" alt="${album.title}">
      </div>
      <div class="detail-info">
        <h2 class="detail-title">${album.title}</h2>
        <div class="detail-row">
          <span class="detail-label">ARTIST</span>
          <span class="detail-value">${album.artist}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">GENRE</span>
          <span class="detail-value">${album.genre}</span>
        </div>
        <div class="detail-price">$${album.price}</div>
        <button class="main-btn add-btn" data-id="${album.id}">Add to Cart</button>
      </div>
    </div>
  `
  addBtnListeners()
}

// ===== Handling filtering =====

export async function applySearchFilter() {
  const search = document.getElementById('search-input').value.trim()
  const filters = {}
  if (search) filters.search = search
  const products = await getProducts(filters)
  renderProducts(products)
}