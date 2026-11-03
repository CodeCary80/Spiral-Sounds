import express from 'express'
import { getLyrics } from '../controllers/lyricsController.js'

export const lyricsRouter = express.Router()

lyricsRouter.get('/', getLyrics)
