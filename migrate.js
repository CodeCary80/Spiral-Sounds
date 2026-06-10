/**
 * migrate.js — one-time script to copy products from SQLite → Supabase
 *
 * Run BEFORE updating db.js:
 *   node migrate.js
 */

import { getDBConnection } from './db/db.js'   // still SQLite at this point
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const db = await getDBConnection()
const products = await db.all('SELECT * FROM products', [])
console.log(`Migrating ${products.length} products to Supabase…`)

for (const p of products) {
  await pool.query(
    `INSERT INTO products (title, artist, price, image, year, genre, stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [p.title, p.artist, p.price, p.image, p.year, p.genre, p.stock]
  )
}

console.log('✅ Migration complete!')
await pool.end()
process.exit(0)