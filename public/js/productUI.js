import { addBtnListeners } from './cartService.js'
import { getProducts } from './productService.js'

// ===== Render product grid =====

export function renderProducts(products) {
  const container = document.getElementById('products-container')
  if (!container) return

  if (products.length === 0) {
    container.innerHTML = `
      <p style="
        padding: 2rem;
        font-size: 0.8rem;
        color: var(--color-text-muted);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        grid-column: 1 / -1;
      ">No records found.</p>
    `
    return
  }

  container.innerHTML = products.map(album => `
    <div class="product-card">
      <a href="/detail.html?id=${album.id}" style="display:block;">
        <img
          src="./images/${album.image}"
          alt="${album.title}"
          loading="lazy"
        >
      </a>
      <span class="genre-label">${album.genre}</span>
      <h2>${album.title}</h2>
      <p class="artist-name">${album.artist}</p>
      <p>$${Number(album.price).toFixed(2)}</p>
      <button
        class="main-btn add-btn"
        data-id="${album.id}"
      >Add to Cart</button>
    </div>
  `).join('')

  addBtnListeners()
}

// ===== Search filter =====

export async function applySearchFilter() {
  const input = document.getElementById('search-input')
  if (!input) return

  const search = input.value.trim()
  const filters = search ? { search } : {}
  const products = await getProducts(filters)
  renderProducts(products)
}