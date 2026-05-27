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
  const mainImg = document.querySelector('.img-main')

  // fade in split pieces
  topRight.style.opacity = '1'
  bottomLeft.style.opacity = '1'

  // hide main image
  mainImg.style.opacity = '0'

  // fly apart
  setTimeout(() => {
    topRight.classList.add('fly')
    bottomLeft.classList.add('fly')
  }, 50)

  setTimeout(() => {
    console.log('animation done — detail view next')
  }, 700)
}

// ===== Handling filtering =====

export async function applySearchFilter() {
  const search = document.getElementById('search-input').value.trim()
  const filters = {}
  if (search) filters.search = search
  const products = await getProducts(filters)
  renderProducts(products)
}
