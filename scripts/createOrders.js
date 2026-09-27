// One-off, re-runnable migration: adds the orders tables used by
// POST /api/orders/complete. Additive only — nothing existing is altered.
//   node scripts/createOrders.js
import 'dotenv/config'
import { getDBConnection } from '../db/db.js'

export const ORDERS_SQL = [
  // One row per Stripe PaymentIntent. The UNIQUE constraint is what makes
  // completing an order idempotent: a retried or doubled request can't insert twice.
  `CREATE TABLE IF NOT EXISTS public.orders (
     id                SERIAL PRIMARY KEY,
     user_id           INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
     payment_intent_id TEXT    NOT NULL UNIQUE,
     amount_cents      INTEGER NOT NULL,
     status            TEXT    NOT NULL CHECK (status IN ('paid', 'refunded')),
     created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS public.order_items (
     id         SERIAL PRIMARY KEY,
     order_id   INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
     product_id INTEGER NOT NULL REFERENCES public.products(id),
     quantity   INTEGER NOT NULL CHECK (quantity > 0),
     unit_price NUMERIC NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id)`,
]

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = await getDBConnection()
  await db.transaction(async tx => { for (const sql of ORDERS_SQL) await tx.run(sql) })
  console.log('orders tables ready')
  process.exit(0)
}
