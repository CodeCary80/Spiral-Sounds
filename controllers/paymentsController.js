import Stripe from 'stripe'

// Initialise once at module load — if the key is missing,
// the server will throw on startup rather than silently on first request.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in your .env file')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function createPaymentIntent(req, res) {
  try {
    const { amount } = req.body

    if (!amount || !Number.isFinite(amount) || amount < 50) {
      return res.status(400).json({ error: 'Invalid amount.' })
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