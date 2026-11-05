import express from 'express'
import { getGenres, getProducts, getProductById, getFeatured } from '../controllers/productsController.js'

export const productsRouter = express.Router()

productsRouter.get('/genres', getGenres)
productsRouter.get('/featured', getFeatured)
productsRouter.get('/', getProducts)
productsRouter.get('/:id', getProductById)