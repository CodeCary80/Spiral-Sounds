// Thin wrappers around /api/cart. Every cart route requires a session, so a
// 401 means "logged out" rather than an error.

export async function getCart() {
  const res = await fetch('/api/cart', { credentials: 'include' })
  if (!res.ok) return null
  const { items } = await res.json()
  return items
}

export async function getCartCount() {
  const res = await fetch('/api/cart/cart-count', { credentials: 'include' })
  if (!res.ok) return 0
  const { totalItems } = await res.json()
  return Number(totalItems) || 0
}

// Resolves true when added; false when the visitor has to log in first.
export async function addToCart(productId) {
  const res = await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productId }),
  })
  return res.ok
}

export async function removeFromCart(cartItemId) {
  const res = await fetch(`/api/cart/${cartItemId}`, { method: 'DELETE', credentials: 'include' })
  return res.status === 204
}

// Sets one line's quantity. Resolves { ok, quantity } — on a stock limit the
// server answers 409 with the shelf count, returned here as `stock`.
export async function setQuantity(cartItemId, quantity) {
  const res = await fetch(`/api/cart/${cartItemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, ...data }
}
