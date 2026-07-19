import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { getDBConnection } from '../db/db.js'

// Fixed test account — registered once in beforeAll, deleted once in afterAll,
// so re-running the suite never accumulates junk rows in the live users table.
const TEST_USER = {
  name:     'Cart Clear Test',
  email:    'cart-clear-test@spiralsounds.test',
  username: 'cartcleartest',
  password: 'Testpass123!',
}

describe('DELETE /api/cart/all', () => {

  const agent = request.agent(app) // persists the session cookie across requests
  let productId

  beforeAll(async () => {
    // Register — if the account survived a previous crashed run, fall back to login
    const registerRes = await agent.post('/api/auth/register').send(TEST_USER)

    if (registerRes.status !== 201) {
      await agent.post('/api/auth/login').send({
        username: TEST_USER.username,
        password: TEST_USER.password,
      })
    }

    const productsRes = await request(app).get('/api/products')
    productId = productsRes.body[0].id
  })

  afterAll(async () => {
    const db = await getDBConnection()
    const user = await db.get('SELECT id FROM users WHERE email = ?', [TEST_USER.email])

    if (user) {
      await db.run('DELETE FROM cart_items WHERE user_id = ?', [user.id])
      await db.run('DELETE FROM users WHERE id = ?', [user.id])
    }
  })

  it('empties the cart', async () => {
    await agent.post('/api/cart/add').send({ productId })

    const before = await agent.get('/api/cart')
    expect(before.body.items.length).toBeGreaterThan(0)

    const del = await agent.delete('/api/cart/all')
    expect(del.status).toBe(204)

    const after = await agent.get('/api/cart')
    expect(after.body.items).toEqual([])
  })

})
