// One-off maintenance script — not part of the running app.
// Fills the store's empty genre categories by pulling real album metadata
// and cover art from the iTunes Search API (no auth key required).
//
// Usage:
//   node scripts/importRecords.js --dry-run   (fetch + map + print, no DB writes, no downloads)
//   node scripts/importRecords.js             (actually inserts + downloads artwork)

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { getDBConnection } from '../db/db.js'

const IMAGES_DIR = path.join(import.meta.dirname, '..', 'public', 'images')

// Curated real artist+album picks per genre, enough to bring every one of the
// store's 12 genres to at least 5 records. The 7 genres that already had 3
// real records from an earlier run only list their 2 top-up picks — not the
// original 3, since re-querying those risks iTunes returning a slightly
// different edition title (e.g. "(Remastered)") that slips past the
// title+artist dedup check and inserts a near-duplicate.
const TARGETS = {
  jazz: [
    'Thelonious Monk - Brilliant Corners', 'Charles Mingus - Mingus Ah Um',
  ],
  electronic: [
    'Jean-Michel Jarre - Oxygene', 'Boards of Canada - Music Has the Right to Children',
  ],
  soul: [
    'Stevie Wonder - Songs in the Key of Life', 'Sam Cooke - Portrait of a Legend',
  ],
  classical: [
    'Antonio Vivaldi - The Four Seasons', 'Frederic Chopin - Nocturnes',
  ],
  pop: [
    'Whitney Houston - Whitney Houston', 'ABBA - Arrival',
  ],
  metal: [
    'Judas Priest - Painkiller', 'Slayer - World Painted Blood',
  ],
  blues: [
    'Etta James - At Last', 'Albert King - Born Under a Bad Sign',
  ],
  rock: [
    'Led Zeppelin - IV', 'Pink Floyd - The Wall', 'The Rolling Stones - Sticky Fingers',
    'Fleetwood Mac - Rumours', 'Queen - A Night at the Opera',
  ],
  indie: [
    'Arctic Monkeys - AM', 'Vampire Weekend - Modern Vampires of the City', 'The Strokes - Is This It',
    'Tame Impala - Lonerism', 'Alt-J - An Awesome Wave',
  ],
  ambient: [
    'Brian Eno - Ambient 1 Music for Airports', 'Brian Eno - Apollo Atmospheres and Soundtracks', 'Harold Budd - The Pavilion of Dreams',
    'Stars of the Lid - The Tired Sounds of Stars of the Lid', 'Vangelis - Blade Runner',
  ],
  folk: [
    'Bob Dylan - The Freewheelin\' Bob Dylan', 'Joni Mitchell - Blue', 'Simon & Garfunkel - Bridge Over Troubled Water',
    'Nick Drake - Pink Moon', 'Fleet Foxes - Fleet Foxes',
  ],
  punk: [
    'Ramones - Ramones', 'Sex Pistols - Never Mind the Bollocks', 'The Clash - London Calling',
    'Dead Kennedys - Bedtime for Democracy', 'Bad Religion - No Substance',
  ],
}

// Plausible vinyl price in this store's existing range ($38-$45), deterministic
// per title so re-runs don't produce different prices.
function priceFor(title) {
  let hash = 0
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (34.99 + (hash % 1100) / 100).toFixed(2)
}

function tokens(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

async function searchAlbum(artist, album, genre) {
  const term = encodeURIComponent(`${artist} ${album}`)
  const url = `https://itunes.apple.com/search?term=${term}&entity=album&limit=10`
  const res = await fetch(url)
  const data = await res.json()

  const normalized = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const wantedAlbum = normalized(album)
  const wantedArtistTokens = tokens(artist)
  // Classical listings credit the performing orchestra/soloist as "artist",
  // not the composer — match the composer's surname in the title instead.
  const composerSurname = normalized(artist.trim().split(' ').pop())

  // Every token of the artist we asked for must show up in the returned
  // artist's tokens (e.g. "Prince" matches "Prince & The Revolution"). Only
  // checking substring-of-either-string is too loose — it let "Nick Drake"
  // match plain "Drake", since "drake" is a substring of "nickdrake".
  const byRealArtist = data.results.filter(r => {
    const gotArtistTokens = tokens(r.artistName)
    if (wantedArtistTokens.every(t => gotArtistTokens.includes(t))) return true
    if (genre === 'classical' && normalized(r.collectionName).includes(composerSurname)) return true
    return false
  })

  // Prefer an exact title match over a broader one (e.g. the real "Currents"
  // album over "Currents B-Sides & Remixes - EP", which also contains the
  // word "currents"). Among substring matches, the shortest title is closest
  // to what we asked for.
  const exact = byRealArtist.find(r => normalized(r.collectionName) === wantedAlbum)
  if (exact) return exact

  const substringMatches = byRealArtist
    .filter(r => normalized(r.collectionName).includes(wantedAlbum))
    .sort((a, b) => a.collectionName.length - b.collectionName.length)

  return substringMatches[0] ?? byRealArtist[0] ?? null
}

async function nextImageNumber() {
  const files = fs.readdirSync(IMAGES_DIR)
  const nums = files
    .map(f => f.match(/^vinyl(\d+)\.(png|jpg)$/))
    .filter(Boolean)
    .map(m => Number(m[1]))
  return (nums.length ? Math.max(...nums) : 0) + 1
}

async function downloadArtwork(url, destPath) {
  const hiRes = url.replace('100x100bb', '600x600bb')
  const res = await fetch(hiRes)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(destPath, buf)
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const db = await getDBConnection()
  const existing = await db.all('SELECT title, artist FROM products')
  const existingKey = new Set(existing.map(r => `${r.title.toLowerCase()}|${r.artist.toLowerCase()}`))

  let imgNum = dryRun ? null : await nextImageNumber()
  const toInsert = []

  for (const [genre, entries] of Object.entries(TARGETS)) {
    for (const entry of entries) {
      const [artist, album] = entry.split(' - ')
      const hit = await searchAlbum(artist, album, genre)
      if (!hit) {
        console.log(`[MISS] ${entry} — no iTunes result`)
        continue
      }

      const title = hit.collectionName
      const key = `${title.toLowerCase()}|${hit.artistName.toLowerCase()}`
      if (existingKey.has(key)) {
        console.log(`[SKIP] ${title} by ${hit.artistName} — already in catalog`)
        continue
      }

      const year = new Date(hit.releaseDate).getFullYear()
      const price = priceFor(title)
      const itunesGenre = hit.primaryGenreName

      const row = { genre, title, artist: hit.artistName, year, price, itunesGenre, artworkUrl: hit.artworkUrl100 }
      toInsert.push(row)
      console.log(`[OK] ${genre.padEnd(10)} ${title} — ${hit.artistName} (${year}, $${price}) [iTunes genre: ${itunesGenre}]`)
    }
  }

  console.log(`\n${toInsert.length} record(s) ready to insert.`)
  if (dryRun) {
    console.log('Dry run — no DB writes, no image downloads.')
    return
  }

  for (const row of toInsert) {
    const image = `vinyl${imgNum}.jpg`
    await downloadArtwork(row.artworkUrl, path.join(IMAGES_DIR, image))
    await db.run(
      'INSERT INTO products (title, artist, price, image, year, genre, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [row.title, row.artist, row.price, image, row.year, row.genre, 12]
    )
    console.log(`[INSERTED] ${row.title} -> ${image}`)
    imgNum++
  }
}

main()
