import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { getDBConnection } from '../db/db.js'

// Fixed test accounts — registered in beforeAll, deleted in afterAll, so
// re-running never leaves rows behind in the live users table.
const OWNER = { name: 'Qty Test', email: 'cart-qty-test@spiralsounds.test', username: 'cartqtytest', password: 'Testpass123!' }
const OTHER = { name: 'Qty Other', email: 'cart-qty-other@spiralsounds.test', username: 'cartqtyother', password: 'Testpass123!' }

async function signIn(agent, user) {
  const res = await agent.post('/api/auth/register').send(user)
  if (res.status !== 201) await agent.post('/api/auth/login').send({ username: user.username, password: user.password })
}

describe('PATCH /api/cart/:itemId', () => {
  const owner = request.agent(app)
  const other = request.agent(app)
  let item    // the owner's cart line: { cartItemId, stock, ... }

  beforeAll(async () => {
    await signIn(owner, OWNER)
    await signIn(other, OTHER)
    await owner.delete('/api/cart/all')
    const products = await request(app).get('/api/products')
    await owner.post('/api/cart/add').send({ productId: products.body[0].id })
    item = (await owner.get('/api/cart')).body.items[0]
  })

  afterAll(async () => {
    const db = await getDBConnection()
    for (const u of [OWNER, OTHER]) {
      const row = await db.get('SELECT id FROM users WHERE email = ?', [u.email])
      if (row) {
        await db.run('DELETE FROM cart_items WHERE user_id = ?', [row.id])
        await db.run('DELETE FROM users WHERE id = ?', [row.id])
      }
    }
  })

  it('sets the quantity of a line', async () => {
    const res = await owner.patch(`/api/cart/${item.cartItemId}`).send({ quantity: 3 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ cartItemId: item.cartItemId, quantity: 3 })

    const cart = await owner.get('/api/cart')
    expect(cart.body.items[0].quantity).toBe(3)
  })

  it('rejects zero, negatives and non-integers', async () => {
    for (const quantity of [0, -1, 1.5, '2', null]) {
      const res = await owner.patch(`/api/cart/${item.cartItemId}`).send({ quantity })
      expect(res.status).toBe(400)
    }
  })

  it('will not go past the stock on the shelf', async () => {
    const res = await owner.patch(`/api/cart/${item.cartItemId}`).send({ quantity: Number(item.stock) + 1 })
    expect(res.status).toBe(409)
    expect(res.body.stock).toBe(Number(item.stock))
  })

  it("cannot change another user's line", async () => {
    const res = await other.patch(`/api/cart/${item.cartItemId}`).send({ quantity: 2 })
    expect(res.status).toBe(404)
  })

  it('requires a session', async () => {
    const res = await request(app).patch(`/api/cart/${item.cartItemId}`).send({ quantity: 2 })
    expect(res.status).toBe(401)
  })
})
