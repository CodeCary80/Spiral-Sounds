import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { getDBConnection } from '../db/db.js'
import { stripe } from './paymentsController.js'

// Runs against Stripe test mode and the real database. Uses its own test
// record (so no real record's stock changes) and fixed test accounts; all of
// it — users, orders, bags and the record — is removed in afterAll.
const BUYER = { name: 'Order Test', email: 'order-test@spiralsounds.test', username: 'ordertest', password: 'Testpass123!' }
const RIVAL = { name: 'Order Rival', email: 'order-rival@spiralsounds.test', username: 'orderrival', password: 'Testpass123!' }
const TEST_TITLE = '__order test record__'

let db, productId, price
const buyer = request.agent(app)
const rival = request.agent(app)

async function signIn(agent, user) {
  const res = await agent.post('/api/auth/register').send(user)
  if (res.status !== 201) await agent.post('/api/auth/login').send({ username: user.username, password: user.password })
}
const stockNow = async () => Number((await db.get('SELECT stock FROM products WHERE id = ?', [productId])).stock)
const setStock = n => db.run('UPDATE products SET stock = ? WHERE id = ?', [n, productId])

// Put `qty` of the test record in the agent's bag, open a PaymentIntent for it
// and pay it with Stripe's test card, the way the Payment Element would.
async function paidIntent(agent, qty = 1) {
  await agent.delete('/api/cart/all')
  await agent.post('/api/cart/add').send({ productId })
  if (qty > 1) {
    const line = (await agent.get('/api/cart')).body.items[0]
    await agent.patch(`/api/cart/${line.cartItemId}`).send({ quantity: qty })
  }
  const res = await agent.post('/api/payments/create-intent').send({ amount: Math.round(price * qty * 100) })
  expect(res.status).toBe(200)
  const id = res.body.clientSecret.split('_secret_')[0]
  await stripe.paymentIntents.confirm(id, { payment_method: 'pm_card_visa', return_url: 'https://example.com' })
  return id
}

describe('orders and stock', () => {
  beforeAll(async () => {
    db = await getDBConnection()
    await db.run(`DELETE FROM products WHERE title = ?`, [TEST_TITLE])   // leftovers from a crashed run
    const row = await db.get(
      `INSERT INTO products (title, artist, price, image, year, genre, stock) VALUES (?, 'Test', 25, 'vinyl1.jpg', 2026, 'test', 5) RETURNING id, price`,
      [TEST_TITLE]
    )
    productId = row.id
    price = Number(row.price)
    await signIn(buyer, BUYER)
    await signIn(rival, RIVAL)
  }, 30000)

  afterAll(async () => {
    for (const u of [BUYER, RIVAL]) {
      const row = await db.get('SELECT id FROM users WHERE email = ?', [u.email])
      if (row) {
        await db.run('DELETE FROM cart_items WHERE user_id = ?', [row.id])
        await db.run('DELETE FROM users WHERE id = ?', [row.id])   // cascades to orders + order_items
      }
    }
    await db.run('DELETE FROM products WHERE id = ?', [productId])
  }, 30000)

  beforeEach(() => setStock(5))

  it('add to bag stops at the stock on the shelf', async () => {
    await setStock(1)
    await buyer.delete('/api/cart/all')
    expect((await buyer.post('/api/cart/add').send({ productId })).status).toBe(200)
    const res = await buyer.post('/api/cart/add').send({ productId })
    expect(res.status).toBe(409)
    expect(res.body.stock).toBe(1)
  })

  it('rejects malformed, unpaid and other people’s payments', async () => {
    expect((await buyer.post('/api/orders/complete').send({ paymentIntentId: 'nope' })).status).toBe(400)

    await buyer.delete('/api/cart/all')
    await buyer.post('/api/cart/add').send({ productId })
    const created = await buyer.post('/api/payments/create-intent').send({ amount: Math.round(price * 100) })
    const unpaid = created.body.clientSecret.split('_secret_')[0]
    expect((await buyer.post('/api/orders/complete').send({ paymentIntentId: unpaid })).status).toBe(409)

    const paid = await paidIntent(buyer)
    expect((await rival.post('/api/orders/complete').send({ paymentIntentId: paid })).status).toBe(403)
    expect(await stockNow()).toBe(5)
  }, 60000)

  it('records the order, takes the stock and clears the bag — once, however often it is called', async () => {
    const pi = await paidIntent(buyer, 2)

    // two at the same time, then a late retry
    const [a, b] = await Promise.all([
      buyer.post('/api/orders/complete').send({ paymentIntentId: pi }),
      buyer.post('/api/orders/complete').send({ paymentIntentId: pi }),
    ])
    const again = await buyer.post('/api/orders/complete').send({ paymentIntentId: pi })

    expect([a.status, b.status].sort()).toEqual([200, 201])
    expect(again.status).toBe(200)
    expect(new Set([a.body.orderId, b.body.orderId, again.body.orderId]).size).toBe(1)
    expect(await stockNow()).toBe(3)
    expect((await buyer.get('/api/cart')).body.items).toEqual([])

    const lines = await db.all('SELECT quantity FROM order_items WHERE order_id = ?', [a.body.orderId])
    expect(lines).toEqual([{ quantity: 2 }])
  }, 60000)

  it('refunds when the record sells out mid-payment, and leaves the stock alone', async () => {
    const pi = await paidIntent(buyer)
    await setStock(0)                                   // someone else got there first

    const res = await buyer.post('/api/orders/complete').send({ paymentIntentId: pi })
    expect(res.status).toBe(409)
    expect(res.body.status).toBe('refunded')
    expect(await stockNow()).toBe(0)
    expect((await buyer.get('/api/cart')).body.items.length).toBe(1)   // rolled back, bag untouched

    const refunds = await stripe.refunds.list({ payment_intent: pi })
    expect(refunds.data.length).toBe(1)

    // a retry reports the refund without refunding twice
    expect((await buyer.post('/api/orders/complete').send({ paymentIntentId: pi })).body.status).toBe('refunded')
    expect((await stripe.refunds.list({ payment_intent: pi })).data.length).toBe(1)
  }, 60000)

  it('two buyers, one copy: exactly one gets it, the other is refunded', async () => {
    await setStock(1)
    const [p1, p2] = [await paidIntent(buyer), await paidIntent(rival)]

    const results = await Promise.all([
      buyer.post('/api/orders/complete').send({ paymentIntentId: p1 }),
      rival.post('/api/orders/complete').send({ paymentIntentId: p2 }),
    ])
    expect(results.map(r => r.status).sort()).toEqual([201, 409])
    expect(await stockNow()).toBe(0)
  }, 90000)
})
