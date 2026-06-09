import express from 'express'
import { createPaymentIntent } from '../controllers/paymentsController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const paymentsRouter = express.Router()

paymentsRouter.post('/create-intent', requireAuth, createPaymentIntent)