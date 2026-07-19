import 'dotenv/config'

import express from 'express'
import { productsRouter } from './routes/products.js'
import { authRouter } from './routes/auth.js'
import { meRouter } from './routes/me.js'
import { cartRouter } from './routes/cart.js'
import session from 'express-session'
import { paymentsRouter } from './routes/payments.js'

const app = express()
const secret = process.env.SPIRAL_SESSION_SECRET || 'jellyfish-baskingshark'

app.use(express.json())

app.use(session({
  secret: secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}))

app.use(express.static('public'))

app.use('/api/products', productsRouter)

app.use('/api/auth/me', meRouter)

app.use('/api/auth', authRouter)

app.use('/api/cart', cartRouter)

app.use('/api/payments', paymentsRouter)

export { app }
