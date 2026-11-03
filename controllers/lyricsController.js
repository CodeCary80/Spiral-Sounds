// Lyrics come from LRCLIB (https://lrclib.net), a free community lyrics service
// that needs no key. It is asked through this route rather than from the page so
// repeat views are served from the cache below instead of hitting LRCLIB again.

const LRCLIB = 'https://lrclib.net/api'
const ATTEMPTS = 4
const CACHE_LIMIT = 500
const cache = new Map()

// "Dreams - 2004 Remaster" and "Pannonica (feat. Sonny Rollins)" are listed under
// the plain song name.
export function cleanTitle(title) {
  const cleaned = title.replace(/\s+[-–]\s+.*$/, '').replace(/\s*[([].*?[)\]]/g, '').trim()
  return cleaned || title
}

// A credit like "Prince & The Revolution" is usually listed under the first name.
export function mainArtist(artist) {
  return artist.split(/\s*(?:&|,)\s*/)[0].trim() || artist
}

// LRCLIB has no ranking guarantee, so prefer a result with lyrics; a song only
// counts as instrumental when nothing better came back.
export function pickLyrics(results) {
  const withLyrics = results.find(r => r.plainLyrics?.trim())
  if (withLyrics) return { lyrics: withLyrics.plainLyrics.trim(), instrumental: false }
  return { lyrics: null, instrumental: results.some(r => r.instrumental) }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// LRCLIB often answers 503 "server is busy, retry in a moment" with a Retry-After
// of a second, and a retry usually gets through. A 404 just means no match.
async function askLrclib(endpoint, params) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${LRCLIB}/${endpoint}?${params}`, {
      headers: { 'User-Agent': 'Spiral Sounds (student project)' },
      signal: AbortSignal.timeout(8000)
    })
    if (res.status === 404) return null
    if (res.ok) return res.json()
    if (res.status !== 503 || attempt === ATTEMPTS) throw new Error(`LRCLIB answered ${res.status}`)
    await sleep(Math.min(Number(res.headers.get('retry-after') ?? 1), 3) * 1000)
  }
}

// The exact lookup is far quicker and less often busy than search, so search is
// only the fallback for songs it has no lyrics for.
async function fetchLyrics(track, artist) {
  const params = new URLSearchParams({ track_name: cleanTitle(track), artist_name: mainArtist(artist) })
  const exact = await askLrclib('get', params)
  if (exact?.plainLyrics?.trim()) return pickLyrics([exact])

  const results = await askLrclib('search', params)
  return pickLyrics([...(exact ? [exact] : []), ...(results ?? [])])
}

export async function getLyrics(req, res) {
  const { track, artist } = req.query

  if (typeof track !== 'string' || typeof artist !== 'string' || !track.trim() || !artist.trim()
    || track.length > 300 || artist.length > 300) {
    return res.status(400).json({ error: 'track and artist are required' })
  }

  const key = `${artist}\n${track}`.toLowerCase()
  if (cache.has(key)) return res.json(cache.get(key))

  try {
    const result = await fetchLyrics(track, artist)
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
    cache.set(key, result)
    res.json(result)
  } catch (err) {
    console.error('Lyrics lookup failed:', err.message)
    res.status(502).json({ error: 'Lyrics are unavailable right now' })
  }
}
