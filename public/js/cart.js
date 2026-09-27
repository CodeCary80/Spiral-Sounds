// Bag / checkout page (redesign). Reference: design/mockups/cart.html.
// Payment: the server creates a PaymentIntent only if the amount matches the
// bag it recomputes itself; Stripe's Payment Element then collects the card.

import { initHeader, setBagCount } from './header.js'
import { getProducts } from './productService.js'
import { getCart, removeFromCart } from './cartApi.js'
import { calculateCartTotal } from './cartTotal.js'
import { handOffCover } from './handoff.js'

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51TgWi7CB3G5e1Zu6ne6SHHjqYtGdSXQBdEeViu9kVLdYB65qszWpY6I3dsREGfJvfienp3KAoJtXDft7j2GSYR8y00WqbxkyT3'

const main = document.getElementById('cart')
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const money = n => '$' + Number(n).toFixed(2)

let items = []
let catalogue = []
let stripe = null, elements = null   // live once the payment step is open

// ---------- states ----------

function picks() {
  // one record from each of four genres, skipping anything that was in the bag
  const skip = new Set(items.map(i => i.productId)), seen = new Set(), out = []
  for (const p of catalogue) {
    if (skip.has(p.id) || seen.has(p.genre)) continue
    seen.add(p.genre); out.push(p)
    if (out.length === 4) break
  }
  if (!out.length) return ''
  return `<section class="picks">
    <p class="caps">From the shelf</p>
    <div class="picks-grid">${out.map(p => `
      <a class="card" href="/detail.html?id=${p.id}" data-id="${p.id}" data-image="${esc(p.image)}">
        <div class="c" style="background-image:url('/images/${esc(p.image)}')"></div>
        <b>${esc(p.title)}</b><span>${esc(p.artist)}</span></a>`).join('')}</div>
  </section>`
}

function renderEmpty() {
  main.innerHTML = `<div class="state cart-empty">
    <p class="caps">Your bag</p>
    <h1 class="h1"><span class="ln"><span>Nothing here yet.</span></span></h1>
    <p class="lead">Every record in the shop was chosen by someone on staff. Start with a genre you love, or one you don’t know yet.</p>
    <a class="btn" href="/?genre=all">Browse the collection <span aria-hidden="true">↗</span></a>
    ${picks()}
  </div>`
}

function renderThanks(email) {
  main.innerHTML = `<div class="state">
    <p class="caps">Order placed</p>
    <h1 class="h1"><span class="ln"><span>Thank you.</span></span></h1>
    <p class="lead">Your records are being pulled from the shelf and packed up.${email ? ` A receipt is on its way to <b>${esc(email)}</b>.` : ''}</p>
    <a class="btn" href="/?genre=all">Keep digging <span aria-hidden="true">↗</span></a>
    ${picks()}
  </div>`
  scrollTo({ top: 0 })
}

function renderBag() {
  const qty = items.reduce((a, i) => a + i.quantity, 0)
  const total = calculateCartTotal(items)
  setBagCount(qty)
  if (!items.length) { renderEmpty(); return }

  main.innerHTML = `
    <section class="items" aria-label="Records in your bag">
      <div class="sub caps"><span>${qty} record${qty === 1 ? '' : 's'}</span><span>Price</span></div>
      ${items.map((i, n) => `
        <article class="line" style="--n:${n}" data-item="${i.cartItemId}">
          <a class="c" href="/detail.html?id=${i.productId}" data-id="${i.productId}" data-image="${esc(i.image)}" aria-label="${esc(i.title)}" style="background-image:url('/images/${esc(i.image)}')"></a>
          <div>
            <h3><a href="/detail.html?id=${i.productId}" data-id="${i.productId}" data-image="${esc(i.image)}">${esc(i.title)}</a></h3>
            <p class="artist">${esc(i.artist)}</p>
            ${i.quantity > 1 ? `<p class="meta caps">Qty ${i.quantity}</p>` : ''}
          </div>
          <div class="right">
            <div><span class="price">${money(i.quantity * Number(i.price))}</span>${i.quantity > 1 ? `<span class="each">${money(i.price)} each</span>` : ''}</div>
            <button class="remove" type="button" data-item="${i.cartItemId}" aria-label="Remove ${esc(i.title)}">Remove</button>
          </div>
        </article>`).join('')}
    </section>

    <aside class="summary" aria-label="Order summary"><div class="summary-in">
      <p class="caps">Order summary</p>
      <dl class="rows">
        <div><dt>Subtotal</dt><dd id="cart-subtotal">${money(total)}</dd></div>
        <div><dt>Shipping</dt><dd>Free</dd></div>
      </dl>
      <div class="total"><span class="caps">Total</span><strong id="cart-total">${money(total)}</strong></div>
      <button class="btn" id="checkout-btn" type="button">Checkout <span aria-hidden="true">→</span></button>
      <div class="pay" id="pay"><div><div class="pay-in">
        <p class="caps">Payment details</p>
        <div class="field">
          <label for="email">Email for your receipt <span class="opt">— optional</span></label>
          <input class="input" id="email" type="email" autocomplete="email" placeholder="you@example.com">
        </div>
        <div id="payment-element"></div>
        <p class="pay-msg" id="pay-msg" role="alert"></p>
        <p class="note">Test mode — use card 4242 4242 4242 4242, any future date and any CVC.</p>
        <button class="btn" id="pay-btn" type="button">Pay ${money(total)}</button>
      </div></div></div>
      <a class="link" id="continue" href="/?genre=all">← Continue shopping</a>
    </div></aside>`
}

// ---------- checkout ----------

async function openPayment(btn) {
  btn.disabled = true
  btn.textContent = 'Loading payment…'
  const msg = document.getElementById('pay-msg')
  try {
    const amount = Math.round(calculateCartTotal(items) * 100)
    const res = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ amount }),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error ${res.status}`)
    const { clientSecret } = await res.json()
    if (typeof Stripe === 'undefined') throw new Error('The payment form could not load. Please refresh and try again.')

    stripe = Stripe(STRIPE_PUBLISHABLE_KEY)
    elements = stripe.elements({
      clientSecret,
      fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600&display=swap' }],
      appearance: {
        theme: 'flat',
        variables: {
          colorPrimary: '#8b2e22', colorBackground: '#fbf9f6', colorText: '#1c1a17', colorTextSecondary: '#6b655c',
          colorDanger: '#8b2e22', fontFamily: '"Public Sans", sans-serif', borderRadius: '3px', spacingUnit: '4px',
        },
        rules: {
          '.Input': { border: '1px solid #ddd6cb', boxShadow: 'none' },
          '.Input:focus': { border: '1px solid #1c1a17', boxShadow: 'none' },
          '.Label': { color: '#6b655c', fontWeight: '500' },
        },
      },
    })
    elements.create('payment').mount('#payment-element')
    btn.hidden = true
    document.getElementById('continue').hidden = true
    document.getElementById('pay').classList.add('open')
  } catch (err) {
    btn.disabled = false
    btn.innerHTML = 'Checkout <span aria-hidden="true">→</span>'
    document.getElementById('pay').classList.add('open')
    msg.textContent = err.message
  }
}

async function pay(btn) {
  const box = document.getElementById('email')
  const msg = document.getElementById('pay-msg')
  const email = box.value.trim()
  msg.textContent = ''
  document.querySelector('.err')?.remove()
  // the email is optional, but if one is typed it has to look like an address
  if (email && !box.checkValidity()) {
    box.classList.add('bad')
    box.insertAdjacentHTML('afterend', '<p class="err">That email doesn’t look right — fix it or leave it blank.</p>')
    box.focus()
    return
  }
  btn.disabled = true
  btn.textContent = 'Processing…'
  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: `${location.origin}/cart.html`, ...(email ? { receipt_email: email } : {}) },
    redirect: 'if_required',
  })
  if (error) {
    msg.textContent = error.message
    btn.disabled = false
    btn.textContent = `Pay ${money(calculateCartTotal(items))}`
    return
  }
  if (paymentIntent?.status === 'succeeded') {
    await fetch('/api/cart/all', { method: 'DELETE', credentials: 'include' }).catch(() => {})
    setBagCount(0)
    renderThanks(email)
    items = []
  }
}

main.addEventListener('click', async e => {
  const rm = e.target.closest('.remove')
  if (rm) {
    const row = rm.closest('.line')
    row.classList.add('leaving')
    const [ok] = await Promise.all([removeFromCart(rm.dataset.item), new Promise(r => setTimeout(r, 280))])
    if (!ok) { row.classList.remove('leaving'); return }
    // the bag changed, so any open payment step is stale — re-render drops it
    items = items.filter(i => String(i.cartItemId) !== rm.dataset.item)
    renderBag()
    return
  }
  const link = e.target.closest('[data-image]')
  if (link) { handOffCover({ id: link.dataset.id, image: link.dataset.image }); return }
  if (e.target.closest('#checkout-btn')) { openPayment(e.target.closest('#checkout-btn')); return }
  if (e.target.closest('#pay-btn')) pay(e.target.closest('#pay-btn'))
})
main.addEventListener('input', e => {
  if (e.target.id !== 'email') return
  e.target.classList.remove('bad')
  document.querySelector('.err')?.remove()
})

// ---------- boot ----------

async function boot() {
  const [name, all] = await Promise.all([initHeader(), getProducts()])
  catalogue = all
  if (!name) { location.href = '/login.html?next=cart'; return }
  items = (await getCart()) || []
  renderBag()
}

boot()
