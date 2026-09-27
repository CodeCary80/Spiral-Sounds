import { getDBConnection } from '../db/db.js'
import { stripe, decodeItems } from './paymentsController.js'

// Thrown inside the transaction when a record can't cover its quantity.
class OutOfStock extends Error {
  constructor(title) { super(`“${title}” sold out while you were paying`); this.title = title }
}

const UNIQUE_VIOLATION = '23505'

// POST /api/orders/complete { paymentIntentId }
//
// Called by the bag page after Stripe confirms a payment. Nothing the browser
// says is trusted: the server asks Stripe whether the payment really succeeded,
// for this user, and for which records. Then, in one transaction, it records
// the order, takes the stock and clears those lines from the bag.
//
//  - idempotent: orders.payment_intent_id is UNIQUE, so a retry, refresh or
//    double click can't record (or decrement) twice — it just gets the order back
//  - no overselling: each decrement is a single conditional UPDATE
//    (… WHERE stock >= n), so two buyers of the last copy can't both win
//  - if a record sold out mid-payment, everything rolls back and the payment
//    is refunded in full
export async function completeOrder(req, res) {
  const userId = req.session.userId
  const paymentIntentId = req.body?.paymentIntentId
  if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'Invalid payment reference.' })
  }

  const db = await getDBConnection()

  // Already recorded? Return it as-is (the idempotent path).
  const existing = await db.get('SELECT id, status FROM orders WHERE payment_intent_id = ?', [paymentIntentId])
  if (existing) return respondWith(res, existing, userId, db)

  let intent
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch {
    return res.status(404).json({ error: 'Payment not found.' })
  }
  if (intent.metadata?.userId !== String(userId)) {
    return res.status(403).json({ error: 'This payment belongs to another account.' })
  }
  if (intent.status !== 'succeeded') {
    return res.status(409).json({ error: 'Payment has not gone through.' })
  }

  const items = decodeItems(intent.metadata.items)
  try {
    const order = await db.transaction(async tx => {
      // Insert first: a concurrent request for the same payment blocks on the
      // unique index here and then fails, instead of decrementing again.
      const { lastID: orderId } = await tx.run(
        `INSERT INTO orders (user_id, payment_intent_id, amount_cents, status) VALUES (?, ?, ?, 'paid')`,
        [userId, paymentIntentId, intent.amount]
      )
      for (const { productId, quantity } of items) {
        const taken = await tx.get(
          `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ? RETURNING price`,
          [quantity, productId, quantity]
        )
        if (!taken) {
          const p = await tx.get('SELECT title FROM products WHERE id = ?', [productId])
          throw new OutOfStock(p?.title || 'A record')
        }
        await tx.run(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
          [orderId, productId, quantity, taken.price]
        )
      }
      // clear only what was paid for — anything added in another tab stays
      const ids = items.map(i => i.productId)
      if (ids.length) {
        await tx.run(
          `DELETE FROM cart_items WHERE user_id = ? AND product_id IN (${ids.map(() => '?').join(', ')})`,
          [userId, ...ids]
        )
      }
      return { id: orderId, status: 'paid' }
    })
    return res.status(201).json({ orderId: order.id, status: order.status })
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      // lost the race to a concurrent request for this same payment
      const order = await db.get('SELECT id, status FROM orders WHERE payment_intent_id = ?', [paymentIntentId])
      return respondWith(res, order, userId, db)
    }
    if (err instanceof OutOfStock) return refund(res, db, { userId, paymentIntentId, intent, message: err.message })
    console.error('Order completion error:', err)
    return res.status(500).json({ error: 'Could not record the order. Your payment is safe — please contact us.' })
  }
}

// Record the refund first (the unique index again keeps it single), then refund.
async function refund(res, db, { userId, paymentIntentId, intent, message }) {
  try {
    await db.run(
      `INSERT INTO orders (user_id, payment_intent_id, amount_cents, status) VALUES (?, ?, ?, 'refunded')`,
      [userId, paymentIntentId, intent.amount]
    )
  } catch (err) {
    if (err.code !== UNIQUE_VIOLATION) throw err
    const order = await db.get('SELECT id, status FROM orders WHERE payment_intent_id = ?', [paymentIntentId])
    return respondWith(res, order, userId, db)
  }
  await stripe.refunds.create({ payment_intent: paymentIntentId })
  return res.status(409).json({ status: 'refunded', error: `${message}. Your payment has been refunded in full.` })
}

async function respondWith(res, order, userId, db) {
  const owner = await db.get('SELECT user_id FROM orders WHERE id = ?', [order.id])
  if (String(owner.user_id) !== String(userId)) {
    return res.status(403).json({ error: 'This payment belongs to another account.' })
  }
  return order.status === 'refunded'
    ? res.status(409).json({ status: 'refunded', orderId: order.id, error: 'This payment was refunded.' })
    : res.status(200).json({ orderId: order.id, status: order.status })
}
