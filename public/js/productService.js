// ===== Fetch products =====

export async function getProducts(filters = {}) {
  const queryParams = new URLSearchParams(filters)
  const res = await fetch(`/api/products?${queryParams}`)
  return await res.json()
}

// ===== Fetch genres =====

export async function getGenres() {
  const res = await fetch('/api/products/genres')
  return await res.json() // expects array of genre strings
}

// ===== Populate genre select (kept for backwards compat) =====

export async function populateGenreSelect() {
  const genres = await getGenres()
  const select = document.getElementById('genre-select')
  if (!select) return

  genres.forEach(genre => {
    const option = document.createElement('option')
    option.value = genre
    option.textContent = genre
    select.appendChild(option)
  })
}