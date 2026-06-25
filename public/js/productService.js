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

