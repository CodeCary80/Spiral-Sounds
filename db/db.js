import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'node:path'
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Convert SQLite ? placeholders → PostgreSQL $1, $2, …
function toPostgres(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

// get / all / run over any "queryable" — the pool (each call may use a
// different connection) or one checked-out client (inside a transaction).
function wrap(q) {
  return {
    // Returns a single row or null
    async get(sql, params = []) {
      const { rows } = await q.query(toPostgres(sql), params)
      return rows[0] ?? null
    },

    // Returns an array of rows
    async all(sql, params = []) {
      const { rows } = await q.query(toPostgres(sql), params)
      return rows
    },

    // Executes INSERT / UPDATE / DELETE
    // Automatically appends RETURNING id for INSERT so result.lastID keeps working
    async run(sql, params = []) {
      const pgSql    = toPostgres(sql)
      const isInsert = /^\s*INSERT/i.test(pgSql)
      const finalSql = isInsert && !/RETURNING/i.test(pgSql)
        ? `${pgSql} RETURNING id`
        : pgSql
      const { rows, rowCount } = await q.query(finalSql, params)
      return { lastID: rows[0]?.id, changes: rowCount }
    },
  }
}

// Drop-in replacement for the old SQLite db object.
// Controllers call getDBConnection() and use db.get/all/run exactly as before.
const db = {
  ...wrap(pool),

  // Runs fn(tx) on a single connection inside BEGIN/COMMIT; any throw rolls
  // every statement back. tx has the same get/all/run API.
  async transaction(fn) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(wrap(client))
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }
  },
}

// Same function name as before — controllers import this unchanged
export async function getDBConnection() {
  return db
}
