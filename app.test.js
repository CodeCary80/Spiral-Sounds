import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'

describe('requireAuth — protected routes reject unauthenticated requests', () => {

  it('POST /api/payments/create-intent returns 401 with no session', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .send({ amount: 1000 })

    expect(res.status).toBe(401)
  })

  it('GET /api/cart returns 401 with no session', async () => {
    const res = await request(app).get('/api/cart')

    expect(res.status).toBe(401)
  })

})
