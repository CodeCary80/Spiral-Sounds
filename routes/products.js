import express from 'express'
import { getGenres, getProducts,getProductById  } from '../controllers/productsController.js'

export const productsRouter = express.Router()

productsRouter.get('/genres', getGenres)
productsRouter.get('/', getProducts)
productsRouter.get('/:id', getProductById)