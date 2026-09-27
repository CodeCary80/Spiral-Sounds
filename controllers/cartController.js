import { getDBConnection } from '../db/db.js'

export async function addToCart(req, res) {
  const db = await getDBConnection()

  const productId = parseInt(req.body.productId, 10)
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' })
  }

  const userId  = req.session.userId
  const existing = await db.get(
    'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
    [userId, productId]
  )

  if (existing) {
    await db.run('UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?', [existing.id])
  } else {
    await db.run(
      'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, 1)',
      [userId, productId]
    )
  }

  res.json({ message: 'Added to cart' })
}

export async function getCartCount(req, res) {
  const db = await getDBConnection()

  // Quote alias — PostgreSQL lowercases unquoted camelCase aliases
  const result = await db.get(
    `SELECT SUM(quantity) AS "totalItems" FROM cart_items WHERE user_id = ?`,
    [req.session.userId]
  )

  res.json({ totalItems: result?.totalItems || 0 })
}

export async function getAll(req, res) {
  const db = await getDBConnection()

  // Quote alias — cartItemId must stay camelCase for the frontend
  const items = await db.all(
    `SELECT ci.id AS "cartItemId", ci.product_id AS "productId", ci.quantity,
            p.title, p.artist, p.price, p.image, p.stock
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = ?`,
    [req.session.userId]
  )

  res.json({ items })
}

// Sets one line's quantity. 1..stock only — taking a line to zero is what
// DELETE /:itemId is for, and the bag can't hold more copies than the shelf.
export async function updateQuantity(req, res) {
  const db       = await getDBConnection()
  const itemId   = parseInt(req.params.itemId, 10)
  const quantity = req.body?.quantity

  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid item ID' })
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be a whole number of at least 1' })
  }

  const item = await db.get(
    `SELECT ci.id, p.stock
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.id = ? AND ci.user_id = ?`,
    [itemId, req.session.userId]
  )

  if (!item) {
    return res.status(404).json({ error: 'Item not found' })
  }
  if (quantity > Number(item.stock)) {
    return res.status(409).json({ error: `Only ${item.stock} left on the shelf`, stock: Number(item.stock) })
  }

  await db.run('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, itemId, req.session.userId])
  res.json({ cartItemId: itemId, quantity })
}

export async function deleteItem(req, res) {
  const db    = await getDBConnection()
  const itemId = parseInt(req.params.itemId, 10)

  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid item ID' })
  }

  const item = await db.get(
    'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
    [itemId, req.session.userId]
  )

  if (!item) {
    return res.status(400).json({ error: 'Item not found' })
  }

  await db.run('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [itemId, req.session.userId])
  res.status(204).send()
}

export async function deleteAll(req, res) {
  const db = await getDBConnection()
  await db.run('DELETE FROM cart_items WHERE user_id = ?', [req.session.userId])
  res.status(204).send()
}