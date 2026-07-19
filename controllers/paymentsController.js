import Stripe from 'stripe'
import { getDBConnection } from '../db/db.js'
import { calculateCartTotal } from '../public/js/cartTotal.js'

// Initialise once at module load — if the key is missing,
// the server will throw on startup rather than silently on first request.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in your .env file')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Amount must be a real, finite number of cents, at or above Stripe's ~$0.50 minimum.
// This only checks the amount is well-formed — amountMatchesCart() below is what
// actually verifies it matches the user's real cart total.
export function isValidAmount(amount) {
  return Boolean(amount) && Number.isFinite(amount) && amount >= 50
}

// Recomputes the cart total server-side (in cents, same rounding the frontend uses)
// and checks it against the amount the client is asking Stripe to charge — this is
// what stops a tampered/incorrect amount from a modified request.
export function amountMatchesCart(amount, cartItems) {
  const expectedAmount = Math.round(calculateCartTotal(cartItems) * 100)
  return amount === expectedAmount
}

export async function createPaymentIntent(req, res) {
  try {
    const { amount } = req.body

    if (!isValidAmount(amount)) {
      return res.status(400).json({ error: 'Invalid amount.' })
    }

    const db = await getDBConnection()
    const cartItems = await db.all(
      `SELECT p.price, ci.quantity
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ?`,
      [req.session.userId]
    )

    if (!amountMatchesCart(amount, cartItems)) {
      return res.status(400).json({ error: 'Amount does not match cart total.' })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount),   // already in cents from the frontend
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
    })

    res.json({ clientSecret: paymentIntent.client_secret })

  } catch (err) {
    console.error('Stripe error:', err)
    res.status(500).json({ error: err.message })
  }
}