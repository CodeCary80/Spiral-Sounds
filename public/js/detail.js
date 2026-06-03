import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'
import { addBtnListeners, updateCartIcon } from './cartService.js'

document.getElementById('logout-btn').addEventListener('click', logout)

// ===== Render detail view =====

function renderDetail(album) {
  const main = document.getElementById('detail-main')

  // Update page title
  document.title = `${album.title} — Spiral Sounds`

  main.innerHTML = `
    <div class="detail-wrapper">

      <!-- Left: cover + purchase -->
      <div class="detail-left">
        <img
          class="detail-cover"
          src="./images/${album.image}"
          alt="${album.title}"
        >
        <div class="detail-purchase">
          <div class="detail-price">$${Number(album.price).toFixed(2)}</div>
          <button
            class="detail-cart-btn add-btn"
            data-id="${album.id}"
          >
            Add to Cart
            <span class="detail-cart-arrow">→</span>
          </button>
        </div>
      </div>

      <!-- Right: info -->
      <div class="detail-right">

        <span class="detail-genre-tag">${album.genre}</span>

        <div>
          <h1 class="detail-title">${album.title}</h1>
          <p class="detail-artist">${album.artist}</p>
        </div>

        <div class="detail-divider"></div>

        <div class="detail-meta">
          ${album.label ? `
          <div class="detail-meta-row">
            <span class="detail-meta-key">Label</span>
            <span class="detail-meta-val">${album.label}</span>
          </div>` : ''}
          ${album.year ? `
          <div class="detail-meta-row">
            <span class="detail-meta-key">Year</span>
            <span class="detail-meta-val">${album.year}</span>
          </div>` : ''}
          ${album.format ? `
          <div class="detail-meta-row">
            <span class="detail-meta-key">Format</span>
            <span class="detail-meta-val">${album.format}</span>
          </div>` : ''}
          ${album.condition ? `
          <div class="detail-meta-row">
            <span class="detail-meta-key">Condition</span>
            <span class="detail-meta-val">${album.condition}</span>
          </div>` : ''}
        </div>

        <div class="detail-divider"></div>

        <!-- Tracklist — shown only if data exists -->
        ${album.tracklist && album.tracklist.length > 0 ? `
        <div class="detail-tracklist">
          <div class="detail-tracklist-label">Tracklist</div>
          ${album.tracklist.map((track, i) => `
            <div class="detail-track">
              <span class="detail-track-num">${String(i + 1).padStart(2, '0')}</span>
              <span class="detail-track-name">${track.title}</span>
              ${track.duration ? `<span class="detail-track-time">${track.duration}</span>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

      </div>
    </div>
  `

  addBtnListeners()
}

// ===== Error state =====

function renderError() {
  document.getElementById('detail-main').innerHTML = `
    <div style="padding:3rem 2rem; text-align:center;">
      <p style="font-size:0.9rem; color:var(--color-text-muted); letter-spacing:0.1em; text-transform:uppercase;">
        Album not found.
      </p>
      <a href="/" style="
        display:inline-block;
        margin-top:1.5rem;
        font-size:0.7rem;
        letter-spacing:0.15em;
        text-transform:uppercase;
        color:var(--color-accent);
      ">← Back to Store</a>
    </div>
  `
}

// ===== Init =====

async function init() {
  const name = await checkAuth()
  renderGreeting(name)
  showHideMenuItems(name)
  if (name) await updateCartIcon()

  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')

  if (!id) {
    renderError()
    return
  }

  try {
    const res = await fetch(`/api/products/${id}`)
    if (!res.ok) {
      renderError()
      return
    }
    const album = await res.json()
    renderDetail(album)
  } catch (err) {
    console.error('Failed to load album:', err)
    renderError()
  }
}

init()