import express from 'express'
import { completeOrder } from '../controllers/ordersController.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const ordersRouter = express.Router()

ordersRouter.post('/complete', requireAuth, completeOrder)
