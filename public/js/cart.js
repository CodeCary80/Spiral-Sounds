import { logout } from './logout.js'
import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js'

document.getElementById('logout-btn').addEventListener('click', logout)

const dom = {
  checkoutBtn:  document.getElementById('checkout-btn'),
  userMessage:  document.getElementById('user-message'),
  cartList:     document.getElementById('cart-list'),
  cartTotal:    document.getElementById('cart-total'),
  cartSubtotal: document.getElementById('cart-subtotal'),
}

// ===== Remove single item =====

dom.cartList.addEventListener('click', async event => {
  const btn = event.target.closest('.cart-item-remove')
  if (!btn) return
  await removeItem(btn.dataset.id)
})

// ===== Checkout =====

dom.checkoutBtn.addEventListener('click', async () => {
  await removeAll()
  showMessage('Your order has been sent for processing.')
  dom.checkoutBtn.classList.add('disabled')
  dom.checkoutBtn.disabled = true
})

// ===== Fetch & render cart =====

async function loadCart() {
  try {
    const res = await fetch('/api/cart/', { credentials: 'include' })

    if (!res.ok) {
      window.location.href = '/login.html'
      return
    }

    const { items } = await res.json()
    renderItems(items)
    renderSummary(items)
  } catch (err) {
    console.error('Error loading cart:', err)
    dom.cartList.innerHTML = `
      <li class="cart-empty">Unable to load cart. Please try again.</li>
    `
  }
}

function renderItems(items) {
  dom.cartList.innerHTML = ''

  if (items.length === 0) {
    dom.cartList.innerHTML = `
      <li class="cart-empty">Your basket is empty.</li>
    `
    return
  }

  items.forEach(item => {
    const itemTotal = (item.price * item.quantity).toFixed(2)
    const li = document.createElement('li')
    li.className = 'cart-item'
    const imgHTML = item.image
      ? `<img class="cart-item-img" src="./images/${item.image}" alt="${item.title}">`
      : `<div class="cart-item-img" style="background:var(--color-bg-light);"></div>`
    li.innerHTML = `
      ${imgHTML}
      <div class="cart-item-info">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-artist">${item.artist}</div>
        <div class="cart-item-qty">× ${item.quantity}</div>
      </div>
      <div class="cart-item-price">$${itemTotal}</div>
      <button
        class="cart-item-remove"
        data-id="${item.cartItemId}"
        aria-label="Remove ${item.title}"
      >✕</button>
    `
    dom.cartList.appendChild(li)
  })
}

function renderSummary(items) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const formatted = `$${total.toFixed(2)}`

  dom.cartTotal.textContent    = formatted
  dom.cartSubtotal.textContent = formatted

  const empty = total <= 0
  dom.checkoutBtn.disabled = empty
  dom.checkoutBtn.classList.toggle('disabled', empty)
}

function showMessage(text) {
  dom.userMessage.textContent    = text
  dom.userMessage.style.display  = 'block'
}

// ===== API calls =====

async function removeItem(itemId) {
  try {
    const res = await fetch(`/api/cart/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (res.status === 204) {
      await loadCart()
    } else {
      console.error('Error removing item:', await res.text())
    }
  } catch (err) {
    console.error('Error removing item:', err)
  }
}

async function removeAll() {
  try {
    const res = await fetch('/api/cart/all', {
      method: 'DELETE',
      credentials: 'include',
    })
    if (res.status === 204) {
      await loadCart()
    } else {
      console.error('Error clearing cart:', await res.text())
    }
  } catch (err) {
    console.error('Error clearing cart:', err)
  }
}

// ===== Init =====

async function init() {
  const name = await checkAuth()
  renderGreeting(name)
  showHideMenuItems(name)
  await loadCart()
}

init()