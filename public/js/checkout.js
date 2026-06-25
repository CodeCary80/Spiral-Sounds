/**
 * js/checkout.js  —  Stripe Payment Element for Spiral Sounds
 *
 * Test card: 4242 4242 4242 4242 | any future expiry | any CVC
 */

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51TgWi7CB3G5e1Zu6ne6SHHjqYtGdSXQBdEeViu9kVLdYB65qszWpY6I3dsREGfJvfienp3KAoJtXDft7j2GSYR8y00WqbxkyT3'

// ── Grab elements ─────────────────────────────────────────────────────────────

const checkoutBtn = document.getElementById('checkout-btn')
const paySection  = document.getElementById('payment-section')
const payBtn      = document.getElementById('pay-btn')
const payBtnText  = document.getElementById('pay-btn-text')
const payMessage  = document.getElementById('payment-message')



if (!checkoutBtn) {
  console.error('[checkout.js] ❌ #checkout-btn not found — checkout will not work')
} else if (!paySection) {
  console.error('[checkout.js] ❌ #payment-section not found — did you update cart.html?')
} else {
  console.log('[checkout.js] ✅ all elements found, attaching listener')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function showMessage(text, type = 'info') {
  if (!payMessage) return
  payMessage.textContent   = text
  payMessage.className     = `payment-message ${type}`
  payMessage.style.display = 'block'
}

function hideMessage() {
  if (payMessage) payMessage.style.display = 'none'
}

function setPayBtnLoading(loading) {
  if (!payBtn) return
  payBtn.disabled        = loading
  payBtnText.textContent = loading ? 'Processing…' : '↳ \u00a0Pay now'
}

// ── Step 1: Checkout button clicked ──────────────────────────────────────────

if (checkoutBtn) {
  checkoutBtn.addEventListener('click', async () => {
    console.log('[checkout.js] checkout button clicked')

    // Force-enable in case cart.js disabled it while still having items
    if (checkoutBtn.disabled) {
      console.warn('[checkout.js] button was disabled — check renderSummary in cart.js')
      return
    }

    const totalEl   = document.getElementById('cart-total')
    const totalText = totalEl?.textContent.replace(/[$,\s]/g, '').trim()
    const amount    = parseFloat(totalText)

    console.log('[checkout.js] parsed amount:', amount, '(raw text:', totalEl?.textContent, ')')

    if (!amount || amount <= 0) {
      alert('Your cart is empty or total is zero.')
      return
    }

    checkoutBtn.textContent = 'Loading payment…'
    checkoutBtn.disabled    = true

    try {
      console.log('[checkout.js] fetching /api/payments/create-intent with amount (cents):', Math.round(amount * 100))

      const res = await fetch('/api/payments/create-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: Math.round(amount * 100) }),
      })

      console.log('[checkout.js] response status:', res.status)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        console.error('[checkout.js] server error:', errData)
        throw new Error(errData.error || `Server error ${res.status}`)
      }

      const { clientSecret } = await res.json()
      console.log('[checkout.js] got clientSecret ✅')

      if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js not loaded — check the <script src="https://js.stripe.com/v3/"> tag in cart.html')
      }

      const stripe   = Stripe(STRIPE_PUBLISHABLE_KEY)
      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: 'flat',
          variables: {
            colorPrimary:    '#C0392B',
            colorBackground: '#F7F3EC',
            colorText:       '#1C1C1C',
            colorDanger:     '#C0392B',
            fontFamily:      '"neue-kabel-black", sans-serif',
            borderRadius:    '0px',
          },
          rules: {
            '.Input': { border: 'none', borderBottom: '1px solid #D4C9B8', padding: '8px 0', fontSize: '0.8rem', boxShadow: 'none' },
            '.Input:focus': { borderColor: '#1C1C1C', boxShadow: 'none' },
            '.Label': { fontSize: '0.55rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A7F72' },
          },
        },
      })

      const paymentElement = elements.create('payment')
      paymentElement.mount('#payment-element')
      paymentElement.on('ready', () => console.log('[checkout.js] PaymentElement ready ✅'))

      paySection.classList.add('visible')
      checkoutBtn.style.display = 'none'
      console.log('[checkout.js] payment form shown ✅')

      // ── Step 2: Pay button clicked ──────────────────────────────────────────

      payBtn.addEventListener('click', async () => {
        console.log('[checkout.js] pay button clicked')
        setPayBtnLoading(true)
        hideMessage()

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: `${window.location.origin}/` },
          redirect: 'if_required',
        })

        if (error) {
          console.error('[checkout.js] payment error:', error.message)
          showMessage(error.message, 'error')
          setPayBtnLoading(false)
          return
        }

        if (paymentIntent?.status === 'succeeded') {
          console.log('[checkout.js] payment succeeded ✅')
          showMessage('✓ Payment successful — thank you for your order!', 'success')
          payBtn.style.display = 'none'

          await fetch('/api/cart/all', { method: 'DELETE', credentials: 'include' }).catch(() => {})

          const cartListEl = document.getElementById('cart-list')
          const totalElUp  = document.getElementById('cart-total')
          const subElUp    = document.getElementById('cart-subtotal')
          if (cartListEl) cartListEl.innerHTML  = '<li class="cart-empty">Your basket is empty.</li>'
          if (totalElUp)  totalElUp.textContent  = '$0.00'
          if (subElUp)    subElUp.textContent    = '$0.00'

          setTimeout(() => { window.location.href = '/' }, 2200)
        }
      }, { once: true })  // once:true prevents duplicate listeners if user somehow re-opens

    } catch (err) {
      console.error('[checkout.js] ❌ error:', err.message)
      showMessage(err.message, 'error')
      checkoutBtn.textContent = 'Checkout →'
      checkoutBtn.disabled    = false
    }
  })
}