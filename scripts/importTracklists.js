// One-off maintenance script — not part of the running app.
// Backfills the `tracklist` column for existing products by looking up each
// album's real songs from the iTunes Search/Lookup API (no auth key needed).
//
// Usage:
//   node scripts/importTracklists.js --dry-run   (fetch + print, no DB writes)
//   node scripts/importTracklists.js             (writes tracklist JSON)

import 'dotenv/config'
import { getDBConnection } from '../db/db.js'

function tokens(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function normalized(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Re-locate the album's iTunes collectionId. Titles/artists in our DB came
// straight from a prior iTunes import, so an exact title match is reliable.
async function findCollectionId(title, artist) {
  const term = encodeURIComponent(`${artist} ${title}`)
  const url = `https://itunes.apple.com/search?term=${term}&entity=album&limit=10`
  const res = await fetch(url)
  const data = await res.json()

  const wantedArtistTokens = tokens(artist)
  const wantedTitle = normalized(title)

  const candidates = data.results.filter(r => {
    const gotArtistTokens = tokens(r.artistName)
    return wantedArtistTokens.every(t => gotArtistTokens.includes(t))
  })

  const exact = candidates.find(r => normalized(r.collectionName) === wantedTitle)
  return (exact ?? candidates[0])?.collectionId ?? null
}

function formatDuration(ms) {
  if (!ms) return null
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

async function fetchTracklist(collectionId) {
  const url = `https://itunes.apple.com/lookup?id=${collectionId}&entity=song`
  const res = await fetch(url)
  const data = await res.json()

  return data.results
    .filter(r => r.wrapperType === 'track' && r.kind === 'song')
    .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
    .map(t => ({ title: t.trackName, duration: formatDuration(t.trackTimeMillis) }))
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// iTunes rate-limits fairly aggressively and returns either plain-text
// "Rate limit..." or a truncated/empty body (bad JSON) when throttled.
// Retry with backoff instead of treating those as permanent failures.
async function withRetry(fn, attempts = 6, baseDelay = 3000) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === attempts - 1) throw err
      await sleep(baseDelay * (i + 1))
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const db = await getDBConnection()
  const products = await db.all('SELECT id, title, artist FROM products ORDER BY id')

  for (const p of products) {
    try {
      const collectionId = await withRetry(() => findCollectionId(p.title, p.artist))
      if (!collectionId) {
        console.log(`[MISS] #${p.id} ${p.title} — ${p.artist} — no iTunes match`)
        await sleep(1000)
        continue
      }

      await sleep(1000)
      const tracklist = await withRetry(() => fetchTracklist(collectionId))
      await sleep(1000)

      if (!tracklist.length) {
        console.log(`[EMPTY] #${p.id} ${p.title} — ${p.artist} — no tracks returned`)
        continue
      }

      console.log(`[OK] #${p.id} ${p.title} — ${p.artist} — ${tracklist.length} tracks`)
      if (!dryRun) {
        await db.run('UPDATE products SET tracklist = ? WHERE id = ?', [JSON.stringify(tracklist), p.id])
      }
    } catch (err) {
      console.log(`[ERROR] #${p.id} ${p.title} — ${err.message}`)
    }
  }

  if (dryRun) console.log('\nDry run — no DB writes.')
}

main()
