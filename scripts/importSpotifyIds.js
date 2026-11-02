// One-off maintenance script — not part of the running app.
// Adds a `spotifyId` to each song in every product's `tracklist` column, so the
// detail page can play 30-second previews through the Spotify embed player.
// Uses the Spotify Web API with app-only (client credentials) auth, which needs
// SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env from a free app created at
// https://developer.spotify.com/dashboard.
//
// Usage:
//   node scripts/importSpotifyIds.js --dry-run   (fetch + print matches, no DB writes)
//   node scripts/importSpotifyIds.js             (writes ids for records that have none yet)
//   node scripts/importSpotifyIds.js --all       (re-matches every record)

import 'dotenv/config'
import { getDBConnection } from '../db/db.js'

const API = 'https://api.spotify.com/v1'

function tokens(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
}

function normalized(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Spotify and iTunes disagree on suffixes ("Dreams - 2004 Remaster" vs
// "Dreams", "(Live)" vs "[Live]"), so the fallback match drops them both sides.
function loose(s) {
  return normalized(s.replace(/\s+[-–]\s+.*$/, '').replace(/\s*[([].*?[)\]]/g, ''))
}

// Our artist field can be a credit like "Prince & The Revolution" or
// "Berlin Philharmonic & Herbert von Karajan" where Spotify lists only part of it.
function artistNames(artist) {
  return artist.split(/\s*(?:&|,|\band\b)\s*/i).map(tokens).filter(n => n.length)
}

// Same words in any order, ignoring the artist's name:
// "Sam Cooke: Portrait Of A Legend 1951-1964" ~ "Portrait of a Legend: 1951–1964".
function sameWords(a, b, artistTokens) {
  const words = s => tokens(s).filter(t => !artistTokens.includes(t)).sort().join(' ')
  return words(a) === words(b)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function getToken() {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env
  if (!id || !secret) {
    console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env first.')
    process.exit(1)
  }
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  if (!res.ok) throw new Error(`token request failed: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token
}

class RateLimited extends Error {}

// Spotify answers 429 with a Retry-After header (seconds) when throttled. Short
// waits are retried; a development-mode app that goes over its quota can be
// told to wait most of a day, so stop instead of sleeping through that.
async function spotify(path, token) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(path.startsWith('http') ? path : API + path, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after')) || 2
      if (wait > 60) throw new RateLimited(`Spotify rate limit: try again in ${(wait / 3600).toFixed(1)} hours`)
      await sleep(wait * 1000)
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
    return res.json()
  }
  throw new Error('rate limited too many times')
}

// Albums whose title matches ours, closest track count first.
async function findAlbums(title, artist, trackCount, token) {
  const names = artistNames(artist)
  const wantedTitle = normalized(title)

  // Different queries surface different releases, so pool them before choosing.
  const found = new Map()
  for (const q of [`album:${title} artist:${artist}`, `${title} ${artist}`, `${title} ${names[0].join(' ')}`]) {
    const data = await spotify(`/search?type=album&limit=10&q=${encodeURIComponent(q)}`, token)
    for (const a of data.albums.items) found.set(a.id, a)
  }

  const candidates = [...found.values()].filter(a => {
    const gotArtistTokens = a.artists.flatMap(x => tokens(x.name))
    return names.some(n => n.every(t => gotArtistTokens.includes(t)))
  })
  const artistTokens = candidates.flatMap(a => a.artists.flatMap(x => tokens(x.name)))
  return candidates
    .filter(a => normalized(a.name) === wantedTitle
      || loose(a.name) === loose(title)
      || sameWords(a.name, title, artistTokens))
    .sort((a, b) => Math.abs(a.total_tracks - trackCount) - Math.abs(b.total_tracks - trackCount)
      || (normalized(b.name) === wantedTitle) - (normalized(a.name) === wantedTitle))
}

async function fetchTracks(albumId, token) {
  const tracks = []
  let next = `/albums/${albumId}/tracks?limit=50`
  while (next) {
    const page = await spotify(next, token)
    tracks.push(...page.items)
    next = page.next
  }
  return tracks
}

// Exact title match first, then the loose one; each Spotify track is used once.
// When both lists are the same length and every title match sits at the same
// position, the rest are paired by position ("Pt. 1: Acknowledgement" vs
// "Pt. I – Acknowledgement", or classical movements named differently).
function matchTracks(tracklist, spotifyTracks) {
  const unused = [...spotifyTracks]
  const take = test => {
    const i = unused.findIndex(test)
    return i === -1 ? null : unused.splice(i, 1)[0]
  }
  const exactPass = tracklist.map(t => take(s => normalized(s.name) === normalized(t.title)))
  const hits = tracklist.map((t, i) => exactPass[i] ?? take(s => loose(s.name) === loose(t.title)))

  const sameOrder = tracklist.length === spotifyTracks.length
    && hits.every((hit, i) => !hit || spotifyTracks[i] === hit)
  return tracklist.map((t, i) => {
    const hit = hits[i] ?? (sameOrder && unused.includes(spotifyTracks[i]) ? spotifyTracks[i] : null)
    const { spotifyId, ...song } = t
    return hit ? { ...song, spotifyId: hit.id } : song
  })
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const all = process.argv.includes('--all')
  const token = await getToken()
  const db = await getDBConnection()
  const products = await db.all('SELECT id, title, artist, tracklist FROM products ORDER BY id')

  let songs = 0
  let matched = 0

  for (const p of products) {
    try {
      if (!p.tracklist?.length) {
        console.log(`[SKIP] #${p.id} ${p.title} — no tracklist`)
        continue
      }
      if (!all && p.tracklist.some(t => t.spotifyId)) continue

      const albums = await findAlbums(p.title, p.artist, p.tracklist.length, token)
      if (!albums.length) {
        console.log(`[MISS] #${p.id} ${p.title} — ${p.artist} — no Spotify album`)
        songs += p.tracklist.length
        continue
      }

      // A title match can still be the wrong release (the 3-track "Paranoid"
      // single, or a remaster without the expanded edition's bonus tracks),
      // so try the closest few and keep whichever matches the most songs.
      let album, tracklist, found = -1
      for (const candidate of albums.slice(0, 3)) {
        const attempt = matchTracks(p.tracklist, await fetchTracks(candidate.id, token))
        const count = attempt.filter(t => t.spotifyId).length
        if (count > found) [album, tracklist, found] = [candidate, attempt, count]
        if (found === p.tracklist.length) break
      }
      songs += tracklist.length
      matched += found

      const tag = found === tracklist.length ? 'OK' : 'PART'
      console.log(`[${tag}] #${p.id} ${p.title} — ${p.artist} — ${found}/${tracklist.length} (${album.name})`)
      for (const t of tracklist) if (!t.spotifyId) console.log(`        unmatched: ${t.title}`)

      if (!dryRun) {
        await db.run('UPDATE products SET tracklist = ? WHERE id = ?', [JSON.stringify(tracklist), p.id])
      }
    } catch (err) {
      if (err instanceof RateLimited) {
        console.log(`[STOP] #${p.id} ${p.title} — ${err.message}`)
        break
      }
      console.log(`[ERROR] #${p.id} ${p.title} — ${err.message}`)
    }
  }

  console.log(`\n${matched}/${songs} songs matched.`)
  if (dryRun) console.log('Dry run — no DB writes.')
  process.exit(0)
}

main()
