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
      <div class="featured-img-wrap">
        <img src="./images/${random.image}" alt="${random.title}">
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

// ===== Handling filtering =====

export async function applySearchFilter() {
  const search = document.getElementById('search-input').value.trim()
  const filters = {}
  if (search) filters.search = search
  const products = await getProducts(filters)
  renderProducts(products)
}
