import { getDBConnection } from '../db/db.js'

// Maps common subgenre/alias search terms to the store's actual genre categories,
// so searching e.g. "New Wave" still surfaces records tagged "rock".
const SUBGENRE_MAP = {
  'new wave': 'rock',
  'grunge': 'rock',
  'psychedelic rock': 'rock',
  'hard rock': 'rock',
  'garage rock': 'rock',

  'indie rock': 'indie',
  'indie pop': 'indie',
  'lo fi': 'indie',
  'dream pop': 'indie',
  'shoegaze': 'indie',

  'drone': 'ambient',
  'new age': 'ambient',
  'dark ambient': 'ambient',
  'field recording': 'ambient',

  'folk rock': 'folk',
  'americana': 'folk',
  'singer songwriter': 'folk',
  'bluegrass': 'folk',

  'post punk': 'punk',
  'hardcore': 'punk',
  'pop punk': 'punk',
  'ska punk': 'punk',

  'bebop': 'jazz',
  'swing': 'jazz',
  'fusion': 'jazz',
  'free jazz': 'jazz',
  'smooth jazz': 'jazz',

  'techno': 'electronic',
  'house': 'electronic',
  'synthwave': 'electronic',
  'idm': 'electronic',
  'downtempo': 'electronic',

  'r&b': 'soul',
  'funk': 'soul',
  'motown': 'soul',
  'neo soul': 'soul',

  'baroque': 'classical',
  'romantic': 'classical',
  'chamber music': 'classical',
  'opera': 'classical',

  'synth pop': 'pop',
  'synthpop': 'pop',
  'dance pop': 'pop',
  'city pop': 'pop',
  'bubblegum pop': 'pop',

  'thrash metal': 'metal',
  'death metal': 'metal',
  'black metal': 'metal',
  'doom metal': 'metal',

  'delta blues': 'blues',
  'chicago blues': 'blues',
  'blues rock': 'blues',
}

export async function getGenres(req, res) {

  try {

    const db = await getDBConnection()

    const genreRows = await db.all('SELECT DISTINCT genre FROM products')
    const genres = genreRows.map(row => row.genre)
    res.json(genres)

  } catch (err) {

    res.status(500).json({error: 'Failed to fetch genres', details: err.message})

  }
}

export async function getProducts(req, res) {

  try {

    const db = await getDBConnection()

    let query = 'SELECT * FROM products'
    let params = []

    const { genre, search } = req.query
    console.log('genre:', genre, '| search:', search)

    if (genre) {

      query += ' WHERE genre = ?'
      params.push(genre)

    } else if (search) {

      const searchPattern = `%${search}%`
      const mappedGenre = SUBGENRE_MAP[search.trim().toLowerCase()]

      if (mappedGenre) {
        query += ' WHERE genre = ? OR title ILIKE ? OR artist ILIKE ? OR genre ILIKE ?'
        params.push(mappedGenre, searchPattern, searchPattern, searchPattern)
      } else {
        query += ' WHERE title ILIKE ? OR artist ILIKE ? OR genre ILIKE ?'
        params.push(searchPattern, searchPattern, searchPattern)
      }

    }
    console.log('QUERY:', query)
    console.log('PARAMS:', params)

    const products = await db.all(query, params)

    res.json(products)


  } catch (err) {

    res.status(500).json({error: 'Failed to fetch products', details: err.message})

  }

}

export async function getProductById(req, res) {
  try {
    const db = await getDBConnection()
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id])

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    res.json(product)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product', details: err.message })
  }
}

// ---- The hero's featured record: a random pick that changes once a week ----

const DAY = 24 * 60 * 60 * 1000
const FIRST_MONDAY = 4 * DAY // 5 Jan 1970, so weeks turn over on Monday at 00:00 UTC
// Tracks to preview instead of a record's first song
const PREVIEW_TRACKS = { 36: 'Sir Duke' }

function previewTrackFor(product) {
  const tracks = (product.tracklist || []).filter(t => t.spotifyId)
  return tracks.find(t => t.title === PREVIEW_TRACKS[product.id]) || tracks[0] || null
}

// mulberry32: the same seed always gives the same sequence of numbers in [0, 1)
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Derived from the date alone, so every visitor sees the same record all week with
// nothing stored. Records are shuffled afresh for each full pass through the
// catalogue, so none comes round again until all of them have had a turn.
export function pickFeatured(products, now = Date.now()) {
  const playable = products.filter(previewTrackFor).sort((a, b) => a.id - b.id)
  if (!playable.length) return null

  const week = Math.floor((now - FIRST_MONDAY) / (7 * DAY))
  const random = seededRandom(Math.floor(week / playable.length))
  const order = [...playable]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  // A sold-out record gives its week to the next one along.
  const start = week % order.length
  const inTurn = order.map((_, i) => order[(start + i) % order.length])
  const pick = inTurn.find(p => Number(p.stock) > 0) || inTurn[0]
  return { ...pick, previewTrack: previewTrackFor(pick) }
}

export async function getFeatured(req, res) {
  try {
    const db = await getDBConnection()
    const featured = pickFeatured(await db.all('SELECT * FROM products'))

    if (!featured) {
      return res.status(404).json({ error: 'No featured record' })
    }

    res.json(featured)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured record', details: err.message })
  }
}
