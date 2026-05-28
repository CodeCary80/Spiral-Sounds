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
        <div class="img-split top-right">
          <img src="./images/${random.image}" alt="">
        </div>
        <div class="img-split bottom-left">
          <img src="./images/${random.image}" alt="">
        </div>
        <div class="img-split top-left">
          <img src="./images/${random.image}" alt="">
        </div>
        <div class="img-split bottom-right">
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
    console.log('clicked')
    triggerSplitAnimation(random)
  })
}

function triggerSplitAnimation(album) {
  const topRight = document.querySelector('.top-right')
  const bottomLeft = document.querySelector('.bottom-left')
  const topLeft = document.querySelector('.top-left')
  const bottomRight = document.querySelector('.bottom-right')
  const mainImg = document.querySelector('.img-main')

  // show all 4 pieces
  topRight.style.opacity = '1'
  bottomLeft.style.opacity = '1'
  topLeft.style.opacity = '1'
  bottomRight.style.opacity = '1'

  // hide main image
  mainImg.style.opacity = '0'

  // only fly the two outer corners
  setTimeout(() => {
    topRight.classList.add('fly')
    bottomLeft.classList.add('fly')
  }, 50)

  setTimeout(() => {
    renderDetailView(album)
  }, 700)
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
